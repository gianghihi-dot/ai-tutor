// ============================================================
//  src/routes/content.js — Môn học & chương
// ============================================================
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from './_auth-middleware.js';

const router = Router();
router.use(requireAuth);

// Danh sách môn học, kèm số chương & số câu hỏi
router.get('/subjects', (req, res) => {
  const subjects = db.prepare('SELECT * FROM Subjects ORDER BY id').all();
  const data = subjects.map(s => ({
    ...s,
    chapters: db.prepare('SELECT COUNT(*) c FROM Chapters WHERE subject_id=?').get(s.id).c,
    questions: db.prepare('SELECT COUNT(*) c FROM Questions WHERE subject_id=?').get(s.id).c,
  }));
  res.json({ subjects: data });
});

// Chương của một môn
router.get('/subjects/:id/chapters', (req, res) => {
  const rows = db.prepare('SELECT * FROM Chapters WHERE subject_id=? ORDER BY ord').all(req.params.id);
  res.json({ chapters: rows });
});

export default router;
