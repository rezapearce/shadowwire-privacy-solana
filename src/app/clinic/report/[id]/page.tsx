'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Shield, CheckCircle2, AlertCircle, Maximize2, Minimize2, ShieldCheck } from 'lucide-react';
import { getClinicalReport, ClinicalReport } from '@/app/actions/getClinicalReport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SplitViewClinicalForm } from '@/components/clinic/SplitViewClinicalForm';
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
  const [isFocusMode, setIsFocusMode] = useState(false);

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
    <div className={`min-h-screen transition-colors duration-300 ${isFocusMode ? 'bg-white' : 'bg-slate-50/50'}`}>
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-white border-b px-8 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-slate-900">
            {isFocusMode ? 'Focus Mode' : 'Clinical Review'}: {report.child_name}
          </h1>
          {!isFocusMode && (
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
              Age: {report.child_age_months}mo
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsFocusMode(!isFocusMode)}
            className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            {isFocusMode ? (
              <> <Minimize2 className="w-4 h-4" /> Exit Focus </>
            ) : (
              <> <Maximize2 className="w-4 h-4" /> Focus Mode </>
            )}
          </Button>
          {!isFocusMode && (
            <Badge className="bg-teal-600 text-white border-teal-700">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Settled via Shielded Pool
            </Badge>
          )}
          <Button onClick={() => router.push('/clinic')} variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <main className={`transition-all duration-500 ease-in-out mx-auto p-8 ${isFocusMode ? 'max-w-4xl' : 'max-w-[1600px]'}`}>
        <div className="grid grid-cols-12 gap-8">
          
          {/* MAIN STAGE (Left Column - 2/3 width, expands to full in Focus Mode) */}
          <div className={`transition-all duration-500 ${isFocusMode ? 'col-span-12' : 'col-span-12 lg:col-span-8'} space-y-8`}>
            
            {/* Video Section */}
            <section className={`bg-black rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 ${isFocusMode ? 'aspect-[21/9]' : 'aspect-video'}`}>
              <VideoPlayer 
                src={primaryVideoUrl} 
                className="w-full"
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
            </section>

            {/* Assessment Section - Wide & Comfortable */}
            {!hasClinicalReview ? (
              <section className={`bg-white rounded-2xl border transition-shadow ${isFocusMode ? 'shadow-none border-transparent' : 'shadow-sm border-slate-200'}`}>
                {!isFocusMode && (
                  <div className="p-4 border-b bg-slate-50/50">
                    <h2 className="font-bold text-slate-800 uppercase text-[10px] tracking-widest">Assessment Canvas</h2>
                  </div>
                )}
                <div className={`${isFocusMode ? 'py-4' : 'p-8'}`}>
                  <SplitViewClinicalForm 
                    screeningId={screeningId} 
                    bookmarks={bookmarks}
                    childName={report.child_name}
                    aiScores={{
                      social: report.social_score_ai,
                      fineMotor: report.fine_motor_score_ai,
                      language: report.language_score_ai,
                      grossMotor: report.gross_motor_score_ai,
                    }}
                    compact={isFocusMode}
                  />
                </div>
              </section>
            ) : (
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="p-6 border-b bg-slate-50/50">
                  <h2 className="font-bold text-slate-800 uppercase text-xs tracking-widest">
                    Clinical Decision Support
                  </h2>
                </div>
                <div className="p-8">
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
                </div>
              </section>
            )}
          </div>

          {/* SIDEBAR (Right Column - 1/3 width, hidden in Focus Mode) */}
          {!isFocusMode && (
            <div className="col-span-12 lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-right-4">
              {/* AI Insights Card */}
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
              
              {/* Denver II Domain Progress */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-xs font-bold text-slate-900 mb-4 uppercase tracking-wider">
                  Denver II Milestones
                </h3>
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
                <p className="mt-4 text-[10px] text-slate-400 italic">
                  Compare AI mastery detection with clinical observation.
                </p>
              </div>

              {/* Parent History / Quick Actions */}
              <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg shadow-indigo-100">
                <h4 className="font-bold mb-2 text-sm">Parent's Primary Concern</h4>
                <p className="text-sm text-indigo-100 leading-relaxed italic">
                  "{report.clinical_notes || 'No notes provided by parent.'}"
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Privacy Footer */}
      {!isFocusMode && (
        <footer className="border-t bg-white">
          <div className="max-w-[1600px] mx-auto px-8 py-6">
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
        </footer>
      )}
    </div>
  );
}
