'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Shield, User, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getClinicalReport, ClinicalReport } from '@/app/actions/getClinicalReport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ClinicalReportPage() {
  const params = useParams();
  const router = useRouter();
  const screeningId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ClinicalReport | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const getRiskLevel = (score: number | null): 'High' | 'Low' => {
    if (score === null) return 'Low';
    return score >= 50 ? 'High' : 'Low';
  };

  const getRiskBadgeVariant = (riskLevel: 'High' | 'Low') => {
    return riskLevel === 'High' ? 'destructive' : 'default';
  };

  const getCategoryDisplayName = (category: string): string => {
    const categoryMap: Record<string, string> = {
      gross_motor: 'Gross Motor',
      fine_motor: 'Fine Motor',
      language: 'Language',
      personal_social: 'Personal-Social',
    };
    return categoryMap[category] || category;
  };

  const getShortId = (uuid: string): string => {
    return uuid.substring(0, 8).toUpperCase();
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

  const riskLevel = getRiskLevel(report.ai_risk_score);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-teal-900">
            Clinical Review: Screening #{getShortId(screeningId)}
          </h1>
          <Badge className="bg-teal-600 text-white border-teal-700">
            <Shield className="h-3 w-3 mr-1" />
            Secure Access
          </Badge>
        </div>
        <Button onClick={() => router.push('/clinic')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Two-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Patient Summary Card */}
        <Card className="border-teal-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-teal-600" />
              Patient Summary
            </CardTitle>
            <CardDescription>Screening conducted on {formatDate(report.created_at)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Child Age */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Child Age</p>
              <p className="text-2xl font-bold text-teal-900">{report.child_age_months} months</p>
            </div>

            {/* Risk Badge */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Risk Level</p>
              <Badge 
                variant={getRiskBadgeVariant(riskLevel)}
                className={`text-base px-4 py-2 ${
                  riskLevel === 'High' 
                    ? 'bg-red-100 text-red-800 border-red-300' 
                    : 'bg-green-100 text-green-800 border-green-300'
                }`}
              >
                {riskLevel === 'High' ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    High Risk
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Low Risk
                  </>
                )}
              </Badge>
              {report.ai_risk_score !== null && (
                <p className="text-sm text-muted-foreground mt-2">
                  AI Risk Score: {report.ai_risk_score} / 100
                </p>
              )}
            </div>

            {/* AI Summary */}
            {report.ai_summary && (
              <div className="pt-4 border-t">
                <p className="text-sm font-semibold text-teal-900 mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  AI Summary
                </p>
                <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                  {report.ai_summary}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Questionnaire Responses */}
        <Card className="border-teal-200">
          <CardHeader>
            <CardTitle>Questionnaire Responses</CardTitle>
            <CardDescription>
              {report.answers.length} questions answered
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-sm">Category</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Question</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Milestone Age</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Response</th>
                  </tr>
                </thead>
                <tbody>
                  {report.answers.map((answer, index) => (
                    <tr
                      key={index}
                      className={`border-b hover:bg-teal-50/50 transition-colors ${
                        !answer.response ? 'bg-orange-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="border-teal-300 text-teal-700 text-xs">
                          {getCategoryDisplayName(answer.category)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">{answer.questionText}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">
                          {answer.milestoneAgeMonths} months
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={answer.response ? 'default' : 'destructive'}
                          className={
                            answer.response
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-red-100 text-red-800 border-red-200'
                          }
                        >
                          {answer.response ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Yes
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3 mr-1" />
                              No
                            </>
                          )}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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
