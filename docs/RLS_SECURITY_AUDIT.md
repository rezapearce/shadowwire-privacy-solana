# KiddyGuard RLS Security Audit Documentation

## Overview

This document provides comprehensive documentation of all Row-Level Security (RLS) policies in the KiddyGuard platform, their purposes, testing procedures, and security considerations.

## Table of Contents

1. [RLS Policy Summary](#rls-policy-summary)
2. [Screenings Table Policies](#screenings-table-policies)
3. [Clinical Reviews Table Policies](#clinical-reviews-table-policies)
4. [Payment Intents Table Policies](#payment-intents-table-policies)
5. [Service Role Key Usage](#service-role-key-usage)
6. [Testing Procedures](#testing-procedures)
7. [Security Checklist](#security-checklist)

---

## RLS Policy Summary

KiddyGuard uses Row-Level Security (RLS) to ensure data isolation between families and clinics. All critical tables have RLS enabled:

- **screenings**: Family-scoped data isolation
- **clinical_reviews**: Clinic-scoped access control
- **payment_intents**: Public read, controlled write access

---

## Screenings Table Policies

### Purpose
Ensure families can only access their own children's screening data.

### Policies

#### 1. "Families can view their own screenings" (SELECT)
- **Command**: SELECT
- **Logic**: Validates that `family_id` exists in `profiles` table
- **Security**: Prevents cross-family data access
- **File**: `create_screenings_table.sql`

```sql
CREATE POLICY "Families can view their own screenings"
ON screenings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.family_id = screenings.family_id
  )
);
```

#### 2. "Families can insert their own screenings" (INSERT)
- **Command**: INSERT
- **Logic**: Validates that inserted `family_id` exists in `profiles` table
- **Security**: Prevents inserting screenings for non-existent families
- **File**: `create_screenings_table.sql`

#### 3. "Families can update their own screenings" (UPDATE)
- **Command**: UPDATE
- **Logic**: Validates both USING and WITH CHECK clauses
- **Security**: Prevents updating screenings belonging to other families
- **File**: `create_screenings_table.sql`

### Testing
- ✅ Create screening for family_1
- ✅ Verify family_1 can SELECT their screening
- ✅ Verify family_2 CANNOT SELECT family_1's screening
- ✅ Verify family_2 CANNOT UPDATE family_1's screening

---

## Clinical Reviews Table Policies

### Purpose
Ensure clinics can only access clinical reviews for screenings they have been paid to review.

### Policies

#### 1. "Clinics can view clinical reviews" (SELECT)
- **Command**: SELECT
- **Logic**: Requires screening to have a SETTLED payment_intent
- **Security**: Prevents clinics from viewing reviews for unpaid screenings
- **File**: `kiddyguard_phase_2_updates.sql`

```sql
CREATE POLICY "Clinics can view clinical reviews"
ON clinical_reviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM screenings s
    INNER JOIN payment_intents pi ON pi.screening_id = s.id
    WHERE s.id = clinical_reviews.screening_id
    AND pi.status = 'SETTLED'
  )
);
```

#### 2. "Clinics can insert clinical reviews" (INSERT)
- **Command**: INSERT
- **Logic**: Requires screening to have a SETTLED payment_intent
- **Security**: Prevents creating reviews for unpaid screenings
- **File**: `kiddyguard_phase_2_updates.sql`

#### 3. "Clinics can update clinical reviews" (UPDATE)
- **Command**: UPDATE
- **Logic**: Validates screening has associated payment_intent
- **Security**: Prevents unauthorized updates to reviews
- **File**: `kiddyguard_phase_2_updates.sql`

### Testing
- ✅ Create screening with SETTLED payment_intent
- ✅ Verify clinic can INSERT clinical_review
- ✅ Create screening WITHOUT SETTLED payment_intent
- ✅ Verify clinic CANNOT INSERT clinical_review
- ✅ Verify parents CANNOT directly SELECT clinical_reviews (must use getParentReport action)

---

## Payment Intents Table Policies

### Purpose
Allow public read access for payment status checks while controlling write operations.

### Policies

#### 1. "Allow public read access to payment intents" (SELECT)
- **Command**: SELECT
- **Logic**: `USING (true)` - allows all reads
- **Security**: Public read access for payment status checks
- **File**: `fix-payment-intents-rls.sql`

#### 2. "Allow public insert access to payment intents" (INSERT)
- **Command**: INSERT
- **Logic**: `WITH CHECK (true)` - allows all inserts
- **Security**: Allows server actions to create payment intents
- **File**: `fix-payment-intents-rls.sql`

#### 3. "Allow public update access to payment_intents" (UPDATE)
- **Command**: UPDATE
- **Logic**: `USING (true)` - allows all updates
- **Security**: Allows status transitions (PENDING -> SETTLED)
- **File**: `fix-payment-intents-rls.sql`

### Testing
- ✅ Verify public can SELECT payment_intents
- ✅ Verify service role can INSERT payment_intents
- ✅ Verify service role can UPDATE payment_intents status

---

## Service Role Key Usage

### Purpose
The service role key bypasses RLS policies and is used exclusively in server-side operations.

### Security Requirements
1. ✅ **NEVER** expose service role key to client-side code
2. ✅ **ONLY** use in Server Actions (`'use server'` directive)
3. ✅ **ONLY** use in API routes (server-side)
4. ✅ Store in environment variable `SUPABASE_SERVICE_ROLE_KEY`
5. ✅ Never commit to version control

### Usage Locations

All service role key usage is verified to be server-side only:

#### Server Actions (✅ Safe)
- `src/app/actions/submitScreening.ts`
- `src/app/actions/getParentReport.ts`
- `src/app/actions/submitClinicalReview.ts`
- `src/app/actions/generateReport.ts`
- `src/app/actions/getClinicalReport.ts`
- `src/app/actions/calculateDomainScores.ts`
- `src/app/actions/getPendingReviews.ts`
- `src/app/actions/getClinicScreenings.ts`
- `src/app/actions/uploadVideo.ts`
- `src/app/actions/createIntent.ts`
- `src/lib/intents/IntentSolver.ts`
- `src/lib/screening/screeningService.ts`

#### Client-Side Files (✅ Verified Clean)
- No service role key usage found in:
  - `src/components/**`
  - `src/hooks/**`
  - `src/store/**`

### Implementation Pattern

```typescript
// ✅ CORRECT: Server Action
'use server';
import { supabaseServer, supabaseFallback } from '@/lib/supabase-server';
const db = supabaseServer || supabaseFallback;

// ❌ WRONG: Client Component
'use client';
import { supabaseServer } from '@/lib/supabase-server'; // NEVER DO THIS
```

---

## Testing Procedures

### Automated Audit Script

Run the comprehensive audit script to verify all RLS policies:

```bash
# In Supabase SQL Editor
# Run: scripts/audit_rls_policies.sql
```

The script will:
1. Verify RLS is enabled on all critical tables
2. Check that all required policies exist
3. Display policy summary report
4. Provide manual testing instructions

### Manual Testing Checklist

#### Cross-Family Access Prevention
- [ ] Create two test families (`family_1`, `family_2`)
- [ ] Create screening for `family_1`
- [ ] Attempt to SELECT screening as `family_2` → Should FAIL
- [ ] Attempt to UPDATE screening as `family_2` → Should FAIL
- [ ] Attempt to DELETE screening as `family_2` → Should FAIL

#### Clinic Access Control
- [ ] Create screening with SETTLED payment_intent
- [ ] Verify clinic can SELECT clinical_reviews for that screening
- [ ] Verify clinic can INSERT clinical_reviews for that screening
- [ ] Create screening WITHOUT SETTLED payment_intent
- [ ] Verify clinic CANNOT INSERT clinical_reviews → Should FAIL

#### Service Role Bypass
- [ ] Use service role key in server action
- [ ] Verify operations succeed even if RLS would normally block
- [ ] Verify service role key is NEVER used in client-side code

#### Parent Access to Clinical Reviews
- [ ] Verify parents CANNOT directly SELECT from clinical_reviews table
- [ ] Verify parents MUST use `getParentReport` server action
- [ ] Verify `getParentReport` validates `family_id` match

---

## Security Checklist

### Pre-Deployment Checklist

- [ ] All RLS policies are enabled on critical tables
- [ ] All required policies exist and are correctly configured
- [ ] Cross-family access prevention is verified
- [ ] Cross-clinic access prevention is verified
- [ ] Service role key is never exposed client-side
- [ ] Service role key is stored in environment variables only
- [ ] Service role key is not committed to version control
- [ ] All server actions use service role key appropriately
- [ ] Parent access to clinical reviews is restricted to server actions
- [ ] Payment intent policies allow necessary operations
- [ ] Audit script passes all checks
- [ ] Manual testing confirms all security requirements

### Ongoing Security Maintenance

- [ ] Review RLS policies quarterly
- [ ] Audit service role key usage monthly
- [ ] Test cross-family/clinic access prevention after schema changes
- [ ] Monitor Supabase logs for RLS policy violations
- [ ] Update documentation when policies change

---

## Common Issues and Solutions

### Issue: RLS Policy Violations

**Symptoms**: Server actions fail with RLS policy errors

**Solutions**:
1. Verify service role key is set: `SUPABASE_SERVICE_ROLE_KEY`
2. Check that policies allow service role operations
3. Run `scripts/audit_rls_policies.sql` to verify policy configuration
4. Review `APPLY_RLS_FIX.md` for payment_intents fixes

### Issue: Cross-Family Data Leakage

**Symptoms**: Users can see other families' screenings

**Solutions**:
1. Verify `family_id` is correctly set in all queries
2. Check that SELECT policies validate `family_id` match
3. Ensure server actions validate `family_id` before returning data
4. Review `getParentReport` and `getFamilyScreenings` implementations

### Issue: Service Role Key Exposed

**Symptoms**: Service role key appears in client bundles

**Solutions**:
1. Verify all imports of `supabaseServer` are in server actions only
2. Check that no client components import `supabase-server.ts`
3. Use Next.js build analysis to verify key is not bundled
4. Review environment variable configuration

---

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [KiddyGuard RLS Audit Script](../scripts/audit_rls_policies.sql)
- [Service Role Key Configuration](../src/lib/supabase-server.ts)
- [RLS Policy SQL Files](../create_screenings_table.sql, ../kiddyguard_phase_2_updates.sql)

---

## Last Updated

**Date**: 2024-12-19  
**Version**: 1.0  
**Auditor**: KiddyGuard Security Team

