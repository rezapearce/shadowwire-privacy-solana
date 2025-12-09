-- Fix transactions table: Add updated_at column and trigger
-- Run this in Supabase SQL Editor BEFORE updating the RPC function

-- Step 1: Add updated_at column to transactions table (if it doesn't exist)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Create a trigger function to automatically update updated_at on row updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to automatically update updated_at when a transaction is updated
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Set updated_at for existing rows (optional, sets to current time)
UPDATE transactions 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
AND column_name = 'updated_at';

