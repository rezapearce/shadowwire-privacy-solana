'use server';

import { supabaseServer, supabaseFallback } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

// Use server client if available, otherwise fallback to regular client
const db = supabaseServer || supabaseFallback;

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
  try {
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

    // Fetch screening to get family_id before updating
    const { data: screeningData, error: screeningFetchError } = await db
      .from('screenings')
      .select('family_id')
      .eq('id', screeningId)
      .single();

    if (screeningFetchError || !screeningData) {
      console.error('Error fetching screening:', screeningFetchError);
      return {
        success: false,
        error: `Failed to fetch screening: ${screeningFetchError?.message || 'Screening not found'}`,
      };
    }

    // Get parent user_id from profiles table using family_id
    let parentUserId: string | null = null;
    if (screeningData.family_id) {
      const { data: parentData, error: parentError } = await db
        .from('profiles')
        .select('id')
        .eq('family_id', screeningData.family_id)
        .eq('role', 'parent')
        .limit(1)
        .single();

      if (!parentError && parentData) {
        parentUserId = parentData.id;
      } else {
        console.warn('Parent user not found for family_id:', screeningData.family_id);
      }
    }

    // Update screenings table
    const { data, error } = await db
      .from('screenings')
      .update({
        clinical_notes: notes.trim(),
        clinical_risk_level: riskLevel,
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'Dr. Smith (Demo)',
        status: 'COMPLETED',
      })
      .eq('id', screeningId)
      .select('id')
      .single();

    if (error) {
      console.error('Error updating clinical review:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return {
        success: false,
        error: `Failed to submit clinical review: ${error.message}${error.code ? ` (Code: ${error.code})` : ''}${error.hint ? `. Hint: ${error.hint}` : ''}`,
      };
    }

    if (!data || !data.id) {
      return {
        success: false,
        error: 'Failed to submit clinical review: No record updated',
      };
    }

    // Insert notification for the parent (non-blocking)
    if (parentUserId && supabaseServer) {
      try {
        await supabaseServer
          .from('notifications')
          .insert({
            user_id: parentUserId,
            screening_id: screeningId,
            title: 'Results Ready',
            message: 'Dr. Smith has completed the review. Click to view the official report.',
          });
      } catch (notificationError) {
        // Log error but don't fail the main operation
        console.error('Failed to create notification:', notificationError);
      }
    }

    // Revalidate the report page path
    revalidatePath(`/clinic/report/${screeningId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in submitClinicalReview:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
