// ============================================================
//  src/routes/chat.js — AI Chat Tutor
//  Trả lời dựa trên kho kiến thức (giải thích câu hỏi, khái niệm)
//  + dữ liệu học tập của user. Có HOOK để gắn LLM thật.
// ============================================================
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from './_auth-middleware.js';
import { normalize } from '../engine/grading.js';
import { analyzeUser } from '../engine/analysis.js';

const router = Router();
router.use(requireAuth);

// >>> HOOK LLM: để dùng mô hình ngôn ngữ thật, thay thân hàm này bằng
//     lời gọi API (truyền message + ngữ cảnh học tập của user làm prompt)
//     và trả về { reply, refs }.
function answerFromKnowledge(uid, message) {
  const norm = normalize(message);

  // 1) Câu hỏi về tiến độ / điểm yếu của chính mình
  if (/(yeu|lo hong|kem|can on|hong)/.test(norm)) {
    const subjects = db.prepare('SELECT id, name FROM Subjects').all();
    const weakLines = [];
    subjects.forEach(s => {
      const a = analyzeUser(uid, s.id);
      a.weak.slice(0, 2).forEach(w => weakLines.push(`• ${s.name} — ${w.topic} (thành thạo ${Math.round(w.mastery * 100)}%)`));
    });
    if (weakLines.length)
      return { reply: `Dựa trên lịch sử làm bài, đây là những chủ đề bạn nên ưu tiên ôn:\n${weakLines.join('\n')}\n\nBạn muốn mình tạo bộ câu hỏi luyện riêng cho chủ đề nào không?`, refs: [] };
    return { reply: 'Mình chưa thấy lỗ hổng rõ rệt — bạn hãy làm thêm vài bài khảo sát/luyện tập để mình phân tích chính xác hơn nhé.', refs: [] };
  }

  // 2) Tìm khái niệm trùng khớp trong kho câu hỏi (theo topic / stem)
  const all = db.prepare('SELECT stem, explanation, topic FROM Questions').all();
  const scored = all.map(q => {
    const hay = normalize(`${q.topic} ${q.stem}`);
    const tokens = norm.split(' ').filter(w => w.length > 2);
    const hits = tokens.filter(t => hay.includes(t)).length;
    return { q, hits };
  }).filter(x => x.hits > 0).sort((a, b) => b.hits - a.hits);

  if (scored.length) {
    const top = scored.slice(0, 2);
    const reply = top.map(t => `**${t.q.topic}**\n${t.q.explanation}`).join('\n\n');
    return { reply, refs: top.map(t => t.q.topic) };
  }

  // 3) Mặc định
  return {
    reply: 'Mình là gia sư Kinh tế của bạn. Bạn có thể hỏi mình về một khái niệm (ví dụ: "độ co giãn của cầu", "GDP", "lợi thế so sánh"), nhờ mình giải thích vì sao một câu sai, hoặc hỏi "mình đang yếu phần nào".',
    refs: [],
  };
}

router.post('/', (req, res) => {
  const { message } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ error: 'Tin nhắn trống.' });
  const result = answerFromKnowledge(req.user.id, message.trim());
  res.json(result);
});

export default router;
