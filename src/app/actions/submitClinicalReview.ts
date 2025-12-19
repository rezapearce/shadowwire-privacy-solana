'use server';

import { db, supabaseServer } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { generateClinicalReviewHash } from '@/lib/verification/hashGenerator';

export interface SubmitClinicalReviewResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action: Submit clinical review for a screening
 * 
 * @param screeningId - UUID of the screening record
 * @param notes - Clinical notes and recommendations from the doctor
 * @param riskLevel - Final clinical risk assessment: 'LOW', 'MODERATE', or 'HIGH'
 * @param domainScores - Optional domain-specific clinical scores
 * @param finalDiagnosis - Optional final diagnosis text
 * @returns Result object with success status or error message
 */
export async function submitClinicalReview(
  screeningId: string,
  notes: string,
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH',
  domainScores?: {
    social_score_clinical?: number;
    fine_motor_clinical?: number;
    language_clinical?: number;
    gross_motor_clinical?: number;
  },
  finalDiagnosis?: string
): Promise<SubmitClinicalReviewResult> {
  // Log server action invocation and client type
  console.log('[clinical-review] server action called');
  console.log(
    '[clinical-review] using client:',
    supabaseServer ? 'Server(service_role)' : 'Fallback(anon)'
  );
  
  try {
    // Ensure database client is available
    if (!db) {
      console.error('[clinical-review] no database client available');
      return {
        success: false,
        error: 'Database client not initialized',
      };
    }
    
    // Validate inputs
    if (!screeningId || typeof screeningId !== 'string' || screeningId.trim() === '') {
      return {
        success: false,
        error: 'Invalid screening ID',
      };
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(screeningId)) {
      return {
        success: false,
        error: 'Invalid screening ID format',
      };
    }

    if (!notes || typeof notes !== 'string' || notes.trim() === '') {
      return {
        success: false,
        error: 'Clinical notes are required',
      };
    }

    if (!riskLevel || !['LOW', 'MODERATE', 'HIGH'].includes(riskLevel)) {
      return {
        success: false,
        error: 'Invalid risk level. Must be LOW, MODERATE, or HIGH',
      };
    }

    // 2. Fetch Screening AND Family ID (needed for notification)
    const { data: screeningData, error: screeningFetchError } = await db
      .from('screenings')
      .select('id, family_id')
      .eq('id', screeningId)
      .single();

    if (screeningFetchError || !screeningData) {
      console.error('[clinical-review] screening fetch error:', screeningFetchError);
      return { success: false, error: 'Screening not found' };
    }
    console.log('[clinical-review] found screening, family_id:', screeningData.family_id);

    // 3. Insert into clinical_reviews table (separates AI from doctor diagnosis)
    const reviewData: any = {
      screening_id: screeningId,
      pediatrician_id: null, // TODO: Get from auth context when available
      final_diagnosis: finalDiagnosis || riskLevel,
      recommendations: notes,
      is_published: false,
    };

    // Add domain scores if provided
    if (domainScores) {
      if (domainScores.social_score_clinical !== undefined) {
        reviewData.social_score_clinical = domainScores.social_score_clinical;
      }
      if (domainScores.fine_motor_clinical !== undefined) {
        reviewData.fine_motor_clinical = domainScores.fine_motor_clinical;
      }
      if (domainScores.language_clinical !== undefined) {
        reviewData.language_clinical = domainScores.language_clinical;
      }
      if (domainScores.gross_motor_clinical !== undefined) {
        reviewData.gross_motor_clinical = domainScores.gross_motor_clinical;
      }
    }

    const { data: insertedReview, error: insertError } = await db
      .from('clinical_reviews')
      .insert(reviewData)
      .select('review_id, created_at')
      .single();

    if (insertError || !insertedReview) {
      console.error('[clinical-review] supabase error (insert clinical_review):', insertError);
      return { success: false, error: 'Failed to create clinical review' };
    }
    console.log('[clinical-review] clinical review inserted successfully, review_id:', insertedReview.review_id);

    // 3a. Generate integrity hash and update payment_intent
    try {
      const hashData = {
        screeningId: screeningId,
        reviewId: insertedReview.review_id,
        finalDiagnosis: reviewData.final_diagnosis,
        recommendations: reviewData.recommendations,
        socialScoreClinical: reviewData.social_score_clinical ?? null,
        fineMotorClinical: reviewData.fine_motor_clinical ?? null,
        languageClinical: reviewData.language_clinical ?? null,
        grossMotorClinical: reviewData.gross_motor_clinical ?? null,
        reviewedAt: insertedReview.created_at,
      };

      const integrityHash = await generateClinicalReviewHash(hashData);
      console.log('[clinical-review] generated integrity hash:', integrityHash.substring(0, 16) + '...');

      // Find payment_intent for this screening and update with hash
      const { error: paymentUpdateError } = await db
        .from('payment_intents')
        .update({ clinical_review_hash: integrityHash })
        .eq('screening_id', screeningId)
        .eq('status', 'SETTLED');

      if (paymentUpdateError) {
        console.warn('[clinical-review] failed to update payment_intent with hash:', paymentUpdateError);
        // Don't fail - hash generation succeeded but update failed
      } else {
        console.log('[clinical-review] payment_intent updated with integrity hash');
      }
    } catch (hashError) {
      console.error('[clinical-review] error generating integrity hash:', hashError);
      // Don't fail - hash generation is optional for now
    }

    // 4. Update the Screening status to COMPLETED
    const { error: updateError } = await db
      .from('screenings')
      .update({
        status: 'COMPLETED',
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'Dr. Smith (Demo)',
      })
      .eq('id', screeningId);

    if (updateError) {
      console.error('[clinical-review] supabase error (update screening status):', updateError);
      // Don't fail - review was already created
      console.warn('[clinical-review] warning: review created but screening status update failed');
    } else {
      console.log('[clinical-review] screening status updated to COMPLETED');
    }

    // 5. TRIGGER NOTIFICATION (The Critical Part)
    // Use supabaseServer for notification (must bypass RLS)
    const notificationClient = supabaseServer ?? db;
    
    // 4a. Find a User to notify (Relaxed Query: No Role Check)
    const { data: parentProfile, error: profileError } = await notificationClient
      .from('profiles')
      .select('id')
      .eq('family_id', screeningData.family_id)
      .limit(1) // Just grab the first user found
      .single();

    if (profileError || !parentProfile) {
      console.warn('[clinical-review] skipping notification - no user profile found for family_id:', screeningData.family_id);
      console.warn('[clinical-review] profile error details:', JSON.stringify(profileError, null, 2));
    } else {
      console.log('[clinical-review] found user to notify:', parentProfile.id);

      // 4b. Insert the Notification
      const { error: notifError } = await notificationClient
        .from('notifications')
        .insert({
          user_id: parentProfile.id,
          screening_id: screeningId,
          title: "Results Ready",
          message: "Dr. Smith has completed the review. Click to view the official report."
        });
      
      if (notifError) {
        console.error('[clinical-review] supabase error (notification insert):', JSON.stringify(notifError, null, 2));
      } else {
        console.log('[clinical-review] notification inserted successfully');
      }
    }

    // 6. Revalidate and Return
    revalidatePath(`/clinic/report/${screeningId}`);
    return { success: true };

  } catch (error) {
    console.error('[clinical-review] critical server action error:', error);
    console.error('[clinical-review] error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return { success: false, error: error instanceof Error ? error.message : 'Internal server error' };
  }
}
