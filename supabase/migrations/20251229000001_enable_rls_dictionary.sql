-- Migration: 20251229000001_enable_rls_dictionary
-- Description: Enable RLS on dictionary table - service role only access
-- Author: AI Assistant
-- Date: 2025-12-29
--
-- The dictionary table is accessed via backend admin routes using service role.
-- It is NOT exposed to public/anonymous clients.
-- This migration enables RLS with service_role-only policies.

-- Enable RLS
ALTER TABLE public.dictionary ENABLE ROW LEVEL SECURITY;

-- Policy: Only service_role can read dictionary
-- (Admin API routes use service role key)
CREATE POLICY "dictionary_service_role_read" ON public.dictionary
FOR SELECT TO service_role
USING (true);

-- Policy: Only service_role can write dictionary
CREATE POLICY "dictionary_service_role_write" ON public.dictionary
FOR INSERT, UPDATE, DELETE TO service_role
USING (true)
WITH CHECK (true);

-- Note: No anon or authenticated policies = no client-side access
-- All dictionary access goes through /api/admin/* routes which use service role

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'dictionary';

-- Check policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'dictionary';

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================

-- ALTER TABLE public.dictionary DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "dictionary_service_role_read" ON public.dictionary;
-- DROP POLICY IF EXISTS "dictionary_service_role_write" ON public.dictionary;

