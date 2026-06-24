// ============================================================
//  src/engine/grading.js — Chấm điểm tự động
//  Hỗ trợ: mcq | truefalse | matching | fill | essay
//  Tự luận: ưu tiên chấm bằng AI (Groq), lỗi thì dùng heuristic.
// ============================================================

export function normalize(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function gradeObjective(question, payload, userAnswer) {
  switch (question.type) {
    case 'mcq':
    case 'truefalse': {
      const key = payload.answer;
      const ok = String(userAnswer) === String(key);
      return { correct: ok, score: ok ? 1 : 0 };
    }
    case 'fill': {
      const ua = normalize(userAnswer);
      const accepts = [...(payload.answer || []), ...(payload.accept || [])].map(normalize);
      const ok = accepts.some(a => a && (ua === a || ua.includes(a)));
      return { correct: ok, score: ok ? 1 : 0 };
    }
    case 'matching': {
      const key = payload.answer || [];
      const arr = Array.isArray(userAnswer) ? userAnswer : [];
      let hit = 0;
      key.forEach((k, idx) => { if (String(arr[idx]) === String(k)) hit++; });
      const ratio = key.length ? hit / key.length : 0;
      return { correct: ratio === 1, score: ratio };
    }
    default:
      return { correct: false, score: 0 };
  }
}

// ----- Chấm tự luận bằng heuristic (DỰ PHÒNG) -----
export function gradeEssay(question, payload, answer = '') {
  const text = normalize(answer);
  const words = text ? text.split(' ').filter(Boolean) : [];
  const keywords = (payload.keywords || []).map(normalize);

  const matched = keywords.filter(k => k && text.includes(k));
  const coverage = keywords.length ? matched.length / keywords.length : 0;
  const fullness = Math.min(1, words.length / 60);

  const connectors = ['vi', 'do', 'nen', 'tuy nhien', 'boi', 'dan den', 'vi vay',
                      'do do', 'mat khac', 'ngoai ra', 'thu nhat', 'thu hai', 'ket luan'];
  const sentenceCount = (answer.match(/[.!?…]/g) || []).length + 1;
  const connectorHit = connectors.filter(c => text.includes(c)).length;
  const reasoning = Math.min(1, (connectorHit / 3) * 0.6 + Math.min(1, sentenceCount / 4) * 0.4);

  const raw = coverage * 0.4 + fullness * 0.3 + reasoning * 0.3;
  const score = Math.round(raw * 100) / 100;

  const missing = keywords.filter(k => !text.includes(k));
  const suggestions = [];
  if (coverage < 0.6) suggestions.push('Bổ sung các ý cốt lõi còn thiếu để bài đầy đủ hơn.');
  if (fullness < 0.5) suggestions.push('Bài còn ngắn, hãy diễn giải và phân tích sâu hơn.');
  if (reasoning < 0.5) suggestions.push('Thêm từ nối logic (vì, do đó, dẫn đến...) và lập luận mạch lạc theo từng ý.');
  if (suggestions.length === 0) suggestions.push('Bài làm tốt, có thể bổ sung ví dụ minh hoạ để xuất sắc hơn.');

  return {
    correct: score >= 0.5,
    score,
    feedback: {
      logic: Math.round(reasoning * 100),
      completeness: Math.round(coverage * 100),
      depth: Math.round(fullness * 100),
      missing_points: missing,
      suggestions,
      sample: payload.sample || '',
    },
  };
}

// ----- Chấm tự luận bằng AI (Groq) -----
//  Trả về cùng cấu trúc với gradeEssay. Lỗi → trả null để fallback.
export async function gradeEssayAI(question, payload, answer = '') {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !answer || !answer.trim()) return null;

  const prompt =
    `Bạn là giảng viên Kinh tế chấm bài tự luận. Hãy chấm bài làm của sinh viên một cách khách quan.\n\n` +
    `ĐỀ BÀI: ${question.stem}\n\n` +
    `ĐÁP ÁN MẪU / Ý CHÍNH CẦN CÓ: ${payload.sample || (payload.keywords || []).join(', ')}\n\n` +
    `BÀI LÀM CỦA SINH VIÊN: ${answer}\n\n` +
    `Hãy trả về DUY NHẤT một đối tượng JSON (không kèm giải thích, không kèm dấu \`\`\`), theo đúng định dạng:\n` +
    `{"score": <số thực 0..1>, "logic": <0..100>, "completeness": <0..100>, "depth": <0..100>, ` +
    `"missing_points": ["ý còn thiếu 1","ý còn thiếu 2"], "suggestions": ["gợi ý 1","gợi ý 2"]}\n` +
    `Trong đó score là điểm tổng (0=sai hoàn toàn, 1=xuất sắc), logic=tính mạch lạc, completeness=độ đầy đủ ý, depth=chiều sâu phân tích.`;

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });
    if (!resp.ok) {
      console.error('[ESSAY-AI] Groq lỗi:', resp.status);
      return null;
    }
    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    let score = Number(parsed.score);
    if (!isFinite(score)) return null;
    score = Math.max(0, Math.min(1, score));
    score = Math.round(score * 100) / 100;

    console.log('[ESSAY-AI] Chấm AI OK, score =', score);
    return {
      correct: score >= 0.5,
      score,
      feedback: {
        logic: Math.round(Number(parsed.logic) || score * 100),
        completeness: Math.round(Number(parsed.completeness) || score * 100),
        depth: Math.round(Number(parsed.depth) || score * 100),
        missing_points: Array.isArray(parsed.missing_points) ? parsed.missing_points : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        sample: payload.sample || '',
      },
    };
  } catch (e) {
    console.error('[ESSAY-AI] Lỗi:', e.message);
    return null;
  }
}

export function letterGrade(score10) {
  if (score10 >= 9) return 'A+';
  if (score10 >= 8) return 'A';
  if (score10 >= 7) return 'B+';
  if (score10 >= 6) return 'B';
  if (score10 >= 5) return 'C';
  if (score10 >= 4) return 'D';
  return 'F';
}
