import express from 'express';
import { body, param } from 'express-validator';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { getDb } from '../db/database.js';
import { canAccessProject, canAccessTask } from '../utils/access.js';

const router = express.Router();

async function getAssignableMember(db, projectId, userId) {
  return db.get(
    `SELECT 1
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = ? AND pm.user_id = ? AND u.role = 'member'`,
    projectId,
    userId
  );
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const { status, projectId } = req.query;
    const filters = [];
    const params = [];

    if (status) {
      filters.push('t.status = ?');
      params.push(status);
    }
    if (projectId) {
      filters.push('t.project_id = ?');
      params.push(projectId);
    }

    let sql = `
      SELECT t.*, p.name AS project_name, assignee.name AS assigned_to_name, assignee.email AS assigned_to_email, creator.name AS created_by_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users assignee ON assignee.id = t.assigned_to
      JOIN users creator ON creator.id = t.created_by
    `;

    if (req.user.role !== 'admin') {
      filters.push('t.assigned_to = ?');
      params.push(req.user.id);
    }

    if (filters.length) sql += ` WHERE ${filters.join(' AND ')}`;
    sql += ` ORDER BY CASE t.status WHEN 'todo' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END, t.due_date ASC, t.created_at DESC`;

    const tasks = await db.all(sql, ...params);
    res.json(tasks);
  } catch (error) { next(error); }
});

router.post('/', requireAuth, requireAdmin, [
  body('title').trim().isLength({ min: 3 }).withMessage('Task title must be at least 3 characters.'),
  body('description').optional({ nullable: true }).trim(),
  body('project_id').isInt().withMessage('Valid project_id is required.'),
  body('assigned_to').optional({ nullable: true }).isInt().withMessage('Assigned user must be valid.'),
  body('status').optional().isIn(['todo', 'in_progress', 'done']).withMessage('Invalid task status.'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority.'),
  body('due_date').optional({ nullable: true }).isISO8601().withMessage('Due date must be valid.')
], validate, async (req, res, next) => {
  try {
    const { title, description = '', project_id, assigned_to = null, status = 'todo', priority = 'medium', due_date = null } = req.body;
    const db = await getDb();
    const project = await db.get('SELECT id FROM projects WHERE id = ?', project_id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (assigned_to) {
      const membership = await getAssignableMember(db, project_id, assigned_to);
      if (!membership) return res.status(400).json({ message: 'Assigned user must be a member of this project and cannot be an admin.' });
    }
    const result = await db.run(
      'INSERT INTO tasks (title, description, project_id, assigned_to, status, priority, due_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      title, description, project_id, assigned_to, status, priority, due_date, req.user.id
    );
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', result.lastID);
    res.status(201).json(task);
  } catch (error) { next(error); }
});

router.get('/:id', requireAuth, [param('id').isInt()], validate, async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (!(await canAccessTask(req.user, taskId))) return res.status(403).json({ message: 'You cannot access this task.' });
    const db = await getDb();
    const task = await db.get(`SELECT t.*, p.name AS project_name, assignee.name AS assigned_to_name, creator.name AS created_by_name FROM tasks t JOIN projects p ON p.id = t.project_id LEFT JOIN users assignee ON assignee.id = t.assigned_to JOIN users creator ON creator.id = t.created_by WHERE t.id = ?`, taskId);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    res.json(task);
  } catch (error) { next(error); }
});

router.put('/:id', requireAuth, [
  param('id').isInt(),
  body('title').optional().trim().isLength({ min: 3 }).withMessage('Task title must be at least 3 characters.'),
  body('description').optional({ nullable: true }).trim(),
  body('project_id').optional().isInt().withMessage('Valid project_id is required.'),
  body('assigned_to').optional({ nullable: true }).isInt().withMessage('Assigned user must be valid.'),
  body('status').optional().isIn(['todo', 'in_progress', 'done']).withMessage('Invalid task status.'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority.'),
  body('due_date').optional({ nullable: true }).isISO8601().withMessage('Due date must be valid.')
], validate, async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (!(await canAccessTask(req.user, taskId))) return res.status(403).json({ message: 'You cannot access this task.' });
    const db = await getDb();
    const current = await db.get('SELECT * FROM tasks WHERE id = ?', taskId);
    if (!current) return res.status(404).json({ message: 'Task not found.' });

    if (req.user.role !== 'admin') {
      const { status } = req.body;
      if (!status) return res.status(403).json({ message: 'Members can only update task status.' });
      await db.run('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', status, taskId);
    } else {
      const updated = {
        title: req.body.title ?? current.title,
        description: req.body.description ?? current.description,
        project_id: req.body.project_id ?? current.project_id,
        assigned_to: req.body.assigned_to === undefined ? current.assigned_to : req.body.assigned_to,
        status: req.body.status ?? current.status,
        priority: req.body.priority ?? current.priority,
        due_date: req.body.due_date === undefined ? current.due_date : req.body.due_date
      };
      if (updated.assigned_to) {
        const membership = await getAssignableMember(db, updated.project_id, updated.assigned_to);
        if (!membership) return res.status(400).json({ message: 'Assigned user must be a member of this project and cannot be an admin.' });
      }
      await db.run(
        'UPDATE tasks SET title = ?, description = ?, project_id = ?, assigned_to = ?, status = ?, priority = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        updated.title, updated.description, updated.project_id, updated.assigned_to, updated.status, updated.priority, updated.due_date, taskId
      );
    }
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', taskId);
    res.json(task);
  } catch (error) { next(error); }
});

router.delete('/:id', requireAuth, requireAdmin, [param('id').isInt()], validate, async (req, res, next) => {
  try {
    const db = await getDb();
    const result = await db.run('DELETE FROM tasks WHERE id = ?', req.params.id);
    if (!result.changes) return res.status(404).json({ message: 'Task not found.' });
    res.json({ message: 'Task deleted successfully.' });
  } catch (error) { next(error); }
});

export default router;
