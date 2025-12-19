'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { getClinicalReport, ClinicalReport } from '@/app/actions/getClinicalReport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClinicalAssessmentForm } from '@/components/clinic/ClinicalAssessmentForm';
import { VideoPlayer, VideoBookmark } from '@/components/clinic/VideoPlayer';
import { DenverResultsChart } from '@/components/clinic/DenverResultsChart';
import { AIInsightsCard } from '@/components/clinic/AIInsightsCard';

export default function ClinicalReportPage() {
  const params = useParams();
  const router = useRouter();
  const screeningId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ClinicalReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<VideoBookmark[]>([]);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getClinicalReport(screeningId);
        
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to fetch report');
        }
        
        setReport(result.data);
      } catch (err) {
        console.error('Failed to fetch clinical report:', err);
        setError(err instanceof Error ? err.message : 'Failed to load clinical report');
      } finally {
        setLoading(false);
      }
    };

    if (screeningId) {
      fetchReport();
    }
  }, [screeningId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getShortId = (uuid: string): string => {
    return uuid.substring(0, 8).toUpperCase();
  };

  // Find the first video URL from answers
  const getPrimaryVideoUrl = (): string | null => {
    if (!report?.answers) return null;
    const answerWithVideo = report.answers.find((answer) => answer.video_url);
    return answerWithVideo?.video_url || null;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Card className="border-teal-200">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <span className="ml-3 text-muted-foreground">Loading clinical report...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Card className="border-teal-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Access Denied / Record Not Found
            </CardTitle>
            <CardDescription>
              {error || 'The screening record could not be found or access was denied.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/clinic')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Clinic Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryVideoUrl = getPrimaryVideoUrl();
  const hasClinicalReview = !!report.clinical_review;

  return (
    <div className="container mx-auto p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-teal-900">
            Clinical Review: Screening #{getShortId(screeningId)}
          </h1>
          <Badge className="bg-teal-600 text-white border-teal-700">
            <Shield className="h-3 w-3 mr-1" />
            Settled via Shielded Pool
          </Badge>
        </div>
        <Button onClick={() => router.push('/clinic')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Three-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Denver II Domain Scores */}
        <div className="lg:col-span-3 space-y-4">
          <DenverResultsChart
            aiScores={{
              social_score_ai: report.social_score_ai,
              fine_motor_score_ai: report.fine_motor_score_ai,
              language_score_ai: report.language_score_ai,
              gross_motor_score_ai: report.gross_motor_score_ai,
            }}
            clinicalScores={report.clinical_review ? {
              social_score_clinical: report.clinical_review.social_score_clinical,
              fine_motor_clinical: report.clinical_review.fine_motor_clinical,
              language_clinical: report.clinical_review.language_clinical,
              gross_motor_clinical: report.clinical_review.gross_motor_clinical,
            } : undefined}
            showComparison={hasClinicalReview}
          />
        </div>

        {/* Center Column: Video Evidence Player (Primary Focus) */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border-teal-200">
            <CardHeader>
              <CardTitle>Video Evidence</CardTitle>
              <CardDescription>
                Parent-provided video evidence for clinical review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VideoPlayer 
                src={primaryVideoUrl} 
                className="w-full aspect-video"
                showControls={true}
                onBookmark={(bookmark) => setBookmarks((prev) => [...prev, bookmark])}
                bookmarks={bookmarks}
                aiInsights={{
                  riskScore: report.ai_risk_score,
                  domainScores: {
                    social: report.social_score_ai,
                    fineMotor: report.fine_motor_score_ai,
                    language: report.language_score_ai,
                    grossMotor: report.gross_motor_score_ai,
                  },
                }}
              />
              {primaryVideoUrl && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Review the video evidence carefully to validate AI findings.
                  </p>
                </div>
              )}
              {!primaryVideoUrl && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    No video evidence available for this screening.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Insights + Clinical Review Form */}
        <div className="lg:col-span-3 space-y-4">
          <AIInsightsCard
            insights={{
              ai_risk_score: report.ai_risk_score,
              ai_summary: report.ai_summary,
              social_score_ai: report.social_score_ai,
              fine_motor_score_ai: report.fine_motor_score_ai,
              language_score_ai: report.language_score_ai,
              gross_motor_score_ai: report.gross_motor_score_ai,
            }}
            clinicalAssessment={report.clinical_review ? {
              risk_level: report.clinical_risk_level,
              social_score_clinical: report.clinical_review.social_score_clinical,
              fine_motor_clinical: report.clinical_review.fine_motor_clinical,
              language_clinical: report.clinical_review.language_clinical,
              gross_motor_clinical: report.clinical_review.gross_motor_clinical,
            } : undefined}
          />

          {/* Clinical Review Form or Completed Review */}
          {!hasClinicalReview ? (
            <ClinicalAssessmentForm screeningId={screeningId} bookmarks={bookmarks} />
          ) : (
            <Card className="border-teal-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-teal-900">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Review Completed
                </CardTitle>
                <CardDescription>
                  Clinical assessment finalized on {report.reviewed_at ? formatDate(report.reviewed_at) : 'N/A'}
                  {report.reviewed_by && ` by ${report.reviewed_by}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.clinical_review.final_diagnosis && (
                  <div>
                    <p className="text-sm font-semibold text-teal-900 mb-1">Final Diagnosis</p>
                    <p className="text-sm text-gray-700">{report.clinical_review.final_diagnosis}</p>
                  </div>
                )}
                {report.clinical_review.recommendations && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-semibold text-teal-900 mb-2">Recommendations</p>
                    <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                      {report.clinical_review.recommendations}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Privacy Footer */}
      <Card className="border-teal-200 bg-teal-50/50">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-teal-900 mb-2">
                Privacy Note
              </p>
              <p className="text-sm text-teal-700 leading-relaxed">
                Identity Protected. This record was accessed via Zcash-shielded settlement. Parent wallet unknown.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
