'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface DomainScores {
  social_score_ai?: number | null;
  fine_motor_score_ai?: number | null;
  language_score_ai?: number | null;
  gross_motor_score_ai?: number | null;
  social_score_clinical?: number | null;
  fine_motor_clinical?: number | null;
  language_clinical?: number | null;
  gross_motor_clinical?: number | null;
}

interface DenverResultsChartProps {
  aiScores: DomainScores;
  clinicalScores?: DomainScores;
  showComparison?: boolean;
}

const DOMAIN_LABELS = {
  social_score_ai: 'Personal-Social',
  fine_motor_score_ai: 'Fine Motor',
  language_score_ai: 'Language',
  gross_motor_score_ai: 'Gross Motor',
} as const;

const DOMAIN_COLORS = {
  social_score_ai: 'bg-blue-500',
  fine_motor_score_ai: 'bg-green-500',
  language_score_ai: 'bg-yellow-500',
  gross_motor_score_ai: 'bg-purple-500',
} as const;

export function DenverResultsChart({ 
  aiScores, 
  clinicalScores,
  showComparison = false 
}: DenverResultsChartProps) {
  const domains = [
    'social_score_ai',
    'fine_motor_score_ai',
    'language_score_ai',
    'gross_motor_score_ai',
  ] as const;

  const getScore = (domain: typeof domains[number], source: 'ai' | 'clinical'): number | null => {
    if (source === 'clinical' && clinicalScores) {
      const clinicalKey = domain.replace('_ai', '_clinical') as keyof DomainScores;
      return clinicalScores[clinicalKey] ?? null;
    }
    return aiScores[domain] ?? null;
  };

  const getScoreColor = (score: number | null): string => {
    if (score === null) return 'bg-gray-300';
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Card className="border-teal-200">
      <CardHeader>
        <CardTitle>Denver II Domain Scores</CardTitle>
        <CardDescription>
          {showComparison && clinicalScores 
            ? 'AI Analysis vs Clinical Assessment' 
            : 'AI Analysis Results'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {domains.map((domain) => {
          const aiScore = getScore(domain, 'ai');
          const clinicalScore = showComparison ? getScore(domain, 'clinical') : null;
          const domainLabel = DOMAIN_LABELS[domain];
          const domainColor = DOMAIN_COLORS[domain];

          return (
            <div key={domain} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-teal-900">{domainLabel}</span>
                <div className="flex items-center gap-4">
                  {aiScore !== null && (
                    <span className="text-sm text-muted-foreground">
                      AI: <span className="font-semibold">{aiScore}/100</span>
                    </span>
                  )}
                  {clinicalScore !== null && (
                    <span className="text-sm text-muted-foreground">
                      Clinical: <span className="font-semibold">{clinicalScore}/100</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {/* AI Score Bar */}
                {aiScore !== null && (
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                        <div
                          className={`h-full ${getScoreColor(aiScore)} transition-all duration-500`}
                          style={{ width: `${aiScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-12 text-right">{aiScore}%</span>
                    </div>
                  </div>
                )}

                {/* Clinical Score Bar (if comparison mode) */}
                {showComparison && clinicalScore !== null && (
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden border-2 border-teal-600">
                        <div
                          className={`h-full ${getScoreColor(clinicalScore)} transition-all duration-500`}
                          style={{ width: `${clinicalScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-12 text-right text-teal-700">
                        {clinicalScore}%
                      </span>
                    </div>
                    <span className="text-xs text-teal-600 mt-1">Clinical Assessment</span>
                  </div>
                )}

                {/* Agreement Indicator */}
                {showComparison && aiScore !== null && clinicalScore !== null && (
                  <div className="flex items-center gap-2 text-xs">
                    {Math.abs(aiScore - clinicalScore) <= 10 ? (
                      <span className="text-green-600 font-medium">
                        ✓ Agreement within 10 points
                      </span>
                    ) : (
                      <span className="text-orange-600 font-medium">
                        ⚠ Difference: {Math.abs(aiScore - clinicalScore)} points
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

