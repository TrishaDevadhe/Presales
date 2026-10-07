-- =============================================
-- FIX: Create eco_requests table
-- Run this in Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS public.eco_requests (
    id uuid default uuid_generate_v4() primary key,
    program_id uuid references public.programs(id) on delete cascade,
    title text not null,
    description text,
    priority text default 'Urgent',
    status text default 'Pending',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS and add policy
ALTER TABLE public.eco_requests DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON public.eco_requests;
CREATE POLICY "Allow All" ON public.eco_requests FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.eco_requests ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.eco_requests TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
