'use server';

import { db, supabaseServer } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

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
 * @returns Result object with success status or error message
 */
export async function submitClinicalReview(
  screeningId: string,
  notes: string,
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH'
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

    // 3. Update the Screening (The Medical Record)
    const { error: updateError } = await db
      .from('screenings')
      .update({
        clinical_notes: notes,
        clinical_risk_level: riskLevel,
        status: 'COMPLETED',
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'Dr. Smith (Demo)',
      })
      .eq('id', screeningId);

    if (updateError) {
      console.error('[clinical-review] supabase error (update):', updateError);
      return { success: false, error: 'Failed to update screening' };
    }
    console.log('[clinical-review] screening updated successfully');

    // 4. TRIGGER NOTIFICATION (The Critical Part)
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

    // 5. Revalidate and Return
    revalidatePath(`/clinic/report/${screeningId}`);
    return { success: true };

  } catch (error) {
    console.error('[clinical-review] critical server action error:', error);
    console.error('[clinical-review] error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return { success: false, error: error instanceof Error ? error.message : 'Internal server error' };
  }
}
