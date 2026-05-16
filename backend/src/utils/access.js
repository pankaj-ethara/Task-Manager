import { getDb } from '../db/database.js';

export async function canAccessProject(user, projectId) {
  if (user.role === 'admin') return true;
  const db = await getDb();
  const row = await db.get(
    'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?',
    projectId,
    user.id
  );
  return Boolean(row);
}

export async function canAccessTask(user, taskId) {
  if (user.role === 'admin') return true;
  const db = await getDb();
  const task = await db.get('SELECT project_id, assigned_to FROM tasks WHERE id = ?', taskId);
  if (!task) return false;
  return task.assigned_to === user.id;
}
