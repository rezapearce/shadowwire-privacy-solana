'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, AlertTriangle, Brain } from 'lucide-react';
import { detectDiscrepancies, getDiscrepancyColor, getDiscrepancyBadgeVariant } from '@/lib/ai/discrepancyDetector';

export interface AIInsights {
  ai_risk_score: number | null;
  ai_summary: string | null;
  social_score_ai?: number | null;
  fine_motor_score_ai?: number | null;
  language_score_ai?: number | null;
  gross_motor_score_ai?: number | null;
}

interface AIInsightsCardProps {
  insights: AIInsights;
  clinicalAssessment?: {
    risk_level?: 'LOW' | 'MODERATE' | 'HIGH' | null;
    social_score_clinical?: number | null;
    fine_motor_clinical?: number | null;
    language_clinical?: number | null;
    gross_motor_clinical?: number | null;
  };
}

export function AIInsightsCard({ insights, clinicalAssessment }: AIInsightsCardProps) {
  const getRiskLevel = (score: number | null): 'High' | 'Low' => {
    if (score === null) return 'Low';
    return score >= 50 ? 'High' : 'Low';
  };

  const getRiskBadgeVariant = (riskLevel: 'High' | 'Low') => {
    return riskLevel === 'High' ? 'destructive' : 'default';
  };

  const getRiskIcon = (riskLevel: 'High' | 'Low') => {
    return riskLevel === 'High' ? (
      <AlertCircle className="h-4 w-4" />
    ) : (
      <CheckCircle2 className="h-4 w-4" />
    );
  };

  const compareScores = (
    aiScore: number | null,
    clinicalScore: number | null
  ): 'agree' | 'disagree' | 'no_comparison' => {
    if (aiScore === null || clinicalScore === null) return 'no_comparison';
    const diff = Math.abs(aiScore - clinicalScore);
    return diff <= 15 ? 'agree' : 'disagree';
  };

  const riskLevel = getRiskLevel(insights.ai_risk_score);

  // Calculate discrepancies if clinical assessment is available
  const discrepancySummary = useMemo(() => {
    if (!clinicalAssessment) return null;

    return detectDiscrepancies(
      {
        social: insights.social_score_ai ?? null,
        fineMotor: insights.fine_motor_score_ai ?? null,
        language: insights.language_score_ai ?? null,
        grossMotor: insights.gross_motor_score_ai ?? null,
      },
      {
        social: clinicalAssessment.social_score_clinical ?? null,
        fineMotor: clinicalAssessment.fine_motor_clinical ?? null,
        language: clinicalAssessment.language_clinical ?? null,
        grossMotor: clinicalAssessment.gross_motor_clinical ?? null,
      }
    );
  }, [insights, clinicalAssessment]);

  return (
    <Card className="border-teal-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-teal-600" />
          AI Analysis
        </CardTitle>
        <CardDescription>Groq AI assessment results</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Discrepancy Alerts */}
        {discrepancySummary && discrepancySummary.hasHighDiscrepancy && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900 mb-1">
                  High Discrepancy Detected
                </p>
                <p className="text-xs text-red-700 mb-2">
                  {discrepancySummary.highDiscrepancyCount} domain{discrepancySummary.highDiscrepancyCount !== 1 ? 's' : ''} show significant differences between AI and clinical assessment. Please review carefully.
                </p>
                <div className="space-y-1">
                  {discrepancySummary.discrepancies
                    .filter((d) => d.severity === 'high')
                    .map((d) => (
                      <div key={d.domain} className="text-xs text-red-800">
                        <span className="font-medium">{d.domain}:</span> AI {d.aiScore}% vs Clinical {d.clinicalScore}% (diff: {d.difference} pts)
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Risk Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-teal-900">Overall Risk Score</span>
            <Badge
              variant={getRiskBadgeVariant(riskLevel)}
              className={
                riskLevel === 'High'
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-green-100 text-green-800 border-green-300'
              }
            >
              {getRiskIcon(riskLevel)}
              <span className="ml-1">{riskLevel} Risk</span>
            </Badge>
          </div>
          {insights.ai_risk_score !== null && (
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full ${
                  riskLevel === 'High' ? 'bg-red-500' : 'bg-green-500'
                } transition-all duration-500`}
                style={{ width: `${insights.ai_risk_score}%` }}
              />
            </div>
          )}
          {insights.ai_risk_score !== null && (
            <p className="text-xs text-muted-foreground mt-1">
              Score: {insights.ai_risk_score}/100
            </p>
          )}
        </div>

        {/* AI Summary */}
        {insights.ai_summary && (
          <div className="pt-4 border-t">
            <p className="text-sm font-semibold text-teal-900 mb-2">AI Summary</p>
            <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
              {insights.ai_summary}
            </p>
          </div>
        )}

        {/* Domain Breakdown */}
        {(insights.social_score_ai !== null ||
          insights.fine_motor_score_ai !== null ||
          insights.language_score_ai !== null ||
          insights.gross_motor_score_ai !== null) && (
          <div className="pt-4 border-t">
            <p className="text-sm font-semibold text-teal-900 mb-3">Domain Breakdown</p>
            <div className="space-y-2">
              {insights.social_score_ai !== null && (() => {
                const discrepancy = discrepancySummary?.discrepancies.find((d) => d.domain === 'Personal-Social');
                const hasDiscrepancy = discrepancy && discrepancy.requiresReview;
                return (
                  <div className={`flex items-center justify-between text-xs ${hasDiscrepancy ? 'p-2 bg-yellow-50 rounded' : ''}`}>
                    <span className={hasDiscrepancy ? 'font-semibold' : ''}>Personal-Social</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{insights.social_score_ai}/100</span>
                      {clinicalAssessment?.social_score_clinical !== null &&
                        clinicalAssessment?.social_score_clinical !== undefined && (
                          <>
                            <span className="text-muted-foreground">vs</span>
                            <span className="font-medium">{clinicalAssessment.social_score_clinical}/100</span>
                            {discrepancy && (
                              <Badge
                                variant={getDiscrepancyBadgeVariant(discrepancy.severity)}
                                className={`text-xs ${getDiscrepancyColor(discrepancy.severity)}`}
                              >
                                {discrepancy.difference}pt diff
                              </Badge>
                            )}
                          </>
                        )}
                    </div>
                  </div>
                );
              })()}
              {insights.fine_motor_score_ai !== null && (() => {
                const discrepancy = discrepancySummary?.discrepancies.find((d) => d.domain === 'Fine Motor');
                const hasDiscrepancy = discrepancy && discrepancy.requiresReview;
                return (
                  <div className={`flex items-center justify-between text-xs ${hasDiscrepancy ? 'p-2 bg-yellow-50 rounded' : ''}`}>
                    <span className={hasDiscrepancy ? 'font-semibold' : ''}>Fine Motor</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{insights.fine_motor_score_ai}/100</span>
                      {clinicalAssessment?.fine_motor_clinical !== null &&
                        clinicalAssessment?.fine_motor_clinical !== undefined && (
                          <>
                            <span className="text-muted-foreground">vs</span>
                            <span className="font-medium">{clinicalAssessment.fine_motor_clinical}/100</span>
                            {discrepancy && (
                              <Badge
                                variant={getDiscrepancyBadgeVariant(discrepancy.severity)}
                                className={`text-xs ${getDiscrepancyColor(discrepancy.severity)}`}
                              >
                                {discrepancy.difference}pt diff
                              </Badge>
                            )}
                          </>
                        )}
                  </div>
                </div>
                );
              })()}
              {insights.language_score_ai !== null && (() => {
                const discrepancy = discrepancySummary?.discrepancies.find((d) => d.domain === 'Language');
                const hasDiscrepancy = discrepancy && discrepancy.requiresReview;
                return (
                  <div className={`flex items-center justify-between text-xs ${hasDiscrepancy ? 'p-2 bg-yellow-50 rounded' : ''}`}>
                    <span className={hasDiscrepancy ? 'font-semibold' : ''}>Language</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{insights.language_score_ai}/100</span>
                      {clinicalAssessment?.language_clinical !== null &&
                        clinicalAssessment?.language_clinical !== undefined && (
                          <>
                            <span className="text-muted-foreground">vs</span>
                            <span className="font-medium">{clinicalAssessment.language_clinical}/100</span>
                            {discrepancy && (
                              <Badge
                                variant={getDiscrepancyBadgeVariant(discrepancy.severity)}
                                className={`text-xs ${getDiscrepancyColor(discrepancy.severity)}`}
                              >
                                {discrepancy.difference}pt diff
                              </Badge>
                            )}
                          </>
                        )}
                  </div>
                </div>
                );
              })()}
              {insights.gross_motor_score_ai !== null && (() => {
                const discrepancy = discrepancySummary?.discrepancies.find((d) => d.domain === 'Gross Motor');
                const hasDiscrepancy = discrepancy && discrepancy.requiresReview;
                return (
                  <div className={`flex items-center justify-between text-xs ${hasDiscrepancy ? 'p-2 bg-yellow-50 rounded' : ''}`}>
                    <span className={hasDiscrepancy ? 'font-semibold' : ''}>Gross Motor</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{insights.gross_motor_score_ai}/100</span>
                      {clinicalAssessment?.gross_motor_clinical !== null &&
                        clinicalAssessment?.gross_motor_clinical !== undefined && (
                          <>
                            <span className="text-muted-foreground">vs</span>
                            <span className="font-medium">{clinicalAssessment.gross_motor_clinical}/100</span>
                            {discrepancy && (
                              <Badge
                                variant={getDiscrepancyBadgeVariant(discrepancy.severity)}
                                className={`text-xs ${getDiscrepancyColor(discrepancy.severity)}`}
                              >
                                {discrepancy.difference}pt diff
                              </Badge>
                            )}
                          </>
                        )}
                  </div>
                </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Comparison Summary */}
        {clinicalAssessment && (
          <div className="pt-4 border-t">
            <p className="text-sm font-semibold text-teal-900 mb-2">Clinical Comparison</p>
            {clinicalAssessment.risk_level && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Clinical Risk:</span>
                <Badge
                  className={
                    clinicalAssessment.risk_level === 'HIGH'
                      ? 'bg-red-100 text-red-800'
                      : clinicalAssessment.risk_level === 'MODERATE'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }
                >
                  {clinicalAssessment.risk_level}
                </Badge>
                {riskLevel === 'High' && clinicalAssessment.risk_level === 'HIGH' && (
                  <span className="text-green-600">✓ Agreement</span>
                )}
                {riskLevel === 'Low' && clinicalAssessment.risk_level === 'LOW' && (
                  <span className="text-green-600">✓ Agreement</span>
                )}
                {(riskLevel === 'High' && clinicalAssessment.risk_level !== 'HIGH') ||
                (riskLevel === 'Low' && clinicalAssessment.risk_level !== 'LOW') ? (
                  <span className="text-orange-600">⚠ Disagreement</span>
                ) : null}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

