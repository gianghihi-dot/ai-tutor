// ============================================================
//  src/routes/_grade-submission.js — Chấm một lượt nộp bài
//  Dùng chung cho khảo sát, luyện tập và thi giả lập.
//  Tự luận: chấm bằng AI (Groq), lỗi thì dùng heuristic.
// ============================================================
import { db } from '../db.js';
import { gradeObjective, gradeEssay, gradeEssayAI, letterGrade } from '../engine/grading.js';
import { updateMastery, buildStudyPlan } from '../engine/analysis.js';

// answers: [{ id, answer }]
// mode: survey | practice | exam ; examId optional
export async function gradeSubmission(userId, subjectId, mode, answers, examId = null) {
  const detail = [];
  let correctCount = 0, totalScore = 0;
  const getQ = db.prepare('SELECT * FROM Questions WHERE id=?');

  for (const a of answers) {
    const qq = getQ.get(a.id);
    if (!qq) continue;
    const payload = JSON.parse(qq.payload);

    let graded;
    if (qq.type === 'essay') {
      // Ưu tiên chấm bằng AI; nếu lỗi/không có key thì dùng heuristic
      graded = await gradeEssayAI(qq, payload, a.answer) || gradeEssay(qq, payload, a.answer);
    } else {
      graded = gradeObjective(qq, payload, a.answer);
    }

    if (graded.correct) correctCount++;
    totalScore += graded.score;

    const item = {
      id: qq.id, type: qq.type, topic: qq.topic, stem: qq.stem,
      difficulty: qq.difficulty,
      correct: graded.correct, score: graded.score,
      userAnswer: a.answer,
      explanation: qq.explanation,
    };
    if (qq.type === 'mcq') { item.options = payload.options; item.answerKey = payload.answer; }
    else if (qq.type === 'truefalse') item.answerKey = payload.answer;
    else if (qq.type === 'fill') item.answerKey = (payload.answer || []).join(' / ');
    else if (qq.type === 'matching') { item.left = payload.left; item.right = payload.right; item.answerKey = payload.answer; }
    else if (qq.type === 'essay') item.feedback = graded.feedback;
    detail.push(item);
  }

  const total = detail.length || 1;
  const score10 = Math.round((totalScore / total) * 100) / 10;

  const info = db.prepare(`
    INSERT INTO ExamResults (user_id, subject_id, exam_id, mode, score, correct, total, detail)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, subjectId, examId, mode, score10, correctCount, detail.length, JSON.stringify(detail));
  const resultId = info.lastInsertRowid;

  const insEssay = db.prepare(`
    INSERT INTO Essays (result_id, user_id, question_id, answer, score, feedback)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  detail.filter(d => d.type === 'essay').forEach(d => {
    insEssay.run(resultId, userId, d.id, d.userAnswer || '', Math.round(d.score * 10 * 10) / 10, JSON.stringify(d.feedback));
  });

  updateMastery(userId, subjectId, detail.map(d => ({ topic: d.topic, correct: d.correct })));
  db.prepare(`INSERT INTO LearningHistory (user_id, subject_id, action, meta) VALUES (?, ?, ?, ?)`)
    .run(userId, subjectId, `${mode}_done`, JSON.stringify({ resultId, score10, correctCount, total: detail.length }));
  const plan = buildStudyPlan(userId, subjectId);

  return {
    resultId, mode, score: score10, grade: letterGrade(score10),
    correct: correctCount, total: detail.length, detail, plan,
  };
}
