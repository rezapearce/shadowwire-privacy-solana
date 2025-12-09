# Fixing Negative Balance Issue

## Problem
When trying to approve a transaction, you get:
```
Insufficient balance. Current: $-35.00, Required: $25.00
```

This happens because:
- The child's USDC balance is currently **-$35.00** (negative)
- The RPC function prevents transactions that would make the balance more negative
- This is a **safety feature** to prevent overspending

---

## Why is the balance negative?

Possible reasons:
1. **Previous transactions were approved** before the balance validation was added
2. **Manual database changes** set the balance to negative
3. **Data inconsistency** from testing or development

---

## Solutions

You have **3 options**. Choose the one that fits your use case:

### Option 1: Fix the Balance (Recommended)
**Add funds to the child's wallet** to bring it back to positive or zero.

**Steps:**
1. Open Supabase SQL Editor
2. Run `fix-wallet-balance.sql`
3. First, use **Option 3** to find the user's ID:
   ```sql
   SELECT p.username, p.role, w.user_id, w.usdc_balance
   FROM wallets w
   JOIN profiles p ON w.user_id = p.id
   ORDER BY w.usdc_balance ASC;
   ```
4. Then use **Option 2** to add funds (replace `USER_ID_HERE` with the actual UUID):
   ```sql
   UPDATE wallets 
   SET usdc_balance = usdc_balance + 50.00, updated_at = NOW()
   WHERE user_id = 'USER_ID_HERE';
   ```
   (This adds $50 to their current balance. Adjust the amount as needed.)

5. Try approving the transaction again

**Pros:** Maintains financial integrity, prevents overspending
**Cons:** Requires manual balance adjustment

---

### Option 2: Allow Negative Balances
**Remove the balance check** so parents can approve transactions even when balance would go negative.

**Steps:**
1. Open Supabase SQL Editor
2. Copy the contents of `create-approve-transaction-rpc-allow-negative.sql`
3. Paste and run it in Supabase SQL Editor
4. This replaces the RPC function with a version that allows negative balances

**Pros:** Parents have full control, no manual balance fixes needed
**Cons:** Can lead to unlimited negative balances, less financial control

---

### Option 3: Reset Balance to Zero
**Set the balance to $0** and start fresh.

**Steps:**
1. Open Supabase SQL Editor
2. Run `fix-wallet-balance.sql`
3. Use **Option 3** to find the user ID
4. Use **Option 4** to reset balance:
   ```sql
   UPDATE wallets 
   SET usdc_balance = 0.00, updated_at = NOW()
   WHERE user_id = 'USER_ID_HERE';
   ```

**Pros:** Clean slate, simple fix
**Cons:** Doesn't account for why balance went negative

---

## Quick Fix (Fastest)

If you just want to **quickly fix the current negative balance**:

1. **Find the user ID:**
   ```sql
   SELECT p.username, w.user_id, w.usdc_balance
   FROM wallets w
   JOIN profiles p ON w.user_id = p.id
   WHERE w.usdc_balance < 0;
   ```

2. **Add enough funds to cover the transaction:**
   ```sql
   -- Replace USER_ID_HERE with the actual UUID from step 1
   -- Replace 60.00 with enough to cover the negative balance + transaction amount
   UPDATE wallets 
   SET usdc_balance = usdc_balance + 60.00, updated_at = NOW()
   WHERE user_id = 'USER_ID_HERE';
   ```
   (Example: If balance is -$35 and transaction is $25, add at least $60 to have $25 left)

3. **Try approving the transaction again**

---

## Which Option Should You Choose?

- **Option 1 (Fix Balance)**: Use if you want to maintain financial controls and prevent overspending
- **Option 2 (Allow Negative)**: Use if you want parents to have full control and don't mind negative balances
- **Option 3 (Reset)**: Use if you want a clean start and don't care about the historical negative balance

---

## Preventing Future Issues

To prevent negative balances in the future:

1. **Keep the balance validation** (current behavior) - prevents overspending
2. **Set up initial balances** when creating child accounts
3. **Add a "Add Funds" feature** in the parent dashboard to easily top up balances
4. **Monitor balances** regularly

---

## Need Help?

If you're unsure which option to choose:
- **For a production app**: Use **Option 1** (fix balance) to maintain financial integrity
- **For testing/development**: Use **Option 2** (allow negative) for flexibility
- **For a quick demo**: Use **Option 3** (reset) to start fresh

