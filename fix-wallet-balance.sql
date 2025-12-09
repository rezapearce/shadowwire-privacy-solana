-- Fix or adjust wallet balances
-- Run this in Supabase SQL Editor

-- Option 1: Set a specific user's USDC balance to a positive amount
-- Replace 'USER_ID_HERE' with the actual user ID (UUID)
-- UPDATE wallets 
-- SET usdc_balance = 100.00, updated_at = NOW()
-- WHERE user_id = 'USER_ID_HERE';

-- Option 2: Add funds to a user's existing balance
-- Replace 'USER_ID_HERE' with the actual user ID (UUID)
-- Replace 50.00 with the amount you want to add
-- UPDATE wallets 
-- SET usdc_balance = usdc_balance + 50.00, updated_at = NOW()
-- WHERE user_id = 'USER_ID_HERE';

-- Option 3: View all wallet balances to find the user
SELECT 
    p.username,
    p.role,
    w.user_id,
    w.usdc_balance,
    w.zenzec_balance,
    w.sol_balance,
    w.updated_at
FROM wallets w
JOIN profiles p ON w.user_id = p.id
ORDER BY w.usdc_balance ASC;

-- Option 4: Reset a specific user's balance to zero
-- Replace 'USER_ID_HERE' with the actual user ID (UUID)
-- UPDATE wallets 
-- SET usdc_balance = 0.00, updated_at = NOW()
-- WHERE user_id = 'USER_ID_HERE';

-- Option 5: Add a fixed amount to all negative balances (bring them to zero)
-- UPDATE wallets 
-- SET usdc_balance = 0.00, updated_at = NOW()
-- WHERE usdc_balance < 0;

