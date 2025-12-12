/**
 * Prompt Builder for Clinical Screening Analysis
 * 
 * Formats screening answers into a structured prompt for Groq AI analysis
 */

import { getQuestionById } from '@/lib/services/questionService';
import { ScreeningDomain } from '@/types/screening';

/**
 * Map domain codes to readable domain names
 */
function getDomainName(domain: ScreeningDomain | string): string {
  const domainMap: Record<string, string> = {
    personal_social: 'Personal-Social',
    fine_motor: 'Fine Motor',
    language: 'Language',
    gross_motor: 'Gross Motor',
  };
  return domainMap[domain] || domain;
}

/**
 * Build a clinical prompt for Groq AI analysis
 * 
 * @param age - Child's age in months
 * @param answers - Map of questionId -> answer value ("Yes", "No", "Not Yet")
 * @returns Formatted prompt string for AI analysis
 */
export function buildClinicalPrompt(
  age: number,
  answers: Record<string, string>
): string {
  const metMilestones: Array<{ domain: string; questionText: string; answer: string }> = [];
  const missedMilestones: Array<{ domain: string; questionText: string; answer: string }> = [];

  // Process each answer
  for (const [questionId, answerValue] of Object.entries(answers)) {
    // Skip if answer is empty or undefined
    if (!answerValue || answerValue.trim() === '') {
      continue;
    }

    // Look up question details
    const question = getQuestionById(questionId);
    
    if (!question) {
      console.warn(`Question not found for ID: ${questionId}`);
      continue;
    }

    const domainName = getDomainName(question.domain);
    const entry = {
      domain: domainName,
      questionText: question.questionText,
      answer: answerValue,
    };

    // Categorize based on answer
    if (answerValue === 'Yes') {
      metMilestones.push(entry);
    } else if (answerValue === 'No' || answerValue === 'Not Yet') {
      missedMilestones.push(entry);
    }
    // Note: "No Opportunity" answers are skipped (not counted as missed)
  }

  // Build prompt sections
  let prompt = `Child Age: ${age} months.\n\n`;

  // Missed Milestones section
  if (missedMilestones.length > 0) {
    prompt += `Missed Milestones:\n`;
    missedMilestones.forEach((item) => {
      prompt += `- [${item.domain}] ${item.questionText} (Answer: ${item.answer})\n`;
    });
    prompt += '\n';
  } else {
    prompt += `Missed Milestones: None\n\n`;
  }

  // Met Milestones section (for context)
  if (metMilestones.length > 0) {
    prompt += `Met Milestones:\n`;
    metMilestones.forEach((item) => {
      prompt += `- [${item.domain}] ${item.questionText} (Answer: ${item.answer})\n`;
    });
    prompt += '\n';
  }

  // Task instruction
  prompt += `Task: Analyze these developmental delays and concerns. Provide a Risk Score (0-100) and a 2-sentence clinical summary suitable for a pediatrician.`;

  return prompt;
}
