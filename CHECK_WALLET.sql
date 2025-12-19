-- Check if wallet exists for a family
-- Replace the family_id with your actual family ID

-- Check parent profile
SELECT id, family_id, role, email
FROM profiles
WHERE family_id = '4ac7822a-0298-4a8f-87cd-fe95fe6a4d64'
  AND role = 'parent';

-- Check wallet for that parent
SELECT w.*, p.email, p.family_id
FROM wallets w
JOIN profiles p ON w.user_id = p.id
WHERE p.family_id = '4ac7822a-0298-4a8f-87cd-fe95fe6a4d64'
  AND p.role = 'parent';

-- If wallet doesn't exist, create one (replace user_id with actual parent user_id from above)
-- INSERT INTO wallets (user_id, usdc_balance, sol_balance, zenzec_balance)
-- VALUES (
--   'YOUR_PARENT_USER_ID_HERE',
--   1000.00,  -- USDC balance
--   5.0,      -- SOL balance
--   0.0       -- Zenzec balance
-- );

