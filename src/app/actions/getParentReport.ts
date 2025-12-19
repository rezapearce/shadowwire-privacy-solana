'use server';

import { supabaseServer, supabaseFallback } from '@/lib/supabase-server';

// Use server client if available, otherwise fallback to regular client
const db = supabaseServer || supabaseFallback;

export interface ParentReportData {
  screening: {
    id: string;
    child_name: string;
    child_age_months: number;
    created_at: string;
    ai_risk_score: number | null;
    ai_summary: string | null;
    social_score_ai: number | null;
    fine_motor_score_ai: number | null;
    language_score_ai: number | null;
    gross_motor_score_ai: number | null;
  };
  clinicalReview: {
    review_id: string;
    final_diagnosis: string | null;
    recommendations: string | null;
    social_score_clinical: number | null;
    fine_motor_clinical: number | null;
    language_clinical: number | null;
    gross_motor_clinical: number | null;
    created_at: string;
    reviewed_by?: string;
  } | null;
  paymentIntent: {
    status: string;
    clinical_review_hash: string | null;
  } | null;
}

/**
 * Server Action: Get parent report data for a screening
 * Fetches screening with clinical review and payment intent data
 * 
 * @param screeningId - UUID of the screening
 * @param familyId - Family ID for RLS validation
 * @returns Parent report data or error
 */
export async function getParentReport(
  screeningId: string,
  familyId: string
): Promise<{
  success: boolean;
  data?: ParentReportData;
  error?: string;
}> {
  try {
    if (!screeningId || !familyId) {
      return {
        success: false,
        error: 'Screening ID and Family ID are required',
      };
    }

    // Fetch screening with clinical review and payment intent
    const { data: screeningData, error: screeningError } = await db
      .from('screenings')
      .select(`
        id,
        child_name,
        child_age_months,
        created_at,
        ai_risk_score,
        ai_summary,
        social_score_ai,
        fine_motor_score_ai,
        language_score_ai,
        gross_motor_score_ai,
        family_id,
        reviewed_by,
        clinical_reviews (
          review_id,
          final_diagnosis,
          recommendations,
          social_score_clinical,
          fine_motor_clinical,
          language_clinical,
          gross_motor_clinical,
          created_at
        ),
        payment_intents (
          status,
          clinical_review_hash
        )
      `)
      .eq('id', screeningId)
      .eq('family_id', familyId)
      .single();

    if (screeningError || !screeningData) {
      return {
        success: false,
        error: 'Screening not found or access denied',
      };
    }

    // Validate family_id matches (RLS should handle this, but double-check)
    if (screeningData.family_id !== familyId) {
      return {
        success: false,
        error: 'Access denied',
      };
    }

    // Extract clinical review (most recent if multiple)
    const clinicalReviews = Array.isArray(screeningData.clinical_reviews)
      ? screeningData.clinical_reviews
      : screeningData.clinical_reviews
      ? [screeningData.clinical_reviews]
      : [];
    
    const clinicalReview = clinicalReviews.length > 0
      ? clinicalReviews.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]
      : null;

    // Extract payment intent (most recent SETTLED if multiple)
    const paymentIntents = Array.isArray(screeningData.payment_intents)
      ? screeningData.payment_intents
      : screeningData.payment_intents
      ? [screeningData.payment_intents]
      : [];
    
    const paymentIntent = paymentIntents
      .filter((pi: any) => pi.status === 'SETTLED')
      .sort((a: any, b: any) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      )[0] || null;

    const reportData: ParentReportData = {
      screening: {
        id: screeningData.id,
        child_name: screeningData.child_name,
        child_age_months: screeningData.child_age_months,
        created_at: screeningData.created_at,
        ai_risk_score: screeningData.ai_risk_score ?? null,
        ai_summary: screeningData.ai_summary || null,
        social_score_ai: screeningData.social_score_ai ?? null,
        fine_motor_score_ai: screeningData.fine_motor_score_ai ?? null,
        language_score_ai: screeningData.language_score_ai ?? null,
        gross_motor_score_ai: screeningData.gross_motor_score_ai ?? null,
      },
      clinicalReview: clinicalReview ? {
        review_id: clinicalReview.review_id,
        final_diagnosis: clinicalReview.final_diagnosis || null,
        recommendations: clinicalReview.recommendations || null,
        social_score_clinical: clinicalReview.social_score_clinical ?? null,
        fine_motor_clinical: clinicalReview.fine_motor_clinical ?? null,
        language_clinical: clinicalReview.language_clinical ?? null,
        gross_motor_clinical: clinicalReview.gross_motor_clinical ?? null,
        created_at: clinicalReview.created_at,
        reviewed_by: screeningData.reviewed_by || undefined,
      } : null,
      paymentIntent: paymentIntent ? {
        status: paymentIntent.status,
        clinical_review_hash: paymentIntent.clinical_review_hash || null,
      } : null,
    };

    return {
      success: true,
      data: reportData,
    };
  } catch (error) {
    console.error('Unexpected error in getParentReport:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

