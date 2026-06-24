# AI Tutor — Hệ thống hỗ trợ học tập thông minh cho sinh viên ngành Kinh tế

Ứng dụng web full-stack giúp sinh viên Kinh tế học theo lộ trình cá nhân hoá: khảo sát năng lực, luyện tập thích ứng, thi giả lập có đếm giờ, phân tích lỗ hổng kiến thức và chat cùng gia sư AI.

> Toàn bộ phần "AI" hiện chạy bằng **engine luật (rule-based)** chạy ngay không cần khoá API. Mỗi engine đều có chú thích `HOOK LLM` để bạn thay bằng mô hình ngôn ngữ thật khi cần.

---

## 1. Yêu cầu

- **Node.js ≥ 18** (khuyến nghị 20 hoặc mới hơn). Kiểm tra: `node -v`
- npm (đi kèm Node.js)

Ứng dụng dùng `better-sqlite3` — khi cài đặt, npm tự tải bản biên dịch sẵn cho hầu hết hệ điều hành phổ biến (Windows/macOS/Linux), **không cần** tự biên dịch.

## 2. Cài đặt & chạy

```bash
# 1) Cài thư viện
npm install

# 2) Khởi động ứng dụng
npm start
```

Mở trình duyệt tại **http://localhost:3000**

Lần chạy đầu, hệ thống tự tạo cơ sở dữ liệu `data.sqlite` và nạp dữ liệu mẫu (6 môn học ngành Kinh tế). Để chạy ở chế độ tự khởi động lại khi sửa code: `npm run dev`. Để nạp lại dữ liệu mẫu thủ công (khi DB trống): `npm run seed`.

> Muốn nạp lại dữ liệu từ đầu: xoá file `data.sqlite` (và `data.sqlite-wal`, `data.sqlite-shm` nếu có) rồi chạy lại `npm start`.

## 3. Dùng thử

1. Mở trang → **Tạo tài khoản mới** (đăng ký nhanh trong 30 giây).
2. Vào **Luyện tập & Khảo sát** → chọn môn, mục tiêu điểm, làm bài khảo sát đầu vào.
3. Xem **Phân tích lỗ hổng** để thấy chủ đề yếu/mạnh và lộ trình học 7 bước tự cập nhật.
4. Thử **Thi giả lập** có đồng hồ đếm ngược (tự nộp khi hết giờ).
5. Hỏi **AI Chat Tutor**, ví dụ: *"mình đang yếu phần nào?"* hoặc *"giải thích độ co giãn của cầu"*.

Tính năng **Quên mật khẩu** ở chế độ demo sẽ hiển thị mã đặt lại ngay trên màn hình (sản phẩm thật sẽ gửi qua email).

## 4. Năm phân hệ chính

1. **Khảo sát & sinh câu hỏi theo trình độ** — đánh giá năng lực, sinh bộ câu hỏi khớp mục tiêu điểm.
2. **Chấm điểm & phân tích bài làm** — tự động chấm trắc nghiệm/đúng-sai/điền khuyết/ghép cặp và **tự luận** (đánh giá tính logic, độ đầy đủ ý, chiều sâu lập luận, ý còn thiếu, gợi ý + đáp án mẫu).
3. **Thi giả lập** — đề trộn trắc nghiệm + tự luận, đồng hồ đếm ngược, tự nộp khi hết giờ.
4. **Nhận diện lỗ hổng** — theo dõi mức thành thạo từng chủ đề, **giảm độ khó** khi sai liên tiếp và **tăng độ khó** khi làm tốt.
5. **Lộ trình học thích ứng** — 7 bước tự đánh dấu hoàn thành dựa trên hoạt động thực tế.

## 5. Cấu trúc dự án

```
ai-tutor/
├── server.js                 # Khởi động Express, gắn route, phục vụ SPA
├── package.json
├── src/
│   ├── db.js                 # Kết nối SQLite + định nghĩa 10 bảng
│   ├── seed.js               # Dữ liệu mẫu 6 môn Kinh tế (mọi loại câu hỏi)
│   ├── engine/
│   │   ├── grading.js        # Chấm câu đóng + chấm tự luận (HOOK LLM)
│   │   ├── adaptive.js       # Chọn câu & điều chỉnh độ khó theo năng lực
│   │   └── analysis.js       # Phân tích lỗ hổng + xây lộ trình học
│   └── routes/               # auth, content, practice, exams, analytics, chat, profile
└── public/                   # Frontend SPA (HTML/CSS/JS thuần, không framework)
    ├── index.html
    ├── css/styles.css        # Giao diện sáng/tối
    └── js/
        ├── main.js           # Điểm vào: auth, theme, router
        ├── api.js, ui.js, store.js
        └── views/            # dashboard, practice, exam, analytics, chat, profile, result
```

### Cơ sở dữ liệu (SQLite)

`Users`, `Subjects`, `Chapters`, `Questions`, `Exams`, `ExamResults`, `Essays`, `LearningHistory`, `KnowledgeAnalysis`, `StudyPlans`.

Loại câu hỏi hỗ trợ: `mcq` (trắc nghiệm), `truefalse` (đúng/sai), `matching` (ghép cặp), `fill` (điền khuyết), `essay` (tự luận). Độ khó 1–5.

## 6. Thay engine luật bằng LLM thật

Tìm các chú thích `HOOK LLM` trong mã nguồn:

- **`src/engine/grading.js` → `gradeEssay()`**: thay phần chấm heuristic bằng lời gọi API LLM (truyền đề bài, đáp án mẫu, bài làm; nhận về điểm + nhận xét). Giữ nguyên cấu trúc trả về `{ correct, score, feedback }`.
- **`src/routes/chat.js` → `answerFromKnowledge()`**: thay bằng lời gọi LLM, truyền thêm ngữ cảnh học tập của người dùng (chủ đề yếu, lịch sử) làm prompt; trả về `{ reply, refs }`.

Nhờ đó có thể nâng cấp lên AI thật mà không phải sửa frontend hay schema.

## 7. Ghi chú kỹ thuật

- Xác thực bằng **JWT** (lưu ở `localStorage`), mật khẩu băm bằng **bcrypt**.
- Để đặt khoá ký JWT riêng khi triển khai: đặt biến môi trường `JWT_SECRET`.
- Đổi cổng: `PORT=8080 npm start`.
- Frontend là SPA thuần (ESM, không cần bước build).

---

© 2025 AI Tutor · Giấy phép MIT
