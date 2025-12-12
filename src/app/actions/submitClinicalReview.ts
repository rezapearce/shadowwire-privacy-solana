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
