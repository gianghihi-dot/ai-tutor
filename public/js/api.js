// ============================================================
//  js/api.js — Lớp gọi API (tự đính kèm token)
// ============================================================
const TOKEN_KEY = 'aitutor_token';

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try { data = await res.json(); } catch { /* không có body */ }

  if (!res.ok) {
    const err = new Error(data?.error || 'Có lỗi xảy ra. Vui lòng thử lại.');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get:  (p)    => request('GET', p),
  post: (p, b) => request('POST', p, b),
  put:  (p, b) => request('PUT', p, b),
};
