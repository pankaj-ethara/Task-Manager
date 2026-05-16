import express from 'express';
import { body, param } from 'express-validator';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { getDb } from '../db/database.js';
import { canAccessProject } from '../utils/access.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    let projects;
    if (req.user.role === 'admin') {
      projects = await db.all(`SELECT p.*, u.name AS created_by_name, COUNT(DISTINCT pm.user_id) AS member_count, COUNT(DISTINCT t.id) AS task_count FROM projects p JOIN users u ON u.id = p.created_by LEFT JOIN project_members pm ON pm.project_id = p.id LEFT JOIN tasks t ON t.project_id = p.id GROUP BY p.id ORDER BY p.created_at DESC`);
    } else {
      projects = await db.all(`SELECT p.*, u.name AS created_by_name, COUNT(DISTINCT pm2.user_id) AS member_count, COUNT(DISTINCT t.id) AS task_count FROM projects p JOIN users u ON u.id = p.created_by JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ? LEFT JOIN project_members pm2 ON pm2.project_id = p.id LEFT JOIN tasks t ON t.project_id = p.id AND t.assigned_to = ? GROUP BY p.id ORDER BY p.created_at DESC`, req.user.id, req.user.id);
    }
    res.json(projects);
  } catch (error) { next(error); }
});

router.post('/', requireAuth, requireAdmin, [
  body('name').trim().isLength({ min: 3 }).withMessage('Project name must be at least 3 characters.'),
  body('description').optional({ nullable: true }).trim(),
  body('status').optional().isIn(['active', 'completed', 'on_hold']).withMessage('Invalid project status.')
], validate, async (req, res, next) => {
  try {
    const { name, description = '', status = 'active' } = req.body;
    const db = await getDb();
    const result = await db.run('INSERT INTO projects (name, description, status, created_by) VALUES (?, ?, ?, ?)', name, description, status, req.user.id);
    await db.run('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)', result.lastID, req.user.id);
    const project = await db.get('SELECT * FROM projects WHERE id = ?', result.lastID);
    res.status(201).json(project);
  } catch (error) { next(error); }
});

router.get('/:id', requireAuth, [param('id').isInt()], validate, async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    if (!(await canAccessProject(req.user, projectId))) return res.status(403).json({ message: 'You cannot access this project.' });
    const db = await getDb();
    const project = await db.get('SELECT * FROM projects WHERE id = ?', projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    const members = await db.all(`SELECT u.id, u.name, u.email, u.role, pm.added_at FROM project_members pm JOIN users u ON u.id = pm.user_id WHERE pm.project_id = ? ORDER BY u.name ASC`, projectId);
    const taskParams = req.user.role === 'admin' ? [projectId] : [projectId, req.user.id];
    const taskFilter = req.user.role === 'admin' ? 'WHERE t.project_id = ?' : 'WHERE t.project_id = ? AND t.assigned_to = ?';
    const tasks = await db.all(`SELECT t.*, assignee.name AS assigned_to_name, creator.name AS created_by_name FROM tasks t LEFT JOIN users assignee ON assignee.id = t.assigned_to JOIN users creator ON creator.id = t.created_by ${taskFilter} ORDER BY CASE t.status WHEN 'todo' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END, t.due_date ASC`, ...taskParams);
    res.json({ ...project, members, tasks });
  } catch (error) { next(error); }
});

router.put('/:id', requireAuth, requireAdmin, [
  param('id').isInt(),
  body('name').trim().isLength({ min: 3 }).withMessage('Project name must be at least 3 characters.'),
  body('description').optional({ nullable: true }).trim(),
  body('status').isIn(['active', 'completed', 'on_hold']).withMessage('Invalid project status.')
], validate, async (req, res, next) => {
  try {
    const { name, description = '', status } = req.body;
    const db = await getDb();
    const result = await db.run('UPDATE projects SET name = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', name, description, status, req.params.id);
    if (!result.changes) return res.status(404).json({ message: 'Project not found.' });
    const project = await db.get('SELECT * FROM projects WHERE id = ?', req.params.id);
    res.json(project);
  } catch (error) { next(error); }
});

router.delete('/:id', requireAuth, requireAdmin, [param('id').isInt()], validate, async (req, res, next) => {
  try {
    const db = await getDb();
    const result = await db.run('DELETE FROM projects WHERE id = ?', req.params.id);
    if (!result.changes) return res.status(404).json({ message: 'Project not found.' });
    res.json({ message: 'Project deleted successfully.' });
  } catch (error) { next(error); }
});

router.post('/:id/members', requireAuth, requireAdmin, [param('id').isInt(), body('userId').isInt().withMessage('A valid userId is required.')], validate, async (req, res, next) => {
  try {
    const db = await getDb();
    const project = await db.get('SELECT id FROM projects WHERE id = ?', req.params.id);
    const user = await db.get('SELECT id FROM users WHERE id = ?', req.body.userId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    await db.run('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)', req.params.id, req.body.userId);
    res.status(201).json({ message: 'Member added to project.' });
  } catch (error) { next(error); }
});

router.delete('/:id/members/:userId', requireAuth, requireAdmin, [param('id').isInt(), param('userId').isInt()], validate, async (req, res, next) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', req.params.id, req.params.userId);
    res.json({ message: 'Member removed from project.' });
  } catch (error) { next(error); }
});

export default router;
