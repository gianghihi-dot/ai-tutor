// ============================================================
//  js/views/practice.js — Khảo sát năng lực & Luyện tập
// ============================================================
import { api } from '../api.js';
import { state, renderQuestion, wireQuestionInteractions, collectAnswers } from '../store.js';
import { esc, loadingHTML, toast } from '../ui.js';
import { renderResult } from './result.js';

let current = { questions: [], subjectId: null, mode: 'practice' };

export async function renderPractice(root) {
  root.innerHTML = loadingHTML('Đang tải môn học…');
  if (!state.subjects.length) {
    const d = await api.get('/content/subjects');
    state.subjects = d.subjects;
  }
  showSetup(root);
}

function showSetup(root) {
  const preSel = state.currentSubject?.id;
  root.innerHTML = `
    <div class="card">
      <h3 class="card-title">Khảo sát & luyện tập cá nhân hoá</h3>
      <p class="muted">Chọn môn, chương và mục tiêu điểm. Hệ thống sẽ sinh bộ câu hỏi phù hợp với trình độ của bạn.</p>

      <div class="row" style="margin-top:1.2rem">
        <div class="field">
          <label>Môn học</label>
          <select id="p-subject">
            ${state.subjects.map(s => `<option value="${s.id}" ${s.id===preSel?'selected':''}>${esc(s.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Chương</label>
          <select id="p-chapter"><option value="">Tất cả chương</option></select>
        </div>
      </div>

      <div class="field">
        <label>Mục tiêu điểm</label>
        <div class="goal-pills" id="p-goals">
          ${[['C','Đạt (C)'],['B+','Khá (B+)'],['A','Giỏi (A)'],['improve','Thi cải thiện']]
            .map(([v,l],i)=>`<div class="goal-pill ${i===1?'active':''}" data-goal="${v}">${l}</div>`).join('')}
        </div>
      </div>

      <div class="row">
        <div class="field">
          <label>Hình thức</label>
          <select id="p-mode">
            <option value="practice">Luyện tập thích ứng</option>
            <option value="survey">Khảo sát năng lực đầu vào</option>
          </select>
        </div>
        <div class="field">
          <label>Số câu hỏi</label>
          <select id="p-count">
            <option>5</option><option selected>8</option><option>10</option><option>15</option>
          </select>
        </div>
      </div>

      <button class="btn btn-primary" id="p-gen">Sinh câu hỏi →</button>
    </div>
  `;

  const subjectSel = root.querySelector('#p-subject');
  const chapterSel = root.querySelector('#p-chapter');
  let goal = 'B+';

  async function loadChapters() {
    const d = await api.get(`/content/subjects/${subjectSel.value}/chapters`);
    chapterSel.innerHTML = `<option value="">Tất cả chương</option>` +
      d.chapters.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  }
  loadChapters();
  subjectSel.onchange = loadChapters;

  root.querySelectorAll('#p-goals .goal-pill').forEach(p => {
    p.onclick = () => {
      root.querySelectorAll('#p-goals .goal-pill').forEach(x => x.classList.remove('active'));
      p.classList.add('active'); goal = p.dataset.goal;
    };
  });

  root.querySelector('#p-gen').onclick = async () => {
    const mode = root.querySelector('#p-mode').value;
    const count = Number(root.querySelector('#p-count').value);
    const subjectId = Number(subjectSel.value);
    const chapterId = chapterSel.value ? Number(chapterSel.value) : null;
    root.innerHTML = loadingHTML('AI đang sinh câu hỏi phù hợp với bạn…');
    try {
      const d = await api.post('/practice/generate', { subjectId, chapterId, goal, count, mode });
      if (!d.questions.length) { toast('Không có câu hỏi phù hợp.', 'bad'); return showSetup(root); }
      current = { questions: d.questions, subjectId, mode };
      showQuestions(root);
    } catch (e) { toast(e.message, 'bad'); showSetup(root); }
  };
}

function showQuestions(root) {
  const { questions, mode } = current;
  root.innerHTML = `
    <div class="section-head">
      <h3>${mode === 'survey' ? 'Bài khảo sát năng lực' : 'Bài luyện tập'}</h3>
      <span class="muted">${questions.length} câu</span>
    </div>
    <div id="p-questions">${questions.map((q,i)=>renderQuestion(q,i)).join('')}</div>
    <button class="btn btn-primary btn-block" id="p-submit" style="margin-top:1rem">Nộp bài & chấm điểm</button>
  `;
  const qRoot = root.querySelector('#p-questions');
  wireQuestionInteractions(qRoot);

  root.querySelector('#p-submit').onclick = async () => {
    const answers = collectAnswers(questions, qRoot);
    const unanswered = answers.filter(a => a.answer === null || a.answer === '' ||
      (Array.isArray(a.answer) && a.answer.some(x => x === -1))).length;
    if (unanswered > 0 && !confirm(`Còn ${unanswered} câu chưa trả lời. Vẫn nộp bài?`)) return;

    root.innerHTML = loadingHTML('Đang chấm điểm & phân tích bài làm…');
    try {
      const r = await api.post('/practice/submit', { subjectId: current.subjectId, mode, answers });
      root.innerHTML = renderResult(r) +
        `<button class="btn btn-block" id="p-again" style="margin-top:1rem">Luyện bộ câu hỏi mới</button>`;
      root.querySelector('#p-again').onclick = () => showSetup(root);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast(`Hoàn thành! Điểm: ${r.score}/10`, 'good');
    } catch (e) { toast(e.message, 'bad'); }
  };
}
