# Screening Submission Debugging Guide

## Issue Summary
The screening submission appears to be failing silently - the form returns to questions page without showing an error.

## Root Causes Identified

### 1. **Table Mismatch** ✅ FIXED
- `submitScreening` saves to `screenings` table
- `ScreeningHistory` was querying `screening_sessions` table
- **Fix**: Updated `ScreeningHistory` to query `screenings` table

### 2. **MVP Questions Not Found** ✅ FIXED
- MVP questions (`gm_mvp_1`, `lang_mvp_1`, etc.) weren't in `denverIIQuestions`
- **Fix**: Added fallback mapping for MVP questions

### 3. **Error Handling** ✅ IMPROVED
- Added comprehensive logging throughout submission flow
- Enhanced error messages with detailed information

## Debugging Steps

### Step 1: Check Browser Console
Open browser DevTools (F12) → Console tab and look for:

```
=== SCREENING SUBMISSION START ===
Family ID: ...
Child Name: ...
Age: ...
Answers count: ...
Answers: ...

=== SUBMISSION RESULT ===
Result object: ...
Success: ...
Screening ID: ...
Risk Level: ...
Error: ...
```

### Step 2: Check Server Logs
If running locally, check terminal for:
```
Database client type: server (service role) or fallback (anon)
Supabase URL configured: true/false
Service role key configured: true/false
Inserting screening data: ...
Error inserting screening: ...
```

### Step 3: Verify Environment Variables
Ensure these are set in Vercel (or `.env.local` locally):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Critical!
```

### Step 4: Check Database Connection
The logs will show:
- `Database client type: server (service role)` ✅ Good (bypasses RLS)
- `Database client type: fallback (anon)` ⚠️ May fail due to RLS policies

### Step 5: Check Database Schema
Verify the `screenings` table exists with these columns:
- `id` (UUID, primary key)
- `family_id` (UUID)
- `child_name` (TEXT)
- `child_age_months` (INTEGER)
- `answers` (JSONB)
- `ai_risk_score` (INTEGER, nullable)
- `ai_summary` (TEXT, nullable)
- `status` (TEXT)
- `created_at` (TIMESTAMPTZ)

## Common Error Messages

### "No valid answers found"
- **Cause**: Questions not found in lookup
- **Fix**: MVP questions fallback mapping added ✅

### "Failed to save screening: new row violates row-level security policy"
- **Cause**: Using anon key instead of service role key
- **Fix**: Set `SUPABASE_SERVICE_ROLE_KEY` environment variable

### "Failed to save screening: column 'X' does not exist"
- **Cause**: Database schema mismatch
- **Fix**: Run migration scripts to update schema

### "Failed to save screening: null value in column 'X' violates not-null constraint"
- **Cause**: Missing required field
- **Fix**: Check that all required fields are provided

## Testing Checklist

- [ ] Open browser console before submitting screening
- [ ] Submit screening with all "No" answers
- [ ] Check console for detailed logs
- [ ] Verify error message (if any) is displayed
- [ ] Check Screening History shows the new screening
- [ ] Verify screening_id is generated
- [ ] Test payment flow with screening_id

## Next Steps After Fix

1. **Verify Submission Works**: Check console logs show success
2. **Check Screening History**: Should show new screening
3. **Test Payment Flow**: Use screening_id to make payment
4. **Verify Clinic Report**: Clinic should see report after payment

## Files Modified

1. `src/app/actions/submitScreening.ts`
   - Added MVP questions fallback mapping
   - Added `getFamilyScreenings` function
   - Enhanced error logging

2. `src/components/screening/ScreeningWizard.tsx`
   - Enhanced error logging
   - Improved error display

3. `src/components/screening/ScreeningHistory.tsx`
   - Updated to query `screenings` table instead of `screening_sessions`
   - Added risk level display
