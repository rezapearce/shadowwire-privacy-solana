-- Add clinical_review_hash column to payment_intents table
-- This stores a SHA-256 hash of the clinical review data for cryptographic linking
-- Run this in Supabase SQL Editor

ALTER TABLE payment_intents
ADD COLUMN IF NOT EXISTS clinical_review_hash TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_payment_intents_clinical_review_hash ON payment_intents(clinical_review_hash);

-- Add comment for documentation
COMMENT ON COLUMN payment_intents.clinical_review_hash IS 'SHA-256 hash of clinical review data - cryptographically links payment to medical result without exposing payer identity';

