-- =============================================
-- FIX: Create missing DDR and Design Task tables
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Create design_tasks table
CREATE TABLE IF NOT EXISTS public.design_tasks (
    id uuid default uuid_generate_v4() primary key,
    program_id uuid references public.programs(id) on delete cascade,
    task_name text not null,
    status text check (status in ('Not Started', 'In Progress', 'DDR Review', 'Completed')) default 'Not Started',
    assigned_to uuid references public.users(id),
    due_date date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create ddr_reviews table
CREATE TABLE IF NOT EXISTS public.ddr_reviews (
    id uuid default uuid_generate_v4() primary key,
    task_id uuid references public.design_tasks(id) on delete cascade,
    program_id uuid references public.programs(id) on delete cascade,
    cad_file_id uuid references public.cad_files(id),
    title text,
    status text check (status in ('Pending', 'Under Review', 'Approved', 'Resolved')) default 'Pending',
    current_stage text,
    created_by uuid references public.users(id),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Add ddr_id to ddr_comments
ALTER TABLE public.ddr_comments ADD COLUMN IF NOT EXISTS ddr_id uuid references public.ddr_reviews(id) on delete cascade;

-- 4. Set RLS Policies to allow access
ALTER TABLE public.design_tasks DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON public.design_tasks;
CREATE POLICY "Allow All" ON public.design_tasks FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.design_tasks ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.design_tasks TO authenticated, anon;

ALTER TABLE public.ddr_reviews DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON public.ddr_reviews;
CREATE POLICY "Allow All" ON public.ddr_reviews FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.ddr_reviews ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ddr_reviews TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
