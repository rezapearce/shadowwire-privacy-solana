/**
 * Discrepancy Detector Service
 * Calculates differences between AI and clinical scores to identify
 * potential misalignments that require review
 */

export interface DomainScores {
  social?: number | null;
  fineMotor?: number | null;
  language?: number | null;
  grossMotor?: number | null;
}

export interface DiscrepancyResult {
  domain: string;
  aiScore: number | null;
  clinicalScore: number | null;
  difference: number;
  severity: 'none' | 'low' | 'moderate' | 'high';
  requiresReview: boolean;
}

export interface DiscrepancySummary {
  discrepancies: DiscrepancyResult[];
  highDiscrepancyCount: number;
  moderateDiscrepancyCount: number;
  hasHighDiscrepancy: boolean;
}

const DISCREPANCY_THRESHOLDS = {
  low: 10,      // 0-10 points difference
  moderate: 20, // 11-20 points difference
  high: 20,     // >20 points difference
};

/**
 * Calculate discrepancy between AI and clinical scores for a single domain
 */
function calculateDomainDiscrepancy(
  domain: string,
  aiScore: number | null,
  clinicalScore: number | null
): DiscrepancyResult | null {
  // Skip if either score is missing
  if (aiScore === null || clinicalScore === null) {
    return null;
  }

  const difference = Math.abs(aiScore - clinicalScore);
  
  let severity: 'none' | 'low' | 'moderate' | 'high';
  let requiresReview = false;

  if (difference <= DISCREPANCY_THRESHOLDS.low) {
    severity = 'none';
  } else if (difference <= DISCREPANCY_THRESHOLDS.moderate) {
    severity = 'low';
  } else if (difference <= DISCREPANCY_THRESHOLDS.high) {
    severity = 'moderate';
    requiresReview = true;
  } else {
    severity = 'high';
    requiresReview = true;
  }

  return {
    domain,
    aiScore,
    clinicalScore,
    difference,
    severity,
    requiresReview,
  };
}

/**
 * Detect discrepancies between AI and clinical domain scores
 * 
 * @param aiScores - AI-computed domain scores
 * @param clinicalScores - Clinical assessment domain scores
 * @param threshold - Optional custom threshold (default: 20 points)
 * @returns Summary of discrepancies
 */
export function detectDiscrepancies(
  aiScores: DomainScores,
  clinicalScores: DomainScores,
  threshold: number = DISCREPANCY_THRESHOLDS.high
): DiscrepancySummary {
  const domainMap: Record<string, { ai: keyof DomainScores; clinical: keyof DomainScores; label: string }> = {
    social: { ai: 'social', clinical: 'social', label: 'Personal-Social' },
    fineMotor: { ai: 'fineMotor', clinical: 'fineMotor', label: 'Fine Motor' },
    language: { ai: 'language', clinical: 'language', label: 'Language' },
    grossMotor: { ai: 'grossMotor', clinical: 'grossMotor', label: 'Gross Motor' },
  };

  const discrepancies: DiscrepancyResult[] = [];

  Object.entries(domainMap).forEach(([key, { ai, clinical, label }]) => {
    const aiScore = aiScores[ai] ?? null;
    const clinicalScore = clinicalScores[clinical] ?? null;
    
    const discrepancy = calculateDomainDiscrepancy(label, aiScore, clinicalScore);
    if (discrepancy) {
      // Override requiresReview based on custom threshold
      if (discrepancy.difference > threshold) {
        discrepancy.requiresReview = true;
        discrepancy.severity = 'high';
      }
      discrepancies.push(discrepancy);
    }
  });

  const highDiscrepancyCount = discrepancies.filter((d) => d.severity === 'high').length;
  const moderateDiscrepancyCount = discrepancies.filter((d) => d.severity === 'moderate').length;
  const hasHighDiscrepancy = highDiscrepancyCount > 0;

  return {
    discrepancies,
    highDiscrepancyCount,
    moderateDiscrepancyCount,
    hasHighDiscrepancy,
  };
}

/**
 * Get discrepancy severity color for UI
 */
export function getDiscrepancyColor(severity: DiscrepancyResult['severity']): string {
  switch (severity) {
    case 'none':
      return 'text-green-600';
    case 'low':
      return 'text-blue-600';
    case 'moderate':
      return 'text-yellow-600';
    case 'high':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

/**
 * Get discrepancy severity badge variant
 */
export function getDiscrepancyBadgeVariant(severity: DiscrepancyResult['severity']): 'default' | 'destructive' | 'secondary' {
  switch (severity) {
    case 'high':
      return 'destructive';
    case 'moderate':
      return 'secondary';
    default:
      return 'default';
  }
}

