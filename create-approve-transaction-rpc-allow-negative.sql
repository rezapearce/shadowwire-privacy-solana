-- Alternative RPC function that ALLOWS negative balances
-- Use this if you want parents to be able to approve transactions even when balance would go negative
-- Run this in Supabase SQL Editor

-- Drop the existing function first
DROP FUNCTION IF EXISTS approve_transaction_rpc(UUID, UUID);

-- Create the function WITHOUT balance validation (allows negative balances)
CREATE OR REPLACE FUNCTION approve_transaction_rpc(
  target_tx_id UUID,
  approver_profile_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction RECORD;
  v_requester_id UUID;
  v_amount NUMERIC;
  v_current_balance NUMERIC;
  v_result JSON;
BEGIN
  -- Step 1: Check if transaction exists and is pending
  SELECT id, requester_id, amount, status
  INTO v_transaction
  FROM transactions
  WHERE id = target_tx_id;

  -- Validate transaction exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Transaction not found'
    );
  END IF;

  -- Validate transaction is pending
  IF v_transaction.status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Transaction is not pending'
    );
  END IF;

  -- Store values
  v_requester_id := v_transaction.requester_id;
  v_amount := v_transaction.amount;

  -- Step 1.5: Check requester's current balance (for info only, not validation)
  SELECT usdc_balance
  INTO v_current_balance
  FROM wallets
  WHERE user_id = v_requester_id;

  -- Validate wallet exists
  IF v_current_balance IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Requester wallet not found'
    );
  END IF;

  -- NOTE: Balance validation removed - allows negative balances
  -- Parents can approve transactions even if balance would go negative

  -- Step 2: Update transaction status and approver_id
  UPDATE transactions
  SET 
    status = 'approved',
    approver_id = approver_profile_id
  WHERE id = target_tx_id;

  -- Step 3: Subtract amount from requester's wallet (usdc_balance)
  -- This will allow the balance to go negative
  UPDATE wallets
  SET 
    usdc_balance = usdc_balance - v_amount,
    updated_at = NOW()
  WHERE user_id = v_requester_id;

  -- Validate wallet was updated
  IF NOT FOUND THEN
    -- Rollback transaction update if wallet update failed
    UPDATE transactions
    SET 
      status = 'pending',
      approver_id = NULL
    WHERE id = target_tx_id;
    
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to update wallet'
    );
  END IF;

  -- Step 4: Return the updated transaction
  SELECT row_to_json(t.*)
  INTO v_result
  FROM (
    SELECT 
      id,
      amount,
      status,
      type,
      requester_id,
      approver_id,
      family_id,
      description,
      created_at
    FROM transactions
    WHERE id = target_tx_id
  ) t;

  RETURN json_build_object(
    'success', true,
    'transaction', v_result
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users (or anon for development)
GRANT EXECUTE ON FUNCTION approve_transaction_rpc(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION approve_transaction_rpc(UUID, UUID) TO authenticated;

