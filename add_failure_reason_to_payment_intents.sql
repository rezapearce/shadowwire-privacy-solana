-- Add failure_reason column to payment_intents table
-- Run this in Supabase SQL Editor

ALTER TABLE payment_intents
ADD COLUMN IF NOT EXISTS failure_reason TEXT;
