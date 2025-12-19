-- Create Demo Pediatrician User "Dr. Smith"
-- IMPORTANT: Run fix_profiles_role_constraint.sql FIRST to update the role constraint!
-- 
-- This script creates a user in Supabase Auth first, then creates the profile
-- Run this in Supabase SQL Editor

-- Step 1: Create user in auth.users table (Supabase Auth)
-- Note: This requires Supabase Auth to be enabled
DO $$
DECLARE
  new_user_id UUID;
  user_exists BOOLEAN;
  profile_exists BOOLEAN;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE username = 'Dr. Smith') INTO profile_exists;
  
  IF NOT profile_exists THEN
    -- Generate a new UUID for the user
    new_user_id := gen_random_uuid();
    
    -- Try to create user in auth.users (if Supabase Auth is enabled)
    -- Note: This might fail if auth.users table doesn't exist or requires special permissions
    BEGIN
      INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role
      )
      VALUES (
        new_user_id,
        '00000000-0000-0000-0000-000000000000',
        'dr.smith@kiddyguard.demo',
        crypt('demo_password', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"username": "Dr. Smith"}',
        FALSE,
        'authenticated'
      )
      ON CONFLICT (id) DO NOTHING;
      
      RAISE NOTICE 'Created user in auth.users with ID: %', new_user_id;
    EXCEPTION
      WHEN OTHERS THEN
        -- If auth.users insert fails, try to use an existing user ID or create without auth
        RAISE NOTICE 'Could not create auth user, trying alternative approach: %', SQLERRM;
        -- Use a fixed UUID that we'll reference
        new_user_id := '00000000-0000-0000-0000-000000000001';
    END;
    
    -- Step 2: Create profile referencing the user ID
    INSERT INTO profiles (id, username, role, family_id, wallet_address)
    VALUES (new_user_id, 'Dr. Smith', 'pediatrician', gen_random_uuid(), NULL);
    
    RAISE NOTICE 'Pediatrician user "Dr. Smith" created successfully with ID: %', new_user_id;
  ELSE
    -- Update existing user to pediatrician role
    UPDATE profiles
    SET role = 'pediatrician'
    WHERE username = 'Dr. Smith';
    
    RAISE NOTICE 'Pediatrician user "Dr. Smith" role updated';
  END IF;
END $$;

-- Alternative simpler approach if auth.users doesn't exist or causes issues:
-- Use an existing user ID from your database
-- 
-- DO $$
-- DECLARE
--   existing_user_id UUID;
--   profile_exists BOOLEAN;
-- BEGIN
--   -- Get an existing user ID (e.g., from Daddy Cool or Timmy Turner)
--   SELECT id INTO existing_user_id 
--   FROM profiles 
--   WHERE username IN ('Daddy Cool', 'Timmy Turner') 
--   LIMIT 1;
--   
--   -- If no existing users found, create a new UUID
--   IF existing_user_id IS NULL THEN
--     existing_user_id := gen_random_uuid();
--   END IF;
--   
--   -- Check if profile already exists
--   SELECT EXISTS(SELECT 1 FROM profiles WHERE username = 'Dr. Smith') INTO profile_exists;
--   
--   IF NOT profile_exists THEN
--     INSERT INTO profiles (id, username, role, family_id, wallet_address)
--     VALUES (existing_user_id, 'Dr. Smith', 'pediatrician', gen_random_uuid(), NULL);
--     RAISE NOTICE 'Created profile using user ID: %', existing_user_id;
--   ELSE
--     UPDATE profiles SET role = 'pediatrician' WHERE username = 'Dr. Smith';
--     RAISE NOTICE 'Updated existing profile';
--   END IF;
-- END $$;

-- Verify the user was created
SELECT id, username, role, family_id, created_at
FROM profiles
WHERE username = 'Dr. Smith';
