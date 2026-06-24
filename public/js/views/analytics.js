// ============================================================
//  js/views/analytics.js — Module 4: Nhận diện lỗ hổng & lộ trình học
// ============================================================
import { api } from '../api.js';
import { state } from '../store.js';
import { esc, loadingHTML, barChart, masteryChip, toast } from '../ui.js';

export async function renderAnalytics(root) {
  root.innerHTML = loadingHTML('Đang tải dữ liệu…');
  if (!state.subjects.length) {
    const d = await api.get('/content/subjects');
    state.subjects = d.subjects;
  }

  const sid = state.currentSubject?.id || state.subjects[0]?.id;
  root.innerHTML = `
    <div class="card">
      <div class="section-head" style="margin:0">
        <h3>Phân tích lỗ hổng kiến thức</h3>
        <div class="field" style="margin:0;min-width:240px">
          <select id="a-subject">
            ${state.subjects.map(s => `<option value="${s.id}" ${s.id === sid ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    <div id="a-body"></div>
  `;

  const body = root.querySelector('#a-body');
  const subjectSel = root.querySelector('#a-subject');
  const load = () => loadSubject(body, Number(subjectSel.value));
  subjectSel.onchange = load;
  load();
}

async function loadSubject(body, subjectId) {
  body.innerHTML = loadingHTML('Đang phân tích toàn bộ lịch sử làm bài…');
  try {
    const [gaps, plan] = await Promise.all([
      api.get(`/analytics/gaps/${subjectId}`),
      api.get(`/analytics/plan/${subjectId}`),
    ]);
    render(body, gaps, plan);
  } catch (e) {
    toast(e.message, 'bad');
    body.innerHTML = `<div class="card empty"><p class="muted">Không tải được dữ liệu phân tích.</p></div>`;
  }
}

function render(body, gaps, plan) {
  const attempted = gaps.chapterMastery.filter(c => c.attempted);
  const hasData = gaps.topics.length > 0;

  if (!hasData) {
    body.innerHTML = `
      <div class="card empty" style="margin-top:1.1rem">
        <div class="big">◈</div>
        <h3>Chưa có dữ liệu cho môn này</h3>
        <p class="muted">Hãy làm một bài khảo sát hoặc luyện tập để AI Tutor phân tích lỗ hổng kiến thức và xây lộ trình học cho bạn.</p>
      </div>`;
    // Vẫn hiển thị lộ trình (các bước đều chưa hoàn thành)
    body.insertAdjacentHTML('beforeend', planCard(plan));
    return;
  }

  const bars = attempted.map(c => ({
    label: c.name.length > 10 ? c.name.slice(0, 10) + '…' : c.name,
    value: Math.round((c.mastery || 0) * 100),
    max: 100,
    display: `${Math.round((c.mastery || 0) * 100)}%`,
  }));

  body.innerHTML = `
    <div class="grid grid-2" style="margin-top:1.1rem">
      <div class="card">
        <div class="section-head" style="margin:0 0 .8rem"><h3>Mức độ thành thạo theo chương</h3></div>
        ${bars.length ? barChart(bars) : '<p class="muted">Chưa có chương nào được luyện.</p>'}
      </div>
      <div class="card">
        <div class="section-head" style="margin:0 0 .8rem"><h3>Chủ đề còn yếu</h3></div>
        ${gaps.weak.length ? gaps.weak.map(w => topicRow(w, 'bad')).join('') :
          '<p class="muted" style="padding:.6rem 0">Không có chủ đề yếu rõ rệt. Làm tốt lắm!</p>'}
      </div>
    </div>

    <div class="card" style="margin-top:1.1rem">
      <div class="section-head" style="margin:0 0 .8rem"><h3>Điểm mạnh</h3></div>
      ${gaps.strong.length ? gaps.strong.map(w => topicRow(w, 'good')).join('') :
        '<p class="muted" style="padding:.6rem 0">Tiếp tục luyện tập để xây dựng thế mạnh nhé.</p>'}
    </div>

    ${adaptiveCard(gaps)}
    ${planCard(plan)}
  `;
}

function topicRow(w, cls) {
  const pct = Math.round(w.mastery * 100);
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:.55rem 0;border-bottom:1px solid var(--border)">
    <div>
      <b style="font-size:.92rem">${esc(w.topic)}</b>
      <div class="muted" style="font-size:.78rem">${w.correct}/${w.attempts} câu đúng${w.streak_wrong >= 2 ? ' · đang sai liên tiếp' : ''}</div>
    </div>
    ${masteryChip(pct)}
  </div>`;
}

// Thẻ mô tả hành vi thích ứng (giảm/tăng độ khó)
function adaptiveCard(gaps) {
  const reduce = gaps.weak.filter(w => w.streak_wrong >= 2);
  const advance = gaps.strong;
  if (!reduce.length && !advance.length) return '';
  return `<div class="card" style="margin-top:1.1rem">
    <div class="section-head" style="margin:0 0 .6rem"><h3>Điều chỉnh thích ứng</h3></div>
    ${reduce.length ? `<p style="margin:.3rem 0"><span class="chip bad">Giảm độ khó</span>
      Với ${esc(reduce.map(w => w.topic).join(', '))}, hệ thống sẽ hạ độ khó, kèm giải thích chi tiết và bài tập bổ trợ.</p>` : ''}
    ${advance.length ? `<p style="margin:.3rem 0"><span class="chip good">Tăng độ khó</span>
      Với ${esc(advance.map(w => w.topic).join(', '))}, hệ thống sẽ tăng câu hỏi vận dụng và mở rộng kiến thức nâng cao.</p>` : ''}
  </div>`;
}

// Thẻ lộ trình học thích ứng 7 bước
function planCard(plan) {
  return `<div class="card" style="margin-top:1.1rem">
    <div class="section-head" style="margin:0 0 .4rem">
      <h3>Lộ trình học thích ứng</h3>
      <span class="chip ${plan.progress >= 70 ? 'good' : plan.progress >= 40 ? 'warn' : ''}">${plan.progress}% hoàn thành</span>
    </div>
    <div class="progress" style="margin:.4rem 0 1rem"><i style="width:${plan.progress}%"></i></div>
    <div class="steps">
      ${plan.steps.map(s => `
        <div class="step ${s.done ? 'done' : ''}">
          <div class="dot">${s.done ? '✓' : s.id}</div>
          <div>
            <h4>${esc(s.title)}</h4>
            <p>${esc(s.desc)}</p>
          </div>
        </div>`).join('')}
    </div>
  </div>`;
}
