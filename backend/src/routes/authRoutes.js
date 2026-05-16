import express from 'express';
import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import { getDb } from '../db/database.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { signToken } from '../utils/auth.js';

const router = express.Router();

router.post('/signup', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters.'),
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('role').optional().isIn(['admin', 'member']).withMessage('Role must be admin or member.')
], validate, async (req, res, next) => {
  try {
    const { name, email, password, role = 'member' } = req.body;
    const db = await getDb();
    const existing = await db.get('SELECT id FROM users WHERE email = ?', email);
    if (existing) return res.status(409).json({ message: 'Email is already registered.' });
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.run('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', name, email, passwordHash, role);
    const user = await db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', result.lastID);
    res.status(201).json({ token: signToken(user), user });
  } catch (error) { next(error); }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('A valid email is required.'),
  body('password').notEmpty().withMessage('Password is required.')
], validate, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE email = ?', email);
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid email or password.' });
    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role, created_at: user.created_at };
    res.json({ token: signToken(safeUser), user: safeUser });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

export default router;
