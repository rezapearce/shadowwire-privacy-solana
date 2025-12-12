'use server';

import { supabaseServer, supabaseFallback } from '@/lib/supabase-server';
import { denverIIQuestions } from '@/lib/screening/denverIIQuestions';
import { revalidatePath } from 'next/cache';

// Use server client if available, otherwise fallback to regular client
const db = supabaseServer || supabaseFallback;

export interface SubmitScreeningResult {
  success: boolean;
  screening_id?: string;
  risk_level?: 'High' | 'Low';
  error?: string;
}

/**
 * Map category codes to readable domain names
 */
function getDomainName(category: string): string {
  const domainMap: Record<string, string> = {
    gross_motor: 'Gross Motor',
    fine_motor: 'Fine Motor',
    language: 'Language',
    personal_social: 'Personal-Social',
  };
  return domainMap[category] || category;
}

/**
 * Generate summary text based on risk level and affected domains
 */
function generateSummary(
  riskLevel: 'High' | 'Low',
  affectedDomains: string[]
): string {
  if (riskLevel === 'High') {
    const domainsText = affectedDomains.join(', ');
    return `Concerns detected in ${domainsText}. Clinical review recommended.`;
  }
  return 'Developmental milestones appear on track.';
}

/**
 * Submit a screening with rule engine analysis
 * 
 * @param familyId - UUID of the family
 * @param childName - Name of the child
 * @param age - Age in months (0-36)
 * @param answers - Map of questionId -> boolean (true = achieved, false = not achieved)
 * @returns Screening result with screening_id and risk_level
 */
export async function submitScreening(
  familyId: string,
  childName: string,
  age: number,
  answers: Map<string, boolean>
): Promise<SubmitScreeningResult> {
  try {
    // Validate inputs
    if (!familyId || !childName || age === undefined || age < 0 || age > 36) {
      return {
        success: false,
        error: 'Invalid input parameters',
      };
    }

    if (!answers || answers.size === 0) {
      return {
        success: false,
        error: 'Answers cannot be empty',
      };
    }

    // Process answers: Convert Map to array with metadata
    const answersArray: Array<{
      questionId: string;
      response: boolean;
      category: string;
      questionText: string;
      milestoneAgeMonths: number;
    }> = [];

    let noAnswersCount = 0;
    const affectedCategories = new Set<string>();

    // MVP Questions mapping for demo (fallback when not in denverIIQuestions)
    const mvpQuestionsMap: Record<string, { category: string; questionText: string; milestoneAgeMonths: number }> = {
      'gm_mvp_1': { category: 'gross_motor', questionText: 'Walks well', milestoneAgeMonths: 13 },
      'gm_mvp_2': { category: 'gross_motor', questionText: 'Stoops and recovers', milestoneAgeMonths: 15 },
      'gm_mvp_3': { category: 'gross_motor', questionText: 'Runs steadily', milestoneAgeMonths: 20 },
      'lang_mvp_1': { category: 'language', questionText: 'Says 3 words', milestoneAgeMonths: 14 },
      'lang_mvp_2': { category: 'language', questionText: 'Follows simple commands', milestoneAgeMonths: 17 },
      'lang_mvp_3': { category: 'language', questionText: 'Uses 2-word phrases', milestoneAgeMonths: 26 },
    };

    // Look up question metadata for each answer
    for (const [questionId, response] of Array.from(answers.entries())) {
      // First try to find in denverIIQuestions
      let question = denverIIQuestions.find((q) => q.questionId === questionId);
      
      // If not found, try MVP questions map
      if (!question) {
        const mvpQuestion = mvpQuestionsMap[questionId];
        if (mvpQuestion) {
          // Create a question-like object from MVP mapping
          question = {
            questionId,
            category: mvpQuestion.category as any,
            questionText: mvpQuestion.questionText,
            milestoneAgeMonths: mvpQuestion.milestoneAgeMonths,
          } as any;
        }
      }

      if (!question) {
        console.warn(`Question not found: ${questionId}`);
        continue;
      }

      answersArray.push({
        questionId,
        response,
        category: question.category,
        questionText: question.questionText,
        milestoneAgeMonths: question.milestoneAgeMonths,
      });

      // Count "No" answers (false = milestone not achieved)
      if (!response) {
        noAnswersCount++;
        affectedCategories.add(question.category);
      }
    }

    const totalAnswers = answersArray.length;
    if (totalAnswers === 0) {
      return {
        success: false,
        error: 'No valid answers found',
      };
    }

    // Calculate risk using rule engine
    const noAnswersPercentage = (noAnswersCount / totalAnswers) * 100;
    const isHighRisk = noAnswersPercentage > 50;

    const ai_risk_score = isHighRisk ? 85 : 10;
    const risk_level: 'High' | 'Low' = isHighRisk ? 'High' : 'Low';

    // Generate summary
    const affectedDomains = Array.from(affectedCategories).map(getDomainName);
    const ai_summary = generateSummary(risk_level, affectedDomains);

    // Insert into screenings table
    const insertData = {
      family_id: familyId,
      child_name: childName.trim(),
      child_age_months: age,
      answers: answersArray,
      ai_risk_score,
      ai_summary,
      status: 'PENDING_REVIEW' as const,
    };

    // Log database client info for debugging
    const dbType = supabaseServer ? 'server (service role)' : 'fallback (anon)';
    console.log('Database client type:', dbType);
    console.log('Supabase URL configured:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service role key configured:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('Inserting screening data:', {
      family_id: familyId,
      child_name: childName.trim(),
      child_age_months: age,
      answers_count: answersArray.length,
      ai_risk_score,
      risk_level,
    });

    const { data, error } = await db
      .from('screenings')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      console.error('Error inserting screening:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: error,
      });
      return {
        success: false,
        error: `Failed to save screening: ${error.message}${error.code ? ` (Code: ${error.code})` : ''}${error.hint ? `. Hint: ${error.hint}` : ''}`,
      };
    }

    if (!data || !data.id) {
      return {
        success: false,
        error: 'Failed to save screening: No ID returned',
      };
    }

    // Revalidate paths to update UI
    revalidatePath('/screening');
    revalidatePath('/');

    return {
      success: true,
      screening_id: data.id,
      risk_level,
    };
  } catch (error) {
    console.error('Unexpected error in submitScreening:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Server Action: Get all screenings for a family from the screenings table
 */
export async function getFamilyScreenings(
  familyId: string
): Promise<{ success: boolean; screenings?: any[]; error?: string }> {
  try {
    const db = supabaseServer || supabaseFallback;
    
    const { data, error } = await db
      .from('screenings')
      .select('id, child_name, child_age_months, ai_risk_score, status, created_at')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching family screenings:', error);
      return {
        success: false,
        error: `Failed to fetch screenings: ${error.message}`,
      };
    }

    // Transform to match expected format
    const screenings = (data || []).map((screening) => ({
      id: screening.id,
      child_name: screening.child_name,
      child_age_months: screening.child_age_months,
      risk_score: screening.ai_risk_score,
      risk_level: screening.ai_risk_score && screening.ai_risk_score >= 50 ? 'High' : 'Low',
      status: screening.status || 'PENDING_REVIEW',
      created_at: screening.created_at,
    }));

    return {
      success: true,
      screenings,
    };
  } catch (error) {
    console.error('Unexpected error in getFamilyScreenings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
