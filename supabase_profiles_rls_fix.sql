BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated users to read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert profiles" ON public.profiles;
CREATE POLICY "Allow authenticated users to insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update profiles" ON public.profiles;
CREATE POLICY "Allow authenticated users to update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete profiles" ON public.profiles;
CREATE POLICY "Allow authenticated users to delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (true);

COMMIT;
