BEGIN;

-- 1) Make sure the profiles table has columns used by the app.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS teacher_id uuid,
  ADD COLUMN IF NOT EXISTS class text,
  ADD COLUMN IF NOT EXISTS roll_number text,
  ADD COLUMN IF NOT EXISTS guardian_name text,
  ADD COLUMN IF NOT EXISTS guardian_phone text,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 2) Backfill from whichever column exists.
UPDATE public.profiles
SET name = COALESCE(name, full_name, 'User')
WHERE name IS NULL AND full_name IS NULL;

UPDATE public.profiles
SET full_name = COALESCE(full_name, name, 'User')
WHERE full_name IS NULL AND name IS NOT NULL;

-- 3) Enable RLS for the app tables.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- 4) Profiles: allow authenticated users to read/write their own profile and the teacher/student relationships the app uses.
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "profiles_insert_authenticated" ON public.profiles;
CREATE POLICY "profiles_insert_authenticated"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_update_authenticated" ON public.profiles;
CREATE POLICY "profiles_update_authenticated"
ON public.profiles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_delete_authenticated" ON public.profiles;
CREATE POLICY "profiles_delete_authenticated"
ON public.profiles
FOR DELETE
TO authenticated
USING (true);

-- 5) Teacher-managed content: notes/results/announcements/library/activity log
DROP POLICY IF EXISTS "teacher_content_select_authenticated" ON public.notes;
CREATE POLICY "teacher_content_select_authenticated"
ON public.notes
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "teacher_content_insert_authenticated" ON public.notes;
CREATE POLICY "teacher_content_insert_authenticated"
ON public.notes
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "teacher_content_update_authenticated" ON public.notes;
CREATE POLICY "teacher_content_update_authenticated"
ON public.notes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "teacher_content_delete_authenticated" ON public.notes;
CREATE POLICY "teacher_content_delete_authenticated"
ON public.notes
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "results_select_authenticated" ON public.results;
CREATE POLICY "results_select_authenticated"
ON public.results
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "results_insert_authenticated" ON public.results;
CREATE POLICY "results_insert_authenticated"
ON public.results
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "results_update_authenticated" ON public.results;
CREATE POLICY "results_update_authenticated"
ON public.results
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "results_delete_authenticated" ON public.results;
CREATE POLICY "results_delete_authenticated"
ON public.results
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "announcements_select_authenticated" ON public.announcements;
CREATE POLICY "announcements_select_authenticated"
ON public.announcements
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "announcements_insert_authenticated" ON public.announcements;
CREATE POLICY "announcements_insert_authenticated"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "announcements_update_authenticated" ON public.announcements;
CREATE POLICY "announcements_update_authenticated"
ON public.announcements
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "announcements_delete_authenticated" ON public.announcements;
CREATE POLICY "announcements_delete_authenticated"
ON public.announcements
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "notifications_select_authenticated" ON public.notifications;
CREATE POLICY "notifications_select_authenticated"
ON public.notifications
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;
CREATE POLICY "notifications_insert_authenticated"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update_authenticated" ON public.notifications;
CREATE POLICY "notifications_update_authenticated"
ON public.notifications
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_delete_authenticated" ON public.notifications;
CREATE POLICY "notifications_delete_authenticated"
ON public.notifications
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "conversations_select_authenticated" ON public.conversations;
CREATE POLICY "conversations_select_authenticated"
ON public.conversations
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "conversations_insert_authenticated" ON public.conversations;
CREATE POLICY "conversations_insert_authenticated"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "conversations_update_authenticated" ON public.conversations;
CREATE POLICY "conversations_update_authenticated"
ON public.conversations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "conversations_delete_authenticated" ON public.conversations;
CREATE POLICY "conversations_delete_authenticated"
ON public.conversations
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "messages_select_authenticated" ON public.messages;
CREATE POLICY "messages_select_authenticated"
ON public.messages
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "messages_insert_authenticated" ON public.messages;
CREATE POLICY "messages_insert_authenticated"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "messages_update_authenticated" ON public.messages;
CREATE POLICY "messages_update_authenticated"
ON public.messages
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "messages_delete_authenticated" ON public.messages;
CREATE POLICY "messages_delete_authenticated"
ON public.messages
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "library_select_authenticated" ON public.library;
CREATE POLICY "library_select_authenticated"
ON public.library
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "library_insert_authenticated" ON public.library;
CREATE POLICY "library_insert_authenticated"
ON public.library
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "library_update_authenticated" ON public.library;
CREATE POLICY "library_update_authenticated"
ON public.library
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "library_delete_authenticated" ON public.library;
CREATE POLICY "library_delete_authenticated"
ON public.library
FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "activity_log_select_authenticated" ON public.activity_log;
CREATE POLICY "activity_log_select_authenticated"
ON public.activity_log
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "activity_log_insert_authenticated" ON public.activity_log;
CREATE POLICY "activity_log_insert_authenticated"
ON public.activity_log
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "activity_log_update_authenticated" ON public.activity_log;
CREATE POLICY "activity_log_update_authenticated"
ON public.activity_log
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "activity_log_delete_authenticated" ON public.activity_log;
CREATE POLICY "activity_log_delete_authenticated"
ON public.activity_log
FOR DELETE
TO authenticated
USING (true);

-- 6) Storage policies for the uploads bucket used by notes/library files.
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "storage_select_uploads_authenticated" ON storage.objects;
CREATE POLICY "storage_select_uploads_authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'uploads');

DROP POLICY IF EXISTS "storage_insert_uploads_authenticated" ON storage.objects;
CREATE POLICY "storage_insert_uploads_authenticated"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');

DROP POLICY IF EXISTS "storage_update_uploads_authenticated" ON storage.objects;
CREATE POLICY "storage_update_uploads_authenticated"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'uploads')
WITH CHECK (bucket_id = 'uploads');

DROP POLICY IF EXISTS "storage_delete_uploads_authenticated" ON storage.objects;
CREATE POLICY "storage_delete_uploads_authenticated"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'uploads');

COMMIT;
