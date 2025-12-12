# Screening Submission Fix

## Issue Identified
The screening submission was failing because MVP questions (used in the demo wizard) were not found in the `denverIIQuestions` lookup table.

## Fix Applied
1. **Added MVP Questions Fallback**: Modified `submitScreening.ts` to include a fallback mapping for MVP questions (`gm_mvp_1`, `lang_mvp_1`, etc.)
2. **Enhanced Error Logging**: Added detailed error logging to help diagnose database connection issues
3. **Improved Error Messages**: Enhanced error messages in the UI to show more details about what went wrong

## Testing Checklist
- [ ] Verify screening submission works with MVP questions
- [ ] Check browser console for detailed error logs if submission fails
- [ ] Verify database connection (check environment variables)
- [ ] Test full flow: Screening → Payment → Clinic Report

## Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (for fallback)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for server-side operations, bypasses RLS)

## Common Issues

### Issue: "No valid answers found"
**Cause**: Question IDs don't match between wizard and submission
**Fix**: MVP questions are now included in fallback mapping

### Issue: Database connection errors
**Cause**: Missing or incorrect environment variables
**Fix**: Check `.env.local` file has all required variables

### Issue: RLS policy errors
**Cause**: Using anon key instead of service role key
**Fix**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in environment

## Next Steps
1. Test the screening submission with all "No" answers (should trigger High Risk)
2. Verify the screening_id is returned and can be used for payment
3. Complete the payment flow to test clinic report access
