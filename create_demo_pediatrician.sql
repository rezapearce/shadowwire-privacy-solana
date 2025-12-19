-- Create Demo Pediatrician User
-- Run this in Supabase SQL Editor to create the "Dr. Smith" user for pediatrician login

-- First, check if the user already exists
DO $$
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE username = 'Dr. Smith') THEN
    -- Insert new pediatrician user
    INSERT INTO profiles (username, role, family_id)
    VALUES ('Dr. Smith', 'pediatrician', gen_random_uuid());
    
    RAISE NOTICE 'Pediatrician user "Dr. Smith" created successfully';
  ELSE
    -- Update existing user to pediatrician role if needed
    UPDATE profiles
    SET role = 'pediatrician'
    WHERE username = 'Dr. Smith' AND role != 'pediatrician';
    
    RAISE NOTICE 'Pediatrician user "Dr. Smith" already exists (role updated if needed)';
  END IF;
END $$;

-- Verify the user was created/updated
SELECT id, username, role, family_id, created_at
FROM profiles
WHERE username = 'Dr. Smith';

-- Expected output: One row with username='Dr. Smith' and role='pediatrician'

