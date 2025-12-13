-- Create Storage Bucket for Clinical Evidence (Video Evidence)
-- This bucket stores sensitive video evidence of developmental milestones
-- Run this in Supabase SQL Editor

-- Create the private bucket 'clinical-evidence'
-- Note: Buckets are created by inserting into storage.buckets table
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinical-evidence',
  'clinical-evidence',
  false, -- Private bucket (not public)
  52428800, -- 50MB file size limit (adjust as needed)
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'] -- Common video MIME types
)
ON CONFLICT (id) DO NOTHING; -- Prevent errors if bucket already exists

-- Note: RLS is already enabled on storage.objects by default in Supabase
-- We only need to create policies, not enable RLS

-- Drop existing policies for this bucket if they exist (for idempotency)
DROP POLICY IF EXISTS "Families can view their own evidence" ON storage.objects;
DROP POLICY IF EXISTS "Families can upload their own evidence" ON storage.objects;

-- RLS Policy: Families can SELECT (view/download) their own video evidence
-- Folder isolation: files must be in {user_id}/... path structure
CREATE POLICY "Families can view their own evidence"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'clinical-evidence'
  AND (
    -- Allow access if the file path starts with the authenticated user's ID
    name LIKE (auth.uid()::text || '/%')
    -- OR if using custom auth, check via profiles table
    -- Note: This assumes auth.uid() contains the user ID from profiles table
  )
);

-- RLS Policy: Families can INSERT (upload) their own video evidence
-- Folder isolation: files must be uploaded to {user_id}/... path structure
CREATE POLICY "Families can upload their own evidence"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'clinical-evidence'
  AND (
    -- Allow upload if the file path starts with the authenticated user's ID
    name LIKE (auth.uid()::text || '/%')
    -- OR if using custom auth, check via profiles table
    -- Note: This assumes auth.uid() contains the user ID from profiles table
  )
);

-- Note: COMMENT statements may require owner privileges
-- If you get permission errors, you can safely remove the COMMENT lines below
-- COMMENT ON TABLE storage.buckets IS 'Storage buckets for Supabase Storage';
-- COMMENT ON COLUMN storage.objects.bucket_id IS 'References storage.buckets.id';
-- COMMENT ON COLUMN storage.objects.name IS 'File path within bucket. For clinical-evidence, format: {user_id}/{screening_id}/{question_id}/{filename}';

-- Note: Doctor access will be handled via signed URLs generated server-side
-- using the service role key, which bypasses RLS policies
