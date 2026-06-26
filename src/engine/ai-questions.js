// ============================================================
//  src/engine/ai-questions.js — Sinh câu hỏi trắc nghiệm bằng AI (Groq)
//  AI tạo → kiểm tra định dạng kỹ → lưu DB. Lỗi thì trả [] để bù từ kho.
// ============================================================
import { db } from '../db.js';

export async function generateAIQuestions({ subjectId, chapterId = null, difficulty = 3, count = 5 }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || count <= 0) return [];

  const subject = db.prepare('SELECT name FROM Subjects WHERE id=?').get(subjectId);
  if (!subject) return [];

  // Xác định chương để gán câu hỏi.
  // Nếu không chọn chương cụ thể → gán vào chương đầu tiên của môn (vì DB yêu cầu chapter_id).
  let targetChapterId = chapterId;
  let chapterName = 'tổng hợp các chương';
  let topicHint = '';
  if (chapterId) {
    const ch = db.prepare('SELECT name, summary FROM Chapters WHERE id=?').get(chapterId);
    if (ch) { chapterName = ch.name; topicHint = ch.summary || ''; }
  } else {
    const chs = db.prepare('SELECT id, name FROM Chapters WHERE subject_id=? ORDER BY ord').all(subjectId);
    if (chs.length) {
      targetChapterId = chs[0].id; // gán tạm vào chương đầu
      topicHint = chs.map(c => c.name).join(', ');
    }
  }
  // Nếu môn không có chương nào thì không thể lưu → thoát an toàn
  if (!targetChapterId) return [];

  const prompt =
    `Bạn là giảng viên ra đề môn "${subject.name}" (ngành Kinh tế). ` +
    `Hãy soạn ${count} câu hỏi TRẮC NGHIỆM bằng tiếng Việt về chủ đề: ${chapterName}. ` +
    (topicHint ? `Phạm vi kiến thức: ${topicHint}. ` : '') +
    `Độ khó khoảng mức ${difficulty}/5. ` +
    `Mỗi câu có đúng 4 lựa chọn, chỉ 1 đáp án đúng. ` +
    `Trả về DUY NHẤT một JSON (không kèm chữ thừa, không kèm \`\`\`) dạng:\n` +
    `{"questions":[{"stem":"đề bài","options":["A","B","C","D"],"answer":<chỉ số đáp án đúng 0-3>,` +
    `"explanation":"giải thích ngắn","topic":"chủ đề ngắn gọn"}]}`;

  let parsed;
  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });
    if (!resp.ok) { console.error('[AI-Q] Groq lỗi:', resp.status); return []; }
    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return [];
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error('[AI-Q] Lỗi gọi/parse:', e.message);
    return [];
  }

  const list = Array.isArray(parsed?.questions) ? parsed.questions : [];
  if (!list.length) return [];

  const insQ = db.prepare(
    `INSERT INTO Questions (subject_id, chapter_id, type, difficulty, stem, payload, explanation, topic)
     VALUES (@subject_id, @chapter_id, 'mcq', @difficulty, @stem, @payload, @explanation, @topic)`
  );

  const ids = [];
  for (const q of list) {
    if (!q || typeof q.stem !== 'string' || !q.stem.trim()) continue;
    if (!Array.isArray(q.options) || q.options.length !== 4) continue;
    if (q.options.some(o => typeof o !== 'string' || !o.trim())) continue;
    const ans = Number(q.answer);
    if (!Number.isInteger(ans) || ans < 0 || ans > 3) continue;

    try {
      const info = insQ.run({
        subject_id: subjectId,
        chapter_id: targetChapterId,
        difficulty: Math.max(1, Math.min(5, Number(difficulty) || 3)),
        stem: q.stem.trim(),
        payload: JSON.stringify({ options: q.options.map(o => o.trim()), answer: ans }),
        explanation: (typeof q.explanation === 'string' ? q.explanation.trim() : '') || 'Câu hỏi do AI sinh.',
        topic: (typeof q.topic === 'string' && q.topic.trim()) ? q.topic.trim() : chapterName,
      });
      ids.push(info.lastInsertRowid);
    } catch (e) {
      console.error('[AI-Q] Lỗi lưu câu:', e.message);
    }
  }

  console.log(`[AI-Q] Đã sinh ${ids.length}/${count} câu cho môn ${subject.name}.`);
  return ids;
}
