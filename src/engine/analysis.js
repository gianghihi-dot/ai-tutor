// ============================================================
//  src/engine/analysis.js — Phân tích lỗ hổng & lộ trình học
// ============================================================
import { db } from '../db.js';

// Cập nhật bảng KnowledgeAnalysis sau mỗi câu trả lời
//  detail: [{ topic, correct }]
export function updateMastery(userId, subjectId, detail) {
  const upsert = db.prepare(`
    INSERT INTO KnowledgeAnalysis (user_id, subject_id, topic, attempts, correct, mastery, streak_wrong, updated_at)
    VALUES (@user_id, @subject_id, @topic, 1, @c, @c, @sw, strftime('%s','now'))
    ON CONFLICT(user_id, subject_id, topic) DO UPDATE SET
      attempts = attempts + 1,
      correct  = correct + @c,
      streak_wrong = CASE WHEN @c = 1 THEN 0 ELSE streak_wrong + 1 END,
      mastery  = (correct + @c) * 1.0 / (attempts + 1),
      updated_at = strftime('%s','now')
  `);
  const tx = db.transaction(() => {
    detail.forEach(d => {
      if (!d.topic) return;
      upsert.run({ user_id: userId, subject_id: subjectId, topic: d.topic,
        c: d.correct ? 1 : 0, sw: d.correct ? 0 : 1 });
    });
  });
  tx();
}

// Phân tích toàn bộ: trả về điểm mạnh, điểm yếu, mastery theo chương
export function analyzeUser(userId, subjectId) {
  const topics = db.prepare(
    `SELECT topic, attempts, correct, mastery, streak_wrong
     FROM KnowledgeAnalysis WHERE user_id=? AND subject_id=? AND attempts > 0
     ORDER BY mastery ASC`
  ).all(userId, subjectId);

  const weak = topics.filter(t => t.mastery < 0.5);
  const strong = topics.filter(t => t.mastery >= 0.8);

  // Mastery theo chương (gộp các chủ đề có trong chương qua bảng Questions)
  const chapters = db.prepare(
    `SELECT id, name FROM Chapters WHERE subject_id=? ORDER BY ord`
  ).all(subjectId);

  const chapterMastery = chapters.map(ch => {
    const topicsInCh = db.prepare(
      `SELECT DISTINCT topic FROM Questions WHERE chapter_id=?`
    ).all(ch.id).map(r => r.topic);
    const rel = topics.filter(t => topicsInCh.includes(t.topic));
    const avg = rel.length ? rel.reduce((s, t) => s + t.mastery, 0) / rel.length : null;
    return { chapter_id: ch.id, name: ch.name, mastery: avg, attempted: rel.length > 0 };
  });

  return { topics, weak, strong, chapterMastery };
}

// Khuyến nghị hành động khi sai liên tiếp / làm tốt (mô tả cho UI)
export function recommendation(topicStat) {
  if (!topicStat) return null;
  if (topicStat.streak_wrong >= 2) {
    return { action: 'reduce', text: `Bạn đang gặp khó ở "${topicStat.topic}". Hệ thống sẽ giảm độ khó, kèm giải thích chi tiết và bài tập bổ trợ.` };
  }
  if (topicStat.mastery >= 0.8) {
    return { action: 'advance', text: `Bạn làm rất tốt chủ đề "${topicStat.topic}". Hệ thống sẽ tăng độ khó và bổ sung câu hỏi vận dụng.` };
  }
  return null;
}

// Xây dựng lộ trình học thích ứng 7 bước, cập nhật trạng thái theo dữ liệu
export function buildStudyPlan(userId, subjectId) {
  const a = analyzeUser(userId, subjectId);
  const hasSurvey = db.prepare(
    `SELECT COUNT(*) c FROM ExamResults WHERE user_id=? AND subject_id=? AND mode='survey'`
  ).get(userId, subjectId).c > 0;
  const practiceCount = db.prepare(
    `SELECT COUNT(*) c FROM ExamResults WHERE user_id=? AND subject_id=? AND mode='practice'`
  ).get(userId, subjectId).c;
  const examCount = db.prepare(
    `SELECT COUNT(*) c FROM ExamResults WHERE user_id=? AND subject_id=? AND mode='exam'`
  ).get(userId, subjectId).c;
  const avgMastery = a.topics.length
    ? a.topics.reduce((s, t) => s + t.mastery, 0) / a.topics.length : 0;

  const steps = [
    { id: 1, title: 'Đánh giá đầu vào', desc: 'Làm bài khảo sát năng lực để xác định trình độ.',
      done: hasSurvey },
    { id: 2, title: 'Ôn tập kiến thức nền', desc: 'Củng cố khái niệm cốt lõi của môn học.',
      done: hasSurvey && avgMastery >= 0.3 },
    { id: 3, title: 'Luyện tập theo chủ đề', desc: 'Luyện từng chương với độ khó cá nhân hoá.',
      done: practiceCount >= 2 },
    { id: 4, title: 'Củng cố phần còn yếu', desc: a.weak.length
        ? `Tập trung: ${a.weak.slice(0, 3).map(w => w.topic).join(', ')}.`
        : 'Chưa phát hiện lỗ hổng đáng kể.',
      done: a.weak.length === 0 && practiceCount >= 2 },
    { id: 5, title: 'Luyện đề tổng hợp', desc: 'Làm các bộ câu hỏi tổng hợp nhiều chương.',
      done: practiceCount >= 4 },
    { id: 6, title: 'Thi mô phỏng', desc: 'Thi giả lập có đếm giờ như phòng thi thật.',
      done: examCount >= 1 },
    { id: 7, title: 'Báo cáo tiến độ', desc: 'Xem phân tích và lỗ hổng để hoàn thiện.',
      done: examCount >= 1 && avgMastery >= 0.7 },
  ];
  const progress = Math.round(steps.filter(s => s.done).length / steps.length * 100);

  // Lưu/cập nhật lộ trình
  db.prepare(`
    INSERT INTO StudyPlans (user_id, subject_id, steps, progress, updated_at)
    VALUES (?, ?, ?, ?, strftime('%s','now'))
    ON CONFLICT(user_id, subject_id) DO UPDATE SET
      steps=excluded.steps, progress=excluded.progress, updated_at=strftime('%s','now')
  `).run(userId, subjectId, JSON.stringify(steps), progress);

  return { steps, progress };
}
