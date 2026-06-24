// ============================================================
//  src/engine/adaptive.js — Hệ thống học tập thích ứng
//  Chọn câu hỏi & điều chỉnh độ khó theo năng lực và mục tiêu điểm.
// ============================================================
import { db } from '../db.js';

// Bản đồ mục tiêu điểm → khoảng độ khó ưu tiên
const GOAL_DIFFICULTY = {
  C:        { min: 1, max: 3, center: 2 },
  'B+':     { min: 2, max: 4, center: 3 },
  A:        { min: 3, max: 5, center: 4 },
  improve:  { min: 1, max: 4, center: 2 }, // thi cải thiện: nền + nâng dần
};

// Lấy mức độ thành thạo của user theo từng chủ đề của môn
export function masteryByTopic(userId, subjectId) {
  const rows = db.prepare(
    `SELECT topic, mastery, streak_wrong, attempts, correct
     FROM KnowledgeAnalysis WHERE user_id=? AND subject_id=?`
  ).all(userId, subjectId);
  const map = {};
  rows.forEach(r => { map[r.topic] = r; });
  return map;
}

// Xác định độ khó mục tiêu cho một chủ đề cụ thể
//  - Sai liên tiếp → giảm độ khó
//  - Thành thạo cao → tăng độ khó
export function targetDifficulty(goal, topicStat) {
  const g = GOAL_DIFFICULTY[goal] || GOAL_DIFFICULTY['B+'];
  let center = g.center;
  if (topicStat) {
    if (topicStat.streak_wrong >= 2) center -= 1;       // hạ độ khó khi sai liên tiếp
    else if (topicStat.mastery >= 0.8) center += 1;     // nâng độ khó khi giỏi
    else if (topicStat.mastery <= 0.3) center -= 1;
  }
  return Math.max(g.min, Math.min(g.max, center));
}

// Sinh bộ câu hỏi luyện tập cá nhân hoá
//  options: { subjectId, chapterId?, goal, count, types? }
export function generatePractice(userId, options) {
  const { subjectId, chapterId, goal = 'B+', count = 8, types } = options;
  const mastery = masteryByTopic(userId, subjectId);

  // Lấy kho câu hỏi phù hợp phạm vi
  let sql = `SELECT * FROM Questions WHERE subject_id=?`;
  const params = [subjectId];
  if (chapterId) { sql += ` AND chapter_id=?`; params.push(chapterId); }
  if (types && types.length) {
    sql += ` AND type IN (${types.map(() => '?').join(',')})`;
    params.push(...types);
  }
  const pool = db.prepare(sql).all(...params);
  if (!pool.length) return [];

  // Tính điểm ưu tiên cho từng câu: gần độ khó mục tiêu + ưu tiên chủ đề yếu
  const scored = pool.map(qq => {
    const tStat = mastery[qq.topic];
    const targetD = targetDifficulty(goal, tStat);
    const diffGap = Math.abs(qq.difficulty - targetD);          // càng nhỏ càng tốt
    const weakBoost = tStat ? (1 - tStat.mastery) : 0.5;        // chủ đề yếu được ưu tiên
    const noise = Math.random() * 0.3;                          // tránh lặp đơn điệu
    const priority = weakBoost * 1.2 - diffGap * 0.5 + noise;
    return { qq, priority };
  });

  scored.sort((a, b) => b.priority - a.priority);
  return scored.slice(0, count).map(s => publicQuestion(s.qq));
}

// Ẩn đáp án trước khi gửi cho client (chống lộ đáp án)
export function publicQuestion(qq) {
  const payload = JSON.parse(qq.payload);
  const safe = { id: qq.id, type: qq.type, difficulty: qq.difficulty, stem: qq.stem, topic: qq.topic, chapter_id: qq.chapter_id };
  if (qq.type === 'mcq') safe.options = payload.options;
  if (qq.type === 'matching') {
    // Trộn thứ tự hiển thị vế phải nhưng vẫn chấm đúng nhờ keymap:
    // right_keymap[viShuffled] = chỉ số gốc trong payload.right
    safe.left = payload.left;
    const orig = payload.right;
    const idx = orig.map((_, i) => i);
    shuffle(idx);
    safe.right = idx.map(i => orig[i]);   // văn bản đã trộn
    safe.right_keymap = idx;              // vị trí hiển thị → chỉ số gốc (để chấm)
  }
  return safe;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
