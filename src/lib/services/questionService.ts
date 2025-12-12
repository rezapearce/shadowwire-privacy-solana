/**
 * Question Service for Denver II Developmental Screening
 * 
 * Loads questions from denverQuestions.json and provides filtering by age
 */

import denverQuestionsData from '@/lib/data/denverQuestions.json';
import {
  DenverQuestion,
  QuestionsByDomain,
  ScreeningDomain,
  DenverQuestionsData,
} from '@/types/screening';

// Type assertion for imported JSON
const questionsDatabase = denverQuestionsData as DenverQuestionsData;

// Cache for loaded questions
let cachedQuestions: DenverQuestion[] | null = null;

/**
 * Load all questions from the JSON file
 * Uses caching to avoid reloading on every call
 */
function loadQuestions(): DenverQuestion[] {
  if (cachedQuestions) {
    return cachedQuestions;
  }

  cachedQuestions = questionsDatabase.questions.map((q) => ({
    ...q,
    domain: q.domain as ScreeningDomain,
  }));

  return cachedQuestions;
}

/**
 * Get all questions for a specific age (in months)
 * Returns questions where the age falls within the question's age range
 * 
 * @param ageInMonths - Child's age in months
 * @returns Array of questions relevant for the given age
 */
export function getQuestionsForAge(ageInMonths: number): DenverQuestion[] {
  const allQuestions = loadQuestions();

  return allQuestions.filter((question) => {
    const { start, end } = question.ageRangeMonths;
    return ageInMonths >= start && ageInMonths <= end;
  });
}

/**
 * Get questions grouped by domain for a specific age
 * Useful for displaying questions in 4 distinct sections
 * 
 * @param ageInMonths - Child's age in months
 * @returns Questions grouped by domain (personal_social, fine_motor, language, gross_motor)
 */
export function getQuestionsByDomain(ageInMonths: number): QuestionsByDomain {
  const questions = getQuestionsForAge(ageInMonths);

  // Initialize domain groups
  const grouped: QuestionsByDomain = {
    personal_social: [],
    fine_motor: [],
    language: [],
    gross_motor: [],
  };

  // Group questions by domain
  questions.forEach((question) => {
    const domain = question.domain;
    if (domain in grouped) {
      grouped[domain as keyof QuestionsByDomain].push(question);
    }
  });

  // Sort questions within each domain by order
  Object.keys(grouped).forEach((domain) => {
    grouped[domain as keyof QuestionsByDomain].sort(
      (a, b) => a.order - b.order
    );
  });

  return grouped;
}

/**
 * Get a single question by ID
 * 
 * @param questionId - The question ID (e.g., "PS-001")
 * @returns The question if found, null otherwise
 */
export function getQuestionById(questionId: string): DenverQuestion | null {
  const allQuestions = loadQuestions();
  return allQuestions.find((q) => q.id === questionId) || null;
}

/**
 * Get questions for a specific domain and age
 * 
 * @param domain - The screening domain
 * @param ageInMonths - Child's age in months
 * @returns Array of questions for the specified domain and age
 */
export function getQuestionsByDomainAndAge(
  domain: ScreeningDomain,
  ageInMonths: number
): DenverQuestion[] {
  const questions = getQuestionsForAge(ageInMonths);
  return questions
    .filter((q) => q.domain === domain)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get metadata about the question database
 */
export function getQuestionMetadata() {
  return questionsDatabase.metadata;
}

/**
 * Clear the question cache (useful for testing or reloading)
 */
export function clearQuestionCache(): void {
  cachedQuestions = null;
}
