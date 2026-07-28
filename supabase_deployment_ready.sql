BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  full_name text,
  email text,
  username text UNIQUE,
  role text NOT NULL DEFAULT 'student',
  teacher_id uuid,
  class text,
  roll_number text,
  guardian_name text,
  guardian_phone text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  class text NOT NULL,
  subject text NOT NULL,
  chapter text NOT NULL,
  filename text NOT NULL,
  description text,
  storage_path text,
  date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  subject text NOT NULL,
  exam_name text NOT NULL,
  marks_obtained integer NOT NULL,
  total_marks integer NOT NULL,
  remarks text,
  date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  class_scope text NOT NULL,
  date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  subject text NOT NULL,
  chapter text NOT NULL,
  filename text NOT NULL,
  description text,
  storage_path text,
  date timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  date timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_teacher_id ON public.profiles(teacher_id);
CREATE INDEX IF NOT EXISTS idx_notes_teacher_id ON public.notes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_results_student_id ON public.results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_teacher_id ON public.results(teacher_id);
CREATE INDEX IF NOT EXISTS idx_announcements_teacher_id ON public.announcements(teacher_id);
CREATE INDEX IF NOT EXISTS idx_notifications_student_id ON public.notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_conversations_teacher_id ON public.conversations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_conversations_student_id ON public.conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_library_teacher_id ON public.library(teacher_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_teacher_id ON public.activity_log(teacher_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_authenticated ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS profiles_insert_authenticated ON public.profiles;
CREATE POLICY profiles_insert_authenticated ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS profiles_update_authenticated ON public.profiles;
CREATE POLICY profiles_update_authenticated ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS profiles_delete_authenticated ON public.profiles;
CREATE POLICY profiles_delete_authenticated ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notes_select_authenticated ON public.notes;
CREATE POLICY notes_select_authenticated ON public.notes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS notes_insert_authenticated ON public.notes;
CREATE POLICY notes_insert_authenticated ON public.notes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS notes_update_authenticated ON public.notes;
CREATE POLICY notes_update_authenticated ON public.notes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS notes_delete_authenticated ON public.notes;
CREATE POLICY notes_delete_authenticated ON public.notes FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS results_select_authenticated ON public.results;
CREATE POLICY results_select_authenticated ON public.results FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS results_insert_authenticated ON public.results;
CREATE POLICY results_insert_authenticated ON public.results FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS results_update_authenticated ON public.results;
CREATE POLICY results_update_authenticated ON public.results FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS results_delete_authenticated ON public.results;
CREATE POLICY results_delete_authenticated ON public.results FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS announcements_select_authenticated ON public.announcements;
CREATE POLICY announcements_select_authenticated ON public.announcements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS announcements_insert_authenticated ON public.announcements;
CREATE POLICY announcements_insert_authenticated ON public.announcements FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS announcements_update_authenticated ON public.announcements;
CREATE POLICY announcements_update_authenticated ON public.announcements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS announcements_delete_authenticated ON public.announcements;
CREATE POLICY announcements_delete_authenticated ON public.announcements FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS notifications_select_authenticated ON public.notifications;
CREATE POLICY notifications_select_authenticated ON public.notifications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS notifications_insert_authenticated ON public.notifications;
CREATE POLICY notifications_insert_authenticated ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS notifications_update_authenticated ON public.notifications;
CREATE POLICY notifications_update_authenticated ON public.notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS notifications_delete_authenticated ON public.notifications;
CREATE POLICY notifications_delete_authenticated ON public.notifications FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS conversations_select_authenticated ON public.conversations;
CREATE POLICY conversations_select_authenticated ON public.conversations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS conversations_insert_authenticated ON public.conversations;
CREATE POLICY conversations_insert_authenticated ON public.conversations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS conversations_update_authenticated ON public.conversations;
CREATE POLICY conversations_update_authenticated ON public.conversations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS conversations_delete_authenticated ON public.conversations;
CREATE POLICY conversations_delete_authenticated ON public.conversations FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS messages_select_authenticated ON public.messages;
CREATE POLICY messages_select_authenticated ON public.messages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS messages_insert_authenticated ON public.messages;
CREATE POLICY messages_insert_authenticated ON public.messages FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS messages_update_authenticated ON public.messages;
CREATE POLICY messages_update_authenticated ON public.messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS messages_delete_authenticated ON public.messages;
CREATE POLICY messages_delete_authenticated ON public.messages FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS library_select_authenticated ON public.library;
CREATE POLICY library_select_authenticated ON public.library FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS library_insert_authenticated ON public.library;
CREATE POLICY library_insert_authenticated ON public.library FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS library_update_authenticated ON public.library;
CREATE POLICY library_update_authenticated ON public.library FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS library_delete_authenticated ON public.library;
CREATE POLICY library_delete_authenticated ON public.library FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS activity_log_select_authenticated ON public.activity_log;
CREATE POLICY activity_log_select_authenticated ON public.activity_log FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS activity_log_insert_authenticated ON public.activity_log;
CREATE POLICY activity_log_insert_authenticated ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS activity_log_update_authenticated ON public.activity_log;
CREATE POLICY activity_log_update_authenticated ON public.activity_log FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS activity_log_delete_authenticated ON public.activity_log;
CREATE POLICY activity_log_delete_authenticated ON public.activity_log FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  v_full_name text := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.email
  );
  v_username text := COALESCE(
    NEW.raw_user_meta_data->>'username',
    lower(split_part(NEW.email, '@', 1))
  );
  v_email text := COALESCE(NEW.email, '');
BEGIN
  INSERT INTO public.profiles (
    user_id,
    name,
    full_name,
    username,
    role,
    email
  )
  VALUES (
    NEW.id,
    v_full_name,
    v_full_name,
    lower(v_username),
    v_role,
    v_email
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

COMMIT;
