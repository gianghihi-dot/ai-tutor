// ============================================================
//  js/ui.js — Tiện ích giao diện dùng chung
// ============================================================

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s = '') {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---- Toast ----
export function toast(message, type = '') {
  const wrap = $('#toast-wrap');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(20px)'; }, 3200);
  setTimeout(() => el.remove(), 3600);
}

// ---- Modal ----
export function modal(html) {
  const overlay = $('#overlay');
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.classList.remove('hidden');
  const close = () => overlay.classList.add('hidden');
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  return { close, root: overlay };
}
export function closeModal() { $('#overlay').classList.add('hidden'); }

// ---- Loading screen ----
export function loadingHTML(text = 'Đang tải…') {
  return `<div class="loading-screen"><div class="loader"></div><p>${esc(text)}</p></div>`;
}

// ---- Difficulty dots ----
export function diffDots(level) {
  return `<span class="diff-dots">${[1,2,3,4,5].map(i => `<i class="${i <= level ? 'on' : ''}"></i>`).join('')}</span>`;
}

// ---- Nhãn loại câu hỏi ----
export const TYPE_LABEL = {
  mcq: 'Trắc nghiệm', truefalse: 'Đúng/Sai', matching: 'Ghép cặp', fill: 'Điền khuyết', essay: 'Tự luận',
};

// ---- Bar chart (CSS) ----
export function barChart(items) { // items: [{label, value, max}]
  const max = Math.max(...items.map(i => i.max ?? i.value), 1);
  return `<div class="barchart">${items.map(i => `
    <div class="bar-col">
      <span class="bar-val">${i.display ?? i.value}</span>
      <div class="bar" style="height:${Math.max(4, (i.value / max) * 100)}%"></div>
      <span class="bar-label">${esc(i.label)}</span>
    </div>`).join('')}</div>`;
}

// ---- Line chart (SVG) ----
export function lineChart(values) {
  if (!values.length) return '<p class="muted">Chưa có dữ liệu.</p>';
  const W = 600, H = 150, pad = 16;
  const max = 10, min = 0;
  const step = values.length > 1 ? (W - pad * 2) / (values.length - 1) : 0;
  const pts = values.map((v, i) => {
    const x = pad + i * step;
    const y = H - pad - ((v - min) / (max - min)) * (H - pad * 2);
    return [x, y];
  });
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length-1][0].toFixed(1)},${H-pad} L${pts[0][0].toFixed(1)},${H-pad} Z`;
  return `<svg class="linechart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7c5cff"/><stop offset="100%" stop-color="#7c5cff" stop-opacity="0"/>
    </linearGradient></defs>
    <path class="area" d="${area}"/>
    <path class="line" d="${line}"/>
    ${pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3"/>`).join('')}
  </svg>`;
}

// ---- Định dạng thời gian ----
export function timeAgo(sec) {
  const diff = Math.floor(Date.now() / 1000) - sec;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff/60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff/3600)} giờ trước`;
  return new Date(sec * 1000).toLocaleDateString('vi-VN');
}

export function masteryChip(pct) {
  const cls = pct >= 70 ? 'good' : pct >= 40 ? 'warn' : 'bad';
  return `<span class="chip ${cls}">${pct}%</span>`;
}
