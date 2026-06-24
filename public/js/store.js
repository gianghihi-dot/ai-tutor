// ============================================================
//  js/store.js — Trạng thái ứng dụng + bộ render câu hỏi dùng chung
// ============================================================
import { esc, diffDots, TYPE_LABEL } from './ui.js';

export const state = {
  user: null,
  subjects: [],
  currentSubject: null,
};

// ---------- Render một câu hỏi ra HTML (dùng cho luyện tập & thi) ----------
export function renderQuestion(q, index) {
  let inner = '';
  if (q.type === 'mcq') {
    inner = q.options.map((o, i) => `
      <label class="opt" data-qid="${q.id}">
        <input type="radio" name="q${q.id}" value="${i}"> <span>${esc(o)}</span>
      </label>`).join('');
  } else if (q.type === 'truefalse') {
    inner = [['true','Đúng'],['false','Sai']].map(([v,l]) => `
      <label class="opt" data-qid="${q.id}">
        <input type="radio" name="q${q.id}" value="${v}"> <span>${l}</span>
      </label>`).join('');
  } else if (q.type === 'fill') {
    inner = `<input class="q-input" type="text" data-qid="${q.id}" placeholder="Nhập câu trả lời…">`;
  } else if (q.type === 'essay') {
    inner = `<textarea class="q-input" data-qid="${q.id}" placeholder="Viết câu trả lời của bạn… (nêu rõ các ý chính, lập luận mạch lạc)"></textarea>`;
  } else if (q.type === 'matching') {
    inner = q.left.map((l, i) => `
      <div class="match-row">
        <div class="m-left">${esc(l)}</div>
        <span class="arrow">→</span>
        <select data-qid="${q.id}" data-idx="${i}">
          <option value="">— chọn —</option>
          ${q.right.map((r, ri) => `<option value="${q.right_keymap ? q.right_keymap[ri] : ri}">${esc(r)}</option>`).join('')}
        </select>
      </div>`).join('');
  }

  return `<div class="q-card" id="qc-${q.id}">
    <div class="q-head">
      <span class="q-num">Câu ${index + 1}</span>
      <span style="display:flex;gap:.5rem;align-items:center">
        <span class="chip q-type-tag">${TYPE_LABEL[q.type]}</span>
        ${diffDots(q.difficulty)}
      </span>
    </div>
    <div class="q-stem">${esc(q.stem)}</div>
    <div class="q-body">${inner}</div>
  </div>`;
}

// Gắn tương tác chọn đáp án (highlight)
export function wireQuestionInteractions(root) {
  root.querySelectorAll('.opt input').forEach(inp => {
    inp.addEventListener('change', () => {
      const name = inp.name;
      root.querySelectorAll(`input[name="${name}"]`).forEach(o => o.closest('.opt').classList.remove('selected'));
      inp.closest('.opt').classList.add('selected');
    });
  });
}

// ---------- Thu thập câu trả lời từ DOM ----------
export function collectAnswers(questions, root) {
  return questions.map(q => {
    let answer = null;
    if (q.type === 'mcq' || q.type === 'truefalse') {
      const sel = root.querySelector(`input[name="q${q.id}"]:checked`);
      answer = sel ? (q.type === 'mcq' ? Number(sel.value) : sel.value === 'true') : null;
    } else if (q.type === 'fill' || q.type === 'essay') {
      const el = root.querySelector(`[data-qid="${q.id}"]`);
      answer = el ? el.value : '';
    } else if (q.type === 'matching') {
      const selects = root.querySelectorAll(`select[data-qid="${q.id}"]`);
      answer = [...selects].map(s => s.value === '' ? -1 : Number(s.value));
    }
    return { id: q.id, answer };
  });
}
