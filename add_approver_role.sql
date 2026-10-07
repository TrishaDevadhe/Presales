-- =============================================
-- FIX: Add missing 'approver_role' column to approvals table
-- Run this in Supabase SQL Editor
-- =============================================

ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS approver_role text;

NOTIFY pgrst, 'reload schema';
