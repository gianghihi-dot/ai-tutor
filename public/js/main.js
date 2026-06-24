// ============================================================
//  js/main.js — Điểm khởi động ứng dụng (auth, theme, router)
// ============================================================
import { api, getToken, setToken } from './api.js';
import { state } from './store.js';
import { $, toast } from './ui.js';

// ---------- Tham chiếu DOM ----------
const authScreen = $('#auth-screen');
const appShell   = $('#app-shell');
const appContent = $('#app-content');
const viewTitle  = $('#view-title');
const sidebar    = $('#sidebar');
const overlay    = $('#overlay');

const VIEW_TITLE = {
  dashboard: 'Tổng quan',
  practice:  'Luyện tập & Khảo sát',
  exam:      'Thi giả lập',
  analytics: 'Phân tích lỗ hổng',
  chat:      'AI Chat Tutor',
  profile:   'Hồ sơ cá nhân',
};

// Nạp view động (lazy import) — trả về hàm render
const VIEW_LOADERS = {
  dashboard: () => import('./views/dashboard.js').then(m => m.renderDashboard),
  practice:  () => import('./views/practice.js').then(m => m.renderPractice),
  exam:      () => import('./views/exam.js').then(m => m.renderExam),
  analytics: () => import('./views/analytics.js').then(m => m.renderAnalytics),
  chat:      () => import('./views/chat.js').then(m => m.renderChat),
  profile:   () => import('./views/profile.js').then(m => m.renderProfile),
};

let currentView = null;

// ============================================================
//  THEME (Dark / Light) — lưu lựa chọn
// ============================================================
function initTheme() {
  const saved = localStorage.getItem('aitutor_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  $('#theme-toggle').onclick = () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('aitutor_theme', next);
  };
}

// ============================================================
//  ROUTER
// ============================================================
async function nav(view) {
  if (!VIEW_LOADERS[view]) view = 'dashboard';

  // Dọn dẹp đồng hồ nếu rời khỏi màn thi
  if (currentView === 'exam' && view !== 'exam') {
    try { const m = await import('./views/exam.js'); m.cleanupExam?.(); } catch { /* ignore */ }
  }
  currentView = view;

  // Cập nhật trạng thái active trên sidebar
  document.querySelectorAll('.nav-item').forEach(n =>
    n.classList.toggle('active', n.dataset.view === view));
  viewTitle.textContent = VIEW_TITLE[view] || 'AI Tutor';

  // Đóng sidebar trên mobile
  closeSidebar();

  try {
    const render = await VIEW_LOADERS[view]();
    await render(appContent, nav);
  } catch (e) {
    console.error(e);
    appContent.innerHTML = `<div class="card empty"><p class="muted">Không tải được trang. ${e.message || ''}</p></div>`;
  }
}

function wireNav() {
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.onclick = (e) => { e.preventDefault(); nav(item.dataset.view); };
  });
}

// ============================================================
//  SIDEBAR (mobile)
// ============================================================
function openSidebar() {
  sidebar.classList.add('open');
  overlay.innerHTML = '';
  overlay.classList.remove('hidden');
  overlay.onclick = closeSidebar;
}
function closeSidebar() {
  sidebar.classList.remove('open');
  if (!overlay.querySelector('.modal')) overlay.classList.add('hidden');
}
function wireSidebar() {
  $('#menu-toggle').onclick = () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  };
}

// ============================================================
//  XÁC THỰC
// ============================================================
function showAuth() {
  authScreen.classList.remove('hidden');
  appShell.classList.add('hidden');
}
function showApp() {
  authScreen.classList.add('hidden');
  appShell.classList.remove('hidden');
  // Hiển thị thông tin người dùng
  const name = state.user?.full_name || 'Bạn';
  $('#user-name').textContent = name.split(' ').pop();
  $('#user-avatar').textContent = (name[0] || 'B').toUpperCase();
}

// Chuyển đổi giữa các form đăng nhập / đăng ký / quên / đặt lại
function switchAuthForm(target) {
  ['login', 'register', 'forgot', 'reset'].forEach(f => {
    $(`#form-${f}`).classList.toggle('hidden', f !== target);
  });
}

function wireAuthLinks() {
  document.querySelectorAll('[data-go]').forEach(a => {
    a.onclick = (e) => { e.preventDefault(); switchAuthForm(a.dataset.go); };
  });
}

function formData(form) {
  const data = {};
  new FormData(form).forEach((v, k) => { data[k] = v; });
  return data;
}

function wireAuthForms() {
  // Đăng nhập
  $('#form-login').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.submitter; if (btn) btn.disabled = true;
    try {
      const d = await api.post('/auth/login', formData(e.target));
      setToken(d.token);
      state.user = d.user;
      await bootIntoApp();
    } catch (err) { toast(err.message, 'bad'); }
    finally { if (btn) btn.disabled = false; }
  };

  // Đăng ký
  $('#form-register').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.submitter; if (btn) btn.disabled = true;
    try {
      const d = await api.post('/auth/register', formData(e.target));
      setToken(d.token);
      state.user = d.user;
      toast('Tạo tài khoản thành công!', 'good');
      await bootIntoApp();
    } catch (err) { toast(err.message, 'bad'); }
    finally { if (btn) btn.disabled = false; }
  };

  // Quên mật khẩu
  $('#form-forgot').onsubmit = async (e) => {
    e.preventDefault();
    const box = $('#reset-token-box');
    try {
      const d = await api.post('/auth/forgot', formData(e.target));
      box.classList.remove('hidden');
      box.innerHTML = `Mã đặt lại (chế độ demo): <b>${d.token}</b><br><span class="muted">Bấm "Đã có mã? Đặt lại ngay" và dán mã này.</span>`;
      toast('Đã tạo mã đặt lại.', 'good');
    } catch (err) { toast(err.message, 'bad'); }
  };

  // Đặt lại mật khẩu
  $('#form-reset').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/reset', formData(e.target));
      toast('Đặt lại mật khẩu thành công. Hãy đăng nhập.', 'good');
      switchAuthForm('login');
    } catch (err) { toast(err.message, 'bad'); }
  };
}

function wireLogout() {
  $('#logout-btn').onclick = () => {
    setToken(null);
    state.user = null;
    state.subjects = [];
    state.currentSubject = null;
    location.reload();
  };
}

// ============================================================
//  KHỞI ĐỘNG VÀO ỨNG DỤNG (sau khi đã có token + user)
// ============================================================
async function bootIntoApp() {
  showApp();
  try {
    const d = await api.get('/content/subjects');
    state.subjects = d.subjects;
  } catch (e) { /* sẽ tải lại trong từng view */ }
  nav('dashboard');
}

// ============================================================
//  ĐIỂM VÀO
// ============================================================
async function init() {
  initTheme();
  wireAuthLinks();
  wireAuthForms();
  wireNav();
  wireSidebar();
  wireLogout();

  const token = getToken();
  if (token) {
    try {
      const d = await api.get('/auth/me');
      state.user = d.user;
      await bootIntoApp();
      return;
    } catch (e) {
      setToken(null); // token hỏng/hết hạn
    }
  }
  showAuth();
  switchAuthForm('login');
}

init();
