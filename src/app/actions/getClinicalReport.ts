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
