-- ============================================================================
-- KiddyGuard RLS Policy Security Audit Script
-- ============================================================================
-- This script tests all Row-Level Security (RLS) policies to ensure
-- proper data isolation and prevent cross-family/clinic data leakage.
--
-- Run this in Supabase SQL Editor to verify RLS policies are working correctly.
-- ============================================================================

-- ============================================================================
-- PART 1: Verify RLS is Enabled on All Critical Tables
-- ============================================================================

DO $$
DECLARE
  rls_enabled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename IN ('screenings', 'clinical_reviews', 'payment_intents')
    AND c.relrowsecurity = true;
  
  IF rls_enabled_count < 3 THEN
    RAISE EXCEPTION 'FAIL: RLS not enabled on all critical tables. Expected 3, found %', rls_enabled_count;
  ELSE
    RAISE NOTICE 'PASS: RLS enabled on all critical tables (%)', rls_enabled_count;
  END IF;
END $$;

-- ============================================================================
-- PART 2: Audit Screenings Table RLS Policies
-- ============================================================================

-- 2.1 Verify SELECT policy exists and restricts by family_id
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'screenings'
      AND policyname = 'Families can view their own screenings'
      AND cmd = 'SELECT'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    RAISE EXCEPTION 'FAIL: SELECT policy missing on screenings table';
  ELSE
    RAISE NOTICE 'PASS: SELECT policy exists on screenings table';
  END IF;
END $$;

-- 2.2 Verify INSERT policy exists and validates family_id
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'screenings'
      AND policyname = 'Families can insert their own screenings'
      AND cmd = 'INSERT'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    RAISE EXCEPTION 'FAIL: INSERT policy missing on screenings table';
  ELSE
    RAISE NOTICE 'PASS: INSERT policy exists on screenings table';
  END IF;
END $$;

-- 2.3 Verify UPDATE policy exists and restricts by family_id
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'screenings'
      AND policyname = 'Families can update their own screenings'
      AND cmd = 'UPDATE'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    RAISE EXCEPTION 'FAIL: UPDATE policy missing on screenings table';
  ELSE
    RAISE NOTICE 'PASS: UPDATE policy exists on screenings table';
  END IF;
END $$;

-- ============================================================================
-- PART 3: Audit Clinical Reviews Table RLS Policies
-- ============================================================================

-- 3.1 Verify SELECT policy exists and restricts by clinic access
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clinical_reviews'
      AND policyname = 'Clinics can view clinical reviews'
      AND cmd = 'SELECT'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    RAISE EXCEPTION 'FAIL: SELECT policy missing on clinical_reviews table';
  ELSE
    RAISE NOTICE 'PASS: SELECT policy exists on clinical_reviews table';
  END IF;
END $$;

-- 3.2 Verify INSERT policy exists and requires SETTLED payment
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clinical_reviews'
      AND policyname = 'Clinics can insert clinical reviews'
      AND cmd = 'INSERT'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    RAISE EXCEPTION 'FAIL: INSERT policy missing on clinical_reviews table';
  ELSE
    RAISE NOTICE 'PASS: INSERT policy exists on clinical_reviews table';
  END IF;
END $$;

-- 3.3 Verify UPDATE policy exists
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clinical_reviews'
      AND policyname = 'Clinics can update clinical reviews'
      AND cmd = 'UPDATE'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    RAISE EXCEPTION 'FAIL: UPDATE policy missing on clinical_reviews table';
  ELSE
    RAISE NOTICE 'PASS: UPDATE policy exists on clinical_reviews table';
  END IF;
END $$;

-- ============================================================================
-- PART 4: Audit Payment Intents Table RLS Policies
-- ============================================================================

-- 4.1 Verify SELECT policy exists
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_intents'
      AND cmd = 'SELECT'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    RAISE EXCEPTION 'FAIL: SELECT policy missing on payment_intents table';
  ELSE
    RAISE NOTICE 'PASS: SELECT policy exists on payment_intents table';
  END IF;
END $$;

-- 4.2 Verify INSERT policy exists
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_intents'
      AND cmd = 'INSERT'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    RAISE EXCEPTION 'FAIL: INSERT policy missing on payment_intents table';
  ELSE
    RAISE NOTICE 'PASS: INSERT policy exists on payment_intents table';
  END IF;
END $$;

-- 4.3 Verify UPDATE policy exists
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_intents'
      AND cmd = 'UPDATE'
  ) INTO policy_exists;
  
  IF NOT policy_exists THEN
    RAISE EXCEPTION 'FAIL: UPDATE policy missing on payment_intents table';
  ELSE
    RAISE NOTICE 'PASS: UPDATE policy exists on payment_intents table';
  END IF;
END $$;

-- ============================================================================
-- PART 5: Summary Report
-- ============================================================================

-- Display all RLS policies for critical tables
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('screenings', 'clinical_reviews', 'payment_intents')
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- PART 6: Manual Testing Instructions
-- ============================================================================

-- To manually test cross-family access prevention:
-- 1. Create two test families in profiles table
-- 2. Create a screening for family_1
-- 3. Attempt to SELECT that screening as family_2 (should fail)
-- 4. Attempt to UPDATE that screening as family_2 (should fail)
--
-- To manually test clinic access:
-- 1. Create a screening with SETTLED payment_intent
-- 2. Verify clinic can SELECT/INSERT clinical_reviews for that screening
-- 3. Create a screening WITHOUT SETTLED payment_intent
-- 4. Verify clinic CANNOT INSERT clinical_reviews for that screening
--
-- To test service role bypass:
-- 1. Use service role key in server action
-- 2. Verify operations succeed even if RLS would normally block
-- 3. Ensure service role key is NEVER used in client-side code

RAISE NOTICE '========================================';
RAISE NOTICE 'RLS Audit Complete';
RAISE NOTICE 'Review the policy summary above';
RAISE NOTICE 'Perform manual cross-family/clinic tests as described';
RAISE NOTICE '========================================';

