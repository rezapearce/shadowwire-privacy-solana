/**
 * Diagnosis Templates for Clinical Assessment
 * ShadowWire Privacy Hackathon 2026
 * 
 * This is a stub implementation for build compatibility
 */

export interface DiagnosisTemplate {
  id: string;
  name: string;
  description: string;
  criteria: string[];
  recommendations: string[];
}

export const DIAGNOSIS_TEMPLATES: DiagnosisTemplate[] = [
  {
    id: 'typical-development',
    name: 'Typical Development',
    description: 'Child is developing within expected ranges for age',
    criteria: ['All domains within normal limits', 'Age-appropriate milestones'],
    recommendations: ['Continue routine monitoring', 'Parent education on developmental milestones']
  },
  {
    id: 'developmental-delay',
    name: 'Developmental Delay',
    description: 'Child shows delays in one or more developmental domains',
    criteria: ['Scores below expected range in one or more domains', 'Delayed milestone achievement'],
    recommendations: ['Early intervention services', 'Developmental therapy', 'Regular follow-up']
  },
  {
    id: 'advanced-development',
    name: 'Advanced Development',
    description: 'Child shows advanced skills in one or more domains',
    criteria: ['Scores above expected range', 'Early achievement of milestones'],
    recommendations: ['Enrichment activities', 'Advanced learning opportunities', 'Gifted program consideration']
  }
];

export function getDiagnosisTemplate(id: string): DiagnosisTemplate | undefined {
  return DIAGNOSIS_TEMPLATES.find(template => template.id === id);
}
