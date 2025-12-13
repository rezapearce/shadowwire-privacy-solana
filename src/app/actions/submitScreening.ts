'use server';

import { supabaseServer, supabaseFallback } from '@/lib/supabase-server';
import { denverIIQuestions } from '@/lib/screening/denverIIQuestions';
import { revalidatePath } from 'next/cache';
import Groq from 'groq-sdk';
import { buildClinicalPrompt } from '@/lib/ai/promptBuilder';
import { getQuestionById } from '@/lib/services/questionService';

// Use server client if available, otherwise fallback to regular client
const db = supabaseServer || supabaseFallback;

export interface SubmitScreeningResult {
  success: boolean;
  screening_id?: string;
  risk_level?: 'High' | 'Low';
  ai_risk_score?: number;
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
 * Submit a screening with hybrid AI/rule engine analysis
 * 
 * @param familyId - UUID of the family
 * @param childName - Name of the child
 * @param age - Age in months (0-36)
 * @param answers - Record of questionId -> answer value ("Yes", "No", "Not Yet")
 * @param videoUrls - Optional Record of questionId -> video path in storage
 * @param screeningId - Optional pre-generated screening ID (for video uploads)
 * @returns Screening result with screening_id, risk_level, and ai_risk_score
 */
export async function submitScreening(
  familyId: string,
  childName: string,
  age: number,
  answers: Record<string, string>,
  videoUrls?: Record<string, string>,
  screeningId?: string | null
): Promise<SubmitScreeningResult> {
  try {
    // Validate inputs
    if (!familyId || !childName || age === undefined || age < 0 || age > 36) {
      return {
        success: false,
        error: 'Invalid input parameters',
      };
    }

    if (!answers || Object.keys(answers).length === 0) {
      return {
        success: false,
        error: 'Answers cannot be empty',
      };
    }

    // Process answers: Convert Record to array with metadata
    const answersArray: Array<{
      questionId: string;
      response: string;
      category: string;
      questionText: string;
      milestoneAgeMonths: number;
      video_url?: string; // Optional path to video evidence in storage bucket
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
    for (const [questionId, answerValue] of Object.entries(answers)) {
      // Skip empty answers
      if (!answerValue || answerValue.trim() === '') {
        continue;
      }

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

      // Also try to get from questionService (for new question format)
      if (!question) {
        const denverQuestion = getQuestionById(questionId);
        if (denverQuestion) {
          // Convert DenverQuestion format to expected format
          question = {
            questionId: denverQuestion.id,
            category: denverQuestion.domain,
            questionText: denverQuestion.questionText,
            milestoneAgeMonths: denverQuestion.ageRangeMonths.start,
          } as any;
        }
      }

      if (!question) {
        console.warn(`Question not found: ${questionId}`);
        continue;
      }

      // Include video URL if available for this question
      const videoUrl = videoUrls?.[questionId];

      answersArray.push({
        questionId,
        response: answerValue,
        category: question.category,
        questionText: question.questionText,
        milestoneAgeMonths: question.milestoneAgeMonths,
        ...(videoUrl && { video_url: videoUrl }),
      });

      // Count "No" or "Not Yet" answers (missed milestones)
      if (answerValue === 'No' || answerValue === 'Not Yet') {
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

    // Hybrid AI/Rule-based logic
    const groqApiKey = process.env.GROQ_API_KEY;
    let ai_risk_score: number;
    let ai_summary: string;
    let risk_level: 'High' | 'Low';

    if (groqApiKey) {
      // AI Path: Use Groq for analysis
      try {
        const groq = new Groq({ apiKey: groqApiKey });
        const prompt = buildClinicalPrompt(age, answers);

        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a pediatric developmental screening AI assistant. Analyze Denver II screening results and provide a risk assessment with a clinical summary.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          model: 'llama3-8b-8192',
          temperature: 0.7,
          max_tokens: 500,
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response from Groq API');
        }

        const parsed = JSON.parse(content);
        
        // Validate and extract risk_score and summary
        ai_risk_score = typeof parsed.risk_score === 'number'
          ? Math.max(0, Math.min(100, parsed.risk_score))
          : (noAnswersCount / totalAnswers) * 100;

        ai_summary = typeof parsed.summary === 'string' && parsed.summary.trim()
          ? parsed.summary.trim()
          : generateSummary(
              ai_risk_score >= 50 ? 'High' : 'Low',
              Array.from(affectedCategories).map(getDomainName)
            );

        risk_level = ai_risk_score >= 50 ? 'High' : 'Low';

        console.log('AI analysis completed:', { ai_risk_score, risk_level });
      } catch (error) {
        console.error('Error calling Groq API, falling back to rule-based logic:', error);
        // Fallback to rule-based logic
        const noAnswersPercentage = (noAnswersCount / totalAnswers) * 100;
        const isHighRisk = noAnswersPercentage > 50;
        ai_risk_score = isHighRisk ? 85 : 10;
        risk_level = isHighRisk ? 'High' : 'Low';
        const affectedDomains = Array.from(affectedCategories).map(getDomainName);
        ai_summary = generateSummary(risk_level, affectedDomains);
      }
    } else {
      // Rule-based fallback (when GROQ_API_KEY is not set)
      const noAnswersPercentage = (noAnswersCount / totalAnswers) * 100;
      const isHighRisk = noAnswersPercentage > 50;
      ai_risk_score = isHighRisk ? 85 : 10;
      risk_level = isHighRisk ? 'High' : 'Low';
      const affectedDomains = Array.from(affectedCategories).map(getDomainName);
      ai_summary = generateSummary(risk_level, affectedDomains);
      console.log('Using rule-based analysis (GROQ_API_KEY not configured)');
    }

    // Insert into screenings table
    // Use provided screeningId if available (for video uploads), otherwise let DB generate one
    const insertData: any = {
      family_id: familyId,
      child_name: childName.trim(),
      child_age_months: age,
      answers: answersArray,
      ai_risk_score,
      ai_summary,
      status: 'PENDING_REVIEW' as const,
    };

    // If screeningId is provided, use it (videos are already uploaded with this ID)
    if (screeningId) {
      insertData.id = screeningId;
    }

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
      ai_risk_score,
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
      .select('id, child_name, child_age_months, ai_risk_score, ai_summary, status, created_at, clinical_notes, clinical_risk_level, reviewed_at, reviewed_by')
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
      ai_summary: screening.ai_summary || null,
      clinical_notes: screening.clinical_notes || null,
      clinical_risk_level: screening.clinical_risk_level || null,
      reviewed_at: screening.reviewed_at || null,
      reviewed_by: screening.reviewed_by || null,
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
