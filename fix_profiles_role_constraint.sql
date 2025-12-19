-- Fix profiles table role constraint to include 'pediatrician'
-- Run this FIRST before creating the pediatrician user

-- Step 1: Drop the existing check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 2: Create a new constraint that includes 'pediatrician'
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('parent', 'child', 'pediatrician'));

-- Step 3: Verify the constraint was updated
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
AND conname = 'profiles_role_check';

-- Expected output should show: CHECK (role IN ('parent', 'child', 'pediatrician'))

