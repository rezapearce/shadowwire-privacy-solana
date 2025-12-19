-- Create Demo Pediatrician User
-- IMPORTANT: Run fix_profiles_role_constraint.sql FIRST to update the role constraint!
-- Run this in Supabase SQL Editor to create the "Dr. Smith" user for pediatrician login

-- Insert pediatrician user with explicit ID generation
-- If user already exists, update the role instead
DO $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- Check if user already exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE username = 'Dr. Smith') INTO user_exists;
  
  IF NOT user_exists THEN
    -- Insert new pediatrician user
    INSERT INTO profiles (id, username, role, family_id, wallet_address)
    VALUES (gen_random_uuid(), 'Dr. Smith', 'pediatrician', gen_random_uuid(), NULL);
    
    RAISE NOTICE 'Pediatrician user "Dr. Smith" created successfully';
  ELSE
    -- Update existing user to pediatrician role
    UPDATE profiles
    SET role = 'pediatrician'
    WHERE username = 'Dr. Smith';
    
    RAISE NOTICE 'Pediatrician user "Dr. Smith" role updated';
  END IF;
END $$;

-- Alternative: If ON CONFLICT doesn't work (no unique constraint on username),
-- use this approach instead:
-- 
-- DO $$
-- DECLARE
--   user_exists BOOLEAN;
-- BEGIN
--   SELECT EXISTS(SELECT 1 FROM profiles WHERE username = 'Dr. Smith') INTO user_exists;
--   
--   IF NOT user_exists THEN
--     INSERT INTO profiles (id, username, role, family_id, wallet_address)
--     VALUES (gen_random_uuid(), 'Dr. Smith', 'pediatrician', gen_random_uuid(), NULL);
--   ELSE
--     UPDATE profiles
--     SET role = 'pediatrician'
--     WHERE username = 'Dr. Smith';
--   END IF;
-- END $$;

-- Verify the user was created/updated
SELECT id, username, role, family_id, wallet_address, created_at
FROM profiles
WHERE username = 'Dr. Smith';

-- Expected output: One row with username='Dr. Smith' and role='pediatrician'

