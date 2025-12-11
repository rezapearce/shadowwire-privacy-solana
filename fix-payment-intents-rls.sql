-- Fix RLS policies for payment_intents table
-- Run this in Supabase SQL Editor
-- This allows server actions to insert payment intents without authentication context

-- Drop existing policies
DROP POLICY IF EXISTS "Families can view their own payment intents" ON payment_intents;
DROP POLICY IF EXISTS "Families can insert their own payment intents" ON payment_intents;
DROP POLICY IF EXISTS "Families can update their own payment intents" ON payment_intents;

-- For development: Allow public read access to payment intents
-- (In production, you'd want to restrict this based on family_id)
CREATE POLICY "Allow public read access to payment intents"
ON payment_intents
FOR SELECT
USING (true);

-- For development: Allow public insert access to payment intents
-- (In production, you'd want to verify family_id matches authenticated user)
CREATE POLICY "Allow public insert access to payment intents"
ON payment_intents
FOR INSERT
WITH CHECK (true);

-- For development: Allow public update access to payment intents
-- (In production, you'd want to restrict updates to same family_id)
CREATE POLICY "Allow public update access to payment intents"
ON payment_intents
FOR UPDATE
USING (true);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'payment_intents';
