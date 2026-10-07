-- =============================================
-- FIX: Update constraints on mbom_reviews table
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop the restrictive constraints
ALTER TABLE public.mbom_reviews DROP CONSTRAINT IF EXISTS mbom_reviews_role_check;
ALTER TABLE public.mbom_reviews DROP CONSTRAINT IF EXISTS mbom_reviews_status_check;

-- Add updated constraints to support the new sequential eBOM workflow
ALTER TABLE public.mbom_reviews 
  ADD CONSTRAINT mbom_reviews_role_check 
  CHECK (role IN ('Manufacturing Engineer', 'Procurement Engineer', 'Design Engineer', 'Quality Engineer', 'Procurement'));

ALTER TABLE public.mbom_reviews 
  ADD CONSTRAINT mbom_reviews_status_check 
  CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Blocked'));
