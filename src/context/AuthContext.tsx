import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import {
  User,
  Role,
  Note,
  ExamResult,
  Announcement,
  Conversation,
  Notification,
  LibraryNote,
  ActivityItem,
  ActivityType,
} from '../data/mockData';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (username: string, password: string, role: Role) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  registerTeacher: (name: string, username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resetStudentPassword: (studentId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateUserPhoto: (userId: string, photoUrl: string) => Promise<void>;
  students: User[];
  addStudent: (student: Omit<User, 'id' | 'role'> & { password?: string }) => Promise<{ success: boolean; error?: string }>;
  removeStudent: (studentId: string) => Promise<void>;
  updateStudent: (studentId: string, updates: Partial<User>) => Promise<void>;
  notes: Note[];
  addNote: (note: Omit<Note, 'id' | 'date' | 'hasFile' | 'storagePath'> & { file?: File }) => Promise<void>;
  getSignedNoteUrl: (storagePath: string) => Promise<string | null>;
  results: ExamResult[];
  addResult: (result: Omit<ExamResult, 'id' | 'date'>) => Promise<void>;
  announcements: Announcement[];
  addAnnouncement: (ann: Omit<Announcement, 'id' | 'date' | 'timeAgo'>) => Promise<void>;
  removeAnnouncement: (id: string) => Promise<void>;
  conversations: Conversation[];
  sendMessage: (studentId: string, senderId: string, text: string) => Promise<void>;
  notifications: Notification[];
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: (studentId: string) => Promise<void>;
  library: LibraryNote[];
  addToLibrary: (note: Omit<LibraryNote, 'id' | 'date'> & { file?: File }) => Promise<void>;
  removeFromLibrary: (id: string) => Promise<void>;
  getLibraryForTeacher: (teacherId: string) => LibraryNote[];
  activityLog: ActivityItem[];
  getStudentsForTeacher: (teacherId: string) => User[];
  getNotesForStudent: (student: User) => Note[];
  getResultsForStudent: (studentId: string) => ExamResult[];
  getNotificationsForStudent: (studentId: string) => Notification[];
  getNotificationsUnreadCount: (studentId: string) => number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (row: Record<string, unknown>): User => ({
  id: (row.user_id as string) ?? (row.id as string),
  name: (row.full_name as string) ?? (row.name as string) ?? 'Unknown',
  role: (row.role as Role) ?? 'student',
  username: row.username as string,
  class: (row.class as string) ?? undefined,
  rollNumber: (row.roll_number as string) ?? undefined,
  guardianName: (row.guardian_name as string) ?? undefined,
  guardianPhone: (row.guardian_phone as string) ?? undefined,
  teacherId: (row.teacher_id as string) ?? undefined,
  photoUrl: (row.photo_url as string) ?? undefined,
});

const normalizeForEmail = (username: string) => username.trim().toLowerCase().replace(/[^a-z0-9._+-]/g, '_');
const normalizeUsername = (username: string) => username.trim().toLowerCase();
const buildAuthEmail = (username: string) => `${normalizeForEmail(username)}@taskmate.local`;
const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ?? 'uploads';
const LOCAL_STORAGE_PREFIX = 'taskmate-local';

const createId = () => typeof crypto !== 'undefined' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const now = () => new Date().toISOString();
const buildStoragePath = (filename: string) => `${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`;
const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') resolve(reader.result);
    else reject(new Error('Failed to read file.'));
  };
  reader.onerror = () => reject(new Error('Failed to read file.'));
  reader.readAsDataURL(file);
});
const isFallbackableError = (error: unknown) => {
  if (isSupabaseAccessError(error)) return true;
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /permission|row level security|relation|does not exist|failed|network|timeout|storage/i.test(message);
};

type LocalDemoUser = User & { password: string };

const seedLocalDemoState = () => {
  const existingUsers = readLocalJson<LocalDemoUser[]>("users", []);
  if (existingUsers.length) return existingUsers;

  const teacherUser: LocalDemoUser = {
    id: createId(),
    name: 'Teacher Demo',
    role: 'teacher',
    username: 'teacher',
    password: 'teacher123',
  };

  const studentUser: LocalDemoUser = {
    id: createId(),
    name: 'Student Demo',
    role: 'student',
    username: 'student',
    password: 'student123',
    class: '10A',
    teacherId: teacherUser.id,
  };

  const users = [teacherUser, studentUser];
  writeLocalJson("users", users);
  writeLocalJson("students", [studentUser as User]);
  writeLocalJson("notes", [{
    id: createId(),
    class: '10A',
    subject: 'Mathematics',
    chapter: 'Algebra',
    filename: 'algebra-notes.pdf',
    description: 'Sample notes for the demo student.',
    date: now(),
    teacherId: teacherUser.id,
    hasFile: false,
  }]);
  writeLocalJson("results", [{
    id: createId(),
    studentId: studentUser.id,
    examName: 'Unit Test',
    marksObtained: 86,
    totalMarks: 100,
    remarks: 'Excellent work.',
    date: now(),
    teacherId: teacherUser.id,
    subject: 'Mathematics',
  }]);
  writeLocalJson("announcements", [{
    id: createId(),
    teacherId: teacherUser.id,
    title: 'Welcome to TaskMate',
    content: 'Use this local demo account to explore the teacher and student flow.',
    classScope: '10A',
    date: now(),
    timeAgo: 'Just now',
  }]);
  writeLocalJson("notifications", [{
    id: createId(),
    studentId: studentUser.id,
    type: 'announcement',
    message: 'A new announcement was posted for your class.',
    read: false,
    date: now(),
  }]);
  writeLocalJson("library", [{
    id: createId(),
    teacherId: teacherUser.id,
    subject: 'Science',
    chapter: 'Physics',
    filename: 'physics-reference.pdf',
    description: 'Saved for reuse.',
    date: now(),
  }]);
  writeLocalJson("activity_log", [{
    id: createId(),
    teacherId: teacherUser.id,
    type: 'student_registered',
    description: 'Demo student was registered locally.',
    date: now(),
  }]);
  writeLocalJson("conversations", [{
    studentId: studentUser.id,
    messages: [{
      id: createId(),
      senderId: teacherUser.id,
      text: 'Welcome! I have shared your first notes.',
      timestamp: 'Now',
    }],
  }]);

  return users;
};

const readLocalJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(`${LOCAL_STORAGE_PREFIX}:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeLocalJson = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${LOCAL_STORAGE_PREFIX}:${key}`, JSON.stringify(value));
  } catch {
    // ignore storage failure
  }
};

const enableLocalFallback = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${LOCAL_STORAGE_PREFIX}:mode`, 'true');
};

const persistLocalSessionUser = (user: User | null) => {
  if (typeof window === 'undefined') return;
  if (!user) {
    window.localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}:sessionUser`);
    return;
  }
  window.localStorage.setItem(`${LOCAL_STORAGE_PREFIX}:sessionUser`, JSON.stringify(user));
};

const getLocalSessionUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${LOCAL_STORAGE_PREFIX}:sessionUser`);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

const getLocalUsers = () => {
  const seedUsers = seedLocalDemoState();
  const persistedUsers = readLocalJson<LocalDemoUser[]>("users", []);
  const mergedUsers = [...persistedUsers];
  for (const seedUser of seedUsers) {
    const exists = mergedUsers.some((user) => normalizeUsername(user.username) === normalizeUsername(seedUser.username));
    if (!exists) mergedUsers.push(seedUser);
  }
  return mergedUsers;
};

const getLocalFallbackUser = (username: string, password: string, role: Role) => {
  const users = getLocalUsers();
  const normalizedUsername = normalizeUsername(username);
  const match = users.find((user) => normalizeUsername(user.username) === normalizedUsername && user.password === password && user.role === role);
  if (!match) return null;
  const { password: _password, ...safeUser } = match;
  return safeUser;
};

const getLocalStudentsForTeacher = (teacherId: string) => {
  const cachedStudents = readLocalJson<User[]>("students", []);
  return cachedStudents.filter((student) => student.role === 'student' && student.teacherId === teacherId);
};

const getLocalTeacherIdForStudent = (studentId: string) => {
  const cachedStudents = readLocalJson<User[]>("students", []);
  return cachedStudents.find((student) => student.id === studentId)?.teacherId;
};

const useLocalFallback = () => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(`${LOCAL_STORAGE_PREFIX}:mode`) === 'true';
};

const isSupabaseAccessError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status?: number }).status) : undefined;
  return /permission denied|row level security|violates row-level|401|403|404|400/i.test(message) || [400, 401, 403, 404].includes(status ?? -1);
};

const buildProfileWritePayload = (base: Record<string, unknown>) => {
  const payload = { ...base };
  if ('full_name' in payload && payload.full_name !== undefined) {
    payload.name = payload.full_name;
    delete payload.full_name;
  }
  return payload;
};

const buildAppUserFromProfile = (
  supUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null | undefined,
  profile: Record<string, unknown> | null | undefined,
  fallbackRole: Role = 'student',
): User => {
  const metadata = (supUser?.user_metadata ?? {}) as Record<string, unknown>;
  const displayName = (profile?.full_name as string)
    ?? (profile?.name as string)
    ?? (metadata.full_name as string)
    ?? (metadata.name as string)
    ?? (supUser?.email ?? 'Supabase User');

  return {
    id: (profile?.user_id as string) ?? (profile?.id as string) ?? supUser?.id ?? '',
    name: displayName,
    username: (profile?.username as string) ?? ((metadata.username as string) ?? (supUser?.email ?? supUser?.id ?? '')),
    role: (profile?.role as Role) ?? ((metadata.role as Role) ?? fallbackRole),
    class: (profile?.class as string) ?? undefined,
    rollNumber: (profile?.roll_number as string) ?? undefined,
    guardianName: (profile?.guardian_name as string) ?? undefined,
    guardianPhone: (profile?.guardian_phone as string) ?? undefined,
    teacherId: (profile?.teacher_id as string) ?? undefined,
    photoUrl: (profile?.photo_url as string) ?? undefined,
  };
};

const lookupProfileSafely = async (supUser: { id: string; email?: string | null } | null | undefined, username?: string | null) => {
  try {
    const normalizedUsername = username ? normalizeUsername(username) : null;
    if (supUser?.id) {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', supUser.id).maybeSingle();
      if (!error && data) return data as Record<string, unknown>;
    }

    if (supUser?.email) {
      const { data, error } = await supabase.from('profiles').select('*').eq('email', supUser.email).maybeSingle();
      if (!error && data) return data as Record<string, unknown>;
    }

    if (normalizedUsername) {
      const { data, error } = await supabase.from('profiles').select('*').eq('username', normalizedUsername).maybeSingle();
      if (!error && data) return data as Record<string, unknown>;
    }
  } catch {
    // fall back to auth metadata when the profiles table is unavailable
  }

  return null;
};

const uploadFileToStorage = async (file: File) => {
  try {
    const storagePath = buildStoragePath(file.name);
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, file);
    if (error) throw error;
    return storagePath;
  } catch {
    return null;
  }
};

const getStorageUrl = async (storagePath: string): Promise<string | null> => {
  if (/^(data:|blob:|https?:\/\/)/i.test(storagePath)) return storagePath;
  const { data: signedData, error: signedError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (signedError) {
    const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    return publicData?.publicUrl ?? null;
  }

  return signedData?.signedUrl ?? null;
};

const normalizeNote = (row: Record<string, unknown>): Note => ({
  id: row.id as string,
  class: row.class as string,
  subject: row.subject as string,
  chapter: row.chapter as string,
  filename: row.filename as string,
  description: (row.description as string) ?? undefined,
  date: (row.date as string) ?? (row.created_at as string),
  teacherId: row.teacher_id as string,
  hasFile: !!row.storage_path,
  storagePath: (row.storage_path as string) ?? undefined,
});

const normalizeResult = (row: Record<string, unknown>): ExamResult => ({
  id: row.id as string,
  studentId: row.student_id as string,
  examName: row.exam_name as string,
  marksObtained: Number(row.marks_obtained),
  totalMarks: Number(row.total_marks),
  remarks: (row.remarks as string) ?? '',
  date: (row.date as string) ?? (row.created_at as string),
  teacherId: row.teacher_id as string,
  subject: row.subject as string,
});

const normalizeAnnouncement = (row: Record<string, unknown>): Announcement => ({
  id: row.id as string,
  teacherId: row.teacher_id as string,
  title: row.title as string,
  content: row.content as string,
  classScope: row.class_scope as string,
  date: (row.date as string) ?? (row.created_at as string),
  timeAgo: '',
});

const normalizeNotification = (row: Record<string, unknown>): Notification => ({
  id: row.id as string,
  studentId: row.student_id as string,
  type: row.type as Notification['type'],
  message: row.message as string,
  read: Boolean(row.read),
  date: (row.date as string) ?? (row.created_at as string),
});

const normalizeLibrary = (row: Record<string, unknown>): LibraryNote => ({
  id: row.id as string,
  teacherId: row.teacher_id as string,
  subject: row.subject as string,
  chapter: row.chapter as string,
  filename: row.filename as string,
  description: (row.description as string) ?? undefined,
  date: (row.date as string) ?? (row.created_at as string),
  storagePath: (row.storage_path as string) ?? undefined,
});

const normalizeActivity = (row: Record<string, unknown>): ActivityItem => ({
  id: row.id as string,
  teacherId: row.teacher_id as string,
  type: row.type as ActivityType,
  description: row.description as string,
  date: (row.date as string) ?? (row.created_at as string),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<User[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [library, setLibrary] = useState<LibraryNote[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityItem[]>([]);
  const localFallbackRef = useRef(useLocalFallback());
  const suppressAuthSyncUntilRef = useRef(0);

  const suppressNextAuthSync = () => {
    suppressAuthSyncUntilRef.current = Date.now() + 2000;
  };

  // Moved above the useEffects below: `logout` is referenced inside the
  // auth-state-change effect (both directly and in its dependency array),
  // so it must be declared before those effects run to avoid a
  // temporal-dead-zone ReferenceError / "used before its declaration".
  const logout = async () => {
    suppressNextAuthSync();
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore supabase sign-out errors
    }
    setCurrentUser(null);
    setStudents([]);
    setNotes([]);
    setResults([]);
    setAnnouncements([]);
    setConversations([]);
    setNotifications([]);
    setLibrary([]);
    setActivityLog([]);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('taskmate_token');
      window.localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}:mode`);
      persistLocalSessionUser(null);
    }
  };

  const loadTeacherConversations = useCallback(async (teacherId: string) => {
    if (localFallbackRef.current || useLocalFallback()) {
      const cachedConversations = readLocalJson<Conversation[]>("conversations", []);
      setConversations(cachedConversations);
      return;
    }

    try {
      const { data: conversationRows, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('teacher_id', teacherId);

      if (conversationError || !conversationRows) {
        setConversations([]);
        return;
      }

      const convIds = conversationRows.map((row) => row.id as string).filter(Boolean);
      let messageRows: Record<string, unknown>[] = [];

      if (convIds.length) {
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: true });
        if (!messagesError && messagesData) {
          messageRows = messagesData;
        }
      }

      setConversations(
        conversationRows.map((conv) => ({
          studentId: conv.student_id as string,
          messages: messageRows
            .filter((msg) => msg.conversation_id === conv.id)
            .map((msg) => ({
              id: msg.id as string,
              senderId: msg.sender_id as string,
              text: msg.text as string,
              timestamp: msg.created_at
                ? new Date(msg.created_at as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '',
            })),
        })),
      );
    } catch (error) {
      if (isSupabaseAccessError(error)) {
        localFallbackRef.current = true;
        enableLocalFallback();
        const cachedConversations = readLocalJson<Conversation[]>("conversations", []);
        setConversations(cachedConversations);
        return;
      }
      setConversations([]);
    }
  }, []);

  const loadStudentConversations = useCallback(async (studentId: string) => {
    if (localFallbackRef.current || useLocalFallback()) {
      const cachedConversations = readLocalJson<Conversation[]>("conversations", []);
      setConversations(cachedConversations);
      return;
    }

    try {
      const { data: conversationRows, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('student_id', studentId);

      if (conversationError || !conversationRows) {
        setConversations([]);
        return;
      }

      const convIds = conversationRows.map((row) => row.id as string).filter(Boolean);
      let messageRows: Record<string, unknown>[] = [];

      if (convIds.length) {
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: true });
        if (!messagesError && messagesData) {
          messageRows = messagesData;
        }
      }

      setConversations(
        conversationRows.map((conv) => ({
          studentId: conv.student_id as string,
          messages: messageRows
            .filter((msg) => msg.conversation_id === conv.id)
            .map((msg) => ({
              id: msg.id as string,
              senderId: msg.sender_id as string,
              text: msg.text as string,
              timestamp: msg.created_at
                ? new Date(msg.created_at as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '',
            })),
        })),
      );
    } catch (error) {
      if (isSupabaseAccessError(error)) {
        localFallbackRef.current = true;
        enableLocalFallback();
        const cachedConversations = readLocalJson<Conversation[]>("conversations", []);
        setConversations(cachedConversations);
        return;
      }
      setConversations([]);
    }
  }, []);

  const loadTeacherData = useCallback(async (teacherId: string) => {
    if (localFallbackRef.current || useLocalFallback()) {
      const cachedStudents = readLocalJson<User[]>("students", []);
      const teacherStudents = getLocalStudentsForTeacher(teacherId);
      const cachedNotes = readLocalJson<Note[]>("notes", []);
      const cachedResults = readLocalJson<ExamResult[]>("results", []);
      const cachedAnnouncements = readLocalJson<Announcement[]>("announcements", []);
      const cachedLibrary = readLocalJson<LibraryNote[]>("library", []);
      const cachedActivity = readLocalJson<ActivityItem[]>("activity_log", []);
      setStudents(teacherStudents.length ? teacherStudents : cachedStudents);
      setNotes(cachedNotes);
      setResults(cachedResults);
      setAnnouncements(cachedAnnouncements);
      setLibrary(cachedLibrary);
      setActivityLog(cachedActivity);
      await loadTeacherConversations(teacherId);
      return;
    }

    try {
      const [studentsResult, notesResult, resultsResult, announcementsResult, libraryResult, activityResult] = await Promise.allSettled([
        supabase.from('profiles').select('*').eq('role', 'student').eq('teacher_id', teacherId),
        supabase.from('notes').select('*').eq('teacher_id', teacherId).order('date', { ascending: false }),
        supabase.from('results').select('*').eq('teacher_id', teacherId).order('date', { ascending: false }),
        supabase.from('announcements').select('*').eq('teacher_id', teacherId).order('date', { ascending: false }),
        supabase.from('library').select('*').eq('teacher_id', teacherId).order('date', { ascending: false }),
        supabase.from('activity_log').select('*').eq('teacher_id', teacherId).order('date', { ascending: false }).limit(50),
      ]);

      const students = studentsResult.status === 'fulfilled' && studentsResult.value.data ? studentsResult.value.data.map(normalizeUser) : [];
      const notes = notesResult.status === 'fulfilled' && notesResult.value.data ? notesResult.value.data.map(normalizeNote) : [];
      const results = resultsResult.status === 'fulfilled' && resultsResult.value.data ? resultsResult.value.data.map(normalizeResult) : [];
      const announcements = announcementsResult.status === 'fulfilled' && announcementsResult.value.data ? announcementsResult.value.data.map(normalizeAnnouncement) : [];
      const library = libraryResult.status === 'fulfilled' && libraryResult.value.data ? libraryResult.value.data.map(normalizeLibrary) : [];
      const activityLog = activityResult.status === 'fulfilled' && activityResult.value.data ? activityResult.value.data.map(normalizeActivity) : [];
      const linkedLocalStudents = getLocalStudentsForTeacher(teacherId);
      const resolvedStudents = students.length ? students : linkedLocalStudents;

      setStudents(resolvedStudents);
      setNotes(notes);
      setResults(results);
      setAnnouncements(announcements);
      setLibrary(library);
      setActivityLog(activityLog);
      await loadTeacherConversations(teacherId);
    } catch (error) {
      if (isSupabaseAccessError(error)) {
        localFallbackRef.current = true;
        enableLocalFallback();
        const cachedStudents = readLocalJson<User[]>("students", []);
        const teacherStudents = getLocalStudentsForTeacher(teacherId);
        const cachedNotes = readLocalJson<Note[]>("notes", []);
        const cachedResults = readLocalJson<ExamResult[]>("results", []);
        const cachedAnnouncements = readLocalJson<Announcement[]>("announcements", []);
        const cachedLibrary = readLocalJson<LibraryNote[]>("library", []);
        const cachedActivity = readLocalJson<ActivityItem[]>("activity_log", []);
        setStudents(teacherStudents.length ? teacherStudents : cachedStudents);
        setNotes(cachedNotes);
        setResults(cachedResults);
        setAnnouncements(cachedAnnouncements);
        setLibrary(cachedLibrary);
        setActivityLog(cachedActivity);
        await loadTeacherConversations(teacherId);
        return;
      }
      setStudents([]);
      setNotes([]);
      setResults([]);
      setAnnouncements([]);
      setLibrary([]);
      setActivityLog([]);
      await loadTeacherConversations(teacherId);
    }
  }, [loadTeacherConversations]);

  const loadStudentData = useCallback(async (student: User) => {
    if (localFallbackRef.current || useLocalFallback()) {
      setNotes(readLocalJson<Note[]>("notes", []));
      setResults(readLocalJson<ExamResult[]>("results", []));
      setAnnouncements(readLocalJson<Announcement[]>("announcements", []));
      setNotifications(readLocalJson<Notification[]>("notifications", []));
      await loadStudentConversations(student.id);
      return;
    }

    try {
      let resolvedTeacherId = student.teacherId;
      let resolvedClass = student.class;

      if (!resolvedTeacherId || !resolvedClass) {
        const profile = await lookupProfileSafely({ id: student.id, email: student.username ? `${student.username}@taskmate.local` : undefined }, student.username ?? undefined);
        resolvedTeacherId = (profile?.teacher_id as string | undefined) ?? resolvedTeacherId;
        resolvedClass = (profile?.class as string | undefined) ?? resolvedClass;
      }

      const [notesResult, resultsResult, announcementsResult, notificationsResult] = await Promise.allSettled([
        (() => {
          let query = supabase.from('notes').select('*').order('date', { ascending: false });
          if (resolvedClass) query = query.eq('class', resolvedClass);
          if (resolvedTeacherId) query = query.eq('teacher_id', resolvedTeacherId);
          return query;
        })(),
        supabase.from('results').select('*').eq('student_id', student.id).order('date', { ascending: false }),
        (() => {
          let query = supabase.from('announcements').select('*').order('date', { ascending: false });
          if (resolvedTeacherId) query = query.eq('teacher_id', resolvedTeacherId);
          if (resolvedClass) query = query.in('class_scope', ['All Classes', resolvedClass]);
          return query;
        })(),
        supabase.from('notifications').select('*').eq('student_id', student.id).order('date', { ascending: false }),
      ]);

      const notes = notesResult.status === 'fulfilled' && notesResult.value.data ? notesResult.value.data.map(normalizeNote) : [];
      const results = resultsResult.status === 'fulfilled' && resultsResult.value.data ? resultsResult.value.data.map(normalizeResult) : [];
      const announcements = announcementsResult.status === 'fulfilled' && announcementsResult.value.data ? announcementsResult.value.data.map(normalizeAnnouncement) : [];
      const notifications = notificationsResult.status === 'fulfilled' && notificationsResult.value.data ? notificationsResult.value.data.map(normalizeNotification) : [];

      setNotes(notes);
      setResults(results);
      setAnnouncements(announcements);
      setNotifications(notifications);
      await loadStudentConversations(student.id);
    } catch (error) {
      if (isSupabaseAccessError(error)) {
        localFallbackRef.current = true;
        enableLocalFallback();
        setNotes(readLocalJson<Note[]>("notes", []));
        setResults(readLocalJson<ExamResult[]>("results", []));
        setAnnouncements(readLocalJson<Announcement[]>("announcements", []));
        setNotifications(readLocalJson<Notification[]>("notifications", []));
        await loadStudentConversations(student.id);
        return;
      }
      setNotes([]);
      setResults([]);
      setAnnouncements([]);
      setNotifications([]);
      await loadStudentConversations(student.id);
    }
  }, [loadStudentConversations]);

  useEffect(() => {
    async function restoreSession() {
      // Use Supabase session instead of local JWT token
      try {
        const { data, error } = await supabase.auth.getSession();
        const session = data?.session ?? null;
        if (!session) {
          const storedSessionUser = getLocalSessionUser();
          if (storedSessionUser) {
            localFallbackRef.current = true;
            enableLocalFallback();
            setCurrentUser(storedSessionUser);
            if (storedSessionUser.role === 'teacher') await loadTeacherData(storedSessionUser.id);
            else await loadStudentData(storedSessionUser);
          }
          setLoading(false);
          return;
        }

        // Lookup profile and populate currentUser (same mapping as onAuthStateChange)
        try {
          const supUser = session.user;
          const profile = await lookupProfileSafely(supUser, supUser.email ?? undefined);

          const storedSessionUser = getLocalSessionUser();
          const fallbackRole = (storedSessionUser?.role as Role | undefined) ?? 'student';
          const builtUser = buildAppUserFromProfile(supUser, profile, fallbackRole);

          setCurrentUser(builtUser);
          if (builtUser.role === 'teacher') await loadTeacherData(builtUser.id);
          else await loadStudentData(builtUser);
        } catch (e) {
          setCurrentUser(null);
        }
      } catch (e) {
        // If Supabase session retrieval fails, fall back to unauthenticated state
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, [loadStudentData, loadTeacherData]);

  useEffect(() => {
    const listener = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (suppressAuthSyncUntilRef.current > Date.now()) {
          return;
        }

        if (event === 'SIGNED_OUT') {
          // Clear local app session/state when Supabase signs out
          await logout();
        } else if (event === 'SIGNED_IN') {
          // Bridge Supabase -> app: lookup canonical profile in `profiles` table
          const supUser = session?.user;
          if (supUser) {
            try {
              const profile = await lookupProfileSafely(supUser, supUser.email ?? undefined);

              const storedSessionUser = getLocalSessionUser();
              const fallbackRole = (storedSessionUser?.role as Role | undefined) ?? 'student';
              const builtUser = buildAppUserFromProfile(supUser, profile, fallbackRole);

              setCurrentUser(builtUser);

              // Load role-specific data
              if (builtUser.role === 'teacher') await loadTeacherData(builtUser.id);
              else await loadStudentData(builtUser);
            } catch (e) {
              // swallow to avoid breaking app during migration
            }
          }
        }
      } catch (e) {
        // swallow errors — listener should not crash the app
      }
    });

    return () => {
      const anyListener: any = listener;
      if (anyListener?.data?.subscription?.unsubscribe) anyListener.data.subscription.unsubscribe();
      else if (anyListener?.subscription?.unsubscribe) anyListener.subscription.unsubscribe();
      else if (typeof anyListener === 'function') anyListener();
    };
  }, [logout, loadStudentData, loadTeacherData]);

  const login = async (username: string, password: string, role: Role) => {
    try {
      suppressNextAuthSync();
      const normalizedUsername = normalizeUsername(username);
      const localFallbackUser = getLocalFallbackUser(username, password, role);
      if (localFallbackUser) {
        localFallbackRef.current = true;
        enableLocalFallback();
        persistLocalSessionUser(localFallbackUser);
        setCurrentUser(localFallbackUser);
        if (localFallbackUser.role === 'teacher') await loadTeacherData(localFallbackUser.id);
        else await loadStudentData(localFallbackUser);
        return { success: true };
      }

      const profile = await lookupProfileSafely(null, normalizedUsername);
      const candidateEmails = [buildAuthEmail(normalizedUsername)];

      if (profile?.email) {
        candidateEmails.push(profile.email as string);
      }

      const uniqueEmails = Array.from(new Set(candidateEmails.filter(Boolean)));
      let signInError: Error | null = null;
      let sessionUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null = null;

      for (const email of uniqueEmails) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) {
          sessionUser = data?.user ?? null;
          break;
        }
        signInError = error;
      }

      if (!sessionUser) {
        return { success: false, error: signInError?.message ?? 'Incorrect username or password.' };
      }

      const resolvedRole = (profile?.role as Role) ?? ((sessionUser.user_metadata?.role as Role) ?? role);
      if (resolvedRole !== role) {
        return { success: false, error: `This account is registered as a ${resolvedRole}.` };
      }

      const builtUser = buildAppUserFromProfile(sessionUser, profile, role);
      persistLocalSessionUser(builtUser);
      setCurrentUser(builtUser);
      if (builtUser.role === 'teacher') await loadTeacherData(builtUser.id);
      else await loadStudentData(builtUser);

      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  const registerTeacher = async (name: string, username: string, password: string) => {
    try {
      const email = buildAuthEmail(username);
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'teacher',
            full_name: name.trim(),
            username: username.trim().toLowerCase(),
          },
        },
      });

      if (signUpError || !signUpData.user) {
        const normalizedUsername = normalizeUsername(username);
        const existingUsers = readLocalJson<LocalDemoUser[]>("users", []);
        if (existingUsers.some((user) => normalizeUsername(user.username) === normalizedUsername)) {
          return { success: false, error: 'Username already taken.' };
        }
        const fallbackTeacher: LocalDemoUser = {
          id: createId(),
          name: name.trim(),
          role: 'teacher',
          username: normalizedUsername,
          password,
        };
        const nextUsers = [...existingUsers, fallbackTeacher];
        writeLocalJson("users", nextUsers);
        enableLocalFallback();
        persistLocalSessionUser(fallbackTeacher);
        setCurrentUser(fallbackTeacher);
        writeLocalJson("students", []);
        writeLocalJson("notes", []);
        writeLocalJson("results", []);
        writeLocalJson("announcements", []);
        writeLocalJson("library", []);
        writeLocalJson("activity_log", []);
        writeLocalJson("conversations", []);
        setStudents([]);
        setNotes([]);
        setResults([]);
        setAnnouncements([]);
        setLibrary([]);
        setActivityLog([]);
        setConversations([]);
        return { success: true };
      }

      const supUser = signUpData.user;
      suppressNextAuthSync();
      let profileData: Record<string, unknown> | null = null;
      const localTeacherUser: LocalDemoUser = {
        id: supUser.id,
        name: name.trim(),
        role: 'teacher',
        username: username.trim().toLowerCase(),
        password,
      };
      const existingUsers = getLocalUsers();
      const nextUsers = [...existingUsers.filter((user) => normalizeUsername(user.username) !== normalizeUsername(localTeacherUser.username)), localTeacherUser];
      writeLocalJson("users", nextUsers);
      enableLocalFallback();
      localFallbackRef.current = true;
      try {
        const { data, error } = await supabase.from('profiles').insert(buildProfileWritePayload({
          user_id: supUser.id,
          username: username.trim().toLowerCase(),
          full_name: name.trim(),
          email,
          role: 'teacher',
        })).select().maybeSingle();

        if (!error && data) {
          profileData = data;
        }
      } catch (error) {
        if (isSupabaseAccessError(error)) {
          localFallbackRef.current = true;
          enableLocalFallback();
        }
        profileData = null;
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        return { success: false, error: signInError.message };
      }

      const sessionUser = signInData?.user ?? null;
      if (sessionUser) {
        const builtUser = buildAppUserFromProfile(sessionUser, profileData, 'teacher');
        setCurrentUser(builtUser);
        if (builtUser.role === 'teacher') await loadTeacherData(builtUser.id);
        else await loadStudentData(builtUser);
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserEmail = sessionData?.session?.user?.email;
      if (!currentUserEmail) {
        return { success: false, error: 'No authenticated session found.' };
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: currentUserEmail,
        password: oldPassword,
      });

      if (verifyError) {
        return { success: false, error: verifyError.message };
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  const resetStudentPassword = async (studentId: string, newPassword: string) => {
    if (import.meta.env.DEV) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL ?? window.location.origin;
        const token = typeof window !== 'undefined' ? window.localStorage.getItem('taskmate_token') : null;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch(`${apiUrl}/auth/reset-student`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ studentId, newPassword }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error((body as any).message ?? 'Failed to reset student password.');
        }

        return { success: true };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    }

    return { success: false, error: 'Student password reset is only supported in local development.' };
  };

  const updateUserPhoto = async (userId: string, photoUrl: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ photo_url: photoUrl })
      .eq('user_id', userId);
    if (error) throw error;
    setCurrentUser((prev) => prev ? { ...prev, photoUrl } : prev);
    setStudents((prev) => prev.map((s) => s.id === userId ? { ...s, photoUrl } : s));
  };

  const addStudent = async (student: Omit<User, 'id' | 'role'> & { password?: string }) => {
    if (!currentUser) return { success: false, error: 'Not logged in.' };
    const password = student.password ?? '';
    if (!password) return { success: false, error: 'Password is required.' };

    try {
      const email = buildAuthEmail(student.username);
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'student',
            full_name: student.name.trim(),
            username: student.username.trim().toLowerCase(),
          },
        },
      });

      if (signUpError || !signUpData.user) {
        const normalizedUsername = normalizeUsername(student.username);
        const existingUsers = readLocalJson<LocalDemoUser[]>("users", []);
        if (existingUsers.some((user) => normalizeUsername(user.username) === normalizedUsername)) {
          return { success: false, error: 'Username already taken.' };
        }
        const fallbackStudent: LocalDemoUser = {
          id: createId(),
          name: student.name.trim(),
          role: 'student',
          username: normalizedUsername,
          password,
          class: student.class,
          teacherId: currentUser.id,
        };
        const nextUsers = [...existingUsers, fallbackStudent];
        writeLocalJson("users", nextUsers);
        const nextStudents = [...readLocalJson<User[]>("students", []), fallbackStudent as User];
        writeLocalJson("students", nextStudents);
        enableLocalFallback();
        persistLocalSessionUser(currentUser);
        setStudents(nextStudents);
        return { success: true };
      }

      const supUser = signUpData.user;
      suppressNextAuthSync();
      let profileData: Record<string, unknown> | null = null;
      const localStudentUser: LocalDemoUser = {
        id: supUser.id,
        name: student.name.trim(),
        role: 'student',
        username: student.username.trim().toLowerCase(),
        password,
        class: student.class,
        teacherId: currentUser.id,
      };
      const existingUsers = getLocalUsers();
      const nextUsers = [...existingUsers.filter((user) => normalizeUsername(user.username) !== normalizeUsername(localStudentUser.username)), localStudentUser];
      writeLocalJson("users", nextUsers);
      enableLocalFallback();
      localFallbackRef.current = true;
      try {
        const { data, error } = await supabase.from('profiles').insert(buildProfileWritePayload({
          user_id: supUser.id,
          username: student.username.trim().toLowerCase(),
          full_name: student.name.trim(),
          email,
          role: 'student',
          class: student.class,
          guardian_name: student.guardianName,
          guardian_phone: student.guardianPhone,
          teacher_id: currentUser.id,
        })).select().maybeSingle();

        if (!error && data) {
          profileData = data;
        }
      } catch (error) {
        if (isSupabaseAccessError(error)) {
          localFallbackRef.current = true;
          enableLocalFallback();
        }
        profileData = null;
      }

      const newStudent: User = profileData ? normalizeUser(profileData) : {
        id: supUser.id,
        name: student.name.trim(),
        role: 'student',
        username: student.username.trim().toLowerCase(),
        class: student.class,
        rollNumber: undefined,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        teacherId: currentUser.id,
      };
      const nextStudents = [...readLocalJson<User[]>("students", []), newStudent];
      writeLocalJson("students", nextStudents);
      setStudents((prev) => [...prev, newStudent]);
      setCurrentUser((prev) => prev ? { ...prev } : prev);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  const removeStudent = async (studentId: string) => {
    try {
      const { error } = await supabase.from('profiles').delete().eq('user_id', studentId);
      if (error) throw error;
      const nextStudents = readLocalJson<User[]>("students", []).filter((s) => s.id !== studentId);
      writeLocalJson("students", nextStudents);
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
    } catch (error) {
      if (isSupabaseAccessError(error)) {
        localFallbackRef.current = true;
        enableLocalFallback();
        const nextStudents = readLocalJson<User[]>("students", []).filter((s) => s.id !== studentId);
        writeLocalJson("students", nextStudents);
        setStudents(nextStudents);
        return;
      }
      throw error;
    }
  };

  const updateStudent = async (studentId: string, updates: Partial<User>) => {
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.class !== undefined) payload.class = updates.class;
    if (updates.rollNumber !== undefined) payload.roll_number = updates.rollNumber;
    if (updates.guardianName !== undefined) payload.guardian_name = updates.guardianName;
    if (updates.guardianPhone !== undefined) payload.guardian_phone = updates.guardianPhone;
    if (updates.photoUrl !== undefined) payload.photo_url = updates.photoUrl;
    if (!Object.keys(payload).length) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('user_id', studentId)
        .select()
        .single();

      if (error || !data) throw error ?? new Error('Failed to update student.');
      const student = normalizeUser(data);
      const nextStudents = readLocalJson<User[]>("students", []).map((s) => s.id === studentId ? student : s);
      writeLocalJson("students", nextStudents);
      setStudents((prev) => prev.map((s) => s.id === studentId ? student : s));
      setCurrentUser((prev) => prev?.id === studentId ? student : prev);
    } catch (error) {
      if (isSupabaseAccessError(error)) {
        localFallbackRef.current = true;
        enableLocalFallback();
        const nextStudents = readLocalJson<User[]>("students", []).map((s) => s.id === studentId ? { ...s, ...updates } : s);
        writeLocalJson("students", nextStudents);
        setStudents(nextStudents);
        setCurrentUser((prev) => prev?.id === studentId ? { ...prev, ...updates } : prev);
        return;
      }
      throw error;
    }
  };

  const addNote = async (note: Omit<Note, 'id' | 'date' | 'hasFile' | 'storagePath'> & { file?: File }) => {
    let storagePath: string | null = null;
    if (note.file) {
      storagePath = await uploadFileToStorage(note.file);
      if (!storagePath) {
        storagePath = await readFileAsDataUrl(note.file);
      }
    }

    const optimisticNote: Note = {
      id: createId(),
      class: note.class,
      subject: note.subject,
      chapter: note.chapter,
      filename: note.filename,
      description: note.description ?? undefined,
      date: now(),
      teacherId: note.teacherId,
      hasFile: !!storagePath,
      storagePath: storagePath ?? undefined,
    };

    const nextNotes = [optimisticNote, ...readLocalJson<Note[]>("notes", [])];
    writeLocalJson("notes", nextNotes);
    setNotes(nextNotes);

    try {
      const { data, error } = await supabase.from('notes').insert({
        teacher_id: note.teacherId,
        class: note.class,
        subject: note.subject,
        chapter: note.chapter,
        filename: note.filename,
        description: note.description ?? null,
        date: now(),
        storage_path: storagePath,
      }).select().single();

      if (error || !data) throw error ?? new Error('Note upload failed.');
      const normalizedNote = normalizeNote(data);
      const syncedNotes = [normalizedNote, ...readLocalJson<Note[]>("notes", []).filter((item) => item.id !== optimisticNote.id)];
      writeLocalJson("notes", syncedNotes);
      setNotes(syncedNotes);
    } catch (err) {
      if (isFallbackableError(err)) {
        localFallbackRef.current = true;
        enableLocalFallback();
      }
    }
  };

  const getSignedNoteUrl = async (storagePath: string) => {
    if (!storagePath) return null;
    return getStorageUrl(storagePath);
  };

  const addResult = async (result: Omit<ExamResult, 'id' | 'date'>) => {
    const optimisticResult: ExamResult = {
      id: createId(),
      studentId: result.studentId,
      examName: result.examName,
      marksObtained: result.marksObtained,
      totalMarks: result.totalMarks,
      remarks: result.remarks,
      date: now(),
      teacherId: result.teacherId,
      subject: result.subject,
    };

    const nextResults = [optimisticResult, ...readLocalJson<ExamResult[]>("results", [])];
    writeLocalJson("results", nextResults);
    setResults(nextResults);

    try {
      const { data: insertedResult, error: resultError } = await supabase.from('results').insert({
        teacher_id: result.teacherId,
        student_id: result.studentId,
        subject: result.subject,
        exam_name: result.examName,
        marks_obtained: result.marksObtained,
        total_marks: result.totalMarks,
        remarks: result.remarks,
        date: now(),
      }).select().single();

      if (resultError || !insertedResult) throw resultError ?? new Error('Failed to add result.');

      const { error: notificationError } = await supabase.from('notifications').insert({
        student_id: result.studentId,
        type: 'result',
        message: `New result published: ${result.examName}`,
        read: false,
        date: now(),
      });

      const { error: activityError } = await supabase.from('activity_log').insert({
        teacher_id: result.teacherId,
        type: 'result_published',
        description: `Published ${result.examName} for ${result.studentId}`,
        date: now(),
      });

      if (notificationError) throw notificationError;
      if (activityError) throw activityError;

      const syncedResults = [normalizeResult(insertedResult), ...readLocalJson<ExamResult[]>("results", []).filter((item) => item.id !== optimisticResult.id)];
      writeLocalJson("results", syncedResults);
      setResults(syncedResults);
    } catch (err) {
      if (isFallbackableError(err)) {
        localFallbackRef.current = true;
        enableLocalFallback();
      }
    }
  };

  const addAnnouncement = async (ann: Omit<Announcement, 'id' | 'date' | 'timeAgo'>) => {
    const optimisticAnnouncement: Announcement = {
      id: createId(),
      teacherId: ann.teacherId,
      title: ann.title,
      content: ann.content,
      classScope: ann.classScope,
      date: now(),
      timeAgo: '',
    };

    const nextAnnouncements = [optimisticAnnouncement, ...readLocalJson<Announcement[]>("announcements", [])];
    writeLocalJson("announcements", nextAnnouncements);
    setAnnouncements(nextAnnouncements);

    try {
      const { data: insertedAnnouncement, error: announcementError } = await supabase.from('announcements').insert({
        teacher_id: ann.teacherId,
        title: ann.title,
        content: ann.content,
        class_scope: ann.classScope,
        date: now(),
      }).select().single();

      if (announcementError || !insertedAnnouncement) throw announcementError ?? new Error('Failed to add announcement.');

      const { data: studentsData, error: studentsError } = await supabase
        .from('profiles')
        .select('user_id, class')
        .eq('teacher_id', ann.teacherId)
        .eq('role', 'student');

      if (studentsError) throw studentsError;

      const targets = (studentsData ?? []).filter((student) =>
        ann.classScope === 'All Classes' || student.class === ann.classScope,
      );

      if (targets.length) {
        const { error: notificationError } = await supabase.from('notifications').insert(
          targets.map((student) => ({
            student_id: student.user_id as string,
            type: 'announcement',
            message: `New announcement: ${ann.title}`,
            read: false,
            date: now(),
          })),
        );
        if (notificationError) throw notificationError;
      }

      const { error: activityError } = await supabase.from('activity_log').insert({
        teacher_id: ann.teacherId,
        type: 'announcement_posted',
        description: `Posted ${ann.title}`,
        date: now(),
      });
      if (activityError) throw activityError;

      const syncedAnnouncements = [normalizeAnnouncement(insertedAnnouncement), ...readLocalJson<Announcement[]>("announcements", []).filter((item) => item.id !== optimisticAnnouncement.id)];
      writeLocalJson("announcements", syncedAnnouncements);
      setAnnouncements(syncedAnnouncements);
    } catch (err) {
      if (isFallbackableError(err)) {
        localFallbackRef.current = true;
        enableLocalFallback();
      }
    }
  };

  const removeAnnouncement = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) throw error;
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  const sendMessage = async (studentId: string, senderId: string, text: string) => {
    if (!currentUser) throw new Error('Not logged in.');
    let teacherId = currentUser.role === 'teacher' ? currentUser.id : (currentUser.teacherId ?? getLocalTeacherIdForStudent(currentUser.id));

    if (!teacherId && currentUser.role !== 'teacher') {
      try {
        const { data } = await supabase.from('profiles').select('teacher_id').eq('user_id', currentUser.id).maybeSingle();
        teacherId = (data?.teacher_id as string | undefined) ?? undefined;
      } catch {
        teacherId = undefined;
      }
    }

    if (!teacherId) throw new Error('Teacher ID missing.');

    try {
      const { data: existingConversation, error: existingConversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (existingConversationError && existingConversationError.code !== 'PGRST116') {
        throw existingConversationError;
      }

      let conversationId = existingConversation?.id as string | undefined;
      if (!conversationId) {
        const { data: newConversation, error: convError } = await supabase
          .from('conversations')
          .insert({ teacher_id: teacherId, student_id: studentId })
          .select()
          .single();
        if (convError || !newConversation) throw convError ?? new Error('Failed to create conversation.');
        conversationId = newConversation.id as string;
      }

      const { error: messageError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: senderId,
        text,
        created_at: now(),
      });
      if (messageError) throw messageError;

      if (currentUser.role === 'teacher') {
        const { error: notificationError } = await supabase.from('notifications').insert({
          student_id: studentId,
          type: 'message',
          message: 'New message from your teacher',
          read: false,
          date: now(),
        });
        if (notificationError) throw notificationError;

        const { error: activityError } = await supabase.from('activity_log').insert({
          teacher_id: teacherId,
          type: 'message_sent',
          description: `Sent message to ${studentId}`,
          date: now(),
        });
        if (activityError) throw activityError;
      }

      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError || !messagesData) throw messagesError ?? new Error('Failed to load messages.');

      const conversation: Conversation = {
        studentId,
        messages: messagesData.map((msg) => ({
          id: msg.id as string,
          senderId: msg.sender_id as string,
          text: msg.text as string,
          timestamp: msg.created_at
            ? new Date(msg.created_at as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '',
        })),
      };

      setConversations((prev) => {
        const index = prev.findIndex((c) => c.studentId === conversation.studentId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = conversation;
          return updated;
        }
        return [...prev, conversation];
      });
    } catch (error) {
      if (isFallbackableError(error)) {
        localFallbackRef.current = true;
        enableLocalFallback();
        const existingConversations = readLocalJson<Conversation[]>("conversations", []);
        const localConversation = existingConversations.find((conversation) => conversation.studentId === studentId) ?? {
          studentId,
          messages: [],
        };
        const nextConversation: Conversation = {
          ...localConversation,
          messages: [
            ...localConversation.messages,
            {
              id: createId(),
              senderId,
              text,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ],
        };
        const nextConversations = existingConversations.filter((conversation) => conversation.studentId !== studentId);
        nextConversations.push(nextConversation);
        writeLocalJson("conversations", nextConversations);
        setConversations(nextConversations);
        return;
      }
      throw error;
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
    if (error) throw error;
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = async (studentId: string) => {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('student_id', studentId);
    if (error) throw error;
    setNotifications((prev) => prev.map((n) => (n.studentId === studentId ? { ...n, read: true } : n)));
  };

  const addToLibrary = async (note: Omit<LibraryNote, 'id' | 'date'> & { file?: File }) => {
    let storagePath: string | null = null;
    if (note.file) {
      storagePath = await uploadFileToStorage(note.file);
    }

    const optimisticLibraryItem: LibraryNote = {
      id: createId(),
      teacherId: note.teacherId,
      subject: note.subject,
      chapter: note.chapter,
      filename: note.filename,
      description: note.description ?? undefined,
      date: now(),
      storagePath: storagePath ?? undefined,
    };

    const nextLibrary = [optimisticLibraryItem, ...readLocalJson<LibraryNote[]>("library", [])];
    writeLocalJson("library", nextLibrary);
    setLibrary(nextLibrary);

    try {
      const { data, error } = await supabase.from('library').insert({
        teacher_id: note.teacherId,
        subject: note.subject,
        chapter: note.chapter,
        filename: note.filename,
        description: note.description ?? null,
        date: now(),
        storage_path: storagePath,
      }).select().single();

      if (error || !data) throw error ?? new Error('Failed to add library item.');
      const normalizedLibrary = normalizeLibrary(data);
      const syncedLibrary = [normalizedLibrary, ...readLocalJson<LibraryNote[]>("library", []).filter((item) => item.id !== optimisticLibraryItem.id)];
      writeLocalJson("library", syncedLibrary);
      setLibrary(syncedLibrary);
    } catch (err) {
      if (isFallbackableError(err)) {
        localFallbackRef.current = true;
        enableLocalFallback();
      }
    }
  };

  const removeFromLibrary = async (id: string) => {
    const { error } = await supabase.from('library').delete().eq('id', id);
    if (error) throw error;
    setLibrary((prev) => prev.filter((item) => item.id !== id));
  };

  const getLibraryForTeacher = useCallback((teacherId: string) => library.filter((item) => item.teacherId === teacherId), [library]);
  const getStudentsForTeacher = useCallback((teacherId: string) => students.filter((student) => student.teacherId === teacherId), [students]);
  const getNotesForStudent = useCallback((student: User) => notes.filter((note) => note.class === student.class && (!student.teacherId || note.teacherId === student.teacherId || !note.teacherId)), [notes]);
  const getResultsForStudent = useCallback((studentId: string) => results.filter((result) => result.studentId === studentId), [results]);
  const getNotificationsForStudent = useCallback((studentId: string) => [...notifications].filter((notification) => notification.studentId === studentId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [notifications]);
  const getNotificationsUnreadCount = useCallback((studentId: string) => notifications.filter((notification) => notification.studentId === studentId && !notification.read).length, [notifications]);

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      login,
      logout,
      registerTeacher,
      changePassword,
      resetStudentPassword,
      updateUserPhoto,
      students,
      addStudent,
      removeStudent,
      updateStudent,
      notes,
      addNote,
      getSignedNoteUrl,
      results,
      addResult,
      announcements,
      addAnnouncement,
      removeAnnouncement,
      conversations,
      sendMessage,
      notifications,
      markNotificationRead,
      markAllNotificationsRead,
      library,
      addToLibrary,
      removeFromLibrary,
      getLibraryForTeacher,
      activityLog,
      getStudentsForTeacher,
      getNotesForStudent,
      getResultsForStudent,
      getNotificationsForStudent,
      getNotificationsUnreadCount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
