import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';
import { getDb } from '../db/database.js';

const router = express.Router();

router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const db = await getDb();
    const users = await db.all('SELECT id, name, email, role, created_at FROM users ORDER BY name ASC');
    res.json(users);
  } catch (error) { next(error); }
});

export default router;
