import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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
const buildAuthEmail = (username: string) => `${normalizeForEmail(username)}@taskmate.local`;
const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ?? 'uploads';

const createId = () => typeof crypto !== 'undefined' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const now = () => new Date().toISOString();
const buildStoragePath = (filename: string) => `${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`;

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

const uploadFileToStorage = async (file: File) => {
  const storagePath = buildStoragePath(file.name);
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, file);
  if (error) throw error;
  return storagePath;
};

const getStorageUrl = async (storagePath: string): Promise<string | null> => {
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

  // Moved above the useEffects below: `logout` is referenced inside the
  // auth-state-change effect (both directly and in its dependency array),
  // so it must be declared before those effects run to avoid a
  // temporal-dead-zone ReferenceError / "used before its declaration".
  const logout = async () => {
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
  };

  const loadTeacherConversations = useCallback(async (teacherId: string) => {
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
  }, []);

  const loadStudentConversations = useCallback(async (studentId: string) => {
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
  }, []);

  const loadTeacherData = useCallback(async (teacherId: string) => {
    const [studentsRes, notesRes, resultsRes, announcementsRes, libraryRes, activityRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'student').eq('teacher_id', teacherId),
      supabase.from('notes').select('*').eq('teacher_id', teacherId).order('date', { ascending: false }),
      supabase.from('results').select('*').eq('teacher_id', teacherId).order('date', { ascending: false }),
      supabase.from('announcements').select('*').eq('teacher_id', teacherId).order('date', { ascending: false }),
      supabase.from('library').select('*').eq('teacher_id', teacherId).order('date', { ascending: false }),
      supabase.from('activity_log').select('*').eq('teacher_id', teacherId).order('date', { ascending: false }).limit(50),
    ]);

    setStudents(studentsRes.data?.map(normalizeUser) ?? []);
    setNotes(notesRes.data?.map(normalizeNote) ?? []);
    setResults(resultsRes.data?.map(normalizeResult) ?? []);
    setAnnouncements(announcementsRes.data?.map(normalizeAnnouncement) ?? []);
    setLibrary(libraryRes.data?.map(normalizeLibrary) ?? []);
    setActivityLog(activityRes.data?.map(normalizeActivity) ?? []);
    await loadTeacherConversations(teacherId);
  }, [loadTeacherConversations]);

  const loadStudentData = useCallback(async (student: User) => {
    if (!student.teacherId || !student.class) {
      setNotes([]);
      setResults([]);
      setAnnouncements([]);
      setNotifications([]);
      await loadStudentConversations(student.id);
      return;
    }

    const [notesRes, resultsRes, announcementsRes, notificationsRes] = await Promise.all([
      supabase.from('notes').select('*').eq('teacher_id', student.teacherId).eq('class', student.class).order('date', { ascending: false }),
      supabase.from('results').select('*').eq('student_id', student.id).order('date', { ascending: false }),
      supabase
        .from('announcements')
        .select('*')
        .eq('teacher_id', student.teacherId)
        .in('class_scope', ['All Classes', student.class])
        .order('date', { ascending: false }),
      supabase.from('notifications').select('*').eq('student_id', student.id).order('date', { ascending: false }),
    ]);

    setNotes(notesRes.data?.map(normalizeNote) ?? []);
    setResults(resultsRes.data?.map(normalizeResult) ?? []);
    setAnnouncements(announcementsRes.data?.map(normalizeAnnouncement) ?? []);
    setNotifications(notificationsRes.data?.map(normalizeNotification) ?? []);
    await loadStudentConversations(student.id);
  }, [loadStudentConversations]);

  useEffect(() => {
    async function restoreSession() {
      // Use Supabase session instead of local JWT token
      try {
        const { data, error } = await supabase.auth.getSession();
        const session = data?.session ?? null;
        if (!session) {
          setLoading(false);
          return;
        }

        // Lookup profile and populate currentUser (same mapping as onAuthStateChange)
        try {
          const supUser = session.user;
          let profile: Record<string, unknown> | null = null;
          const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', supUser.id)
            .maybeSingle();

          if (!profileError && userProfile) {
            profile = userProfile;
          } else if (supUser.email) {
            const { data: emailProfile, error: emailProfileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', supUser.email)
              .maybeSingle();

            if (!emailProfileError && emailProfile) {
              profile = emailProfile;
            }
          }

          const builtUser = buildAppUserFromProfile(supUser, profile, 'student');

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
        if (event === 'SIGNED_OUT') {
          // Clear local app session/state when Supabase signs out
          await logout();
        } else if (event === 'SIGNED_IN') {
          // Bridge Supabase -> app: lookup canonical profile in `profiles` table
          const supUser = session?.user;
          if (supUser) {
            try {
              let profile: Record<string, unknown> | null = null;
              const { data: userProfile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', supUser.id)
                .maybeSingle();

              if (!error && userProfile) {
                profile = userProfile;
              } else if (supUser.email) {
                const { data: emailProfile, error: emailProfileError } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('email', supUser.email)
                  .maybeSingle();

                if (!emailProfileError && emailProfile) {
                  profile = emailProfile;
                }
              }

              const builtUser = buildAppUserFromProfile(supUser, profile, 'student');

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
      const normalizedUsername = username.trim().toLowerCase();
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', normalizedUsername)
        .maybeSingle();

      if (profileError || !profile) {
        return { success: false, error: 'Incorrect username or password.' };
      }

      if (profile.role !== role) {
        return { success: false, error: `This account is registered as a ${profile.role}.` };
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email as string,
        password,
      });

      if (signInError) return { success: false, error: signInError.message };

      const sessionUser = signInData?.user ?? null;
      if (sessionUser) {
        const builtUser = buildAppUserFromProfile(sessionUser, profile, role);
        setCurrentUser(builtUser);
        if (builtUser.role === 'teacher') await loadTeacherData(builtUser.id);
        else await loadStudentData(builtUser);
      }

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
        return { success: false, error: signUpError?.message ?? 'Could not create account.' };
      }

      const supUser = signUpData.user;
      const { data: profileData, error: profileError } = await supabase.from('profiles').insert({
        user_id: supUser.id,
        username: username.trim().toLowerCase(),
        full_name: name.trim(),
        email,
        role: 'teacher',
      }).select().maybeSingle();

      if (profileError || !profileData) {
        return { success: false, error: profileError?.message ?? 'Could not create teacher profile.' };
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
        const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
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
        return { success: false, error: signUpError?.message ?? 'Could not create student account.' };
      }

      const supUser = signUpData.user;
      const { data: profileData, error: profileError } = await supabase.from('profiles').insert({
        user_id: supUser.id,
        username: student.username.trim().toLowerCase(),
        full_name: student.name.trim(),
        email,
        role: 'student',
        class: student.class,
        guardian_name: student.guardianName,
        guardian_phone: student.guardianPhone,
        teacher_id: currentUser.id,
      }).select().maybeSingle();

      if (profileError || !profileData) {
        return { success: false, error: profileError?.message ?? 'Could not create student profile.' };
      }

      const newStudent: User = normalizeUser(profileData);
      setStudents((prev) => [...prev, newStudent]);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  const removeStudent = async (studentId: string) => {
    const { error } = await supabase.from('profiles').delete().eq('user_id', studentId);
    if (error) throw error;
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  const updateStudent = async (studentId: string, updates: Partial<User>) => {
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.full_name = updates.name;
    if (updates.class !== undefined) payload.class = updates.class;
    if (updates.rollNumber !== undefined) payload.roll_number = updates.rollNumber;
    if (updates.guardianName !== undefined) payload.guardian_name = updates.guardianName;
    if (updates.guardianPhone !== undefined) payload.guardian_phone = updates.guardianPhone;
    if (updates.photoUrl !== undefined) payload.photo_url = updates.photoUrl;
    if (!Object.keys(payload).length) return;

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('user_id', studentId)
      .select()
      .single();

    if (error || !data) throw error ?? new Error('Failed to update student.');
    const student = normalizeUser(data);
    setStudents((prev) => prev.map((s) => s.id === studentId ? student : s));
    setCurrentUser((prev) => prev?.id === studentId ? student : prev);
  };

  const addNote = async (note: Omit<Note, 'id' | 'date' | 'hasFile' | 'storagePath'> & { file?: File }) => {
    try {
      let storagePath: string | null = null;
      if (note.file) {
        storagePath = await uploadFileToStorage(note.file);
      }

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
      setNotes((prev) => [normalizeNote(data), ...prev]);
    } catch (err) {
      throw err;
    }
  };

  const getSignedNoteUrl = async (storagePath: string) => {
    if (!storagePath) return null;
    return getStorageUrl(storagePath);
  };

  const addResult = async (result: Omit<ExamResult, 'id' | 'date'>) => {
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

    setResults((prev) => [normalizeResult(insertedResult), ...prev]);
  };

  const addAnnouncement = async (ann: Omit<Announcement, 'id' | 'date' | 'timeAgo'>) => {
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

    setAnnouncements((prev) => [normalizeAnnouncement(insertedAnnouncement), ...prev]);
  };

  const removeAnnouncement = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) throw error;
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  const sendMessage = async (studentId: string, senderId: string, text: string) => {
    if (!currentUser) throw new Error('Not logged in.');
    const teacherId = currentUser.role === 'teacher' ? currentUser.id : currentUser.teacherId;
    if (!teacherId) throw new Error('Teacher ID missing.');

    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('student_id', studentId)
      .single();

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
    try {
      let storagePath: string | null = null;
      if (note.file) {
        storagePath = await uploadFileToStorage(note.file);
      }

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
      setLibrary((prev) => [normalizeLibrary(data), ...prev]);
    } catch (err) {
      throw err;
    }
  };

  const removeFromLibrary = async (id: string) => {
    const { error } = await supabase.from('library').delete().eq('id', id);
    if (error) throw error;
    setLibrary((prev) => prev.filter((item) => item.id !== id));
  };

  const getLibraryForTeacher = useCallback((teacherId: string) => library.filter((item) => item.teacherId === teacherId), [library]);
  const getStudentsForTeacher = useCallback((teacherId: string) => students.filter((student) => student.teacherId === teacherId), [students]);
  const getNotesForStudent = useCallback((student: User) => notes.filter((note) => note.class === student.class && note.teacherId === student.teacherId), [notes]);
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
