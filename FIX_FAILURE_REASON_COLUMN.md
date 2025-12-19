# 🔧 Fix: Add failure_reason Column

## The Problem
The status polling is failing because the `failure_reason` column doesn't exist in your `payment_intents` table.

## The Solution

### Step 1: Add the Column to Database

Run this SQL script in **Supabase SQL Editor**:

```sql
-- Add failure_reason column to payment_intents table
ALTER TABLE payment_intents
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_intents' 
  AND column_name = 'failure_reason'
  AND table_schema = 'public';
```

### Step 2: Restart Dev Server

After running the SQL script, restart your dev server:
```bash
# Stop the server (Ctrl+C) and restart:
npm run dev
```

## Why This Happens

The code tries to query `failure_reason` to show error messages when payments fail, but the column wasn't created in your database. The migration script `add_failure_reason_to_payment_intents.sql` exists but needs to be run.

## Temporary Workaround

I've updated the code to handle the missing column gracefully, but you should still add the column for full functionality. The code will now:
- Try to query `failure_reason` first
- If the column doesn't exist, query without it
- Continue polling without crashing

However, you won't see failure reasons in error messages until you add the column.

