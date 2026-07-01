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

    <div class="card" id="about-card" style="margin-top:1.1rem;padding:1.2rem 1.4rem">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.8rem">
        <h3 style="margin:0">AI Tutor là gì?</h3>
        <span class="muted" style="font-size:.82rem">Nền tảng học tập thông minh cho sinh viên Kinh tế</span>
      </div>
      <p style="font-size:.92rem;line-height:1.65;margin-bottom:1rem;color:var(--muted)">
        🎓 AI Tutor là gia sư AI cá nhân hóa dành cho sinh viên khối ngành Kinh tế. Hệ thống sẽ giúp bạn đánh giá năng lực, tạo câu hỏi phù hợp với trình độ, chấm điểm tự động và phát hiện những chủ đề cần cải thiện. Từ đó, AI xây dựng lộ trình ôn tập thông minh, điều chỉnh độ khó theo kết quả học tập của chính bạn.
      </p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem;margin-bottom:1rem">
        <div style="padding:.8rem;border-radius:.6rem;border:1px solid var(--border);display:flex;flex-direction:column;gap:.3rem">
          <span style="width:1.6rem;height:1.6rem;border-radius:50%;background:var(--accent);color:#fff;font-size:.75rem;font-weight:700;display:flex;align-items:center;justify-content:center">1</span>
          <b style="font-size:.88rem">Khảo sát đầu vào</b>
          <span class="muted" style="font-size:.78rem">Chọn môn học và làm bài khảo sát ngắn để AI hiểu trình độ hiện tại của bạn.</span>
        </div>
        <div style="padding:.8rem;border-radius:.6rem;border:1px solid var(--border);display:flex;flex-direction:column;gap:.3rem">
          <span style="width:1.6rem;height:1.6rem;border-radius:50%;background:var(--accent);color:#fff;font-size:.75rem;font-weight:700;display:flex;align-items:center;justify-content:center">2</span>
          <b style="font-size:.88rem">Luyện tập thích ứng</b>
          <span class="muted" style="font-size:.78rem">Làm bài, được chấm và giải thích ngay — câu hỏi tiếp theo tự điều chỉnh độ khó theo năng lực.</span>
        </div>
        <div style="padding:.8rem;border-radius:.6rem;border:1px solid var(--border);display:flex;flex-direction:column;gap:.3rem">
          <span style="width:1.6rem;height:1.6rem;border-radius:50%;background:var(--accent);color:#fff;font-size:.75rem;font-weight:700;display:flex;align-items:center;justify-content:center">3</span>
          <b style="font-size:.88rem">Theo dõi tiến bộ</b>
          <span class="muted" style="font-size:.78rem">Xem phân tích lỗ hổng kiến thức và hỏi đáp trực tiếp với AI Chat Tutor bất cứ lúc nào.</span>
        </div>
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <span class="chip">✓ Chấm tự luận bằng AI</span>
        <span class="chip">✓ Thi giả lập có đếm giờ</span>
        <span class="chip">✓ Lộ trình học cá nhân hoá</span>
        <span class="chip">✓ Nhận diện chủ đề yếu</span>
      </div>
    </div>

    <div class="grid grid-4" style="margin-top:1.1rem">
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
