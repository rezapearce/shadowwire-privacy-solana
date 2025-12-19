'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, ShieldCheck, HelpCircle, Loader2 } from "lucide-react";
import { DenverResultsChart } from "../clinic/DenverResultsChart";
import { VerificationBadge } from "../shared/VerificationBadge";
import { ReportPreviewData } from "./ReportPreviewCard";
import { generateReportFromScreening } from "@/app/actions/generateReport";
import { toast } from "sonner";

interface ParentReportPortalProps {
  screening: {
    id: string;
    child_name: string;
    child_age_months: number;
    created_at: string;
    ai_risk_score: number | null;
    ai_summary: string | null;
    social_score_ai: number | null;
    fine_motor_score_ai: number | null;
    language_score_ai: number | null;
    gross_motor_score_ai: number | null;
  };
  clinicalReview: {
    review_id: string;
    final_diagnosis: string | null;
    recommendations: string | null;
    social_score_clinical: number | null;
    fine_motor_clinical: number | null;
    language_clinical: number | null;
    gross_motor_clinical: number | null;
    created_at: string;
    reviewed_by?: string;
  } | null;
  paymentIntent: {
    status: string;
    clinical_review_hash: string | null;
  } | null;
}

export default function ParentReportPortal({ 
  screening, 
  clinicalReview, 
  paymentIntent 
}: ParentReportPortalProps) {
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!clinicalReview) {
      toast.error('No clinical review available for download');
      return;
    }

    setIsDownloadingPDF(true);
    try {
      const result = await generateReportFromScreening(screening.id, 'pdf');
      
      if (result.success && result.report) {
        // Convert base64 to blob and download
        const base64Data = result.report.split(',')[1]; // Remove data:application/pdf;base64, prefix
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `clinical-report-${screening.child_name}-${screening.id.substring(0, 8)}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success('PDF report downloaded successfully');
      } else {
        toast.error(result.error || 'Failed to generate PDF report');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF report');
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  if (!clinicalReview) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Clinical review not yet available. The pediatrician is still reviewing this screening.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare data for ReportPreviewCard (not used in this component, but kept for potential future use)
  const reportPreviewData: ReportPreviewData = {
    childName: screening.child_name,
    ageMonths: screening.child_age_months,
    doctorName: clinicalReview.reviewed_by?.replace('Dr. ', '').replace(' (Demo)', '') || 'Smith',
    clinicName: 'KiddyGuard Clinic',
    aiScores: {
      'Personal Social': screening.social_score_ai ?? 0,
      'Fine Motor': screening.fine_motor_score_ai ?? 0,
      'Language': screening.language_score_ai ?? 0,
      'Gross Motor': screening.gross_motor_score_ai ?? 0,
    },
    clinicalScores: {
      'Personal Social': clinicalReview.social_score_clinical ?? 0,
      'Fine Motor': clinicalReview.fine_motor_clinical ?? 0,
      'Language': clinicalReview.language_clinical ?? 0,
      'Gross Motor': clinicalReview.gross_motor_clinical ?? 0,
    },
    diagnosis: clinicalReview.final_diagnosis || 'No diagnosis provided',
    recommendations: clinicalReview.recommendations || 'No recommendations provided',
    verificationHash: paymentIntent?.clinical_review_hash || 'Pending verification',
    reviewedAt: clinicalReview.created_at,
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* 1. Status Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-indigo-50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-slate-900">Report Ready: {screening.child_name}</h2>
            <Badge className="bg-green-500 hover:bg-green-500 text-white border-none">Verified</Badge>
          </div>
          <p className="text-slate-500 text-sm">
            Review completed by {clinicalReview.reviewed_by || 'Dr. Smith'} on {new Date(clinicalReview.created_at).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloadingPDF}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
          >
            {isDownloadingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Official PDF
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 2. Side-by-Side Comparison (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Developmental Domain Progress</CardTitle>
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-indigo-200 rounded-full"></span>
                  AI Score
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-indigo-600 rounded-full"></span>
                  Doctor Verdict
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DenverResultsChart
                aiScores={{
                  social_score_ai: screening.social_score_ai,
                  fine_motor_score_ai: screening.fine_motor_score_ai,
                  language_score_ai: screening.language_score_ai,
                  gross_motor_score_ai: screening.gross_motor_score_ai,
                }}
                clinicalScores={{
                  social_score_clinical: clinicalReview.social_score_clinical,
                  fine_motor_clinical: clinicalReview.fine_motor_clinical,
                  language_clinical: clinicalReview.language_clinical,
                  gross_motor_clinical: clinicalReview.gross_motor_clinical,
                }}
                showComparison={true}
              />
              <p className="mt-4 text-sm text-slate-500 italic flex items-center gap-1">
                <HelpCircle className="w-4 h-4" />
                Scores indicate milestone mastery. 100% means the child has mastered all age-appropriate tasks for that domain.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Clinical Diagnosis & Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pediatrician Verdict</h4>
                <p className="text-slate-900 font-medium">{clinicalReview.final_diagnosis || 'No diagnosis provided'}</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Next Steps for {screening.child_name}</h4>
                <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">
                  {clinicalReview.recommendations || 'No specific recommendations provided.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Privacy & Trust Sidebar (1 Column) */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
                <h3 className="font-bold text-lg">Privacy Verified</h3>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Your medical data is decoupled from your identity. This clinical review was funded via a <strong>shielded transaction</strong>, ensuring your payment history cannot be traced back to this diagnosis.
              </p>
              <VerificationBadge 
                verificationHash={paymentIntent?.clinical_review_hash || null}
                showHash={true}
                className="mt-4"
              />
            </CardContent>
          </Card>

          <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-3">Questions about this report?</h4>
            <p className="text-xs text-slate-500 mb-4">
              Contact {clinicalReview.reviewed_by || 'Dr. Smith'} at KiddyGuard Clinic.
            </p>
            <Button variant="outline" className="w-full">
              Message Clinic
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

