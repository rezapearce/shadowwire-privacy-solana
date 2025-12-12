/**
 * Sample Denver II Questions for Testing
 * 
 * This file contains a small subset of questions (12-15) covering:
 * - Age 0-6 months
 * - Age 12-24 months  
 * - Age 3-4 years
 * - All 4 domains (Personal-Social, Fine Motor, Language, Gross Motor)
 */

import { DenverQuestion, ScreeningDomain } from '@/types/screening';

export const denverQuestionsSample: DenverQuestion[] = [
  // Age 0-6 months - Personal-Social
  {
    id: 'PS-SAMPLE-001',
    domain: ScreeningDomain.PERSONAL_SOCIAL,
    questionText: 'Does your baby smile when you talk to or smile at her (a "social smile")?',
    ageRangeMonths: {
      start: 2,
      end: 4,
    },
    responseOptions: ['Yes', 'Not Yet', 'No Opportunity'],
    requiresVideo: false,
    videoInstruction: '',
    order: 1,
  },

  // Age 0-6 months - Fine Motor
  {
    id: 'FM-SAMPLE-001',
    domain: ScreeningDomain.FINE_MOTOR,
    questionText: 'Does your baby follow objects past the midline (follows with eyes from one side to the other)?',
    ageRangeMonths: {
      start: 2,
      end: 4,
    },
    responseOptions: ['Yes', 'Not Yet', 'No Opportunity'],
    requiresVideo: false,
    videoInstruction: '',
    order: 2,
  },

  // Age 0-6 months - Language
  {
    id: 'LANG-SAMPLE-001',
    domain: ScreeningDomain.LANGUAGE,
    questionText: 'Does your baby make cooing sounds?',
    ageRangeMonths: {
      start: 2,
      end: 4,
    },
    responseOptions: ['Yes', 'Not Yet', 'No Opportunity'],
    requiresVideo: false,
    videoInstruction: '',
    order: 3,
  },

  // Age 0-6 months - Gross Motor
  {
    id: 'GM-SAMPLE-001',
    domain: ScreeningDomain.GROSS_MOTOR,
    questionText: 'Can your baby lift their head when lying on their stomach?',
    ageRangeMonths: {
      start: 1,
      end: 3,
    },
    responseOptions: ['Yes', 'Not Yet', 'No Opportunity'],
    requiresVideo: false,
    videoInstruction: '',
    order: 4,
  },

  // Age 0-6 months - Gross Motor (additional)
  {
    id: 'GM-SAMPLE-002',
    domain: ScreeningDomain.GROSS_MOTOR,
    questionText: 'Can your baby roll from stomach to back?',
    ageRangeMonths: {
      start: 4,
      end: 6,
    },
    responseOptions: ['Yes', 'Not Yet', 'No Opportunity'],
    requiresVideo: false,
    videoInstruction: '',
    order: 5,
  },

  // Age 12-24 months - Personal-Social
  {
    id: 'PS-SAMPLE-002',
    domain: ScreeningDomain.PERSONAL_SOCIAL,
    questionText: 'Does your child drink from a cup without help?',
    ageRangeMonths: {
      start: 12,
      end: 18,
    },
    responseOptions: ['Yes', 'Not Yet', 'No Opportunity'],
    requiresVideo: false,
    videoInstruction: '',
    order: 6,
  },

  // Age 12-24 months - Fine Motor
  {
    id: 'FM-SAMPLE-002',
    domain: ScreeningDomain.FINE_MOTOR,
    questionText: 'Can your child stack 2 blocks?',
    ageRangeMonths: {
      start: 12,
      end: 15,
    },
    responseOptions: ['Yes', 'Not Yet', 'No Opportunity'],
    requiresVideo: false,
    videoInstruction: '',
    order: 7,
  },

  // Age 12-24 months - Language
  {
    id: 'LANG-SAMPLE-002',
    domain: ScreeningDomain.LANGUAGE,
    questionText: 'Does your child say at least 3 words besides "mama" and "dada"?',
    ageRangeMonths: {
      start: 12,
      end: 15,
    },
    responseOptions: ['Yes', 'Not Yet', 'No Opportunity'],
    requiresVideo: false,
    videoInstruction: '',
    order: 8,
  },

  // Age 12-24 months - Gross Motor
  {
    id: 'GM-SAMPLE-003',
    domain: ScreeningDomain.GROSS_MOTOR,
    questionText: 'Can your child walk well (walks without holding on)?',
    ageRangeMonths: {
      start: 12,
      end: 15,
    },
    responseOptions: ['Yes', 'Not Yet', 'No Opportunity'],
    requiresVideo: false,
    videoInstruction: '',
    order: 9,
  },

  // Age 12-24 months - Gross Motor (additional)
  {
    id: 'GM-SAMPLE-004',
    domain: ScreeningDomain.GROSS_MOTOR,
    questionText: 'Can your child run?',
    ageRangeMonths: {
      start: 18,
      end: 24,
    },
    responseOptions: ['Yes', 'Not Yet', 'No Opportunity'],
    requiresVideo: false,
    videoInstruction: '',
    order: 10,
  },

  // Age 3-4 years - Personal-Social
  {
    id: 'PS-SAMPLE-003',
    domain: ScreeningDomain.PERSONAL_SOCIAL,
    questionText: 'Does your child know their first and last name?',
    ageRangeMonths: {
      start: 36,
      end: 48,
    },
    responseOptions: ['Yes', 'Not Yet', 'No Opportunity'],
    requiresVideo: false,
    videoInstruction: '',
    order: 11,
  },

  // Age 3-4 years - Fine Motor
  {
    id: 'FM-SAMPLE-003',
    domain: ScreeningDomain.FINE_MOTOR,
    questionText: 'Can your child copy a circle when drawing?',
    ageRangeMonths: {
      start: 33,
      end: 36,
    },
    responseOptions: ['Yes', 'Not Yet', 'No Opportunity'],
    requiresVideo: false,
    videoInstruction: '',
    order: 12,
  },

  // Age 3-4 years - Language
  {
    id: 'LANG-SAMPLE-003',
    domain: ScreeningDomain.LANGUAGE,
    questionText: 'Does your child speak in 3-word sentences?',
    ageRangeMonths: {
      start: 30,
      end: 36,
    },
    responseOptions: ['Yes', 'Not Yet', 'No Opportunity'],
    requiresVideo: false,
    videoInstruction: '',
    order: 13,
  },

  // Age 3-4 years - Gross Motor
  {
    id: 'GM-SAMPLE-005',
    domain: ScreeningDomain.GROSS_MOTOR,
    questionText: 'Can your child balance on one foot for 2 seconds?',
    ageRangeMonths: {
      start: 36,
      end: 48,
    },
    responseOptions: ['Yes', 'Not Yet', 'No Opportunity'],
    requiresVideo: false,
    videoInstruction: '',
    order: 14,
  },

  // Age 3-4 years - Personal-Social (additional)
  {
    id: 'PS-SAMPLE-004',
    domain: ScreeningDomain.PERSONAL_SOCIAL,
    questionText: 'Does your child play cooperatively with other children?',
    ageRangeMonths: {
      start: 48,
      end: 60,
    },
    responseOptions: ['Yes', 'Not Yet', 'No Opportunity'],
    requiresVideo: false,
    videoInstruction: '',
    order: 15,
  },
];
