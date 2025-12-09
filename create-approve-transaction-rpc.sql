-- Create RPC function to atomically approve transactions and update wallet balances
-- Run this in Supabase SQL Editor
-- Supports both public (USDC) and shielded (zenZEC) transaction types

-- Drop the existing function first (required when changing return type or signature)
DROP FUNCTION IF EXISTS approve_transaction_rpc(UUID, UUID);

-- Create the function with multi-currency support
CREATE OR REPLACE FUNCTION approve_transaction_rpc(
  target_tx_id UUID,
  approver_profile_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tx_record RECORD;
  current_balance NUMERIC;
BEGIN
  -- A. Get the transaction details (including type)
  SELECT * INTO tx_record FROM public.transactions WHERE id = target_tx_id;

  -- B. Validation Checks
  IF tx_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;

  IF tx_record.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction is not pending');
  END IF;

  -- C. "Insufficient Funds" Check (The Safety Logic)
  -- 1. Get current balance for the specific wallet type (USDC or zenZEC)
  IF tx_record.type = 'public' THEN
    SELECT usdc_balance INTO current_balance 
    FROM public.wallets 
    WHERE user_id = tx_record.requester_id;
  ELSIF tx_record.type = 'shielded' THEN
    SELECT zenzec_balance INTO current_balance 
    FROM public.wallets 
    WHERE user_id = tx_record.requester_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid transaction type');
  END IF;

  -- Validate wallet exists
  IF current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requester wallet not found');
  END IF;

  -- 2. Block execution if insufficient funds
  IF current_balance < tx_record.amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds in Child wallet');
  END IF;

  -- D. Update Transaction Status
  UPDATE public.transactions
  SET 
    status = 'approved', 
    approver_id = approver_profile_id, 
    updated_at = NOW() 
  WHERE id = target_tx_id;

  -- E. Deduct Balance from appropriate wallet type
  IF tx_record.type = 'public' THEN
    UPDATE public.wallets 
    SET 
      usdc_balance = usdc_balance - tx_record.amount,
      updated_at = NOW()
    WHERE user_id = tx_record.requester_id;
  ELSIF tx_record.type = 'shielded' THEN
    UPDATE public.wallets 
    SET 
      zenzec_balance = zenzec_balance - tx_record.amount,
      updated_at = NOW()
    WHERE user_id = tx_record.requester_id;
  END IF;

  -- Validate wallet was updated
  IF NOT FOUND THEN
    -- Rollback transaction update if wallet update failed
    UPDATE public.transactions
    SET 
      status = 'pending',
      approver_id = NULL
    WHERE id = target_tx_id;
    
    RETURN jsonb_build_object('success', false, 'error', 'Failed to update wallet');
  END IF;

  -- F. Return success
  RETURN jsonb_build_object('success', true, 'new_status', 'approved');

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users (or anon for development)
GRANT EXECUTE ON FUNCTION approve_transaction_rpc(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION approve_transaction_rpc(UUID, UUID) TO authenticated;
