/**
 * Denver II Developmental Screening Type Definitions
 * 
 * These types match the structure of denverQuestions.json
 */

/**
 * Domain categories for Denver II screening questions
 */
export enum ScreeningDomain {
  PERSONAL_SOCIAL = 'personal_social',
  FINE_MOTOR = 'fine_motor',
  LANGUAGE = 'language',
  GROSS_MOTOR = 'gross_motor',
}

/**
 * Response options for questionnaire questions
 */
export type QuestionResponse = 'Yes' | 'Not Yet' | 'No Opportunity';

/**
 * Denver II Question structure matching the JSON format
 */
export interface DenverQuestion {
  id: string;
  domain: ScreeningDomain;
  questionText: string;
  ageRangeMonths: {
    start: number;
    end: number;
  };
  responseOptions: QuestionResponse[];
  requiresVideo: boolean;
  videoInstruction: string;
  order: number;
}

/**
 * Simplified age range for filtering
 */
export interface AgeRange {
  min: number;
  max: number;
}

/**
 * Questionnaire response from user
 */
export interface QuestionnaireResponse {
  question_id: string;
  response: QuestionResponse;
  notes?: string;
  video_url?: string; // Optional path to video evidence in storage bucket
}

/**
 * Questions grouped by domain
 */
export interface QuestionsByDomain {
  personal_social: DenverQuestion[];
  fine_motor: DenverQuestion[];
  language: DenverQuestion[];
  gross_motor: DenverQuestion[];
}

/**
 * JSON file structure
 */
export interface DenverQuestionsData {
  metadata: {
    version: string;
    totalQuestions: number;
    ageRangeMonths: AgeRange;
    lastUpdated: string;
    description: string;
  };
  questions: DenverQuestion[];
}
