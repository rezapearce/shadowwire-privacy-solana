-- Add input_tx_ref column to payment_intents table
-- This column stores the transaction hash of the input transaction (e.g., SOL transfer from wallet)
-- Run this in Supabase SQL Editor

ALTER TABLE payment_intents
ADD COLUMN IF NOT EXISTS input_tx_ref TEXT;

-- Add comment for documentation
COMMENT ON COLUMN payment_intents.input_tx_ref IS 'Transaction hash/reference for the input transaction (e.g., SOL transfer from user wallet to vault)';
