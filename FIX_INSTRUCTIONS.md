# Step-by-Step Fix Instructions

## Problem
When clicking "Approve" from the parent dashboard, you get this error:
```
column "updated_at" of relation "transactions" does not exist
```

## Solution Overview
1. Add the `updated_at` column to the `transactions` table
2. Update the RPC function with the corrected parameter name (`target_tx_id`)
3. Test the approval flow

---

## Step 1: Fix the Transactions Table Schema

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor** (left sidebar)

2. **Run the Schema Fix Script**
   - Open the file `fix-transactions-updated-at.sql` in your project
   - Copy the entire contents
   - Paste it into the Supabase SQL Editor
   - Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

3. **Verify Success**
   - You should see a success message
   - The output should show the `updated_at` column details

---

## Step 2: Update the RPC Function

1. **Open the Updated RPC Function**
   - Open the file `create-approve-transaction-rpc.sql` in your project
   - Copy the entire contents (it now uses `target_tx_id` instead of `transaction_id`)
   - **Note:** The file now includes a `DROP FUNCTION` statement first, which is required when changing parameter names

2. **Update in Supabase**
   - Go to Supabase SQL Editor
   - Paste the entire function (including the DROP statement)
   - Click **Run**

3. **Verify the Function**
   - You should see: `Success. No rows returned`
   - This means the function was dropped and recreated successfully
   - **Note:** If you see a warning about the function not existing, that's fine - the `IF EXISTS` clause handles it safely

---

## Step 3: Test the Approval Flow

1. **Start Your Application**
   - Make sure your Next.js app is running
   - Log in as a parent user

2. **Test Approval**
   - Navigate to the Parent Dashboard
   - Find a pending transaction
   - Click the "Approve" button
   - You should see:
     - ✅ Success toast: "Transaction Approved & Balance Updated"
     - ✅ Wallet balance should decrease
     - ✅ Transaction status should change to "approved"

---

## Troubleshooting

### If you still get errors:

1. **Check Function Parameters**
   - In Supabase SQL Editor, run:
     ```sql
     SELECT routine_name, parameter_name, data_type
     FROM information_schema.parameters
     WHERE specific_schema = 'public'
     AND routine_name = 'approve_transaction_rpc'
     ORDER BY ordinal_position;
     ```
   - Verify that `target_tx_id` appears as the first parameter

2. **Check Table Schema**
   - Run:
     ```sql
     SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_name = 'transactions'
     ORDER BY ordinal_position;
     ```
   - Verify that `updated_at` column exists

3. **Check for Conflicting Triggers**
   - Run:
     ```sql
     SELECT trigger_name, event_manipulation, event_object_table
     FROM information_schema.triggers
     WHERE event_object_table = 'transactions';
     ```
   - If you see multiple triggers, you may need to drop conflicting ones

### Common Issues:

- **"cannot change return type of existing function"** or **"ERROR: 42P13"**:
  - This happens when PostgreSQL detects a signature change (like changing parameter names)
  - **Solution:** The SQL file now includes `DROP FUNCTION IF EXISTS approve_transaction_rpc(UUID, UUID);` before `CREATE OR REPLACE`
  - Make sure you're running the entire SQL file, including the DROP statement at the top
  - If you still get this error, manually run: `DROP FUNCTION IF EXISTS approve_transaction_rpc(UUID, UUID);` first, then run the CREATE statement

- **"Function already exists"**: This is normal - the `CREATE OR REPLACE` handles it
- **"Permission denied"**: Make sure you're running as a database admin/superuser
- **"Column already exists"**: The `IF NOT EXISTS` clause handles this safely

---

## What Changed?

### SQL Function (`create-approve-transaction-rpc.sql`)
- Added `DROP FUNCTION IF EXISTS` statement to handle parameter name changes
- Changed parameter name from `transaction_id` to `target_tx_id` (to match TypeScript code)
- All references to `transaction_id` inside the function were updated to `target_tx_id`

### TypeScript Code (`src/store/useFamilyStore.ts`)
- Already updated to use `target_tx_id` parameter
- Already calls `fetchFamilyData()` on success
- Already shows the correct toast message

### Database Schema (`fix-transactions-updated-at.sql`)
- Adds `updated_at` column to `transactions` table
- Creates a trigger to automatically update `updated_at` when rows are modified
- Sets default values for existing rows

---

## Next Steps After Fix

Once everything is working:
1. ✅ Transactions can be approved
2. ✅ Wallet balances update automatically
3. ✅ UI refreshes with new balances
4. ✅ Success/error messages display correctly

You're all set! 🎉

