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
CREATE POLICY profiles_select_authenticated ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS profiles_insert_authenticated ON public.profiles;
CREATE POLICY profiles_insert_authenticated ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR (role = 'student' AND teacher_id = auth.uid())
  OR (role = 'teacher' AND auth.uid() = user_id)
  OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS profiles_update_authenticated ON public.profiles;
CREATE POLICY profiles_update_authenticated ON public.profiles
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR (role = 'student' AND teacher_id = auth.uid())
  OR auth.uid() IS NOT NULL
)
WITH CHECK (
  auth.uid() = user_id
  OR (role = 'student' AND teacher_id = auth.uid())
  OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS profiles_delete_authenticated ON public.profiles;
CREATE POLICY profiles_delete_authenticated ON public.profiles
FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR (role = 'student' AND teacher_id = auth.uid())
  OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS notes_select_authenticated ON public.notes;
CREATE POLICY notes_select_authenticated ON public.notes
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS notes_insert_authenticated ON public.notes;
CREATE POLICY notes_insert_authenticated ON public.notes
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS notes_update_authenticated ON public.notes;
CREATE POLICY notes_update_authenticated ON public.notes
FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS notes_delete_authenticated ON public.notes;
CREATE POLICY notes_delete_authenticated ON public.notes
FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS results_select_authenticated ON public.results;
CREATE POLICY results_select_authenticated ON public.results
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS results_insert_authenticated ON public.results;
CREATE POLICY results_insert_authenticated ON public.results
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS results_update_authenticated ON public.results;
CREATE POLICY results_update_authenticated ON public.results
FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS results_delete_authenticated ON public.results;
CREATE POLICY results_delete_authenticated ON public.results
FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS announcements_select_authenticated ON public.announcements;
CREATE POLICY announcements_select_authenticated ON public.announcements
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS announcements_insert_authenticated ON public.announcements;
CREATE POLICY announcements_insert_authenticated ON public.announcements
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS announcements_update_authenticated ON public.announcements;
CREATE POLICY announcements_update_authenticated ON public.announcements
FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS announcements_delete_authenticated ON public.announcements;
CREATE POLICY announcements_delete_authenticated ON public.announcements
FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS notifications_select_authenticated ON public.notifications;
CREATE POLICY notifications_select_authenticated ON public.notifications
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS notifications_insert_authenticated ON public.notifications;
CREATE POLICY notifications_insert_authenticated ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS notifications_update_authenticated ON public.notifications;
CREATE POLICY notifications_update_authenticated ON public.notifications
FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS notifications_delete_authenticated ON public.notifications;
CREATE POLICY notifications_delete_authenticated ON public.notifications
FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS conversations_select_authenticated ON public.conversations;
CREATE POLICY conversations_select_authenticated ON public.conversations
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS conversations_insert_authenticated ON public.conversations;
CREATE POLICY conversations_insert_authenticated ON public.conversations
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS conversations_update_authenticated ON public.conversations;
CREATE POLICY conversations_update_authenticated ON public.conversations
FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS conversations_delete_authenticated ON public.conversations;
CREATE POLICY conversations_delete_authenticated ON public.conversations
FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS messages_select_authenticated ON public.messages;
CREATE POLICY messages_select_authenticated ON public.messages
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS messages_insert_authenticated ON public.messages;
CREATE POLICY messages_insert_authenticated ON public.messages
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS messages_update_authenticated ON public.messages;
CREATE POLICY messages_update_authenticated ON public.messages
FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS messages_delete_authenticated ON public.messages;
CREATE POLICY messages_delete_authenticated ON public.messages
FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS library_select_authenticated ON public.library;
CREATE POLICY library_select_authenticated ON public.library
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS library_insert_authenticated ON public.library;
CREATE POLICY library_insert_authenticated ON public.library
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS library_update_authenticated ON public.library;
CREATE POLICY library_update_authenticated ON public.library
FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS library_delete_authenticated ON public.library;
CREATE POLICY library_delete_authenticated ON public.library
FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS activity_log_select_authenticated ON public.activity_log;
CREATE POLICY activity_log_select_authenticated ON public.activity_log
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS activity_log_insert_authenticated ON public.activity_log;
CREATE POLICY activity_log_insert_authenticated ON public.activity_log
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS activity_log_update_authenticated ON public.activity_log;
CREATE POLICY activity_log_update_authenticated ON public.activity_log
FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS activity_log_delete_authenticated ON public.activity_log;
CREATE POLICY activity_log_delete_authenticated ON public.activity_log
FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL);

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

CREATE OR REPLACE FUNCTION public.ensure_profile_for_user(
  p_user_id uuid,
  p_role text DEFAULT 'student',
  p_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_teacher_id uuid DEFAULT NULL,
  p_class text DEFAULT NULL,
  p_username text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    name,
    full_name,
    email,
    username,
    role,
    teacher_id,
    class
  )
  VALUES (
    p_user_id,
    COALESCE(NULLIF(p_name, ''), split_part(COALESCE(p_email, ''), '@', 1), 'User'),
    COALESCE(NULLIF(p_name, ''), split_part(COALESCE(p_email, ''), '@', 1), 'User'),
    p_email,
    COALESCE(NULLIF(p_username, ''), lower(split_part(COALESCE(p_email, ''), '@', 1))),
    COALESCE(NULLIF(p_role, ''), 'student'),
    p_teacher_id,
    p_class
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    name = COALESCE(NULLIF(EXCLUDED.name, ''), public.profiles.name),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    email = COALESCE(NULLIF(EXCLUDED.email, ''), public.profiles.email),
    username = COALESCE(NULLIF(EXCLUDED.username, ''), public.profiles.username),
    role = COALESCE(NULLIF(EXCLUDED.role, ''), public.profiles.role),
    teacher_id = COALESCE(EXCLUDED.teacher_id, public.profiles.teacher_id),
    class = COALESCE(NULLIF(EXCLUDED.class, ''), public.profiles.class);
END;
$$;

CREATE OR REPLACE FUNCTION public.send_notification_to_student(
  p_student_user_id uuid,
  p_message text,
  p_type text DEFAULT 'announcement'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.ensure_profile_for_user(
    p_user_id => p_student_user_id,
    p_role => 'student'
  );

  INSERT INTO public.notifications (student_id, type, message, read, date)
  VALUES (p_student_user_id, p_type, p_message, false, now());
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_linked_students_on_announcement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT user_id
    FROM public.profiles
    WHERE role = 'student'
      AND teacher_id = NEW.teacher_id
      AND (NEW.class_scope = 'All Classes' OR class = NEW.class_scope)
  LOOP
    PERFORM public.send_notification_to_student(
      p_student_user_id => r.user_id,
      p_message => 'New announcement: ' || NEW.title,
      p_type => 'announcement'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_linked_students_on_announcement ON public.announcements;
CREATE TRIGGER trg_notify_linked_students_on_announcement
AFTER INSERT ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.notify_linked_students_on_announcement();

COMMIT;
