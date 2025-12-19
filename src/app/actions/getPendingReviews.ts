'use server';

import { supabaseServer, supabaseFallback } from '@/lib/supabase-server';

// Use server client if available, otherwise fallback to regular client
const db = supabaseServer || supabaseFallback;

export interface PendingReview {
  screening_id: string;
  child_name: string;
  child_age_months: number;
  risk_level: 'High' | 'Low';
  ai_risk_score: number | null;
  ai_summary: string | null;
  status: string;
  created_at: string;
  payment_status: string;
  payment_amount: number | null;
  has_video: boolean;
  social_score_ai: number | null;
  fine_motor_score_ai: number | null;
  language_score_ai: number | null;
  gross_motor_score_ai: number | null;
}

/**
 * Server Action to fetch pending reviews for clinic
 * Returns screenings that have SETTLED payments but no clinical review yet
 */
export async function getPendingReviews(): Promise<{
  success: boolean;
  data?: PendingReview[];
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
        social_score_ai,
        fine_motor_score_ai,
        language_score_ai,
        gross_motor_score_ai,
        answers,
        payment_intents!inner (
          status,
          fiat_amount
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
      console.error('Error fetching pending reviews:', error);
      return {
        success: false,
        error: `Failed to fetch pending reviews: ${error.message}`,
      };
    }

    // Transform the data to match our interface
    const reviews: PendingReview[] = (data || []).map((screening: any) => {
      // Check if there are any videos in the answers
      const hasVideo = Array.isArray(screening.answers) && 
        screening.answers.some((answer: any) => answer.video_url || answer.videoUrl);

      // Determine risk level
      const riskLevel: 'High' | 'Low' = (screening.ai_risk_score ?? 0) >= 50 ? 'High' : 'Low';

      return {
        screening_id: screening.id,
        child_name: screening.child_name,
        child_age_months: screening.child_age_months,
        risk_level: riskLevel,
        ai_risk_score: screening.ai_risk_score ?? null,
        ai_summary: screening.ai_summary || null,
        status: screening.status || 'PENDING_REVIEW',
        created_at: screening.created_at,
        payment_status: screening.payment_intents?.[0]?.status || 'UNKNOWN',
        payment_amount: screening.payment_intents?.[0]?.fiat_amount || null,
        has_video: hasVideo,
        social_score_ai: screening.social_score_ai ?? null,
        fine_motor_score_ai: screening.fine_motor_score_ai ?? null,
        language_score_ai: screening.language_score_ai ?? null,
        gross_motor_score_ai: screening.gross_motor_score_ai ?? null,
      };
    });

    return {
      success: true,
      data: reviews,
    };
  } catch (error) {
    console.error('Unexpected error in getPendingReviews:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

