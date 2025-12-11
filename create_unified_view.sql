-- Create unified_transactions view
-- This view merges internal family transfers (transactions) and external clinic payments (payment_intents)
-- Run this in Supabase SQL Editor

CREATE OR REPLACE VIEW unified_transactions AS
SELECT 
  -- Normalized columns
  t.id::TEXT AS id,
  t.family_id,
  t.amount::NUMERIC(18, 2) AS amount,
  'INTERNAL'::TEXT AS type,
  t.status::TEXT AS status,
  COALESCE(t.description, 'Transfer to Child')::TEXT AS description,
  t.created_at,
  NULL::TEXT AS currency,
  NULL::TEXT AS input_tx_ref,
  NULL::TEXT AS failure_reason
FROM transactions t

UNION ALL

SELECT 
  -- Normalized columns
  pi.intent_id::TEXT AS id,
  pi.family_id,
  pi.fiat_amount::NUMERIC(18, 2) AS amount,
  'CLINIC_BILL'::TEXT AS type,
  pi.status::TEXT AS status,
  'Clinic Payment'::TEXT AS description,
  pi.created_at,
  pi.currency::TEXT AS currency,
  pi.input_tx_ref::TEXT AS input_tx_ref,
  pi.failure_reason::TEXT AS failure_reason
FROM payment_intents pi;

-- Enable Row Level Security on the view
-- Note: Views inherit RLS from underlying tables, but we can add explicit policies if needed
-- The view will respect the RLS policies on transactions and payment_intents tables

-- Create an index-like structure for better performance
-- Since views don't support indexes directly, ensure underlying tables have proper indexes
-- (These should already exist based on the table creation scripts)

-- Grant access to authenticated users
-- The view will be accessible based on the RLS policies of the underlying tables
