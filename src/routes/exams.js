// ============================================================
//  src/routes/exams.js — Thi giả lập có đếm giờ
// ============================================================
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from './_auth-middleware.js';
import { publicQuestion } from '../engine/adaptive.js';
import { gradeSubmission } from './_grade-submission.js';

const router = Router();
router.use(requireAuth);

// Tạo đề thi theo cấu hình
router.post('/create', (req, res) => {
  const { subjectId, chapterId, difficulty, count = 10, duration = 30 } = req.body || {};
  if (!subjectId) return res.status(400).json({ error: 'Thiếu môn học.' });
  let sql = 'SELECT * FROM Questions WHERE subject_id=?';
  const params = [subjectId];
  if (chapterId) { sql += ' AND chapter_id=?'; params.push(chapterId); }
  if (difficulty) { sql += ' AND difficulty<=?'; params.push(difficulty); }
  sql += ' ORDER BY RANDOM()';
  const pool = db.prepare(sql).all(...params);
  if (!pool.length) return res.status(404).json({ error: 'Không đủ câu hỏi cho cấu hình này.' });

  const objective = pool.filter(q => q.type !== 'essay');
  const essays = pool.filter(q => q.type === 'essay');
  const nEssay = Math.min(essays.length, Math.max(1, Math.round(count * 0.2)));
  const selected = [...objective.slice(0, count - nEssay), ...essays.slice(0, nEssay)];
  const subject = db.prepare('SELECT name FROM Subjects WHERE id=?').get(subjectId);
  const ids = selected.map(q => q.id);
  const info = db.prepare(
    `INSERT INTO Exams (user_id, subject_id, title, duration, question_ids) VALUES (?, ?, ?, ?, ?)`
  ).run(req.user.id, subjectId, `Đề thi ${subject?.name || ''}`, duration, JSON.stringify(ids));
  res.json({
    examId: info.lastInsertRowid,
    title: `Đề thi giả lập · ${subject?.name || ''}`,
    duration,
    questions: selected.map(publicQuestion),
  });
});

// Nộp bài thi
router.post('/submit', async (req, res) => {
  const { examId, answers } = req.body || {};
  if (!examId || !Array.isArray(answers))
    return res.status(400).json({ error: 'Dữ liệu nộp bài không hợp lệ.' });
  const exam = db.prepare('SELECT * FROM Exams WHERE id=? AND user_id=?').get(examId, req.user.id);
  if (!exam) return res.status(404).json({ error: 'Không tìm thấy đề thi.' });
  const result = await gradeSubmission(req.user.id, exam.subject_id, 'exam', answers, examId);
  res.json(result);
});

// Lịch sử thi của user
router.get('/history', (req, res) => {
  const rows = db.prepare(`
    SELECT r.id, r.score, r.correct, r.total, r.created_at, s.name AS subject
    FROM ExamResults r JOIN Subjects s ON s.id = r.subject_id
    WHERE r.user_id=? AND r.mode='exam' ORDER BY r.created_at DESC LIMIT 20
  `).all(req.user.id);
  res.json({ history: rows });
});

export default router;
