'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { getParentReport } from '@/app/actions/getParentReport';
import { useFamilyStore } from '@/store/useFamilyStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ParentReportPortal from '@/components/dashboard/ParentReportPortal';

export default function ParentReportPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useFamilyStore();
  const screeningId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!currentUser || !currentUser.familyId) {
        setError('Please log in to view this report');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const result = await getParentReport(screeningId, currentUser.familyId);
        
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to fetch report');
        }
        
        setReportData(result.data);
      } catch (err) {
        console.error('Failed to fetch parent report:', err);
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    if (screeningId && currentUser) {
      fetchReport();
    }
  }, [screeningId, currentUser]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="ml-3 text-muted-foreground">Loading report...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Report Not Available</h2>
              <p className="text-muted-foreground mb-4">{error || 'The report could not be found or you do not have access.'}</p>
              <Button onClick={() => router.push('/')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Button onClick={() => router.push('/')} variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
        <ParentReportPortal
          screening={reportData.screening}
          clinicalReview={reportData.clinicalReview}
          paymentIntent={reportData.paymentIntent}
        />
      </div>
    </div>
  );
}

