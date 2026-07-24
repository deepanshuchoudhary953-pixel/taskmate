BEGIN;

-- Add the new email column to profiles.
ALTER TABLE public.profiles
ADD COLUMN email text;

-- Backfill email values from Supabase Auth users if possible.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND p.email IS NULL;

-- Ensure all rows now have an email before enforcing NOT NULL.
-- If this fails, inspect missing rows and fix them manually.
ALTER TABLE public.profiles
ALTER COLUMN email SET NOT NULL;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_email_key UNIQUE (email);

COMMIT;
