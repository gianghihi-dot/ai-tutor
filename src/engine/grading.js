// ============================================================
//  src/engine/grading.js — Chấm điểm tự động
//  Hỗ trợ: mcq | truefalse | matching | fill | essay
//  Phần chấm tự luận dùng heuristic; có HOOK để thay bằng LLM thật.
// ============================================================

// Chuẩn hoá chuỗi: bỏ dấu, viết thường, gọn khoảng trắng
export function normalize(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // bỏ dấu tiếng Việt
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ----- Chấm câu hỏi đóng (trả về {correct, score 0..1}) -----
export function gradeObjective(question, payload, userAnswer) {
  switch (question.type) {
    case 'mcq':
    case 'truefalse': {
      const key = question.type === 'mcq' ? payload.answer : payload.answer;
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
      // userAnswer: mảng chỉ số bên phải đã ghép, so với payload.answer
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

// ----- Chấm tự luận bằng heuristic -----
//  Tiêu chí: độ phủ từ khoá (ý chính), độ dài/đầy đủ, cấu trúc lập luận.
//  >>> HOOK LLM: thay hàm này bằng lời gọi API mô hình ngôn ngữ để
//      chấm chính xác hơn (trả về cùng cấu trúc {score, feedback}).
export function gradeEssay(question, payload, answer = '') {
  const text = normalize(answer);
  const words = text ? text.split(' ').filter(Boolean) : [];
  const keywords = (payload.keywords || []).map(normalize);

  // 1) Độ phủ ý chính (40%)
  const matched = keywords.filter(k => k && text.includes(k));
  const coverage = keywords.length ? matched.length / keywords.length : 0;

  // 2) Độ đầy đủ theo độ dài (30%) — đạt trần ở ~60 từ
  const fullness = Math.min(1, words.length / 60);

  // 3) Lập luận: có từ nối logic + nhiều câu (30%)
  const connectors = ['vi', 'do', 'nen', 'tuy nhien', 'boi', 'dan den', 'vi vay',
                      'do do', 'mat khac', 'ngoai ra', 'thu nhat', 'thu hai', 'ket luan'];
  const sentenceCount = (answer.match(/[.!?…]/g) || []).length + 1;
  const connectorHit = connectors.filter(c => text.includes(c)).length;
  const reasoning = Math.min(1, (connectorHit / 3) * 0.6 + Math.min(1, sentenceCount / 4) * 0.4);

  const raw = coverage * 0.4 + fullness * 0.3 + reasoning * 0.3;
  const score = Math.round(raw * 100) / 100; // 0..1

  // Gợi ý cải thiện
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
      logic: Math.round(reasoning * 100),         // tính logic (%)
      completeness: Math.round(coverage * 100),    // độ đầy đủ ý (%)
      depth: Math.round(fullness * 100),           // chiều sâu (%)
      missing_points: missing,                     // ý còn thiếu (dạng từ khoá)
      suggestions,
      sample: payload.sample || '',
    },
  };
}

// Điểm chữ từ thang 10
export function letterGrade(score10) {
  if (score10 >= 9) return 'A+';
  if (score10 >= 8) return 'A';
  if (score10 >= 7) return 'B+';
  if (score10 >= 6) return 'B';
  if (score10 >= 5) return 'C';
  if (score10 >= 4) return 'D';
  return 'F';
}
