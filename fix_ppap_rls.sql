-- =============================================
-- FIX: Enable PPAP Submissions visibility & inserts
-- Run this in Supabase SQL Editor
-- =============================================

ALTER TABLE public.ppap_submissions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow All" ON public.ppap_submissions;

CREATE POLICY "Allow All" ON public.ppap_submissions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.ppap_submissions ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.ppap_submissions TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
