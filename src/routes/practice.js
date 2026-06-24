// ============================================================
//  src/routes/practice.js — Khảo sát & luyện tập cá nhân hoá
// ============================================================
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from './_auth-middleware.js';
import { generatePractice, masteryByTopic, targetDifficulty } from '../engine/adaptive.js';
import { recommendation } from '../engine/analysis.js';
import { gradeSubmission } from './_grade-submission.js';

const router = Router();
router.use(requireAuth);

// Sinh bộ câu hỏi (khảo sát hoặc luyện tập)
router.post('/generate', (req, res) => {
  const { subjectId, chapterId, goal, count, types, mode } = req.body || {};
  if (!subjectId) return res.status(400).json({ error: 'Thiếu môn học.' });

  // Cập nhật mục tiêu điểm của user (nếu chọn)
  if (goal) db.prepare('UPDATE Users SET goal=? WHERE id=?').run(goal, req.user.id);

  const userGoal = goal || db.prepare('SELECT goal FROM Users WHERE id=?').get(req.user.id).goal;

  let questions;
  if (mode === 'survey') {
    // Khảo sát: lấy đa dạng độ khó & loại, không thiên về chủ đề yếu (vì chưa có dữ liệu)
    const pool = db.prepare('SELECT * FROM Questions WHERE subject_id=? ORDER BY RANDOM()').all(subjectId);
    questions = pool.slice(0, count || 8).map(q => {
      const p = JSON.parse(q.payload);
      const safe = { id: q.id, type: q.type, difficulty: q.difficulty, stem: q.stem, topic: q.topic, chapter_id: q.chapter_id };
      if (q.type === 'mcq') safe.options = p.options;
      if (q.type === 'matching') { safe.left = p.left; safe.right = [...p.right].sort(() => Math.random() - 0.5); }
      return safe;
    });
  } else {
    questions = generatePractice(req.user.id, {
      subjectId, chapterId, goal: userGoal, count: count || 8, types,
    });
  }

  res.json({ questions, goal: userGoal });
});

// Nộp bài → chấm điểm & phân tích
router.post('/submit', (req, res) => {
  const { subjectId, mode = 'practice', answers } = req.body || {};
  if (!subjectId || !Array.isArray(answers))
    return res.status(400).json({ error: 'Dữ liệu nộp bài không hợp lệ.' });

  const result = gradeSubmission(req.user.id, subjectId, mode, answers);

  // Khuyến nghị thích ứng theo từng chủ đề vừa làm
  const mastery = masteryByTopic(req.user.id, subjectId);
  const topicsSeen = [...new Set(result.detail.map(d => d.topic))];
  const recs = topicsSeen.map(t => recommendation(mastery[t])).filter(Boolean);

  // Điểm mạnh / điểm yếu nhanh từ lượt làm này
  const byTopic = {};
  result.detail.forEach(d => {
    byTopic[d.topic] = byTopic[d.topic] || { topic: d.topic, correct: 0, total: 0 };
    byTopic[d.topic].total++; if (d.correct) byTopic[d.topic].correct++;
  });
  const topicStats = Object.values(byTopic);
  const strengths = topicStats.filter(t => t.correct / t.total >= 0.7).map(t => t.topic);
  const weaknesses = topicStats.filter(t => t.correct / t.total < 0.5).map(t => t.topic);

  res.json({ ...result, recommendations: recs, strengths, weaknesses });
});

export default router;
