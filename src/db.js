// ============================================================
//  src/db.js — Khởi tạo kết nối SQLite và tạo toàn bộ bảng
// ============================================================
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data.sqlite');

// Mở (hoặc tạo) file cơ sở dữ liệu
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ------------------------------------------------------------
//  Định nghĩa schema — tạo bảng nếu chưa tồn tại
// ------------------------------------------------------------
export function initSchema() {
  db.exec(`
    -- Người dùng
    CREATE TABLE IF NOT EXISTS Users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name    TEXT NOT NULL,
      email        TEXT NOT NULL UNIQUE,
      password     TEXT NOT NULL,
      goal         TEXT DEFAULT 'B+',          -- mục tiêu điểm: C / B+ / A / improve
      reset_token  TEXT,
      reset_expire INTEGER,
      created_at   INTEGER DEFAULT (strftime('%s','now'))
    );

    -- Môn học
    CREATE TABLE IF NOT EXISTS Subjects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      code        TEXT UNIQUE,
      name        TEXT NOT NULL,
      description TEXT,
      icon        TEXT
    );

    -- Chương (thuộc môn học)
    CREATE TABLE IF NOT EXISTS Chapters (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id  INTEGER NOT NULL,
      ord         INTEGER DEFAULT 0,
      name        TEXT NOT NULL,
      summary     TEXT,
      FOREIGN KEY (subject_id) REFERENCES Subjects(id)
    );

    -- Câu hỏi
    -- type: mcq | truefalse | matching | fill | essay
    -- difficulty: 1 (dễ) → 5 (khó)
    -- payload: JSON chứa lựa chọn, đáp án, cặp ghép, từ khoá chấm tự luận...
    CREATE TABLE IF NOT EXISTS Questions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id  INTEGER NOT NULL,
      chapter_id  INTEGER NOT NULL,
      type        TEXT NOT NULL,
      difficulty  INTEGER DEFAULT 2,
      stem        TEXT NOT NULL,
      payload     TEXT NOT NULL,
      explanation TEXT,
      topic       TEXT,
      FOREIGN KEY (subject_id) REFERENCES Subjects(id),
      FOREIGN KEY (chapter_id) REFERENCES Chapters(id)
    );

    -- Đề thi giả lập đã tạo
    CREATE TABLE IF NOT EXISTS Exams (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      subject_id  INTEGER NOT NULL,
      title       TEXT,
      duration    INTEGER,                     -- phút
      question_ids TEXT,                        -- JSON mảng id câu hỏi
      created_at  INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY (user_id) REFERENCES Users(id),
      FOREIGN KEY (subject_id) REFERENCES Subjects(id)
    );

    -- Kết quả thi / bài làm (dùng chung cho khảo sát, luyện tập, thi)
    -- mode: survey | practice | exam
    CREATE TABLE IF NOT EXISTS ExamResults (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      subject_id  INTEGER NOT NULL,
      exam_id     INTEGER,
      mode        TEXT DEFAULT 'practice',
      score       REAL,                         -- 0..10
      correct     INTEGER,
      total       INTEGER,
      detail      TEXT,                          -- JSON từng câu: đúng/sai, đáp án...
      created_at  INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY (user_id) REFERENCES Users(id),
      FOREIGN KEY (subject_id) REFERENCES Subjects(id)
    );

    -- Bài tự luận (lưu riêng để phân tích sâu)
    CREATE TABLE IF NOT EXISTS Essays (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      result_id   INTEGER,
      user_id     INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      answer      TEXT,
      score       REAL,
      feedback    TEXT,                          -- JSON: logic, đầy đủ ý, lập luận, gợi ý
      created_at  INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY (user_id) REFERENCES Users(id),
      FOREIGN KEY (question_id) REFERENCES Questions(id)
    );

    -- Lịch sử học tập (log sự kiện)
    CREATE TABLE IF NOT EXISTS LearningHistory (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      subject_id  INTEGER,
      action      TEXT,                          -- survey_done | practice_done | exam_done...
      meta        TEXT,
      created_at  INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY (user_id) REFERENCES Users(id)
    );

    -- Phân tích lỗ hổng kiến thức theo chủ đề
    CREATE TABLE IF NOT EXISTS KnowledgeAnalysis (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      subject_id  INTEGER NOT NULL,
      topic       TEXT NOT NULL,
      attempts    INTEGER DEFAULT 0,
      correct     INTEGER DEFAULT 0,
      mastery     REAL DEFAULT 0,                -- 0..1
      streak_wrong INTEGER DEFAULT 0,
      updated_at  INTEGER DEFAULT (strftime('%s','now')),
      UNIQUE (user_id, subject_id, topic),
      FOREIGN KEY (user_id) REFERENCES Users(id),
      FOREIGN KEY (subject_id) REFERENCES Subjects(id)
    );

    -- Lộ trình học tập thích ứng
    CREATE TABLE IF NOT EXISTS StudyPlans (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      subject_id  INTEGER NOT NULL,
      steps       TEXT,                          -- JSON các bước
      progress    REAL DEFAULT 0,
      updated_at  INTEGER DEFAULT (strftime('%s','now')),
      UNIQUE (user_id, subject_id),
      FOREIGN KEY (user_id) REFERENCES Users(id),
      FOREIGN KEY (subject_id) REFERENCES Subjects(id)
    );
  `);
}
