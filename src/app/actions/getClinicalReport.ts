'use server';

import { supabase } from '@/lib/supabase';
import { supabaseServer, supabaseFallback } from '@/lib/supabase-server';

export interface ScreeningAnswer {
  questionId: string;
  response: boolean;
  category: string;
  questionText: string;
  milestoneAgeMonths: number;
  video_url?: string; // Optional path to video evidence in storage bucket
}

export interface ClinicalReport {
  child_name: string;
  child_age_months: number;
  ai_risk_score: number | null;
  ai_summary: string | null;
  answers: ScreeningAnswer[];
  created_at: string;
  clinical_notes: string | null;
  clinical_risk_level: 'LOW' | 'MODERATE' | 'HIGH' | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  // Domain scores
  social_score_ai: number | null;
  fine_motor_score_ai: number | null;
  language_score_ai: number | null;
  gross_motor_score_ai: number | null;
  // Clinical review data
  clinical_review?: {
    social_score_clinical: number | null;
    fine_motor_clinical: number | null;
    language_clinical: number | null;
    gross_motor_clinical: number | null;
    final_diagnosis: string | null;
    recommendations: string | null;
    is_published: boolean;
  } | null;
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

    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      return {
        success: false,
        error: 'Screening record not found',
      };
    }

    // Transform answers: convert string responses ("Yes"/"No"/"Not Yet") to boolean
    const transformedAnswers: ScreeningAnswer[] = (data.answers || []).map((answer: any) => {
      // Handle different response formats
      let responseValue: boolean;
      
      if (typeof answer.response === 'boolean') {
        // Already boolean
        responseValue = answer.response;
      } else if (typeof answer.response === 'string') {
        // Convert string to boolean: "Yes" -> true, "No" or "Not Yet" -> false
        const normalizedResponse = answer.response.trim().toLowerCase();
        responseValue = normalizedResponse === 'yes';
      } else {
        // Default to false for missing/invalid responses
        responseValue = false;
      }

      return {
        questionId: answer.questionId || answer.question_id || '',
        response: responseValue,
        category: answer.category || '',
        questionText: answer.questionText || answer.question_text || '',
        milestoneAgeMonths: answer.milestoneAgeMonths || answer.milestone_age_months || 0,
        video_url: answer.video_url || answer.videoUrl || undefined,
      };
    });

    // Generate signed URLs for videos using service role key (bypasses RLS)
    const db = supabaseServer || supabaseFallback;
    const answersWithSignedUrls = await Promise.all(
      transformedAnswers.map(async (answer) => {
        if (answer.video_url) {
          try {
            const { data: signedUrlData, error: signedUrlError } = await db.storage
              .from('clinical-evidence')
              .createSignedUrl(answer.video_url, 3600); // Valid for 1 hour
            
            if (signedUrlError) {
              console.error(`Failed to generate signed URL for ${answer.video_url}:`, signedUrlError);
              // Return answer without video_url if signed URL generation fails
              return { ...answer, video_url: undefined };
            }
            
            // Replace private path with signed URL
            return { ...answer, video_url: signedUrlData.signedUrl };
          } catch (error) {
            console.error(`Error generating signed URL for ${answer.video_url}:`, error);
            // Return answer without video_url if error occurs
            return { ...answer, video_url: undefined };
          }
        }
        return answer;
      })
    );

    // Fetch domain scores and clinical review separately
    const { data: screeningData, error: screeningError } = await db
      .from('screenings')
      .select('social_score_ai, fine_motor_score_ai, language_score_ai, gross_motor_score_ai')
      .eq('id', screeningId)
      .single();

    const { data: clinicalReviewData } = await db
      .from('clinical_reviews')
      .select('social_score_clinical, fine_motor_clinical, language_clinical, gross_motor_clinical, final_diagnosis, recommendations, is_published')
      .eq('screening_id', screeningId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Transform the data to match our interface
    const report: ClinicalReport = {
      child_name: data.child_name || '',
      child_age_months: data.child_age_months || 0,
      ai_risk_score: data.ai_risk_score ?? null,
      ai_summary: data.ai_summary || null,
      answers: answersWithSignedUrls,
      created_at: data.created_at || new Date().toISOString(),
      clinical_notes: data.clinical_notes || null,
      clinical_risk_level: data.clinical_risk_level || null,
      reviewed_at: data.reviewed_at || null,
      reviewed_by: data.reviewed_by || null,
      social_score_ai: screeningData?.social_score_ai ?? null,
      fine_motor_score_ai: screeningData?.fine_motor_score_ai ?? null,
      language_score_ai: screeningData?.language_score_ai ?? null,
      gross_motor_score_ai: screeningData?.gross_motor_score_ai ?? null,
      clinical_review: clinicalReviewData ? {
        social_score_clinical: clinicalReviewData.social_score_clinical ?? null,
        fine_motor_clinical: clinicalReviewData.fine_motor_clinical ?? null,
        language_clinical: clinicalReviewData.language_clinical ?? null,
        gross_motor_clinical: clinicalReviewData.gross_motor_clinical ?? null,
        final_diagnosis: clinicalReviewData.final_diagnosis || null,
        recommendations: clinicalReviewData.recommendations || null,
        is_published: clinicalReviewData.is_published || false,
      } : null,
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
