'use server';

import { supabase } from '@/lib/supabase';

export interface ScreeningAnswer {
  questionId: string;
  response: boolean;
  category: string;
  questionText: string;
  milestoneAgeMonths: number;
}

export interface ClinicalReport {
  child_name: string;
  child_age_months: number;
  ai_risk_score: number | null;
  ai_summary: string | null;
  answers: ScreeningAnswer[];
  created_at: string;
}

/**
 * Server Action to fetch a single screening record for clinic view
 * Uses RPC function that bypasses RLS to allow clinic access
 */
export async function getClinicalReport(screeningId: string): Promise<{
  success: boolean;
  data?: ClinicalReport;
  error?: string;
}> {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(screeningId)) {
      return {
        success: false,
        error: 'Invalid screening ID format',
      };
    }

    const { data, error } = await supabase.rpc('get_screening_for_clinic', {
      target_screening_id: screeningId,
    });

    if (error) {
      console.error('Error fetching clinical report:', error);
      return {
        success: false,
        error: `Failed to fetch clinical report: ${error.message}`,
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'Screening record not found',
      };
    }

    // Transform the data to match our interface
    const report: ClinicalReport = {
      child_name: data.child_name,
      child_age_months: data.child_age_months,
      ai_risk_score: data.ai_risk_score,
      ai_summary: data.ai_summary,
      answers: data.answers || [],
      created_at: data.created_at,
    };

    return {
      success: true,
      data: report,
    };
  } catch (error) {
    console.error('Unexpected error in getClinicalReport:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
