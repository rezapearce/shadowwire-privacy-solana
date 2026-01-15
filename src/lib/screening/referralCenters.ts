/**
 * Referral Centers for Clinical Assessment
 * ShadowWire Privacy Hackathon 2026
 * 
 * This is a stub implementation for build compatibility
 */

export interface ReferralCenter {
  id: string;
  name: string;
  type: 'hospital' | 'clinic' | 'specialist' | 'therapy';
  location: string;
  specialties: string[];
  contact: string;
}

export const REFERRAL_CENTERS: ReferralCenter[] = [
  {
    id: 'childrens-hospital',
    name: 'Children\'s Medical Center',
    type: 'hospital',
    location: 'Main Campus, Building A',
    specialties: ['Pediatrics', 'Developmental Medicine', 'Neurology'],
    contact: '(555) 123-4567'
  },
  {
    id: 'developmental-clinic',
    name: 'Developmental Assessment Clinic',
    type: 'clinic',
    location: 'Downtown Medical Plaza',
    specialties: ['Developmental Screening', 'Early Intervention', 'Behavioral Therapy'],
    contact: '(555) 987-6543'
  },
  {
    id: 'speech-therapy',
    name: 'Speech & Language Therapy Center',
    type: 'therapy',
    location: 'Wellness Center, Suite 200',
    specialties: ['Speech Therapy', 'Language Development', 'Communication Disorders'],
    contact: '(555) 246-8135'
  }
];

export function getReferralCenters(type?: ReferralCenter['type']): ReferralCenter[] {
  if (type) {
    return REFERRAL_CENTERS.filter(center => center.type === type);
  }
  return REFERRAL_CENTERS;
}

export function formatReferralRecommendation(center: ReferralCenter, reason: string): string {
  return `Refer to ${center.name} (${center.type}) for ${reason}. Location: ${center.location}. Contact: ${center.contact}. Specialties: ${center.specialties.join(', ')}.`;
}
