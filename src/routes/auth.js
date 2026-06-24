// ============================================================
//  src/routes/auth.js — Đăng ký / Đăng nhập / Quên mật khẩu
// ============================================================
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { db } from '../db.js';
import { sign, requireAuth } from './_auth-middleware.js';

const router = Router();

// Đăng ký
router.post('/register', (req, res) => {
  const { fullName, email, password } = req.body || {};
  if (!fullName || !email || !password)
    return res.status(400).json({ error: 'Vui lòng nhập đủ họ tên, email và mật khẩu.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự.' });

  const exists = db.prepare('SELECT id FROM Users WHERE email=?').get(email);
  if (exists) return res.status(409).json({ error: 'Email này đã được đăng ký.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    'INSERT INTO Users (full_name, email, password) VALUES (?, ?, ?)'
  ).run(fullName, email, hash);
  const user = db.prepare('SELECT id, full_name, email, goal FROM Users WHERE id=?').get(info.lastInsertRowid);
  res.json({ token: sign(user), user });
});

// Đăng nhập
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const row = db.prepare('SELECT * FROM Users WHERE email=?').get(email);
  if (!row || !bcrypt.compareSync(password || '', row.password))
    return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
  const user = { id: row.id, full_name: row.full_name, email: row.email, goal: row.goal };
  res.json({ token: sign(user), user });
});

// Quên mật khẩu → sinh mã đặt lại (demo trả thẳng mã; thực tế gửi email)
router.post('/forgot', (req, res) => {
  const { email } = req.body || {};
  const row = db.prepare('SELECT id FROM Users WHERE email=?').get(email);
  if (!row) return res.status(404).json({ error: 'Không tìm thấy tài khoản với email này.' });
  const token = randomBytes(4).toString('hex').toUpperCase(); // mã 8 ký tự
  const expire = Math.floor(Date.now() / 1000) + 15 * 60;      // 15 phút
  db.prepare('UPDATE Users SET reset_token=?, reset_expire=? WHERE id=?').run(token, expire, row.id);
  // Demo: trả mã về client. Sản phẩm thật: gửi qua email và KHÔNG trả về.
  res.json({ message: 'Đã tạo mã đặt lại (chế độ demo).', token });
});

// Đặt lại mật khẩu
router.post('/reset', (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) return res.status(400).json({ error: 'Thiếu mã hoặc mật khẩu mới.' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
  const row = db.prepare('SELECT * FROM Users WHERE reset_token=?').get(token);
  if (!row || (row.reset_expire || 0) < Math.floor(Date.now() / 1000))
    return res.status(400).json({ error: 'Mã không hợp lệ hoặc đã hết hạn.' });
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE Users SET password=?, reset_token=NULL, reset_expire=NULL WHERE id=?').run(hash, row.id);
  res.json({ message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.' });
});

// Thông tin tài khoản hiện tại
router.get('/me', requireAuth, (req, res) => {
  const row = db.prepare('SELECT id, full_name, email, goal, created_at FROM Users WHERE id=?').get(req.user.id);
  res.json({ user: row });
});

export default router;
