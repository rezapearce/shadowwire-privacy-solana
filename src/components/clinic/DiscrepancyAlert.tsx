'use client';

import { AlertTriangle, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DiscrepancyResult, getDiscrepancyColor, getDiscrepancyBadgeVariant } from '@/lib/ai/discrepancyDetector';

interface DiscrepancyAlertProps {
  discrepancies: DiscrepancyResult[];
  threshold?: number;
}

export function DiscrepancyAlert({ discrepancies, threshold = 20 }: DiscrepancyAlertProps) {
  const highDiscrepancies = discrepancies.filter((d) => d.difference > threshold);
  const moderateDiscrepancies = discrepancies.filter(
    (d) => d.difference > 10 && d.difference <= threshold
  );

  if (highDiscrepancies.length === 0 && moderateDiscrepancies.length === 0) {
    return null;
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50/50">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* High Discrepancies */}
          {highDiscrepancies.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h4 className="text-sm font-semibold text-red-900">
                  High Discrepancy Detected ({highDiscrepancies.length})
                </h4>
              </div>
              <p className="text-xs text-red-700 mb-3">
                Significant differences (>20 points) between AI and clinical assessment detected.
                Please review these domains carefully.
              </p>
              <div className="space-y-2">
                {highDiscrepancies.map((d) => (
                  <div
                    key={d.domain}
                    className="flex items-center justify-between p-2 bg-white rounded border border-red-200"
                  >
                    <span className="text-sm font-medium text-slate-900">{d.domain}</span>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-slate-600">
                        AI: <span className="font-semibold">{d.aiScore}%</span>
                      </div>
                      <span className="text-xs text-slate-400">vs</span>
                      <div className="text-xs text-slate-600">
                        Clinical: <span className="font-semibold">{d.clinicalScore}%</span>
                      </div>
                      <Badge
                        variant={getDiscrepancyBadgeVariant(d.severity)}
                        className={`text-xs ${getDiscrepancyColor(d.severity)}`}
                      >
                        {d.difference}pt diff
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Moderate Discrepancies */}
          {moderateDiscrepancies.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <h4 className="text-xs font-semibold text-yellow-900">
                  Moderate Discrepancy ({moderateDiscrepancies.length})
                </h4>
              </div>
              <div className="space-y-1">
                {moderateDiscrepancies.map((d) => (
                  <div
                    key={d.domain}
                    className="flex items-center justify-between text-xs p-1.5 bg-white/50 rounded"
                  >
                    <span className="text-slate-700">{d.domain}</span>
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>{d.aiScore}%</span>
                      <span>vs</span>
                      <span>{d.clinicalScore}%</span>
                      <span className="text-yellow-600">({d.difference}pt)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

