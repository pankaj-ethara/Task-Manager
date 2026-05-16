import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { getDb } from '../db/database.js';

const router = express.Router();

router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const params = [];
    let joins = 'FROM tasks t JOIN projects p ON p.id = t.project_id';
    let where = '';
    if (req.user.role !== 'admin') {
      where = 'WHERE t.assigned_to = ?';
      params.push(req.user.id);
    }

    const countRow = await db.get(`
      SELECT
        COUNT(*) AS total_tasks,
        SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) AS todo_tasks,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_tasks,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done_tasks,
        SUM(CASE WHEN t.due_date IS NOT NULL AND date(t.due_date) < date('now') AND t.status != 'done' THEN 1 ELSE 0 END) AS overdue_tasks
      ${joins} ${where}
    `, ...params);

    let projectCount;
    if (req.user.role === 'admin') {
      projectCount = await db.get('SELECT COUNT(*) AS total_projects FROM projects');
    } else {
      projectCount = await db.get('SELECT COUNT(*) AS total_projects FROM project_members WHERE user_id = ?', req.user.id);
    }

    const recentTasks = await db.all(`
      SELECT t.*, p.name AS project_name, assignee.name AS assigned_to_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users assignee ON assignee.id = t.assigned_to
      ${req.user.role !== 'admin' ? 'WHERE t.assigned_to = ?' : ''}
      ORDER BY t.updated_at DESC
      LIMIT 6
    `, ...(req.user.role !== 'admin' ? [req.user.id] : []));

    res.json({
      total_projects: projectCount.total_projects || 0,
      total_tasks: countRow.total_tasks || 0,
      todo_tasks: countRow.todo_tasks || 0,
      in_progress_tasks: countRow.in_progress_tasks || 0,
      done_tasks: countRow.done_tasks || 0,
      overdue_tasks: countRow.overdue_tasks || 0,
      recent_tasks: recentTasks
    });
  } catch (error) { next(error); }
});

export default router;
