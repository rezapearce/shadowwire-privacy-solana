  -- Fix Storage RLS Policies to Allow Service Role
  -- Run this in Supabase SQL Editor

  -- Drop existing policies
  DROP POLICY IF EXISTS "Families can view their own evidence" ON storage.objects;
  DROP POLICY IF EXISTS "Families can upload their own evidence" ON storage.objects;
  DROP POLICY IF EXISTS "Service role can upload evidence" ON storage.objects;

  -- RLS Policy: Allow service role to upload (bypasses all checks)
  CREATE POLICY "Service role can upload evidence"
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (
    bucket_id = 'clinical-evidence'
  );

  -- RLS Policy: Allow service role to view (for signed URLs)
  CREATE POLICY "Service role can view evidence"
  ON storage.objects
  FOR SELECT
  TO service_role
  USING (
    bucket_id = 'clinical-evidence'
  );

  -- RLS Policy: Families can SELECT (view/download) their own video evidence
  -- Only applies to authenticated users (not service role)
  CREATE POLICY "Families can view their own evidence"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'clinical-evidence'
    AND name LIKE (auth.uid()::text || '/%')
  );

  -- RLS Policy: Families can INSERT (upload) their own video evidence
  -- Only applies to authenticated users (not service role)
  CREATE POLICY "Families can upload their own evidence"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'clinical-evidence'
    AND name LIKE (auth.uid()::text || '/%')
  );
