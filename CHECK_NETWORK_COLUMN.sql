-- Check the network column definition in payment_intents table
-- Run this in Supabase SQL Editor to see what values are expected

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'payment_intents' 
  AND column_name = 'network'
  AND table_schema = 'public';

-- Also check if there's a CHECK constraint on the network column
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'payment_intents'::regclass
  AND contype = 'c'
  AND pg_get_constraintdef(oid) LIKE '%network%';

-- Check if network is an enum type
SELECT 
  t.typname AS enum_name,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS allowed_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN (
  SELECT udt_name 
  FROM information_schema.columns 
  WHERE table_name = 'payment_intents' 
    AND column_name = 'network'
)
GROUP BY t.typname;

