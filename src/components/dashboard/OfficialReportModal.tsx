'use client';

import { CheckCircle2, AlertCircle, AlertTriangle, FileText, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Screening {
  id: string;
  child_name: string;
  child_age_months: number;
  clinical_notes: string | null;
  clinical_risk_level: 'LOW' | 'MODERATE' | 'HIGH' | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  ai_summary: string | null;
  created_at: string;
}

interface OfficialReportModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  screening: Screening | null;
}

export function OfficialReportModal({ isOpen, onOpenChange, screening }: OfficialReportModalProps) {
  if (!screening) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRiskLevelColor = (level: 'LOW' | 'MODERATE' | 'HIGH' | null) => {
    if (!level) return '';
    switch (level) {
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  const getRiskLevelIcon = (level: 'LOW' | 'MODERATE' | 'HIGH' | null) => {
    if (!level) return null;
    switch (level) {
      case 'LOW':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'MODERATE':
        return <AlertTriangle className="h-5 w-5" />;
      case 'HIGH':
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-teal-900">
              Official Clinical Report
            </DialogTitle>
            <Badge className="bg-green-100 text-green-800 border-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Review Complete
            </Badge>
          </div>
          <DialogDescription className="text-base pt-2">
            Clinical assessment for {screening.child_name} ({screening.child_age_months} months)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Doctor's Verdict Card */}
          <Card className="border-teal-200 bg-teal-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-teal-900">
                <User className="h-5 w-5 text-teal-600" />
                Doctor's Verdict
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Final Risk Assessment */}
              {screening.clinical_risk_level && (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Final Risk Assessment</p>
                  <Badge
                    className={`text-lg px-6 py-3 flex items-center gap-2 w-fit ${getRiskLevelColor(
                      screening.clinical_risk_level
                    )}`}
                  >
                    {getRiskLevelIcon(screening.clinical_risk_level)}
                    <span className="font-semibold">{screening.clinical_risk_level}</span>
                  </Badge>
                </div>
              )}

              {/* Clinical Notes */}
              {screening.clinical_notes && (
                <div className="pt-4 border-t border-teal-200">
                  <p className="text-sm font-semibold text-teal-900 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Clinical Notes & Recommendations
                  </p>
                  <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap bg-white p-4 rounded-md border border-teal-100">
                    {screening.clinical_notes}
                  </p>
                </div>
              )}

              {/* Signed By */}
              {screening.reviewed_at && (
                <div className="pt-4 border-t border-teal-200">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold">Signed by:</span>{' '}
                    {screening.reviewed_by || 'Clinical Reviewer'} on{' '}
                    {formatDate(screening.reviewed_at)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Section (Secondary) */}
          {screening.ai_summary && (
            <Card className="border-gray-200 bg-gray-50">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-gray-700">
                  AI Assistant Findings
                </CardTitle>
                <CardDescription className="text-xs text-gray-600">
                  Preliminary analysis (for reference only)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
                  {screening.ai_summary}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
