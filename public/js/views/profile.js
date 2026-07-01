// ============================================================
//  js/views/profile.js — Hồ sơ cá nhân & lịch sử học tập
// ============================================================
import { api } from '../api.js';
import { state } from '../store.js';
import { esc, loadingHTML, toast, timeAgo, modal, closeModal } from '../ui.js';
import { renderResult } from './result.js';

const GOALS = [['C', 'Đạt (C)'], ['B+', 'Khá (B+)'], ['A', 'Giỏi (A)'], ['improve', 'Thi cải thiện']];
const MODE_LABEL = { survey: 'Khảo sát', practice: 'Luyện tập', exam: 'Thi giả lập' };

// Màu riêng cho 4 ô thống kê
const STAT_COLORS = [
  { border: '#f97316', bg: 'rgba(249,115,22,.08)' },
  { border: '#22c55e', bg: 'rgba(34,197,94,.08)'  },
  { border: '#3b82f6', bg: 'rgba(59,130,246,.08)' },
  { border: '#a855f7', bg: 'rgba(168,85,247,.08)' },
];

export async function renderProfile(root) {
  root.innerHTML = loadingHTML('Đang tải hồ sơ…');
  const [p, h] = await Promise.all([api.get('/profile'), api.get('/profile/history')]);
  const u = p.user, s = p.stats;
  let goal = u.goal || 'B+';

  // Avatar gradient theo chữ cái đầu
  const avatarLetter = (u.full_name || 'B')[0].toUpperCase();
  const avatarGradients = [
    'linear-gradient(135deg,#f97316,#ef4444)',
    'linear-gradient(135deg,#8b5cf6,#ec4899)',
    'linear-gradient(135deg,#06b6d4,#3b82f6)',
    'linear-gradient(135deg,#22c55e,#16a34a)',
  ];
  const avatarGrad = 'linear-gradient(135deg,#f472b6,#ec4899)';

  root.innerHTML = `
    <div class="grid grid-2">
      <div class="card" style="background:linear-gradient(135deg,rgba(139,92,246,.08),rgba(236,72,153,.04));border:1px solid rgba(139,92,246,.25)">
        <div class="section-head" style="margin:0 0 1rem"><h3>Thông tin cá nhân</h3></div>
        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.2rem">
          <div class="avatar" style="width:56px;height:56px;font-size:1.5rem;background:${avatarGrad};color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;box-shadow:0 4px 14px rgba(139,92,246,.35)">
            ${avatarLetter}
          </div>
          <div>
            <b style="font-size:1.1rem;font-family:var(--font-display)">${esc(u.full_name)}</b>
            <div class="muted" style="font-size:.85rem">${esc(u.email)}</div>
            <div class="muted" style="font-size:.78rem">Tham gia ${timeAgo(u.created_at)}</div>
          </div>
        </div>

        <div class="field">
          <label>Họ và tên</label>
          <input type="text" id="pf-name" value="${esc(u.full_name)}" />
        </div>
        <div class="field">
          <label>Mục tiêu điểm</label>
          <div class="goal-pills" id="pf-goals">
            ${GOALS.map(([v, l]) => `<div class="goal-pill ${v === goal ? 'active' : ''}" data-goal="${v}">${l}</div>`).join('')}
          </div>
        </div>
        <button class="btn btn-primary" id="pf-save">Lưu thay đổi</button>
      </div>

      <div class="card" style="background:linear-gradient(135deg,rgba(59,130,246,.08),rgba(34,197,94,.04));border:1px solid rgba(59,130,246,.25)">
        <div class="section-head" style="margin:0 0 1rem"><h3>Thống kê học tập</h3></div>
        <div class="grid grid-2">
          ${miniStat('Bài đã làm',     s.attempts,                              0)}
          ${miniStat('Điểm trung bình', s.avgScore ? `${s.avgScore}/10` : '—', 1)}
          ${miniStat('Tỷ lệ đúng',     `${s.accuracy}%`,                       2)}
          ${miniStat('Mục tiêu',        GOALS.find(g => g[0] === goal)?.[1] || goal, 3)}
        </div>
      </div>
    </div>

    <div class="section-head"><h3>Lịch sử học tập</h3><span class="muted">${h.history.length} bài gần nhất</span></div>
    <div class="card">
      ${h.history.length ? h.history.map(r => `
        <div class="hist-row" data-id="${r.id}" style="display:flex;justify-content:space-between;align-items:center;padding:.65rem 0;border-bottom:1px solid var(--border);cursor:pointer">
          <div>
            <b style="font-size:.92rem">${esc(r.subject)}</b>
            <span class="chip" style="margin-left:.5rem">${MODE_LABEL[r.mode] || r.mode}</span>
            <div class="muted" style="font-size:.78rem">${timeAgo(r.created_at)} · ${r.correct}/${r.total} câu</div>
          </div>
          <b style="font-family:var(--font-display);font-size:1.05rem;color:var(--accent)">${r.score}<small style="color:var(--muted)">/10</small></b>
        </div>`).join('') :
        '<p class="muted" style="padding:.8rem 0">Chưa có bài làm nào. Hãy bắt đầu luyện tập!</p>'}
    </div>
  `;

  // Chọn mục tiêu
  root.querySelectorAll('#pf-goals .goal-pill').forEach(p => {
    p.onclick = () => {
      root.querySelectorAll('#pf-goals .goal-pill').forEach(x => x.classList.remove('active'));
      p.classList.add('active'); goal = p.dataset.goal;
    };
  });

  // Lưu hồ sơ
  root.querySelector('#pf-save').onclick = async () => {
    const fullName = root.querySelector('#pf-name').value.trim();
    try {
      const d = await api.put('/profile', { fullName, goal });
      state.user = { ...state.user, full_name: d.user.full_name, goal: d.user.goal };
      const nameEl = document.querySelector('#user-name');
      const avEl   = document.querySelector('#user-avatar');
      if (nameEl) nameEl.textContent = d.user.full_name.split(' ').pop();
      if (avEl)   avEl.textContent   = (d.user.full_name || 'B')[0].toUpperCase();
      toast('Đã lưu hồ sơ.', 'good');
    } catch (e) { toast(e.message, 'bad'); }
  };

  // Xem lại chi tiết một bài làm
  root.querySelectorAll('.hist-row').forEach(rowEl => {
    rowEl.onclick = async () => {
      const id = rowEl.dataset.id;
      const m = modal(loadingHTML('Đang tải bài làm…'));
      try {
        const r = await api.get(`/profile/result/${id}`);
        const view = {
          score: r.score, grade: letterGrade(r.score), correct: r.correct, total: r.total,
          detail: r.detail || [],
        };
        m.root.querySelector('.modal').innerHTML =
          `<button class="btn btn-ghost" id="m-close" style="float:right">Đóng</button>
           <h3 style="font-family:var(--font-display);margin-bottom:1rem">Xem lại bài làm</h3>
           ${renderResult(view)}`;
        m.root.querySelector('#m-close').onclick = closeModal;
      } catch (e) {
        toast(e.message, 'bad'); closeModal();
      }
    };
  });
}

function miniStat(label, value, colorIdx) {
  const c = STAT_COLORS[colorIdx];
  return `<div class="card stat" style="padding:1rem;border:1.5px solid ${c.border};background:${c.bg}">
    <span class="label">${label}</span>
    <span class="value" style="font-size:1.4rem">${value}</span>
  </div>`;
}

function letterGrade(score) {
  if (score >= 9) return 'A+';
  if (score >= 8) return 'A';
  if (score >= 7) return 'B+';
  if (score >= 6) return 'B';
  if (score >= 5) return 'C';
  if (score >= 4) return 'D';
  return 'F';
}
