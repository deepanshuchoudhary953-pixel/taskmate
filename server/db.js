const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const dbPath = path.join(__dirname, 'data.sqlite');
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) reject(err);
    else resolve({ id: this.lastID, changes: this.changes });
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

const init = () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      class TEXT,
      roll_number TEXT,
      guardian_name TEXT,
      guardian_phone TEXT,
      teacher_id TEXT,
      photo_url TEXT,
      created_at TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      class TEXT NOT NULL,
      subject TEXT NOT NULL,
      chapter TEXT NOT NULL,
      filename TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      storage_path TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS results (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      exam_name TEXT NOT NULL,
      marks_obtained INTEGER NOT NULL,
      total_marks INTEGER NOT NULL,
      remarks TEXT,
      date TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      class_scope TEXT NOT NULL,
      date TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      student_id TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS library (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      chapter TEXT NOT NULL,
      filename TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      storage_path TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL
    )`);
  });
};

init();

module.exports = { db, run, get, all };