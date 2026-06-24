// ============================================================
//  server.js — Điểm khởi động ứng dụng AI Tutor
// ============================================================
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { initSchema } from './src/db.js';
import { seed } from './src/seed.js';

import authRoutes from './src/routes/auth.js';
import contentRoutes from './src/routes/content.js';
import practiceRoutes from './src/routes/practice.js';
import examRoutes from './src/routes/exams.js';
import analyticsRoutes from './src/routes/analytics.js';
import chatRoutes from './src/routes/chat.js';
import profileRoutes from './src/routes/profile.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Khởi tạo CSDL + nạp dữ liệu mẫu nếu trống
initSchema();
const seeded = seed();
console.log(seeded ? '✓ Đã nạp dữ liệu mẫu.' : '• Dữ liệu đã sẵn sàng.');

app.use(express.json({ limit: '1mb' }));

// API
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/profile', profileRoutes);

// Frontend tĩnh
app.use(express.static(join(__dirname, 'public')));

// SPA fallback (mọi route không phải /api → index.html)
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Xử lý lỗi tập trung
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Lỗi máy chủ nội bộ.' });
});

app.listen(PORT, () => {
  console.log(`\n  ▶  AI Tutor đang chạy tại http://localhost:${PORT}\n`);
});
