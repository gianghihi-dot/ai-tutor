// ============================================================
//  src/routes/_auth-middleware.js — Xác thực JWT
// ============================================================
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'ai-tutor-dev-secret-change-me';

export function sign(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.full_name }, JWT_SECRET, { expiresIn: '7d' });
}

// Middleware: yêu cầu đăng nhập
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.' });
  }
}
