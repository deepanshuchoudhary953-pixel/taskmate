const fetch = global.fetch || require('node-fetch');
const base = 'http://localhost:3001';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(method, path, body, token, isForm = false) {
  const headers = {};
  let bodyData;
  if (body && !isForm) {
    headers['Content-Type'] = 'application/json';
    bodyData = JSON.stringify(body);
  } else if (body && isForm) {
    bodyData = body;
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: bodyData,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (e) { json = null; }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
  }
  return json;
}

(async () => {
  try {
    console.log('Creating teacher...');
    const teacherData = { name: 'Test Teacher', username: 'teacher_test', password: 'Teach123!', role: 'teacher' };
    const reg = await request('POST', '/auth/register', { name: teacherData.name, username: teacherData.username, password: teacherData.password });
    console.log('Teacher registered:', reg.user.id);
    const teacherToken = reg.token;
    console.log('Logging in teacher...');
    const loginTeacher = await request('POST', '/auth/login', { username: teacherData.username, password: teacherData.password, role: 'teacher' });
    const teacherId = loginTeacher.user.id;
    console.log('Teacher login OK', teacherId);

    console.log('Creating student...');
    const studentData = {
      name: 'Test Student',
      class: '10A',
      rollNumber: '01',
      guardianName: 'Parent Test',
      guardianPhone: '9999999999',
      username: 'student_test',
      password: 'Stud123!',
    };
    const createStudent = await request('POST', `/teachers/${teacherId}/students`, studentData, teacherToken);
    const studentId = createStudent.student.id;
    console.log('Student created:', studentId);

    console.log('Posting announcement...');
    const announcement = await request('POST', '/announcements', { teacherId, title: 'Test Announcement', content: 'This is a test announcement', classScope: '10A' }, teacherToken);
    console.log('Announcement created:', announcement.announcement.id);

    console.log('Posting result...');
    const result = await request('POST', '/results', { teacherId, studentId, subject: 'Math', examName: 'Unit Test 1', obtainedMarks: 88, totalMarks: 100, remarks: 'Good work' }, teacherToken);
    console.log('Result created:', result.result.id);

    console.log('Posting note...');
    const noteForm = new FormData();
    noteForm.append('teacherId', teacherId);
    noteForm.append('class', '10A');
    noteForm.append('subject', 'Science');
    noteForm.append('chapter', 'Chapter 1');
    noteForm.append('filename', 'ScienceIntro.pdf');
    noteForm.append('description', 'Intro note');
    const note = await request('POST', '/notes', noteForm, teacherToken, true);
    console.log('Note created:', note.note.id);

    console.log('Posting library item...');
    const libForm = new FormData();
    libForm.append('teacherId', teacherId);
    libForm.append('subject', 'Science');
    libForm.append('chapter', 'Chapter 1');
    libForm.append('filename', 'LibraryNote.pdf');
    libForm.append('description', 'Library item');
    const library = await request('POST', '/library', libForm, teacherToken, true);
    console.log('Library item created:', library.library.id);

    console.log('Sending message...');
    const message = await request('POST', '/messages', { studentId, senderId: teacherId, text: 'Hello student, welcome!' }, teacherToken);
    console.log('Message conversation id:', message.conversation.id);

    console.log('Logging in student...');
    const loginStudent = await request('POST', '/auth/login', { username: studentData.username, password: studentData.password, role: 'student' });
    const studentToken = loginStudent.token;
    console.log('Student login OK', loginStudent.user.id);

    console.log('Fetching student notes...');
    const studentNotes = await request('GET', '/notes', null, studentToken);
    console.log('Student notes count:', studentNotes.notes.length);
    if (studentNotes.notes.length === 0) throw new Error('No notes returned for student');

    console.log('Fetching student results...');
    const studentResults = await request('GET', '/results', null, studentToken);
    console.log('Student results count:', studentResults.results.length);
    if (studentResults.results.length === 0) throw new Error('No results returned for student');

    console.log('Fetching student announcements...');
    const studentAnnouncements = await request('GET', '/announcements', null, studentToken);
    console.log('Student announcements count:', studentAnnouncements.announcements.length);
    if (studentAnnouncements.announcements.length === 0) throw new Error('No announcements returned for student');

    console.log('Fetching student notifications...');
    const studentNotifications = await request('GET', '/notifications', null, studentToken);
    console.log('Student notifications count:', studentNotifications.notifications.length);
    if (studentNotifications.notifications.length === 0) throw new Error('No notifications returned for student');

    console.log('Fetching student conversations...');
    const studentConvos = await request('GET', '/conversations', null, studentToken);
    console.log('Student conversations count:', studentConvos.conversations.length);
    if (studentConvos.conversations.length === 0) throw new Error('No conversations returned for student');

    console.log('Fetching teacher library...');
    const teacherLibrary = await request('GET', `/library?teacherId=${teacherId}`, null, teacherToken);
    console.log('Teacher library count:', teacherLibrary.library.length);
    if (teacherLibrary.library.length === 0) throw new Error('No library entries returned for teacher');

    console.log('All checks passed.');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
})();
