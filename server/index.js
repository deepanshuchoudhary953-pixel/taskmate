const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { run, get, all } = require('./db');
const { hashPassword, verifyPassword, signToken, requireAuth } = require('./auth');
const crypto = require('crypto');

const app = express();
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({ storage });

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

app.get('/status', (req, res) => {
  res.json({ status: 'ok' });
});

const createId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const normalizeUser = (row) => ({
  id: row.id,
  name: row.name,
  role: row.role,
  username: row.username,
  class: row.class || undefined,
  rollNumber: row.roll_number || undefined,
  guardianName: row.guardian_name || undefined,
  guardianPhone: row.guardian_phone || undefined,
  teacherId: row.teacher_id || undefined,
  photoUrl: row.photo_url || undefined,
  createdAt: row.created_at,
});

const normalizeNote = (row) => ({
  id: row.id,
  teacherId: row.teacher_id,
  class: row.class,
  subject: row.subject,
  chapter: row.chapter,
  filename: row.filename,
  description: row.description || undefined,
  date: row.date,
  storagePath: row.storage_path || undefined,
});

const normalizeResult = (row) => ({
  id: row.id,
  teacherId: row.teacher_id,
  studentId: row.student_id,
  subject: row.subject,
  examName: row.exam_name,
  marksObtained: Number(row.marks_obtained),
  totalMarks: Number(row.total_marks),
  remarks: row.remarks || '',
  date: row.date,
});

const normalizeAnnouncement = (row) => ({
  id: row.id,
  teacherId: row.teacher_id,
  title: row.title,
  content: row.content,
  classScope: row.class_scope,
  date: row.date,
});

const normalizeNotification = (row) => ({
  id: row.id,
  studentId: row.student_id,
  type: row.type,
  message: row.message,
  read: Boolean(row.read),
  date: row.date,
});

const normalizeConversation = async (row) => {
  const messages = await all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [row.id]);
  return {
    id: row.id,
    studentId: row.student_id,
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      text: m.text,
      timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })),
  };
};

const normalizeLibrary = (row) => ({
  id: row.id,
  teacherId: row.teacher_id,
  subject: row.subject,
  chapter: row.chapter,
  filename: row.filename,
  description: row.description || undefined,
  date: row.date,
  storagePath: row.storage_path || undefined,
});

const normalizeActivity = (row) => ({
  id: row.id,
  teacherId: row.teacher_id,
  type: row.type,
  description: row.description,
  date: row.date,
});

app.post('/auth/register', async (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password) return res.status(400).json({ message: 'Missing registration data.' });

  const existing = await get('SELECT id FROM users WHERE username = ?', [username.trim().toLowerCase()]);
  if (existing) return res.status(400).json({ message: 'Username already taken.' });

  const id = createId();
  const passwordHash = hashPassword(password);
  await run(
    'INSERT INTO users (id, name, role, username, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name.trim(), 'teacher', username.trim().toLowerCase(), passwordHash, now()],
  );

  const user = normalizeUser({ id, name: name.trim(), role: 'teacher', username: username.trim().toLowerCase(), created_at: now() });
  const token = signToken(user);
  res.json({ token, user });
});

app.post('/auth/login', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ message: 'Missing login credentials.' });

  const row = await get('SELECT * FROM users WHERE username = ?', [username.trim().toLowerCase()]);
  if (!row) return res.status(401).json({ message: 'Incorrect username or password.' });
  if (row.role !== role) return res.status(403).json({ message: `This account is registered as a ${row.role}.` });
  if (!verifyPassword(password, row.password_hash)) return res.status(401).json({ message: 'Incorrect username or password.' });

  const user = normalizeUser(row);
  const token = signToken(user);
  res.json({ token, user });
});


app.get('/auth/me', requireAuth, async (req, res) => {
  const row = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!row) return res.status(404).json({ message: 'User not found.' });
  res.json({ user: normalizeUser(row) });
});

app.post('/auth/change-password', requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ message: 'Missing required data.' });

  const row = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!row) return res.status(404).json({ message: 'User not found.' });
  if (!verifyPassword(oldPassword, row.password_hash)) return res.status(401).json({ message: 'Current password is incorrect.' });
  await run('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(newPassword), req.user.id]);
  res.json({ success: true });
});

app.post('/auth/reset-student', requireAuth, async (req, res) => {
  const { studentId, newPassword } = req.body;
  if (!studentId || !newPassword) return res.status(400).json({ message: 'Missing required data.' });

  const student = await get('SELECT * FROM users WHERE id = ?', [studentId]);
  if (!student) return res.status(404).json({ message: 'Student not found.' });
  if (student.teacher_id !== req.user.id) return res.status(403).json({ message: 'Permission denied.' });

  await run('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(newPassword), studentId]);
  res.json({ success: true });
});

app.post('/auth/logout', requireAuth, async (req, res) => {
  res.json({ success: true });
});

app.get('/teachers/:teacherId/students', requireAuth, async (req, res) => {
  if (req.user.role !== 'teacher' || req.user.id !== req.params.teacherId) {
    return res.status(403).json({ message: 'Permission denied.' });
  }
  const rows = await all('SELECT * FROM users WHERE role = ? AND teacher_id = ?', ['student', req.params.teacherId]);
  res.json({ students: rows.map(normalizeUser) });
});

app.post('/teachers/:teacherId/students', requireAuth, async (req, res) => {
  if (req.user.role !== 'teacher' || req.user.id !== req.params.teacherId) {
    return res.status(403).json({ message: 'Permission denied.' });
  }

  const { name, class: className, rollNumber, guardianName, guardianPhone, username, password } = req.body;
  if (!name || !username || !password || !className) return res.status(400).json({ message: 'Missing student data.' });

  const existing = await get('SELECT id FROM users WHERE username = ?', [username.trim().toLowerCase()]);
  if (existing) return res.status(400).json({ message: 'Username already taken.' });

  const id = createId();
  await run(
    'INSERT INTO users (id, name, role, username, password_hash, class, roll_number, guardian_name, guardian_phone, teacher_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      name.trim(),
      'student',
      username.trim().toLowerCase(),
      hashPassword(password),
      className,
      rollNumber || null,
      guardianName || null,
      guardianPhone || null,
      req.params.teacherId,
      now(),
    ],
  );

  const student = normalizeUser({
    id,
    name: name.trim(),
    role: 'student',
    username: username.trim().toLowerCase(),
    class: className,
    roll_number: rollNumber || null,
    guardian_name: guardianName || null,
    guardian_phone: guardianPhone || null,
    teacher_id: req.params.teacherId,
    created_at: now(),
  });
  await run('INSERT INTO activity_log (id, teacher_id, type, description, date) VALUES (?, ?, ?, ?, ?)', [createId(), req.params.teacherId, 'student_registered', `Registered ${student.name}`, now()]);
  res.json({ student });
});

app.put('/students/:studentId', requireAuth, async (req, res) => {
  const student = await get('SELECT * FROM users WHERE id = ?', [req.params.studentId]);
  if (!student) return res.status(404).json({ message: 'Student not found.' });

  if (req.user.role !== 'teacher' || student.teacher_id !== req.user.id) {
    return res.status(403).json({ message: 'Permission denied.' });
  }

  const updates = [];
  const params = [];
  if (req.body.name !== undefined) { updates.push('name = ?'); params.push(req.body.name); }
  if (req.body.class !== undefined) { updates.push('class = ?'); params.push(req.body.class); }
  if (req.body.rollNumber !== undefined) { updates.push('roll_number = ?'); params.push(req.body.rollNumber); }
  if (req.body.guardianName !== undefined) { updates.push('guardian_name = ?'); params.push(req.body.guardianName); }
  if (req.body.guardianPhone !== undefined) { updates.push('guardian_phone = ?'); params.push(req.body.guardianPhone); }
  if (req.body.photoUrl !== undefined) { updates.push('photo_url = ?'); params.push(req.body.photoUrl); }
  if (!updates.length) return res.status(400).json({ message: 'No fields to update.' });

  params.push(req.params.studentId);
  await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  const updated = await get('SELECT * FROM users WHERE id = ?', [req.params.studentId]);
  res.json({ student: normalizeUser(updated) });
});

app.delete('/students/:studentId', requireAuth, async (req, res) => {
  const student = await get('SELECT * FROM users WHERE id = ?', [req.params.studentId]);
  if (!student) return res.status(404).json({ message: 'Student not found.' });
  if (req.user.role !== 'teacher' || student.teacher_id !== req.user.id) {
    return res.status(403).json({ message: 'Permission denied.' });
  }
  await run('DELETE FROM users WHERE id = ?', [req.params.studentId]);
  res.json({ success: true });
});

app.get('/notes', requireAuth, async (req, res) => {
  if (req.user.role === 'teacher') {
    if (req.query.teacherId !== req.user.id) return res.status(403).json({ message: 'Permission denied.' });
    const rows = await all('SELECT * FROM notes WHERE teacher_id = ? ORDER BY date DESC', [req.query.teacherId]);
    return res.json({ notes: rows.map(normalizeNote) });
  }

  const student = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!student) return res.status(404).json({ message: 'Student not found.' });
  const rows = await all('SELECT * FROM notes WHERE teacher_id = ? AND class = ? ORDER BY date DESC', [student.teacher_id, student.class]);
  res.json({ notes: rows.map(normalizeNote) });
});

app.post('/notes', requireAuth, upload.single('file'), async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Permission denied.' });
  const { teacherId, class: className, subject, chapter, filename, description } = req.body;
  if (!teacherId || !className || !subject || !chapter || !filename) return res.status(400).json({ message: 'Missing note data.' });
  if (teacherId !== req.user.id) return res.status(403).json({ message: 'Teacher mismatch.' });

  const id = createId();
  const storagePath = req.file ? req.file.filename : null;
  await run(
    'INSERT INTO notes (id, teacher_id, class, subject, chapter, filename, description, date, storage_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, teacherId, className, subject, chapter, filename, description || null, now(), storagePath],
  );
  const note = normalizeNote({ id, teacher_id: teacherId, class: className, subject, chapter, filename, description: description || null, date: now(), storage_path: storagePath });
  res.json({ note });
});

app.get('/results', requireAuth, async (req, res) => {
  if (req.user.role === 'teacher') {
    if (req.query.teacherId !== req.user.id) return res.status(403).json({ message: 'Permission denied.' });
    const rows = await all('SELECT * FROM results WHERE teacher_id = ? ORDER BY date DESC', [req.query.teacherId]);
    return res.json({ results: rows.map(normalizeResult) });
  }
  const rows = await all('SELECT * FROM results WHERE student_id = ? ORDER BY date DESC', [req.user.id]);
  res.json({ results: rows.map(normalizeResult) });
});

app.post('/results', requireAuth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Permission denied.' });
  const { teacherId, studentId, class: className, subject, examName, obtainedMarks, totalMarks, remarks } = req.body;
  if (!teacherId || !studentId || !subject || !examName || obtainedMarks === undefined || totalMarks === undefined) {
    return res.status(400).json({ message: 'Missing result data.' });
  }
  if (teacherId !== req.user.id) return res.status(403).json({ message: 'Teacher mismatch.' });

  const student = await get('SELECT * FROM users WHERE id = ?', [studentId]);
  if (!student || student.teacher_id !== req.user.id) return res.status(404).json({ message: 'Student not found.' });

  const id = createId();
  await run(
    'INSERT INTO results (id, teacher_id, student_id, subject, exam_name, marks_obtained, total_marks, remarks, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, teacherId, studentId, subject, examName, Number(obtainedMarks), Number(totalMarks), remarks || '', now()],
  );
  await run('INSERT INTO notifications (id, student_id, type, message, read, date) VALUES (?, ?, ?, ?, ?, ?)', [
    createId(), studentId, 'result', `New result published: ${examName}`, 0, now(),
  ]);
  await run('INSERT INTO activity_log (id, teacher_id, type, description, date) VALUES (?, ?, ?, ?, ?)', [createId(), req.user.id, 'result_published', `Published ${examName} for ${student.name}`, now()]);
  const result = await get('SELECT * FROM results WHERE id = ?', [id]);
  res.json({ result: normalizeResult(result) });
});

app.get('/announcements', requireAuth, async (req, res) => {
  if (req.user.role === 'teacher') {
    if (req.query.teacherId !== req.user.id) return res.status(403).json({ message: 'Permission denied.' });
    const rows = await all('SELECT * FROM announcements WHERE teacher_id = ? ORDER BY date DESC', [req.query.teacherId]);
    return res.json({ announcements: rows.map(normalizeAnnouncement) });
  }
  const student = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!student) return res.status(404).json({ message: 'Student not found.' });
  const rows = await all('SELECT * FROM announcements WHERE teacher_id = ? AND (class_scope = ? OR class_scope = ?) ORDER BY date DESC', [student.teacher_id, 'All Classes', student.class]);
  res.json({ announcements: rows.map(normalizeAnnouncement) });
});

app.post('/announcements', requireAuth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Permission denied.' });
  const { teacherId, title, content, classScope } = req.body;
  if (!teacherId || !title || !content || !classScope) return res.status(400).json({ message: 'Missing announcement data.' });
  if (teacherId !== req.user.id) return res.status(403).json({ message: 'Teacher mismatch.' });

  const id = createId();
  await run('INSERT INTO announcements (id, teacher_id, title, content, class_scope, date) VALUES (?, ?, ?, ?, ?, ?)', [id, teacherId, title, content, classScope, now()]);

  const targets = await all('SELECT id FROM users WHERE teacher_id = ? AND role = ? AND ( ? = ? OR class = ? )', [teacherId, 'student', classScope, 'All Classes', classScope]);
  const inserts = targets.map((student) => run('INSERT INTO notifications (id, student_id, type, message, read, date) VALUES (?, ?, ?, ?, ?, ?)', [createId(), student.id, 'announcement', `New announcement: ${title}`, 0, now()]));
  await Promise.all(inserts);
  await run('INSERT INTO activity_log (id, teacher_id, type, description, date) VALUES (?, ?, ?, ?, ?)', [createId(), req.user.id, 'announcement_posted', `Posted ${title}`, now()]);

  const announcement = await get('SELECT * FROM announcements WHERE id = ?', [id]);
  res.json({ announcement: normalizeAnnouncement(announcement) });
});

app.delete('/announcements/:id', requireAuth, async (req, res) => {
  const announcement = await get('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
  if (!announcement) return res.status(404).json({ message: 'Announcement not found.' });
  if (req.user.role !== 'teacher' || announcement.teacher_id !== req.user.id) return res.status(403).json({ message: 'Permission denied.' });
  await run('DELETE FROM announcements WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.get('/conversations', requireAuth, async (req, res) => {
  if (req.user.role === 'teacher') {
    const rows = await all('SELECT * FROM conversations WHERE teacher_id = ?', [req.user.id]);
    const conversations = await Promise.all(rows.map(normalizeConversation));
    return res.json({ conversations });
  }
  const rows = await all('SELECT * FROM conversations WHERE student_id = ?', [req.user.id]);
  const conversations = await Promise.all(rows.map(normalizeConversation));
  res.json({ conversations });
});

app.post('/messages', requireAuth, async (req, res) => {
  const { studentId, senderId, text } = req.body;
  if (!text || !studentId || !senderId) return res.status(400).json({ message: 'Missing message data.' });

  const student = await get('SELECT * FROM users WHERE id = ?', [studentId]);
  if (!student) return res.status(404).json({ message: 'Student not found.' });
  const teacherId = req.user.role === 'teacher' ? req.user.id : student.teacher_id;
  if (!teacherId) return res.status(403).json({ message: 'Permission denied.' });

  let conversation = await get('SELECT * FROM conversations WHERE teacher_id = ? AND student_id = ?', [teacherId, studentId]);
  if (!conversation) {
    const convId = createId();
    await run('INSERT INTO conversations (id, teacher_id, student_id) VALUES (?, ?, ?)', [convId, teacherId, studentId]);
    conversation = { id: convId, teacher_id: teacherId, student_id: studentId };
  }

  const messageId = createId();
  await run('INSERT INTO messages (id, conversation_id, sender_id, text, created_at) VALUES (?, ?, ?, ?, ?)', [messageId, conversation.id, senderId, text, now()]);
  if (req.user.role === 'teacher') {
    await run('INSERT INTO notifications (id, student_id, type, message, read, date) VALUES (?, ?, ?, ?, ?, ?)', [createId(), studentId, 'message', 'New message from your teacher', 0, now()]);
    await run('INSERT INTO activity_log (id, teacher_id, type, description, date) VALUES (?, ?, ?, ?, ?)', [createId(), teacherId, 'message_sent', `Sent message to ${student.name}`, now()]);
  }

  const messages = await all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [conversation.id]);
  res.json({ conversation: { id: conversation.id, studentId, messages: messages.map((m) => ({ id: m.id, senderId: m.sender_id, text: m.text, timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })) } });
});

app.get('/notifications', requireAuth, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Permission denied.' });
  const rows = await all('SELECT * FROM notifications WHERE student_id = ? ORDER BY date DESC', [req.user.id]);
  res.json({ notifications: rows.map(normalizeNotification) });
});

app.post('/notifications/mark-read', requireAuth, async (req, res) => {
  const { notificationId } = req.body;
  if (!notificationId) return res.status(400).json({ message: 'notificationId required.' });
  const notification = await get('SELECT * FROM notifications WHERE id = ?', [notificationId]);
  if (!notification) return res.status(404).json({ message: 'Notification not found.' });
  if (req.user.role !== 'student' || notification.student_id !== req.user.id) return res.status(403).json({ message: 'Permission denied.' });
  await run('UPDATE notifications SET read = 1 WHERE id = ?', [notificationId]);
  res.json({ success: true });
});

app.post('/notifications/mark-all', requireAuth, async (req, res) => {
  const { studentId } = req.body;
  if (!studentId) return res.status(400).json({ message: 'studentId required.' });
  if (req.user.role !== 'student' || req.user.id !== studentId) return res.status(403).json({ message: 'Permission denied.' });
  await run('UPDATE notifications SET read = 1 WHERE student_id = ?', [studentId]);
  res.json({ success: true });
});

app.get('/library', requireAuth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Permission denied.' });
  if (req.query.teacherId !== req.user.id) return res.status(403).json({ message: 'Permission denied.' });
  const rows = await all('SELECT * FROM library WHERE teacher_id = ? ORDER BY date DESC', [req.query.teacherId]);
  res.json({ library: rows.map(normalizeLibrary) });
});

app.post('/library', requireAuth, upload.single('file'), async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Permission denied.' });
  const { teacherId, subject, chapter, filename, description } = req.body;
  if (!teacherId || !subject || !chapter || !filename) return res.status(400).json({ message: 'Missing library note data.' });
  if (teacherId !== req.user.id) return res.status(403).json({ message: 'Teacher mismatch.' });
  const storagePath = req.file ? req.file.filename : null;
  const id = createId();
  await run('INSERT INTO library (id, teacher_id, subject, chapter, filename, description, date, storage_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [id, teacherId, subject, chapter, filename, description || null, now(), storagePath]);
  const libraryItem = await get('SELECT * FROM library WHERE id = ?', [id]);
  res.json({ library: normalizeLibrary(libraryItem) });
});

app.delete('/library/:id', requireAuth, async (req, res) => {
  const entry = await get('SELECT * FROM library WHERE id = ?', [req.params.id]);
  if (!entry) return res.status(404).json({ message: 'Library note not found.' });
  if (req.user.role !== 'teacher' || entry.teacher_id !== req.user.id) return res.status(403).json({ message: 'Permission denied.' });
  await run('DELETE FROM library WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.get('/activity', requireAuth, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Permission denied.' });
  if (req.query.teacherId !== req.user.id) return res.status(403).json({ message: 'Permission denied.' });
  const rows = await all('SELECT * FROM activity_log WHERE teacher_id = ? ORDER BY date DESC LIMIT 50', [req.query.teacherId]);
  res.json({ activity: rows.map(normalizeActivity) });
});

app.put('/users/:userId', requireAuth, async (req, res) => {
  if (req.user.id !== req.params.userId && req.user.role !== 'teacher') return res.status(403).json({ message: 'Permission denied.' });
  const row = await get('SELECT * FROM users WHERE id = ?', [req.params.userId]);
  if (!row) return res.status(404).json({ message: 'User not found.' });

  const updates = [];
  const params = [];
  if (req.body.photoUrl !== undefined) { updates.push('photo_url = ?'); params.push(req.body.photoUrl); }
  if (req.body.name !== undefined) { updates.push('name = ?'); params.push(req.body.name); }
  if (!updates.length) return res.status(400).json({ message: 'No update fields provided.' });
  params.push(req.params.userId);

  await run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  const updated = await get('SELECT * FROM users WHERE id = ?', [req.params.userId]);
  res.json({ user: normalizeUser(updated) });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`TaskMate local API is running at http://localhost:${port}`);
});