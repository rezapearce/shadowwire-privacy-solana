-- Add default value to network column as a safety net
-- This prevents NOT NULL violations even if code sends null
-- Run this in Supabase SQL Editor

ALTER TABLE payment_intents 
ALTER COLUMN network SET DEFAULT 'solana-devnet';

-- Verify the change
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'payment_intents' 
  AND column_name = 'network'
  AND table_schema = 'public';

