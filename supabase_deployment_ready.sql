BEGIN;

-- 1) Ensure core columns exist on profiles.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
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
  END IF;
END $$;

-- 2) Backfill profile name fields if the table exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    UPDATE public.profiles
    SET name = COALESCE(name, full_name, 'User')
    WHERE name IS NULL AND full_name IS NULL;

    UPDATE public.profiles
    SET full_name = COALESCE(full_name, name, 'User')
    WHERE full_name IS NULL AND name IS NOT NULL;
  END IF;
END $$;

-- 3) Enable RLS and reset policies only for tables that exist.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
    ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'results') THEN
    ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'announcements') THEN
    ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'library') THEN
    ALTER TABLE public.library ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_log') THEN
    ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles','notes','results','announcements','notifications','conversations','messages','library','activity_log')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 4) Create permissive policies for the tables that exist.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
    CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "profiles_insert_authenticated" ON public.profiles;
    CREATE POLICY "profiles_insert_authenticated" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);

    DROP POLICY IF EXISTS "profiles_update_authenticated" ON public.profiles;
    CREATE POLICY "profiles_update_authenticated" ON public.profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "profiles_delete_authenticated" ON public.profiles;
    CREATE POLICY "profiles_delete_authenticated" ON public.profiles FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
    DROP POLICY IF EXISTS "teacher_content_select_authenticated" ON public.notes;
    CREATE POLICY "teacher_content_select_authenticated" ON public.notes FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "teacher_content_insert_authenticated" ON public.notes;
    CREATE POLICY "teacher_content_insert_authenticated" ON public.notes FOR INSERT TO authenticated WITH CHECK (true);

    DROP POLICY IF EXISTS "teacher_content_update_authenticated" ON public.notes;
    CREATE POLICY "teacher_content_update_authenticated" ON public.notes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "teacher_content_delete_authenticated" ON public.notes;
    CREATE POLICY "teacher_content_delete_authenticated" ON public.notes FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'results') THEN
    DROP POLICY IF EXISTS "results_select_authenticated" ON public.results;
    CREATE POLICY "results_select_authenticated" ON public.results FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "results_insert_authenticated" ON public.results;
    CREATE POLICY "results_insert_authenticated" ON public.results FOR INSERT TO authenticated WITH CHECK (true);

    DROP POLICY IF EXISTS "results_update_authenticated" ON public.results;
    CREATE POLICY "results_update_authenticated" ON public.results FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "results_delete_authenticated" ON public.results;
    CREATE POLICY "results_delete_authenticated" ON public.results FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'announcements') THEN
    DROP POLICY IF EXISTS "announcements_select_authenticated" ON public.announcements;
    CREATE POLICY "announcements_select_authenticated" ON public.announcements FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "announcements_insert_authenticated" ON public.announcements;
    CREATE POLICY "announcements_insert_authenticated" ON public.announcements FOR INSERT TO authenticated WITH CHECK (true);

    DROP POLICY IF EXISTS "announcements_update_authenticated" ON public.announcements;
    CREATE POLICY "announcements_update_authenticated" ON public.announcements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "announcements_delete_authenticated" ON public.announcements;
    CREATE POLICY "announcements_delete_authenticated" ON public.announcements FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    DROP POLICY IF EXISTS "notifications_select_authenticated" ON public.notifications;
    CREATE POLICY "notifications_select_authenticated" ON public.notifications FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;
    CREATE POLICY "notifications_insert_authenticated" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

    DROP POLICY IF EXISTS "notifications_update_authenticated" ON public.notifications;
    CREATE POLICY "notifications_update_authenticated" ON public.notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "notifications_delete_authenticated" ON public.notifications;
    CREATE POLICY "notifications_delete_authenticated" ON public.notifications FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    DROP POLICY IF EXISTS "conversations_select_authenticated" ON public.conversations;
    CREATE POLICY "conversations_select_authenticated" ON public.conversations FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "conversations_insert_authenticated" ON public.conversations;
    CREATE POLICY "conversations_insert_authenticated" ON public.conversations FOR INSERT TO authenticated WITH CHECK (true);

    DROP POLICY IF EXISTS "conversations_update_authenticated" ON public.conversations;
    CREATE POLICY "conversations_update_authenticated" ON public.conversations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "conversations_delete_authenticated" ON public.conversations;
    CREATE POLICY "conversations_delete_authenticated" ON public.conversations FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    DROP POLICY IF EXISTS "messages_select_authenticated" ON public.messages;
    CREATE POLICY "messages_select_authenticated" ON public.messages FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "messages_insert_authenticated" ON public.messages;
    CREATE POLICY "messages_insert_authenticated" ON public.messages FOR INSERT TO authenticated WITH CHECK (true);

    DROP POLICY IF EXISTS "messages_update_authenticated" ON public.messages;
    CREATE POLICY "messages_update_authenticated" ON public.messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "messages_delete_authenticated" ON public.messages;
    CREATE POLICY "messages_delete_authenticated" ON public.messages FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'library') THEN
    DROP POLICY IF EXISTS "library_select_authenticated" ON public.library;
    CREATE POLICY "library_select_authenticated" ON public.library FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "library_insert_authenticated" ON public.library;
    CREATE POLICY "library_insert_authenticated" ON public.library FOR INSERT TO authenticated WITH CHECK (true);

    DROP POLICY IF EXISTS "library_update_authenticated" ON public.library;
    CREATE POLICY "library_update_authenticated" ON public.library FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "library_delete_authenticated" ON public.library;
    CREATE POLICY "library_delete_authenticated" ON public.library FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_log') THEN
    DROP POLICY IF EXISTS "activity_log_select_authenticated" ON public.activity_log;
    CREATE POLICY "activity_log_select_authenticated" ON public.activity_log FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "activity_log_insert_authenticated" ON public.activity_log;
    CREATE POLICY "activity_log_insert_authenticated" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

    DROP POLICY IF EXISTS "activity_log_update_authenticated" ON public.activity_log;
    CREATE POLICY "activity_log_update_authenticated" ON public.activity_log FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "activity_log_delete_authenticated" ON public.activity_log;
    CREATE POLICY "activity_log_delete_authenticated" ON public.activity_log FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

COMMIT;
