// ============================================================
//  src/routes/profile.js — Hồ sơ & lịch sử học tập
// ============================================================
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from './_auth-middleware.js';

const router = Router();
router.use(requireAuth);

// Hồ sơ + thống kê cá nhân
router.get('/', (req, res) => {
  const u = db.prepare('SELECT id, full_name, email, goal, created_at FROM Users WHERE id=?').get(req.user.id);
  const stats = db.prepare(`
    SELECT COUNT(*) attempts, AVG(score) avg_score, SUM(correct) correct, SUM(total) total
    FROM ExamResults WHERE user_id=?
  `).get(req.user.id);
  res.json({
    user: u,
    stats: {
      attempts: stats.attempts || 0,
      avgScore: stats.avg_score ? Math.round(stats.avg_score * 10) / 10 : 0,
      accuracy: stats.total ? Math.round(stats.correct / stats.total * 100) : 0,
    },
  });
});

// Cập nhật mục tiêu điểm / họ tên
router.put('/', (req, res) => {
  const { fullName, goal } = req.body || {};
  if (fullName) db.prepare('UPDATE Users SET full_name=? WHERE id=?').run(fullName, req.user.id);
  if (goal) db.prepare('UPDATE Users SET goal=? WHERE id=?').run(goal, req.user.id);
  const u = db.prepare('SELECT id, full_name, email, goal FROM Users WHERE id=?').get(req.user.id);
  res.json({ user: u });
});

// Lịch sử học tập đầy đủ
router.get('/history', (req, res) => {
  const rows = db.prepare(`
    SELECT r.id, r.mode, r.score, r.correct, r.total, r.created_at, s.name subject
    FROM ExamResults r JOIN Subjects s ON s.id=r.subject_id
    WHERE r.user_id=? ORDER BY r.created_at DESC LIMIT 50
  `).all(req.user.id);
  res.json({ history: rows });
});

// Chi tiết một bài làm (để xem lại)
router.get('/result/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM ExamResults WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Không tìm thấy bài làm.' });
  res.json({ ...row, detail: JSON.parse(row.detail || '[]') });
});

export default router;
