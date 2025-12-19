-- Verify and Fix Storage RLS Policies
-- Run this in Supabase SQL Editor to ensure service role can upload

-- First, check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
ORDER BY policyname;

-- Drop ALL existing policies for clinical-evidence bucket
DROP POLICY IF EXISTS "Families can view their own evidence" ON storage.objects;
DROP POLICY IF EXISTS "Families can upload their own evidence" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload evidence" ON storage.objects;
DROP POLICY IF EXISTS "Service role can view evidence" ON storage.objects;
DROP POLICY IF EXISTS "Service role bypass" ON storage.objects;

-- CRITICAL: Create policy that allows service_role to bypass RLS completely
-- Service role should bypass RLS, but explicit policy ensures it works
CREATE POLICY "Service role full access"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'clinical-evidence')
WITH CHECK (bucket_id = 'clinical-evidence');

-- RLS Policy: Families can SELECT (view/download) their own video evidence
CREATE POLICY "Families can view their own evidence"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'clinical-evidence'
  AND name LIKE (auth.uid()::text || '/%')
);

-- RLS Policy: Families can INSERT (upload) their own video evidence
CREATE POLICY "Families can upload their own evidence"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'clinical-evidence'
  AND name LIKE (auth.uid()::text || '/%')
);

-- Verify policies were created
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%evidence%'
ORDER BY policyname;
