// ============================================================
//  src/routes/exams.js — Thi giả lập có đếm giờ
// ============================================================
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from './_auth-middleware.js';
import { publicQuestion } from '../engine/adaptive.js';
import { generateAIQuestions } from '../engine/ai-questions.js';
import { gradeSubmission } from './_grade-submission.js';

const router = Router();
router.use(requireAuth);

// Tạo đề thi theo cấu hình (ưu tiên sinh câu bằng AI, thiếu thì bù từ kho)
router.post('/create', async (req, res) => {
  const { subjectId, chapterId, difficulty, count = 10, duration = 30 } = req.body || {};
  if (!subjectId) return res.status(400).json({ error: 'Thiếu môn học.' });

  const subject = db.prepare('SELECT name FROM Subjects WHERE id=?').get(subjectId);
  if (!subject) return res.status(404).json({ error: 'Không tìm thấy môn học.' });

  const diff = difficulty || 3;
  // Đề thi: ~80% trắc nghiệm (ưu tiên AI) + ~20% tự luận (lấy từ kho)
  const nEssayWanted = Math.max(1, Math.round(count * 0.2));
  const nMcqWanted = count - nEssayWanted;

  // 1) Sinh câu trắc nghiệm bằng AI
  let mcqRows = [];
  try {
    const aiIds = await generateAIQuestions({ subjectId, chapterId: chapterId || null, difficulty: diff, count: nMcqWanted });
    if (aiIds.length) {
      const ph = aiIds.map(() => '?').join(',');
      mcqRows = db.prepare(`SELECT * FROM Questions WHERE id IN (${ph})`).all(...aiIds);
    }
  } catch (e) {
    console.error('[EXAM] Lỗi sinh AI:', e.message);
  }

  // 2) Bù trắc nghiệm còn thiếu từ kho
  if (mcqRows.length < nMcqWanted) {
    const need = nMcqWanted - mcqRows.length;
    const seen = new Set(mcqRows.map(r => r.id));
    let sql = "SELECT * FROM Questions WHERE subject_id=? AND type!='essay'";
    const params = [subjectId];
    if (chapterId) { sql += ' AND chapter_id=?'; params.push(chapterId); }
    if (difficulty) { sql += ' AND difficulty<=?'; params.push(difficulty); }
    sql += ' ORDER BY RANDOM()';
    const bank = db.prepare(sql).all(...params).filter(r => !seen.has(r.id));
    mcqRows = [...mcqRows, ...bank.slice(0, need)];
  }

  // 3) Lấy câu tự luận từ kho
  let essaySql = "SELECT * FROM Questions WHERE subject_id=? AND type='essay'";
  const essayParams = [subjectId];
  if (chapterId) { essaySql += ' AND chapter_id=?'; essayParams.push(chapterId); }
  essaySql += ' ORDER BY RANDOM()';
  const essays = db.prepare(essaySql).all(...essayParams).slice(0, nEssayWanted);

  const selected = [...mcqRows.slice(0, nMcqWanted), ...essays];
  if (!selected.length) return res.status(404).json({ error: 'Không đủ câu hỏi cho cấu hình này.' });

  const ids = selected.map(q => q.id);
  const info = db.prepare(
    `INSERT INTO Exams (user_id, subject_id, title, duration, question_ids) VALUES (?, ?, ?, ?, ?)`
  ).run(req.user.id, subjectId, `Đề thi ${subject.name}`, duration, JSON.stringify(ids));

  res.json({
    examId: info.lastInsertRowid,
    title: `Đề thi giả lập · ${subject.name}`,
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
