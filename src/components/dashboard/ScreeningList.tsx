'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, AlertCircle, CheckCircle2, ChevronRight, Shield } from "lucide-react";
import { FamilyScreening } from '@/app/actions/submitScreening';

interface ScreeningListProps {
  screenings: FamilyScreening[];
}

export default function ScreeningList({ screenings }: ScreeningListProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { 
          label: 'Report Ready', 
          icon: <CheckCircle2 className="w-4 h-4 text-green-600" />, 
          color: 'bg-green-50 text-green-700 border-green-200' 
        };
      case 'UNDER_REVIEW':
        return { 
          label: 'Review in Progress', 
          icon: <Clock className="w-4 h-4 text-amber-600" />, 
          color: 'bg-amber-50 text-amber-700 border-amber-200' 
        };
      case 'PENDING_PAYMENT':
        return { 
          label: 'Awaiting Payment', 
          icon: <AlertCircle className="w-4 h-4 text-indigo-600" />, 
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200' 
        };
      default:
        return { 
          label: 'Screening Sent', 
          icon: <FileText className="w-4 h-4 text-slate-600" />, 
          color: 'bg-slate-50 text-slate-700 border-slate-200' 
        };
    }
  };

  return (
    <div className="space-y-4">
      {screenings.map((screening) => {
        const config = getStatusConfig(screening.status);
        const isCompleted = screening.status === 'COMPLETED';
        
        return (
          <Link key={screening.id} href={isCompleted ? `/dashboard/report/${screening.id}` : '#'}>
            <Card className={`hover:border-indigo-300 transition-all cursor-pointer group shadow-sm border-slate-200 ${!isCompleted ? 'opacity-75' : ''}`}>
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Status Icon */}
                  <div className={`p-3 rounded-full ${config.color.split(' ')[0]}`}>
                    {config.icon}
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {screening.child_name}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">
                        {new Date(screening.created_at).toLocaleDateString()}
                      </span>
                      <Badge variant="outline" className={`text-[10px] uppercase font-bold px-2 py-0 ${config.color}`}>
                        {config.label}
                      </Badge>
                      {screening.risk_level === 'High' && (
                        <span className="text-[10px] text-red-500 font-bold uppercase flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          High Priority
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Zcash Shield Icon for Settled Payments */}
                  {screening.payment_status === 'SETTLED' && (
                    <div className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded border">
                      <Shield className="w-3 h-3 text-indigo-500" />
                      Shielded Verification
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
      
      {screenings.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-2xl border-slate-200">
          <p className="text-slate-500 text-sm">No screening history found.</p>
          <button className="mt-4 text-indigo-600 font-semibold text-sm hover:underline">
            Start First Screening +
          </button>
        </div>
      )}
    </div>
  );
}

