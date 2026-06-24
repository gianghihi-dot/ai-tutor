// ============================================================
//  js/views/chat.js — AI Chat Tutor (giải đáp khái niệm, gợi ý ôn tập)
// ============================================================
import { api } from '../api.js';
import { esc, toast } from '../ui.js';

const SUGGESTIONS = [
  'Mình đang yếu phần nào?',
  'Giải thích độ co giãn của cầu',
  'GDP là gì?',
  'Lợi thế so sánh nghĩa là gì?',
];

// Lịch sử hội thoại trong phiên (cấp module)
let log = [
  { role: 'bot', text: 'Xin chào! Mình là AI Chat Tutor. Hỏi mình về bất kỳ khái niệm Kinh tế nào, nhờ giải thích vì sao một câu sai, hoặc hỏi "mình đang yếu phần nào" để được gợi ý ôn tập nhé.' },
];

export function renderChat(root) {
  root.innerHTML = `
    <div class="chat-wrap">
      <div class="chat-suggest" id="c-suggest">
        ${SUGGESTIONS.map(s => `<span class="chip" data-q="${esc(s)}">${esc(s)}</span>`).join('')}
      </div>
      <div class="chat-log" id="c-log"></div>
      <div class="chat-input">
        <input id="c-input" type="text" placeholder="Nhập câu hỏi của bạn…" autocomplete="off" />
        <button class="btn btn-primary" id="c-send">Gửi</button>
      </div>
    </div>
  `;

  const logEl = root.querySelector('#c-log');
  const input = root.querySelector('#c-input');

  const paint = () => {
    logEl.innerHTML = log.map(m => `<div class="msg ${m.role}">${renderMarkdown(m.text)}</div>`).join('');
    logEl.scrollTop = logEl.scrollHeight;
  };
  paint();

  const send = async (text) => {
    const message = (text ?? input.value).trim();
    if (!message) return;
    log.push({ role: 'user', text: message });
    input.value = '';
    paint();

    // Hiển thị trạng thái "đang soạn"
    log.push({ role: 'bot', text: '…' });
    paint();

    try {
      const d = await api.post('/chat', { message });
      log[log.length - 1] = { role: 'bot', text: d.reply };
    } catch (e) {
      log[log.length - 1] = { role: 'bot', text: 'Xin lỗi, có lỗi xảy ra. Bạn thử lại nhé.' };
      toast(e.message, 'bad');
    }
    paint();
  };

  root.querySelector('#c-send').onclick = () => send();
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  root.querySelectorAll('#c-suggest .chip').forEach(c => {
    c.onclick = () => send(c.dataset.q);
  });
  input.focus();
}

// Markdown rất nhẹ: **đậm** + xuống dòng (nội dung đã được escape trước)
function renderMarkdown(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}
