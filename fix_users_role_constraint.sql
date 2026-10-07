-- =============================================
-- FIX: Update users table role constraint
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Drop the existing constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Add the updated constraint including Manufacturing and Procurement Engineers
ALTER TABLE public.users 
  ADD CONSTRAINT users_role_check 
  CHECK (role IN (
    'Program Manager', 
    'Lead Engineer', 
    'Chief Engineer', 
    'Design Engineer', 
    'Validation Engineer', 
    'Quality Engineer', 
    'Supplier Engineer', 
    'Admin',
    'Manufacturing Engineer',
    'Procurement Engineer'
  ));
