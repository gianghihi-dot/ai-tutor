// ============================================================
//  js/views/dashboard.js — Tổng quan
// ============================================================
import { api } from '../api.js';
import { state } from '../store.js';
import { esc, loadingHTML, lineChart, masteryChip, timeAgo, toast } from '../ui.js';

export async function renderDashboard(root, nav) {
  root.innerHTML = loadingHTML('Đang tổng hợp tiến độ học tập…');
  const data = await api.get('/analytics/dashboard');
  const s = data.stats;

  const hasData = s.attempts > 0;

  root.innerHTML = `
   <div class="hero">
      <h2>🔥 ${esc(state.user.full_name.split(' ').pop())} ơi, deadline điểm số đang tới gần đấy!</h2>
      <p>Đừng để nước tới chân mới nhảy 🐸 — AI Tutor giúp bạn học thông minh, không cày trâu: chấm bài tận tình, chỉ ra chỗ yếu, ra đề vô tận. Vào học liền tay nào! 💪</p>
      <button class="btn btn-primary" data-act="start">Bắt đầu học ngay ↗</button>
    </div>

    <div class="grid grid-4">
      ${statCard('Điểm trung bình', s.avgScore ? `${s.avgScore}<small>/10</small>` : '—', '◈', 'c1')}
      ${statCard('Tỷ lệ đúng', `${s.accuracy}<small>%</small>`, '✓', 'c2')}
      ${statCard('Bài đã làm', s.attempts, '✎', 'c3')}
      ${statCard('Số câu đã luyện', s.questions, '∑', 'c4')}
    </div>

    <div class="grid grid-2" style="margin-top:1.1rem">
      <div class="card">
        <div class="section-head" style="margin:0 0 .6rem"><h3>Xu hướng điểm số</h3></div>
        ${hasData ? lineChart(data.trend.map(t => t.score)) : emptyMini('Chưa có dữ liệu điểm.')}
      </div>
      <div class="card">
        <div class="section-head" style="margin:0 0 .6rem"><h3>Chủ đề còn yếu</h3></div>
        ${data.weak.length ? data.weak.map(w => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem 0;border-bottom:1px solid var(--border)">
            <div><b style="font-size:.92rem">${esc(w.topic)}</b><div class="muted" style="font-size:.78rem">${esc(w.subject)}</div></div>
            ${masteryChip(w.mastery)}
          </div>`).join('') : emptyMini('Tuyệt vời! Chưa phát hiện lỗ hổng đáng kể.')}
      </div>
    </div>

    <div class="section-head"><h3>Môn học</h3><span class="muted">${state.subjects.length} môn ngành Kinh tế</span></div>
    <div class="grid grid-3" id="subj-grid">
      ${state.subjects.map((s, i) => subjCard(s, i)).join('')}
    </div>

    <div class="section-head"><h3>Thành tích gần đây</h3></div>
    <div class="card">
      ${data.recent.length ? data.recent.map(r => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:.6rem 0;border-bottom:1px solid var(--border)">
          <div>
            <b style="font-size:.92rem">${esc(r.subject)}</b>
            <span class="chip" style="margin-left:.5rem">${modeLabel(r.mode)}</span>
            <div class="muted" style="font-size:.78rem">${timeAgo(r.created_at)} · ${r.correct}/${r.total} câu</div>
          </div>
          <b style="font-family:var(--font-display);font-size:1.1rem;color:var(--accent)">${r.score}<small style="color:var(--muted)">/10</small></b>
        </div>`).join('') : emptyMini('Chưa có hoạt động nào. Hãy bắt đầu bài học đầu tiên!')}
    </div>
  `;

  root.querySelector('[data-act="start"]').onclick = () => nav('practice');
  root.querySelectorAll('.subject-card').forEach(c => {
    c.onclick = () => {
      const sid = Number(c.dataset.sid);
      state.currentSubject = state.subjects.find(x => x.id === sid);
      nav('practice');
    };
  });
}

function statCard(label, value, ico, colorClass) {
  return `<div class="card stat stat-${colorClass}">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span class="label">${label}</span><span class="ico">${ico}</span>
    </div>
    <span class="value">${value}</span>
  </div>`;
}
function subjCard(s, i) {
  // Xoay vòng 4 màu theo thứ tự môn
  const tint = `tint-${(i % 4) + 1}`;
  return `<div class="card subject-card ${tint}" data-sid="${s.id}">
    <div class="s-ico">${s.icon || '◆'}</div>
    <b>${esc(s.name)}</b>
    <span class="muted" style="font-size:.84rem">${esc(s.description || '')}</span>
    <div class="meta"><span>${s.chapters} chương</span><span>${s.questions} câu hỏi</span></div>
  </div>`;
}
function modeLabel(m) { return { survey: 'Khảo sát', practice: 'Luyện tập', exam: 'Thi giả lập' }[m] || m; }
function emptyMini(t) { return `<p class="muted" style="padding:.8rem 0">${esc(t)}</p>`; }
