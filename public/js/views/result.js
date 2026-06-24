// ============================================================
//  js/views/result.js — Hiển thị kết quả & phân tích sau khi nộp
// ============================================================
import { esc, TYPE_LABEL } from '../ui.js';

export function renderResult(r) {
  const pct = Math.round(r.score * 10);
  const recHtml = (r.recommendations && r.recommendations.length)
    ? `<div class="card" style="margin-top:1rem">
         <h4 class="card-title">Điều chỉnh thích ứng</h4>
         ${r.recommendations.map(x => `<p class="muted" style="margin-top:.4rem">↳ ${esc(x.text)}</p>`).join('')}
       </div>` : '';

  const tags = [];
  if (r.strengths?.length) tags.push(`<div><span class="chip good">Điểm mạnh</span> ${r.strengths.map(esc).join(', ')}</div>`);
  if (r.weaknesses?.length) tags.push(`<div style="margin-top:.5rem"><span class="chip bad">Cần ôn</span> ${r.weaknesses.map(esc).join(', ')}</div>`);

  return `
    <div class="card">
      <div class="result-banner">
        <div class="score-ring" style="--p:${pct}">
          <div class="s-val">${r.score}<small>/10</small></div>
        </div>
        <div style="flex:1;min-width:220px">
          <h3>Kết quả: ${r.grade}</h3>
          <p class="muted">Đúng ${r.correct}/${r.total} câu · Tỷ lệ ${pct}%</p>
          <div style="margin-top:.7rem">${tags.join('')}</div>
        </div>
      </div>
    </div>
    ${recHtml}
    <div class="section-head"><h3>Xem lại & giải thích</h3></div>
    ${r.detail.map((d, i) => reviewCard(d, i)).join('')}
  `;
}

function reviewCard(d, i) {
  const ok = d.correct;
  const badge = d.type === 'essay'
    ? `<span class="chip ${d.score >= .5 ? 'good' : 'warn'}">${Math.round(d.score*10)}/10 điểm</span>`
    : `<span class="chip ${ok ? 'good' : 'bad'}">${ok ? '✓ Đúng' : '✗ Sai'}</span>`;

  let body = '';
  if (d.type === 'mcq') {
    body = d.options.map((o, idx) => {
      let cls = '';
      if (idx === d.answerKey) cls = 'correct';
      else if (idx === d.userAnswer) cls = 'wrong';
      return `<div class="opt ${cls}"><span>${esc(o)}</span></div>`;
    }).join('');
  } else if (d.type === 'truefalse') {
    const ua = d.userAnswer === true ? 'Đúng' : d.userAnswer === false ? 'Sai' : '(bỏ trống)';
    body = `<p class="muted">Bạn chọn: <b>${ua}</b> · Đáp án: <b style="color:var(--good)">${d.answerKey ? 'Đúng' : 'Sai'}</b></p>`;
  } else if (d.type === 'fill') {
    body = `<p class="muted">Bạn trả lời: <b>${esc(d.userAnswer || '(trống)')}</b> · Đáp án: <b style="color:var(--good)">${esc(d.answerKey)}</b></p>`;
  } else if (d.type === 'matching') {
    body = d.left.map((l, idx) => {
      const correctRi = d.answerKey[idx];
      return `<div class="match-row" style="grid-template-columns:1fr auto 1fr">
        <div class="m-left">${esc(l)}</div><span class="arrow">→</span>
        <div class="m-left" style="border-color:var(--good)">${esc(d.right[correctRi])}</div>
      </div>`;
    }).join('');
  } else if (d.type === 'essay') {
    const f = d.feedback || {};
    body = `
      <div class="feedback-box">
        <p><b>Bài làm của bạn:</b></p>
        <p class="muted" style="margin:.3rem 0 .6rem">${esc(d.userAnswer || '(trống)')}</p>
        <div class="meters">
          ${meter('Tính logic', f.logic)}
          ${meter('Đầy đủ ý', f.completeness)}
          ${meter('Chiều sâu', f.depth)}
        </div>
        ${f.missing_points?.length ? `<p class="muted">Ý còn thiếu: ${f.missing_points.map(esc).join(', ')}</p>` : ''}
        ${f.suggestions?.length ? `<p style="margin-top:.4rem">💡 ${f.suggestions.map(esc).join(' ')}</p>` : ''}
        ${f.sample ? `<p style="margin-top:.6rem"><b>Gợi ý đáp án:</b> <span class="muted">${esc(f.sample)}</span></p>` : ''}
      </div>`;
  }

  return `<div class="q-card">
    <div class="q-head">
      <span class="q-num">Câu ${i + 1} · ${TYPE_LABEL[d.type]}</span>
      ${badge}
    </div>
    <div class="q-stem">${esc(d.stem)}</div>
    ${body}
    ${d.type !== 'essay' && d.explanation ? `<div class="feedback-box"><b>Giải thích:</b> ${esc(d.explanation)}</div>` : ''}
  </div>`;
}

function meter(label, val = 0) {
  const cls = val >= 70 ? 'var(--good)' : val >= 40 ? 'var(--warn)' : 'var(--bad)';
  return `<div class="meter">
    <div class="mlabel"><span>${label}</span><span>${val}%</span></div>
    <div class="progress"><i style="width:${val}%;background:${cls}"></i></div>
  </div>`;
}
