'use server';

import { supabaseServer, supabaseFallback } from '@/lib/supabase-server';
import { ReportData, generateJSONReport, generateTextReport, generateProfessionalPDF } from '@/lib/reports/reportGenerator';

// Use server client if available, otherwise fallback to regular client
const db = supabaseServer || supabaseFallback;

export interface GenerateReportResult {
  success: boolean;
  report?: string;
  format?: 'json' | 'txt' | 'pdf';
  pdfBlob?: Blob;
  error?: string;
}

/**
 * Server Action: Generate and return report for a clinical review
 * 
 * @param reviewId - UUID of the clinical review
 * @param format - Report format: 'json', 'txt', or 'pdf'
 * @returns Report content as string (or PDF as blob)
 */
export async function generateReport(
  reviewId: string,
  format: 'json' | 'txt' | 'pdf' = 'json'
): Promise<GenerateReportResult> {
  try {
    if (!reviewId) {
      return {
        success: false,
        error: 'Review ID is required',
      };
    }

    // Fetch clinical review with screening data and payment intent
    const { data: reviewData, error: reviewError } = await db
      .from('clinical_reviews')
      .select(`
        review_id,
        screening_id,
        final_diagnosis,
        recommendations,
        social_score_clinical,
        fine_motor_clinical,
        language_clinical,
        gross_motor_clinical,
        created_at,
        screenings (
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
          reviewed_by,
          reviewed_at,
          payment_intents (
            clinical_review_hash
          )
        )
      `)
      .eq('review_id', reviewId)
      .single();

    if (reviewError || !reviewData) {
      return {
        success: false,
        error: 'Clinical review not found',
      };
    }

    const screening = reviewData.screenings as any;
    const paymentIntent = Array.isArray(screening.payment_intents) 
      ? screening.payment_intents[0] 
      : screening.payment_intents;

    // Build report data
    const reportData: ReportData = {
      screeningId: screening.id,
      childName: screening.child_name,
      childAgeMonths: screening.child_age_months,
      screeningDate: screening.created_at,
      doctorName: screening.reviewed_by?.replace('Dr. ', '').replace(' (Demo)', '') || 'Smith',
      clinicName: 'KiddyGuard Clinic',
      verificationHash: paymentIntent?.clinical_review_hash || '',
      aiAnalysis: {
        riskScore: screening.ai_risk_score,
        summary: screening.ai_summary,
        domainScores: {
          social: screening.social_score_ai,
          fineMotor: screening.fine_motor_score_ai,
          language: screening.language_score_ai,
          grossMotor: screening.gross_motor_score_ai,
        },
      },
      clinicalAssessment: {
        riskLevel: null, // Would need to derive from scores or store separately
        diagnosis: reviewData.final_diagnosis,
        recommendations: reviewData.recommendations,
        domainScores: {
          social: reviewData.social_score_clinical,
          fineMotor: reviewData.fine_motor_clinical,
          language: reviewData.language_clinical,
          grossMotor: reviewData.gross_motor_clinical,
        },
      },
      reviewedBy: screening.reviewed_by,
      reviewedAt: screening.reviewed_at || reviewData.created_at,
    };

    // Generate report based on format
    let report: string | undefined;
    let pdfBlob: Blob | undefined;

    if (format === 'pdf') {
      // Generate PDF
      const doc = generateProfessionalPDF(reportData);
      pdfBlob = doc.output('blob');
      // For server-side, we can't return blob directly, so convert to base64
      const pdfBase64 = doc.output('datauristring');
      report = pdfBase64;
    } else if (format === 'json') {
      report = generateJSONReport(reportData);
    } else {
      report = generateTextReport(reportData);
    }

    // Mark review as published
    const { error: updateError } = await db
      .from('clinical_reviews')
      .update({ is_published: true })
      .eq('review_id', reviewId);

    if (updateError) {
      console.warn('Failed to mark review as published:', updateError);
      // Don't fail - report was generated successfully
    }

    return {
      success: true,
      report,
      format,
      pdfBlob,
    };
  } catch (error) {
    console.error('Unexpected error in generateReport:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Server Action: Generate report from screening ID
 * Finds the most recent clinical review for the screening
 */
export async function generateReportFromScreening(
  screeningId: string,
  format: 'json' | 'txt' | 'pdf' = 'json'
): Promise<GenerateReportResult> {
  try {
    if (!screeningId) {
      return {
        success: false,
        error: 'Screening ID is required',
      };
    }

    // Find the most recent clinical review for this screening
    const { data: reviewData, error: reviewError } = await db
      .from('clinical_reviews')
      .select('review_id')
      .eq('screening_id', screeningId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reviewError || !reviewData) {
      return {
        success: false,
        error: 'No clinical review found for this screening',
      };
    }

    return generateReport(reviewData.review_id, format);
  } catch (error) {
    console.error('Unexpected error in generateReportFromScreening:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

