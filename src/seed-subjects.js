// ============================================================
//  src/seed-subjects.js — Thêm môn học mới (tên + chương)
//  Câu hỏi cho các môn này sẽ do AI tự sinh khi luyện tập/thi.
//  Tự bỏ qua môn đã tồn tại (an toàn khi chạy lại nhiều lần).
// ============================================================
import { db } from './db.js';

// Danh sách môn mới: code (duy nhất), tên, mô tả, icon, các chương
const NEW_SUBJECTS = [
  {
    code: 'INVEST', name: 'Đầu tư quốc tế', icon: '◴',
    description: 'FDI, FPI, dòng vốn quốc tế và chính sách thu hút đầu tư.',
    chapters: [
      ['Tổng quan đầu tư quốc tế', 'Khái niệm, phân loại FDI và FPI, vai trò của đầu tư quốc tế.'],
      ['Đầu tư trực tiếp nước ngoài (FDI)', 'Động cơ, hình thức, tác động của FDI tới nước nhận đầu tư.'],
      ['Chính sách & môi trường đầu tư', 'Ưu đãi đầu tư, rủi ro quốc gia, hiệp định đầu tư quốc tế.'],
    ],
  },
  {
    code: 'DEVECO', name: 'Kinh tế phát triển', icon: '◵',
    description: 'Tăng trưởng, nghèo đói, bất bình đẳng và phát triển bền vững.',
    chapters: [
      ['Tăng trưởng & phát triển kinh tế', 'Phân biệt tăng trưởng và phát triển, các chỉ tiêu đo lường.'],
      ['Nghèo đói & bất bình đẳng', 'Đường Lorenz, hệ số Gini, các chính sách giảm nghèo.'],
      ['Phát triển bền vững', 'Vốn con người, môi trường, mục tiêu phát triển bền vững (SDGs).'],
    ],
  },
  {
    code: 'PUBECO', name: 'Kinh tế công', icon: '◶',
    description: 'Vai trò của nhà nước, hàng hoá công, thuế và chi tiêu công.',
    chapters: [
      ['Vai trò của khu vực công', 'Thất bại thị trường, lý do can thiệp của nhà nước.'],
      ['Hàng hoá công & ngoại tác', 'Hàng hoá công cộng, ngoại tác tích cực/tiêu cực, giải pháp.'],
      ['Thuế & chi tiêu công', 'Các loại thuế, gánh nặng thuế, ngân sách và chi tiêu công.'],
    ],
  },
];

export function seedSubjects() {
  const insSubject = db.prepare(
    `INSERT INTO Subjects (code, name, description, icon) VALUES (?, ?, ?, ?)`
  );
  const insChapter = db.prepare(
    `INSERT INTO Chapters (subject_id, ord, name, summary) VALUES (?, ?, ?, ?)`
  );
  const findSubject = db.prepare('SELECT id FROM Subjects WHERE code=?');

  let added = 0;
  const tx = db.transaction(() => {
    for (const s of NEW_SUBJECTS) {
      if (findSubject.get(s.code)) continue; // đã có → bỏ qua
      const sid = insSubject.run(s.code, s.name, s.description, s.icon).lastInsertRowid;
      s.chapters.forEach((ch, i) => insChapter.run(sid, i + 1, ch[0], ch[1]));
      added++;
    }
  });
  tx();
  return added; // số môn mới đã thêm
}
