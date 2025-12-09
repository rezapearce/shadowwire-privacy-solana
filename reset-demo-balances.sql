-- Reset Demo Balances for Shield Assets Smoke Test
-- Run this in Supabase SQL Editor
-- This script sets Timmy Turner's USDC balance to $15.00 for testing the Shield Savings feature

-- Step 1: View current balances to verify Timmy Turner's user ID
-- Uncomment and run this first to see all users and their balances:
-- SELECT 
--     p.username,
--     p.role,
--     w.user_id,
--     w.usdc_balance,
--     w.zenzec_balance,
--     w.sol_balance
-- FROM wallets w
-- JOIN profiles p ON w.user_id = p.id
-- WHERE p.role = 'child'
-- ORDER BY p.username;

-- Step 2: Update Timmy Turner's wallet balance
-- This sets USDC to $15.00 and ensures zenZEC is $5.00
UPDATE wallets 
SET 
    usdc_balance = 15.00,
    zenzec_balance = 5.00,
    updated_at = NOW()
WHERE user_id IN (
    SELECT id 
    FROM profiles 
    WHERE username ILIKE '%timmy%' 
    AND role = 'child'
);

-- Step 3: Verify the update
SELECT 
    p.username,
    p.role,
    w.usdc_balance,
    w.zenzec_balance,
    w.sol_balance,
    w.updated_at
FROM wallets w
JOIN profiles p ON w.user_id = p.id
WHERE p.username ILIKE '%timmy%' 
AND p.role = 'child';

-- Expected Result:
-- username: timmy (or similar)
-- role: child
-- usdc_balance: 15.00
-- zenzec_balance: 5.00

