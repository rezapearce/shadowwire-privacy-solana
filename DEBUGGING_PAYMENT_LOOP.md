# 🔍 Debugging Payment Loop Issue

## ✅ Changes Applied

### 1. Comprehensive Error Logging Added
- Added detailed logging throughout `IntentSolver.ts`
- All errors now logged with `[IntentSolver]` prefix for easy filtering
- Errors automatically update payment intent status to `FAILED` so frontend stops polling

### 2. Environment Variable Validation
- `getSupabaseAdmin()` now logs whether environment variables are set
- Clear error messages if variables are missing

### 3. Wallet Finding Logging
- Detailed logs when searching for parent profile
- Detailed logs when searching for wallet
- Clear error messages if wallet doesn't exist

## 🔍 How to Debug

### Step 1: Check Server Terminal Logs

**IMPORTANT:** Look at your **VS Code Terminal** or where `npm run dev` is running, NOT the browser console!

When you click "Pay Now", you should see logs like:

```
[IntentSolver] 🚀 STARTING process for intent <id>
[IntentSolver] 🔑 Initializing admin client...
[IntentSolver] Supabase URL: https://...
[IntentSolver] Service Role Key: ✅ SET (length: 200)
[IntentSolver] Fetching intent <id> from database...
[IntentSolver] ✅ Intent fetched. Status: CREATED, Method: USDC_BALANCE, Amount: 50001
[IntentSolver] → Handling CREATED status...
[IntentSolver] Checking balance for intent <id> (method: USDC_BALANCE)
[IntentSolver] 🔍 Finding parent wallet for family <id>...
```

### Step 2: Common Error Patterns

#### Error: "Missing Supabase environment variables"
```
[IntentSolver] ❌ Missing environment variables: SUPABASE_SERVICE_ROLE_KEY
```
**Fix:** Check your `.env.local` file has `SUPABASE_SERVICE_ROLE_KEY` set

#### Error: "Failed to find parent profile"
```
[IntentSolver] ❌ Failed to find parent profile for family <id>
```
**Fix:** Run `CHECK_WALLET.sql` in Supabase SQL Editor to verify profile exists

#### Error: "Failed to find wallet"
```
[IntentSolver] ❌ Failed to find wallet for parent user <id>
```
**Fix:** Wallet doesn't exist. Create one using:
```sql
INSERT INTO wallets (user_id, usdc_balance, sol_balance, zenzec_balance)
VALUES ('<parent_user_id>', 1000.00, 5.0, 0.0);
```

#### Error: "Insufficient balance"
```
[IntentSolver] ❌ Intent <id> failed: Insufficient USDC balance...
```
**Fix:** Add more balance to the wallet

### Step 3: Check Database

Run this in **Supabase SQL Editor**:

```sql
-- Check latest payment intents
SELECT intent_id, status, input_method, fiat_amount, failure_reason, created_at, updated_at
FROM payment_intents
ORDER BY created_at DESC
LIMIT 5;

-- Check if wallet exists for your family
SELECT w.*, p.email, p.family_id
FROM wallets w
JOIN profiles p ON w.user_id = p.id
WHERE p.family_id = '4ac7822a-0298-4a8f-87cd-fe95fe6a4d64'
  AND p.role = 'parent';
```

### Step 4: Verify Environment Variables

Check your `.env.local` file contains:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important:** After changing `.env.local`, you MUST restart your dev server:
```bash
# Stop server (Ctrl+C)
npm run dev
```

## 🎯 Expected Behavior

When working correctly, you should see in server logs:

```
[IntentSolver] 🚀 STARTING process for intent abc123...
[IntentSolver] ✅ Intent fetched. Status: CREATED
[IntentSolver] → Handling CREATED status...
[IntentSolver] ✅ Balance check passed. Deducting funds...
[IntentSolver] ✅ Status updated to FUNDING_DETECTED
[IntentSolver] → Handling FUNDING_DETECTED status...
[IntentSolver] → Handling ROUTING status...
[IntentSolver] → Handling SHIELDING status...
[IntentSolver] ✅ Successfully processed intent abc123
```

## 🚨 If Still Looping

1. **Check server terminal** - Look for `[IntentSolver]` logs
2. **Check for errors** - Look for `❌` or `💥` in logs
3. **Check database** - Verify wallet exists and has balance
4. **Check environment** - Verify `.env.local` is loaded
5. **Restart server** - After any changes, restart `npm run dev`

## 📝 Next Steps

1. Click "Pay Now" again
2. **Immediately check your server terminal** (not browser console)
3. Look for `[IntentSolver]` logs
4. Share any errors you see (especially those with `❌` or `💥`)

The enhanced logging will show exactly where the process is failing!

