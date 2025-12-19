-- Fix Payment Intent Schema Cache Issue
-- Run this in Supabase SQL Editor

-- Check if screening_id column exists (it shouldn't)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payment_intents' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- If screening_id column exists, drop it (it shouldn't be there)
-- ALTER TABLE payment_intents DROP COLUMN IF EXISTS screening_id;

-- Refresh schema cache (this might help Supabase recognize the correct schema)
NOTIFY pgrst, 'reload schema';

-- Verify payment_intents table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'payment_intents'
  AND table_schema = 'public'
ORDER BY ordinal_position;
