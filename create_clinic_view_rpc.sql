-- Create RPC function to get clinic receipts
-- This function bypasses RLS using SECURITY DEFINER to allow clinic view
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_clinic_receipts(target_clinic_id UUID)
RETURNS TABLE (
  payment_date TIMESTAMPTZ,
  amount NUMERIC(18, 2),
  asset TEXT,
  status TEXT,
  memo TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pi.created_at AS payment_date,
    pi.fiat_amount AS amount,
    'ZEC'::TEXT AS asset,  -- Default to ZEC since settlement_asset column doesn't exist
    pi.status::TEXT AS status,
    CASE 
      WHEN pi.screening_id IS NOT NULL THEN ('Screening: ' || pi.screening_id::TEXT)::TEXT
      ELSE ('Medical Service #' || RIGHT(pi.intent_id::TEXT, 4))::TEXT
    END AS memo
  FROM payment_intents pi
  WHERE pi.clinic_id = target_clinic_id
    AND pi.status = 'SETTLED'
  ORDER BY pi.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
-- Note: Since this is SECURITY DEFINER, it will run with the function creator's privileges
GRANT EXECUTE ON FUNCTION get_clinic_receipts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_clinic_receipts(UUID) TO anon;
