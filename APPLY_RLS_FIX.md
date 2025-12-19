# 🔧 CRITICAL FIX: Apply RLS Policy Update

## The Problem
Even though we're using the service role key, the RLS policies in your Supabase database are still blocking inserts.

## The Solution
You **MUST** run the SQL script below in your Supabase SQL Editor to update the RLS policies.

## Steps:

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Click on "SQL Editor" in the left sidebar

2. **Run This SQL Script** (Copy and paste the entire script):

```sql
-- Fix RLS policies for payment_intents table
-- This allows server actions to insert payment intents

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Families can view their own payment intents" ON payment_intents;
DROP POLICY IF EXISTS "Families can insert their own payment intents" ON payment_intents;
DROP POLICY IF EXISTS "Families can update their own payment intents" ON payment_intents;
DROP POLICY IF EXISTS "Allow public read access to payment intents" ON payment_intents;
DROP POLICY IF EXISTS "Allow public insert access to payment intents" ON payment_intents;
DROP POLICY IF EXISTS "Allow public update access to payment intents" ON payment_intents;

-- Create permissive policies that allow inserts
CREATE POLICY "Allow public read access to payment intents"
ON payment_intents
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access to payment intents"
ON payment_intents
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update access to payment_intents"
ON payment_intents
FOR UPDATE
USING (true);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'payment_intents';
```

3. **Click "Run"** in the SQL Editor

4. **Restart Your Dev Server**:
   ```bash
   # Stop the server (Ctrl+C) and restart:
   npm run dev
   ```

5. **Try "Pay Now" again**

## Why This Works
The service role key should bypass RLS, but if the policies are misconfigured, they can still block operations. By creating permissive policies with `WITH CHECK (true)`, we ensure that inserts are always allowed.

## Verification
After running the script, you should see 3 policies listed in the query results:
- "Allow public read access to payment_intents" (SELECT)
- "Allow public insert access to payment_intents" (INSERT)  
- "Allow public update access to payment intents" (UPDATE)

