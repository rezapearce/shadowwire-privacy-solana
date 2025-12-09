-- Fix RLS policies for development
-- Run this in Supabase SQL Editor

-- First, let's see what policies exist
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Drop existing problematic policies (if any)
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_policy" ON profiles;

-- Create a simple policy that allows reading profiles (for development)
-- This allows anyone with the anon key to read profiles
CREATE POLICY "Allow public read access to profiles"
ON profiles
FOR SELECT
USING (true);

-- If you want to allow inserts/updates as well (for development):
CREATE POLICY "Allow public insert access to profiles"
ON profiles
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update access to profiles"
ON profiles
FOR UPDATE
USING (true);

-- Similar policies for wallets table
DROP POLICY IF EXISTS "wallets_select_policy" ON wallets;
DROP POLICY IF EXISTS "wallets_policy" ON wallets;

CREATE POLICY "Allow public read access to wallets"
ON wallets
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access to wallets"
ON wallets
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update access to wallets"
ON wallets
FOR UPDATE
USING (true);

-- Similar policies for transactions table
DROP POLICY IF EXISTS "transactions_select_policy" ON transactions;
DROP POLICY IF EXISTS "transactions_policy" ON transactions;

CREATE POLICY "Allow public read access to transactions"
ON transactions
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access to transactions"
ON transactions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update access to transactions"
ON transactions
FOR UPDATE
USING (true);

