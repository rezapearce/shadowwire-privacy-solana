-- Create payment_intents table for Intent-Based Payment Engine
-- Run this in Supabase SQL Editor

-- Create the payment_intents table
CREATE TABLE IF NOT EXISTS payment_intents (
  intent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL,
  clinic_id UUID NOT NULL,
  fiat_amount NUMERIC(18, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',
  input_method TEXT NOT NULL CHECK (input_method IN ('USDC_BALANCE', 'SOL_WALLET', 'FIAT_GATEWAY')),
  status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'FUNDING_DETECTED', 'ROUTING', 'SHIELDING', 'SETTLED', 'FAILED')),
  tx_hash TEXT,
  mpc_sig TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_intents_family_id ON payment_intents(family_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_created_at ON payment_intents(created_at DESC);

-- Enable Row Level Security
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Families can view their own payment intents" ON payment_intents;
DROP POLICY IF EXISTS "Families can insert their own payment intents" ON payment_intents;
DROP POLICY IF EXISTS "Families can update their own payment intents" ON payment_intents;

-- RLS Policy: Families can only SELECT their own intents
CREATE POLICY "Families can view their own payment intents"
ON payment_intents
FOR SELECT
USING (family_id = (SELECT family_id FROM profiles WHERE id = auth.uid()));

-- RLS Policy: Families can INSERT their own intents
CREATE POLICY "Families can insert their own payment intents"
ON payment_intents
FOR INSERT
WITH CHECK (family_id = (SELECT family_id FROM profiles WHERE id = auth.uid()));

-- RLS Policy: Families can UPDATE their own intents
CREATE POLICY "Families can update their own payment intents"
ON payment_intents
FOR UPDATE
USING (family_id = (SELECT family_id FROM profiles WHERE id = auth.uid()));

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_intents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_payment_intents_updated_at ON payment_intents;
CREATE TRIGGER update_payment_intents_updated_at
  BEFORE UPDATE ON payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_intents_updated_at();
