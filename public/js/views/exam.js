// ============================================================
//  js/views/exam.js — Module 3: Thi giả lập có đếm giờ
// ============================================================
import { api } from '../api.js';
import { state, renderQuestion, wireQuestionInteractions, collectAnswers } from '../store.js';
import { esc, loadingHTML, toast } from '../ui.js';
import { renderResult } from './result.js';

let session = { examId: null, questions: [], timerId: null, remaining: 0, submitted: false };

export async function renderExam(root) {
  cleanupExam(); // tắt đồng hồ cũ (nếu có) khi mở lại view
  root.innerHTML = loadingHTML('Đang tải môn học…');
  if (!state.subjects.length) {
    const d = await api.get('/content/subjects');
    state.subjects = d.subjects;
  }
  showConfig(root);
}

// ---------- Bước 1: Cấu hình đề thi ----------
function showConfig(root) {
  cleanupExam(); // đảm bảo không còn đồng hồ chạy ngầm
  const preSel = state.currentSubject?.id;
  root.innerHTML = `
    <div class="card">
      <h3 class="card-title">Tạo đề thi giả lập</h3>
      <p class="muted">Thiết lập đề thi theo cấu trúc chuẩn (trắc nghiệm + tự luận) với đồng hồ đếm ngược như phòng thi thật.</p>

      <div class="row" style="margin-top:1.2rem">
        <div class="field">
          <label>Môn học</label>
          <select id="e-subject">
            ${state.subjects.map(s => `<option value="${s.id}" ${s.id === preSel ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Chương</label>
          <select id="e-chapter"><option value="">Tất cả chương</option></select>
        </div>
      </div>

      <div class="row">
        <div class="field">
          <label>Mức độ khó tối đa</label>
          <select id="e-diff">
            <option value="2">Dễ (đến mức 2)</option>
            <option value="3" selected>Trung bình (đến mức 3)</option>
            <option value="4">Khó (đến mức 4)</option>
            <option value="5">Rất khó (mọi mức độ)</option>
          </select>
        </div>
       <div class="field">
          <label>Số câu hỏi (1–20)</label>
          <input type="number" id="e-count" min="1" max="20" value="10" />
        </div>

      <div class="field">
        <label>Thời gian làm bài</label>
        <select id="e-duration">
          <option value="10">10 phút</option>
          <option value="20">20 phút</option>
          <option value="30" selected>30 phút</option>
          <option value="45">45 phút</option>
          <option value="60">60 phút</option>
        </select>
      </div>

      <button class="btn btn-primary" id="e-start">Bắt đầu thi →</button>
    </div>
  `;

  const subjectSel = root.querySelector('#e-subject');
  const chapterSel = root.querySelector('#e-chapter');

  async function loadChapters() {
    const d = await api.get(`/content/subjects/${subjectSel.value}/chapters`);
    chapterSel.innerHTML = `<option value="">Tất cả chương</option>` +
      d.chapters.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  }
  loadChapters();
  subjectSel.onchange = loadChapters;

  root.querySelector('#e-start').onclick = async () => {
    const subjectId = Number(subjectSel.value);
    const chapterId = chapterSel.value ? Number(chapterSel.value) : null;
    const difficulty = Number(root.querySelector('#e-diff').value);
    let count = Number(root.querySelector('#e-count').value);
    if (!Number.isFinite(count) || count < 1) count = 1;
    if (count > 20) count = 20;
    const duration = Number(root.querySelector('#e-duration').value);

    root.innerHTML = loadingHTML('Đang biên soạn đề thi…');
    try {
      const d = await api.post('/exams/create', { subjectId, chapterId, difficulty, count, duration });
      cleanupExam(); // tắt đồng hồ cũ trước khi bắt đầu phiên mới
      session = {
        examId: d.examId,
        questions: d.questions,
        subjectId,
        remaining: duration * 60,
        timerId: null,
        submitted: false,
        title: d.title,
      };
      showExam(root);
    } catch (e) {
      toast(e.message, 'bad');
      showConfig(root);
    }
  };
}

// ---------- Bước 2: Làm bài thi (có đếm giờ) ----------
function showExam(root) {
  const { questions, title } = session;
  root.innerHTML = `
    <div class="exam-bar">
      <div>
        <b style="font-family:var(--font-display)">${esc(title || 'Đề thi giả lập')}</b>
        <div class="muted" style="font-size:.8rem">${questions.length} câu · Tự động nộp khi hết giờ</div>
      </div>
      <div style="display:flex;align-items:center;gap:1rem">
        <span class="timer" id="e-timer">--:--</span>
        <button class="btn btn-primary" id="e-submit">Nộp bài</button>
      </div>
    </div>
    <div id="e-questions" style="margin-top:1rem">
      ${questions.map((q, i) => renderQuestion(q, i)).join('')}
    </div>
    <button class="btn btn-primary btn-block" id="e-submit2" style="margin-top:1rem">Nộp bài & xem kết quả</button>
  `;

  const qRoot = root.querySelector('#e-questions');
  wireQuestionInteractions(qRoot);

  const timerEl = root.querySelector('#e-timer');
  const tick = () => {
    const m = Math.floor(session.remaining / 60);
    const s = session.remaining % 60;
    timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (session.remaining <= 60) timerEl.classList.add('danger');
    if (session.remaining <= 0) {
      cleanupExam();               // TẮT đồng hồ ngay, tránh bắn thông báo lặp
      if (!session.submitted) {
        toast('Hết giờ! Hệ thống tự động nộp bài.', '');
        doSubmit(root, true);
      }
      return;
    }
    session.remaining -= 1;
  };
  tick();
  session.timerId = setInterval(tick, 1000);

  const submit = () => {
    if (session.submitted) return;
    const answers = collectAnswers(questions, qRoot);
    const unanswered = answers.filter(a => a.answer === null || a.answer === '' ||
      (Array.isArray(a.answer) && a.answer.some(x => x === -1))).length;
    if (unanswered > 0 && !confirm(`Còn ${unanswered} câu chưa trả lời. Vẫn nộp bài?`)) return;
    doSubmit(root, false);
  };
  root.querySelector('#e-submit').onclick = submit;
  root.querySelector('#e-submit2').onclick = submit;
}

// ---------- Bước 3: Nộp & chấm điểm ----------
async function doSubmit(root, auto) {
  if (session.submitted) return;
  session.submitted = true;
  cleanupExam(); // tắt đồng hồ ngay khi nộp

  const qRoot = root.querySelector('#e-questions');
  const answers = qRoot
    ? collectAnswers(session.questions, qRoot)
    : session.questions.map(q => ({ id: q.id, answer: null }));

  root.innerHTML = loadingHTML('Đang chấm điểm bài thi & phân tích…');
  try {
    const r = await api.post('/exams/submit', { examId: session.examId, answers });
    root.innerHTML = renderResult(r) +
      `<button class="btn btn-block" id="e-again" style="margin-top:1rem">Tạo đề thi mới</button>`;
    root.querySelector('#e-again').onclick = () => showConfig(root);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(`${auto ? 'Tự động nộp · ' : ''}Điểm thi: ${r.score}/10`, r.score >= 5 ? 'good' : '');
  } catch (e) {
    toast(e.message, 'bad');
    showConfig(root);
  }
}

// Dọn dẹp đồng hồ khi rời view
export function cleanupExam() {
  if (session.timerId) clearInterval(session.timerId);
  session.timerId = null;
}
