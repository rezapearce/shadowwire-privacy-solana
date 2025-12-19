'use server';

import { supabaseServer, supabaseFallback } from '@/lib/supabase-server';

// Use server client if available, otherwise fallback to regular client
const db = supabaseServer || supabaseFallback;

export interface DomainScores {
  social_score_ai: number;
  fine_motor_score_ai: number;
  language_score_ai: number;
  gross_motor_score_ai: number;
}

/**
 * Calculate Denver II domain scores from answers JSONB
 * 
 * Scoring logic:
 * - For each domain, calculate percentage of milestones passed
 * - Only consider milestones that are age-appropriate (milestoneAgeMonths <= child_age_months)
 * - Score = (passed milestones / total age-appropriate milestones) * 100
 * 
 * @param answers - JSONB array of questionnaire answers
 * @param childAgeMonths - Child's age in months
 * @returns Domain scores (0-100) for each domain
 */
export function calculateDomainScores(
  answers: any[],
  childAgeMonths: number
): DomainScores {
  // Map category names from answers to domain names
  const categoryToDomain: Record<string, keyof DomainScores> = {
    'personal_social': 'social_score_ai',
    'fine_motor': 'fine_motor_score_ai',
    'language': 'language_score_ai',
    'gross_motor': 'gross_motor_score_ai',
  };

  // Initialize domain counters
  const domainStats: Record<string, { passed: number; total: number }> = {
    social_score_ai: { passed: 0, total: 0 },
    fine_motor_score_ai: { passed: 0, total: 0 },
    language_score_ai: { passed: 0, total: 0 },
    gross_motor_score_ai: { passed: 0, total: 0 },
  };

  // Process each answer
  if (Array.isArray(answers)) {
    answers.forEach((answer: any) => {
      // Get category from answer (handle different field names)
      const category = answer.category || answer.questionCategory || '';
      
      // Map category to domain
      const domain = categoryToDomain[category];
      
      if (!domain) {
        // Skip unknown categories
        return;
      }

      // Get milestone age (must be age-appropriate)
      const milestoneAge = answer.milestoneAgeMonths || answer.milestone_age_months || 0;
      
      // Only count milestones that are age-appropriate
      if (milestoneAge <= childAgeMonths) {
        domainStats[domain].total++;
        
        // Check if milestone was passed
        // Handle different response formats: boolean, "Yes"/"No", etc.
        let passed = false;
        if (typeof answer.response === 'boolean') {
          passed = answer.response;
        } else if (typeof answer.response === 'string') {
          const normalized = answer.response.trim().toLowerCase();
          passed = normalized === 'yes' || normalized === 'true';
        }
        
        if (passed) {
          domainStats[domain].passed++;
        }
      }
    });
  }

  // Calculate scores (percentage)
  const scores: DomainScores = {
    social_score_ai: domainStats.social_score_ai.total > 0
      ? Math.round((domainStats.social_score_ai.passed / domainStats.social_score_ai.total) * 100)
      : 0,
    fine_motor_score_ai: domainStats.fine_motor_score_ai.total > 0
      ? Math.round((domainStats.fine_motor_score_ai.passed / domainStats.fine_motor_score_ai.total) * 100)
      : 0,
    language_score_ai: domainStats.language_score_ai.total > 0
      ? Math.round((domainStats.language_score_ai.passed / domainStats.language_score_ai.total) * 100)
      : 0,
    gross_motor_score_ai: domainStats.gross_motor_score_ai.total > 0
      ? Math.round((domainStats.gross_motor_score_ai.passed / domainStats.gross_motor_score_ai.total) * 100)
      : 0,
  };

  return scores;
}

/**
 * Server Action: Calculate and store domain scores for a screening
 * 
 * @param screeningId - UUID of the screening
 * @returns Success status and calculated scores
 */
export async function calculateAndStoreDomainScores(
  screeningId: string
): Promise<{
  success: boolean;
  scores?: DomainScores;
  error?: string;
}> {
  try {
    if (!screeningId) {
      return {
        success: false,
        error: 'Screening ID is required',
      };
    }

    // Fetch screening with answers
    const { data: screening, error: fetchError } = await db
      .from('screenings')
      .select('id, answers, child_age_months')
      .eq('id', screeningId)
      .single();

    if (fetchError || !screening) {
      return {
        success: false,
        error: 'Screening not found',
      };
    }

    // Calculate domain scores
    const scores = calculateDomainScores(
      screening.answers || [],
      screening.child_age_months
    );

    // Update screening with calculated scores
    const { error: updateError } = await db
      .from('screenings')
      .update({
        social_score_ai: scores.social_score_ai,
        fine_motor_score_ai: scores.fine_motor_score_ai,
        language_score_ai: scores.language_score_ai,
        gross_motor_score_ai: scores.gross_motor_score_ai,
      })
      .eq('id', screeningId);

    if (updateError) {
      console.error('Error updating domain scores:', updateError);
      return {
        success: false,
        error: `Failed to update domain scores: ${updateError.message}`,
      };
    }

    return {
      success: true,
      scores,
    };
  } catch (error) {
    console.error('Unexpected error in calculateAndStoreDomainScores:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

