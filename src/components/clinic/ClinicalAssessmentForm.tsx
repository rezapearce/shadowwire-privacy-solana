'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { submitClinicalReview } from '@/app/actions/submitClinicalReview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ClinicalAssessmentFormProps {
  screeningId: string;
}

type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';

export function ClinicalAssessmentForm({ screeningId }: ClinicalAssessmentFormProps) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!riskLevel) {
      toast.error('Please select a risk level');
      return;
    }

    if (!notes.trim()) {
      toast.error('Please provide clinical notes');
      return;
    }

    setIsSubmitting(true);
    console.log('📝 [Form Debug] Submitting clinical review:', { screeningId, riskLevel, notesLength: notes.length });

    try {
      const result = await submitClinicalReview(screeningId, notes, riskLevel);
      console.log('📝 [Form Debug] Server action result:', result);

      if (result.success) {
        toast.success('Review submitted successfully');
        router.refresh();
      } else {
        console.error('📝 [Form Debug] Server Action Failed:', result.error);
        toast.error(result.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error('📝 [Form Debug] Exception caught:', error);
      console.error('📝 [Form Debug] Error details:', error instanceof Error ? error.stack : error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRiskLevelColor = (level: RiskLevel) => {
    switch (level) {
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  const getRiskLevelIcon = (level: RiskLevel) => {
    switch (level) {
      case 'LOW':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'MODERATE':
        return <AlertTriangle className="h-4 w-4" />;
      case 'HIGH':
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border-teal-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-teal-900">
          Clinical Assessment
        </CardTitle>
        <CardDescription>
          Provide your clinical assessment and finalize the report
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Risk Level Selector */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-teal-900">
              Final Risk Level <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['LOW', 'MODERATE', 'HIGH'] as RiskLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setRiskLevel(level)}
                  disabled={isSubmitting}
                  className={`
                    flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all
                    ${riskLevel === level
                      ? `${getRiskLevelColor(level)} border-current font-semibold`
                      : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {getRiskLevelIcon(level)}
                  <span className="text-sm">{level}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Clinical Notes */}
          <div className="space-y-2">
            <label htmlFor="clinical-notes" className="text-sm font-semibold text-teal-900">
              Clinical Notes & Recommendations <span className="text-red-500">*</span>
            </label>
            <textarea
              id="clinical-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              rows={6}
              placeholder="Enter your clinical observations, recommendations, and any additional notes..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[120px]"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || !riskLevel || !notes.trim()}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Finalize Report'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
