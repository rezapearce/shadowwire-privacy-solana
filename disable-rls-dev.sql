-- Quick fix: Disable RLS for development
-- Run this in Supabase SQL Editor

-- Disable RLS on all tables (for development only)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'wallets', 'transactions');

