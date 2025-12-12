'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFamilyStore } from '@/store/useFamilyStore';
import { getFamilyScreenings } from '@/app/actions/submitScreening';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Stethoscope, ArrowRight } from 'lucide-react';

const statusColors: Record<string, string> = {
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  PAYMENT_PENDING: 'bg-orange-100 text-orange-800',
  PAID: 'bg-green-100 text-green-800',
};

export function ScreeningHistory() {
  const router = useRouter();
  const { currentUser } = useFamilyStore();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const fetchSessions = async () => {
      try {
        const result = await getFamilyScreenings(currentUser.familyId);
        console.log('Screening history fetch result:', result);
        if (result.success && result.screenings) {
          setSessions(result.screenings);
        } else {
          console.error('Failed to fetch screenings:', result.error);
        }
      } catch (error) {
        console.error('Error fetching screening sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [currentUser]);

  if (!currentUser) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading screening history...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          Screening History
        </CardTitle>
        <CardDescription>
          View past developmental screenings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No screenings yet</p>
            <Button onClick={() => router.push('/screening/wizard')}>
              Start Your First Screening
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((screening) => (
              <Card
                key={screening.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  // Navigate to clinic report if payment was made, otherwise show results
                  if (screening.status === 'PAID' || screening.status === 'SETTLED') {
                    router.push(`/clinic/report/${screening.id}`);
                  } else {
                    // For now, just show the screening ID - could create a results page later
                    router.push(`/screening/wizard`);
                  }
                }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{screening.child_name}</h3>
                        <Badge 
                          variant={screening.risk_level === 'High' ? 'destructive' : 'default'}
                          className={statusColors[screening.status] || 'bg-gray-100 text-gray-800'}
                        >
                          {screening.risk_level} Risk
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {screening.status?.replace('_', ' ') || 'Pending'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Age: {screening.child_age_months} months • {new Date(screening.created_at).toLocaleDateString()}
                        {screening.risk_score !== null && (
                          <span className="ml-2">• Risk Score: {screening.risk_score}/100</span>
                        )}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
