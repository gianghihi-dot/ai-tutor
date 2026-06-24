// ============================================================
//  src/routes/analytics.js — Dashboard & phân tích lỗ hổng
// ============================================================
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from './_auth-middleware.js';
import { analyzeUser, buildStudyPlan } from '../engine/analysis.js';

const router = Router();
router.use(requireAuth);

// Số liệu tổng quan cho Dashboard
router.get('/dashboard', (req, res) => {
  const uid = req.user.id;
  const agg = db.prepare(`
    SELECT COUNT(*) total_attempts,
           AVG(score) avg_score,
           SUM(correct) total_correct,
           SUM(total) total_questions
    FROM ExamResults WHERE user_id=?
  `).get(uid);

  const accuracy = agg.total_questions ? Math.round(agg.total_correct / agg.total_questions * 100) : 0;
  const avgScore = agg.avg_score ? Math.round(agg.avg_score * 10) / 10 : 0;

  // Thành tích gần đây
  const recent = db.prepare(`
    SELECT r.mode, r.score, r.correct, r.total, r.created_at, s.name subject
    FROM ExamResults r JOIN Subjects s ON s.id=r.subject_id
    WHERE r.user_id=? ORDER BY r.created_at DESC LIMIT 6
  `).all(uid);

  // Tiến độ theo môn đã học
  const subjects = db.prepare(`
    SELECT s.id, s.name, s.icon,
           COUNT(r.id) attempts, AVG(r.score) avg
    FROM Subjects s LEFT JOIN ExamResults r ON r.subject_id=s.id AND r.user_id=?
    GROUP BY s.id HAVING attempts > 0 ORDER BY attempts DESC
  `).all(uid).map(r => ({ ...r, avg: r.avg ? Math.round(r.avg * 10) / 10 : 0 }));

  // Chủ đề còn yếu (toàn bộ môn)
  const weak = db.prepare(`
    SELECT k.topic, k.mastery, s.name subject
    FROM KnowledgeAnalysis k JOIN Subjects s ON s.id=k.subject_id
    WHERE k.user_id=? AND k.attempts>0 AND k.mastery < 0.5
    ORDER BY k.mastery ASC LIMIT 6
  `).all(uid).map(r => ({ ...r, mastery: Math.round(r.mastery * 100) }));

  // Xu hướng điểm theo thời gian (10 lượt gần nhất, tăng dần)
  const trend = db.prepare(`
    SELECT score, created_at FROM ExamResults WHERE user_id=?
    ORDER BY created_at DESC LIMIT 10
  `).all(uid).reverse();

  res.json({
    stats: {
      avgScore,
      accuracy,
      attempts: agg.total_attempts || 0,
      questions: agg.total_questions || 0,
    },
    recent, subjects, weak, trend,
  });
});

// Phân tích lỗ hổng theo môn
router.get('/gaps/:subjectId', (req, res) => {
  const a = analyzeUser(req.user.id, Number(req.params.subjectId));
  res.json(a);
});

// Lộ trình học theo môn
router.get('/plan/:subjectId', (req, res) => {
  const plan = buildStudyPlan(req.user.id, Number(req.params.subjectId));
  res.json(plan);
});

export default router;
