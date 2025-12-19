'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2, Stethoscope, AlertCircle, CheckCircle2, RefreshCw, ArrowRight } from 'lucide-react';
import { getClinicScreenings, ClinicScreening } from '@/app/actions/getClinicScreenings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ClinicScreeningsPage() {
  const router = useRouter();
  const [screenings, setScreenings] = useState<ClinicScreening[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchScreenings = async () => {
    try {
      setError(null);
      const result = await getClinicScreenings();
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch screenings');
      }
      
      setScreenings(result.data);
    } catch (err) {
      console.error('Failed to fetch screenings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load screenings');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScreenings();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchScreenings();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  const getStatusBadgeColor = (status: string) => {
    if (status === 'REVIEW_PAID') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-teal-900">Screening Queue</h1>
          <Badge className="bg-teal-600 text-white border-teal-700">
            <Shield className="h-3 w-3 mr-1" />
            Verified Zcash Endpoint
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => router.push('/clinic')} variant="outline">
            Back to Portal
          </Button>
        </div>
      </div>

      {/* Stats Card */}
      <Card className="border-teal-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-teal-600" />
            Pending Reviews
          </CardTitle>
          <CardDescription>Screenings awaiting clinical assessment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-teal-600">
            {loading ? '...' : screenings.length}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {screenings.length === 0
              ? 'No screenings pending review'
              : `${screenings.length} screening(s) awaiting your review`}
          </p>
        </CardContent>
      </Card>

      {/* Screenings Table */}
      <Card className="border-teal-200">
        <CardHeader>
          <CardTitle>Screening List</CardTitle>
          <CardDescription>
            Click &quot;Review&quot; to access the clinical assessment form
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              <span className="ml-3 text-muted-foreground">Loading screenings...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-semibold mb-2">Error Loading Screenings</p>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline">
                Try Again
              </Button>
            </div>
          ) : screenings.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground text-lg mb-2">All caught up!</p>
              <p className="text-sm text-muted-foreground">
                There are no screenings pending review at this time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Child</th>
                    <th className="text-left py-3 px-4 font-semibold">Age</th>
                    <th className="text-left py-3 px-4 font-semibold">AI Risk Score</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Screening Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {screenings
                    .sort((a, b) => {
                      // Prioritize High Risk screenings first
                      const aRisk = getRiskLevel(a.ai_risk_score);
                      const bRisk = getRiskLevel(b.ai_risk_score);
                      if (aRisk === 'High' && bRisk !== 'High') return -1;
                      if (aRisk !== 'High' && bRisk === 'High') return 1;
                      // Then sort by date (newest first)
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    })
                    .map((screening) => {
                      const riskLevel = getRiskLevel(screening.ai_risk_score);
                      return (
                        <tr
                          key={screening.id}
                          className={`border-b hover:bg-teal-50/50 transition-colors ${
                            riskLevel === 'High' ? 'bg-red-50/30' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {riskLevel === 'High' && (
                                <AlertCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span className="font-semibold">{screening.child_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm">{screening.child_age_months} months</span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={getRiskBadgeVariant(riskLevel)}
                              className={
                                riskLevel === 'High'
                                  ? 'bg-red-100 text-red-800 border-red-300'
                                  : 'bg-green-100 text-green-800 border-green-300'
                              }
                            >
                              {riskLevel === 'High' ? (
                                <>
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  High Risk
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Low Risk
                                </>
                              )}
                              {screening.ai_risk_score !== null && (
                                <span className="ml-1">({screening.ai_risk_score}/100)</span>
                              )}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                                <Shield className="h-3 w-3 mr-1" />
                                Paid via Zcash
                              </Badge>
                              <Badge className={getStatusBadgeColor(screening.status)}>
                                {screening.status === 'REVIEW_PAID'
                                  ? 'Payment Received'
                                  : 'Pending Review'}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-muted-foreground">
                              {formatDate(screening.created_at)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              onClick={() => router.push(`/clinic/report/${screening.id}`)}
                              className="bg-teal-600 hover:bg-teal-700 text-white"
                              size="sm"
                            >
                              Review
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
