import jwt from 'jsonwebtoken';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'local_secret_change_me',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}
