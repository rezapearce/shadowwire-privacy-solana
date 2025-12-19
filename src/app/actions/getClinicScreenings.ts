'use server';

import { supabaseServer, supabaseFallback } from '@/lib/supabase-server';

// Use server client if available, otherwise fallback to regular client
const db = supabaseServer || supabaseFallback;

export interface ClinicScreening {
  id: string;
  child_name: string;
  child_age_months: number;
  ai_risk_score: number | null;
  ai_summary: string | null;
  status: string;
  created_at: string;
  clinical_notes: string | null;
  clinical_risk_level: 'LOW' | 'MODERATE' | 'HIGH' | null;
  reviewed_at: string | null;
}

/**
 * Server Action to fetch pending screenings for clinic review
 * Returns screenings with SETTLED payments that haven't been reviewed yet
 */
export async function getClinicScreenings(): Promise<{
  success: boolean;
  data?: ClinicScreening[];
  error?: string;
}> {
  try {
    const { data, error } = await db
      .from('screenings')
      .select(`
        id,
        child_name,
        child_age_months,
        ai_risk_score,
        ai_summary,
        status,
        created_at,
        clinical_notes,
        clinical_risk_level,
        reviewed_at,
        payment_intents!inner (
          status,
          screening_id
        ),
        clinical_reviews (
          review_id
        )
      `)
      // Filter 1: Only screenings where payment is SETTLED
      .eq('payment_intents.status', 'SETTLED')
      // Filter 2: Only screenings that haven't been reviewed yet
      .is('clinical_reviews', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clinic screenings:', error);
      return {
        success: false,
        error: `Failed to fetch screenings: ${error.message}`,
      };
    }

    // Transform the data to match our interface
    const screenings: ClinicScreening[] = (data || []).map((screening: any) => ({
      id: screening.id,
      child_name: screening.child_name,
      child_age_months: screening.child_age_months,
      ai_risk_score: screening.ai_risk_score ?? null,
      ai_summary: screening.ai_summary || null,
      status: screening.status || 'PENDING_REVIEW',
      created_at: screening.created_at,
      clinical_notes: screening.clinical_notes || null,
      clinical_risk_level: screening.clinical_risk_level || null,
      reviewed_at: screening.reviewed_at || null,
    }));

    return {
      success: true,
      data: screenings,
    };
  } catch (error) {
    console.error('Unexpected error in getClinicScreenings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
