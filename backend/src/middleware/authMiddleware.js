import jwt from 'jsonwebtoken';
import { getDb } from '../db/database.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication token is required.' });
    }
    const token = header.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'local_secret_change_me');
    const db = await getDb();
    const user = await db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', decoded.id);
    if (!user) return res.status(401).json({ message: 'Invalid user session.' });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access is required for this action.' });
  }
  next();
}
