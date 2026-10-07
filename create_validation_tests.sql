-- =============================================
-- FIX: Create validation_tests table
-- Run this in Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS public.validation_tests (
    id uuid default uuid_generate_v4() primary key,
    prototype_id uuid references public.prototype_builds(id) on delete cascade,
    test_name text not null,
    test_category text,
    status text default 'Scheduled',
    failure_reason text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS and add policy
ALTER TABLE public.validation_tests DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON public.validation_tests;
CREATE POLICY "Allow All" ON public.validation_tests FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.validation_tests ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.validation_tests TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
