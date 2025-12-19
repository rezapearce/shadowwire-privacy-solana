'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from 'lucide-react';

export interface ReportPreviewData {
  childName: string;
  ageMonths: number;
  doctorName: string;
  clinicName: string;
  aiScores: Record<string, number>;
  clinicalScores: Record<string, number>;
  diagnosis: string;
  recommendations: string;
  verificationHash: string;
  reviewedAt: string;
}

interface ReportPreviewCardProps {
  data: ReportPreviewData;
}

export default function ReportPreviewCard({ data }: ReportPreviewCardProps) {
  const domains = ['Personal Social', 'Fine Motor', 'Language', 'Gross Motor'];

  return (
    <Card className="w-full max-w-3xl mx-auto bg-white shadow-xl rounded-none overflow-hidden">
      {/* 1. Header & Branding */}
      <div className="bg-indigo-600 p-8 text-white">
        <h1 className="text-3xl font-bold tracking-tight">KIDDYGUARD</h1>
        <p className="text-sm opacity-90 mt-1">OFFICIAL CLINICAL DEVELOPMENTAL REPORT</p>
      </div>

      <CardContent className="p-8 space-y-8">
        {/* 2. Patient & Clinic Info */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase mb-2">Patient Information</h3>
            <div className="text-sm text-slate-700 space-y-1">
              <p><span className="font-medium">Name:</span> {data.childName}</p>
              <p><span className="font-medium">Age:</span> {data.ageMonths} months</p>
              <p><span className="font-medium">Date of Review:</span> {new Date(data.reviewedAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase mb-2">Clinic Details</h3>
            <div className="text-sm text-slate-700 space-y-1">
              <p><span className="font-medium">Pediatrician:</span> Dr. {data.doctorName}</p>
              <p><span className="font-medium">Facility:</span> {data.clinicName}</p>
            </div>
          </div>
        </div>

        {/* 3. Developmental Domain Assessment Table */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase mb-4">Developmental Domain Assessment</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-indigo-600 text-white">
                <tr>
                  <th className="px-4 py-3 font-medium">Domain</th>
                  <th className="px-4 py-3 font-medium">AI Analysis</th>
                  <th className="px-4 py-3 font-medium">Clinical Verdict</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {domains.map((domain, index) => {
                  const domainKey = domain.toLowerCase().replace(' ', '');
                  const aiScore = data.aiScores[domainKey] ?? 0;
                  const clinicalScore = data.clinicalScores[domainKey] ?? 0;
                  
                  return (
                    <tr key={domain} className={index % 2 === 1 ? 'bg-slate-50' : ''}>
                      <td className="px-4 py-3 font-medium text-slate-900">{domain}</td>
                      <td className="px-4 py-3 text-slate-700">{aiScore}%</td>
                      <td className="px-4 py-3 text-slate-700 font-semibold">{clinicalScore}%</td>
                      <td className="px-4 py-3">
                        {clinicalScore >= 75 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Pass
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Requires Monitoring
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Final Diagnosis & Recommendations */}
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase mb-2">Final Diagnosis</h3>
            <p className="text-sm text-slate-700 leading-relaxed p-4 bg-slate-50 rounded-lg border">
              {data.diagnosis}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase mb-2">Recommendations</h3>
            <p className="text-sm text-slate-700 leading-relaxed p-4 bg-slate-50 rounded-lg border whitespace-pre-wrap">
              {data.recommendations}
            </p>
          </div>
        </div>

        {/* 5. Privacy & Security Footer */}
        <div className="pt-8 border-t mt-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-[10px] text-slate-500 gap-4">
            <div>
              <p className="font-medium text-slate-700 flex items-center gap-1">
                <Shield className="w-3 h-3 text-indigo-600" />
                Privacy-Preserving Payment Verified via Zcash Shielded Pool
              </p>
              <p className="mt-1 font-mono text-xs">Verification Hash: {data.verificationHash}</p>
            </div>
            <p>This report is digitally signed and encrypted for patient privacy.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

