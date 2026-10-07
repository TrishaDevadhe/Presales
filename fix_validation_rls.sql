-- =============================================
-- FIX: Enable Validation Tests and ECO Requests visibility
-- Run this in Supabase SQL Editor
-- =============================================

DO $$ BEGIN
  ALTER TABLE public.validation_tests DISABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Allow All" ON public.validation_tests;
  CREATE POLICY "Allow All" ON public.validation_tests FOR ALL USING (true) WITH CHECK (true);
  ALTER TABLE public.validation_tests ENABLE ROW LEVEL SECURITY;
  GRANT ALL ON public.validation_tests TO authenticated, anon;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'validation_tests does not exist, skipping.';
END $$;

DO $$ BEGIN
  ALTER TABLE public.eco_requests DISABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "Allow All" ON public.eco_requests;
  CREATE POLICY "Allow All" ON public.eco_requests FOR ALL USING (true) WITH CHECK (true);
  ALTER TABLE public.eco_requests ENABLE ROW LEVEL SECURITY;
  GRANT ALL ON public.eco_requests TO authenticated, anon;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'eco_requests does not exist, skipping.';
END $$;

NOTIFY pgrst, 'reload schema';
