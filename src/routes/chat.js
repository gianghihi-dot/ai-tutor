// ============================================================
//  src/routes/chat.js — AI Chat Tutor (dùng Groq)
//  Ưu tiên gọi LLM thật (Groq); nếu lỗi → engine luật dự phòng.
// ============================================================
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from './_auth-middleware.js';
import { normalize } from '../engine/grading.js';
import { analyzeUser } from '../engine/analysis.js';

const router = Router();
router.use(requireAuth);

function buildUserContext(uid) {
  const subjects = db.prepare('SELECT id, name FROM Subjects').all();
  const weak = [];
  subjects.forEach(s => {
    const a = analyzeUser(uid, s.id);
    a.weak.slice(0, 2).forEach(w =>
      weak.push(`${s.name} — ${w.topic} (thành thạo ${Math.round(w.mastery * 100)}%)`));
  });
  return weak;
}

async function answerFromLLM(uid, message) {
  const apiKey = process.env.GROQ_API_KEY;
  console.log('[CHAT] Có GROQ_API_KEY?', apiKey ? `CÓ (dài ${apiKey.length} ký tự)` : 'KHÔNG');
  if (!apiKey) return null;

  const weak = buildUserContext(uid);
  const contextLine = weak.length
    ? `Ngữ cảnh: học viên đang yếu các chủ đề: ${weak.join('; ')}.`
    : 'Ngữ cảnh: chưa có dữ liệu điểm yếu của học viên.';

  const systemPrompt =
    'Bạn là gia sư Kinh tế thân thiện, giảng bằng tiếng Việt, dễ hiểu, ngắn gọn nhưng đủ ý, ' +
    'có ví dụ minh hoạ khi cần. Chỉ trả lời trong phạm vi kinh tế học. ' + contextLine;

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.6,
      }),
    });

    console.log('[CHAT] Groq HTTP status:', resp.status);
    const data = await resp.json();

    if (!resp.ok) {
      console.error('[CHAT] Groq báo lỗi:', JSON.stringify(data).slice(0, 500));
      return null;
    }
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      console.error('[CHAT] Groq không trả về text:', JSON.stringify(data).slice(0, 500));
      return null;
    }
    console.log('[CHAT] Groq trả lời OK.');
    return { reply: text.trim(), refs: [] };
  } catch (e) {
    console.error('[CHAT] Lỗi gọi Groq:', e.message);
    return null;
  }
}

function answerFromKnowledge(uid, message) {
  const norm = normalize(message);
  if (/(yeu|lo hong|kem|can on|hong)/.test(norm)) {
    const weak = buildUserContext(uid).map(l => `• ${l}`);
    if (weak.length)
      return { reply: `Dựa trên lịch sử làm bài, đây là những chủ đề bạn nên ưu tiên ôn:\n${weak.join('\n')}\n\nBạn muốn mình tạo bộ câu hỏi luyện riêng cho chủ đề nào không?`, refs: [] };
    return { reply: 'Mình chưa thấy lỗ hổng rõ rệt — bạn hãy làm thêm vài bài khảo sát/luyện tập để mình phân tích chính xác hơn nhé.', refs: [] };
  }
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
  return {
    reply: 'Mình là gia sư Kinh tế của bạn. Bạn có thể hỏi mình về một khái niệm (ví dụ: "độ co giãn của cầu", "GDP", "lợi thế so sánh"), nhờ mình giải thích vì sao một câu sai, hoặc hỏi "mình đang yếu phần nào".',
    refs: [],
  };
}

router.post('/', async (req, res) => {
  const { message } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ error: 'Tin nhắn trống.' });
  const msg = message.trim();
  const llm = await answerFromLLM(req.user.id, msg);
  const result = llm || answerFromKnowledge(req.user.id, msg);
  res.json(result);
});

export default router;
