'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Shield, Loader2, ExternalLink } from 'lucide-react';
import QRCode from 'react-qr-code';
import { getClinicReceipts, ClinicReceipt } from '@/app/actions/getClinicData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ClinicPage() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<ClinicReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getClinicReceipts();
        
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to fetch receipts');
        }
        
        setReceipts(result.data);
      } catch (err) {
        console.error('Failed to fetch clinic receipts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load clinic receipts');
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();
  }, []);

  const totalShieldedVolume = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const pendingSettlements = 0; // Mock count as specified

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadgeVariant = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === 'settled') {
      return 'default';
    }
    if (normalizedStatus === 'failed') {
      return 'destructive';
    }
    return 'outline';
  };

  const getStatusDisplay = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  /**
   * Extract screening ID from memo text
   * Handles patterns like:
   * - "Screening #123..." (with UUID)
   * - Full UUID strings
   * - "Screening [UUID]"
   */
  const extractScreeningId = (memo: string): string | null => {
    if (!memo) return null;

    // Try to find a UUID pattern in the memo
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const uuidMatch = memo.match(uuidRegex);
    if (uuidMatch) {
      return uuidMatch[0];
    }

    // Check if memo contains "Screening" keyword (case-insensitive)
    const screeningPattern = /screening/i;
    if (screeningPattern.test(memo)) {
      // Try to extract any ID-like pattern after "Screening"
      const afterScreening = memo.split(/screening/i)[1];
      if (afterScreening) {
        // Look for UUID in the part after "Screening"
        const afterUuidMatch = afterScreening.match(uuidRegex);
        if (afterUuidMatch) {
          return afterUuidMatch[0];
        }
      }
    }

    return null;
  };

  const handleMemoClick = (memo: string) => {
    const screeningId = extractScreeningId(memo);
    if (screeningId) {
      router.push(`/clinic/report/${screeningId}`);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Dr. Smith&apos;s Portal</h1>
          <Badge className="bg-teal-600 text-white border-teal-700">
            <Shield className="h-3 w-3 mr-1" />
            Verified Zcash Endpoint
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-teal-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-teal-600" />
              Total Shielded Volume
            </CardTitle>
            <CardDescription>All settled payments received</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-teal-600">
              {formatCurrency(totalShieldedVolume)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              All transactions are privacy-protected
            </p>
          </CardContent>
        </Card>

        <Card className="border-teal-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 text-teal-600" />
              Pending Settlements
            </CardTitle>
            <CardDescription>Awaiting settlement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-teal-600">
              {pendingSettlements}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              No pending transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Receive Payment QR Code */}
      <Card className="border-teal-200">
        <CardHeader>
          <CardTitle>Receive Payment</CardTitle>
          <CardDescription>Share this QR code for patients to scan and pay</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="p-4 bg-white rounded-lg border-2 border-teal-200">
              <QRCode
                value="00000000-0000-0000-0000-000000000001"
                size={200}
                level="M"
                fgColor="#0d9488"
                bgColor="#ffffff"
              />
            </div>
            <p className="mt-4 text-sm font-medium text-teal-700">
              Scan to Pay Dr. Smith
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Table */}
      <Card className="border-teal-200">
        <CardHeader>
          <CardTitle>Payment Receipts</CardTitle>
          <CardDescription>
            Shielded transactions received - Patient privacy protected
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : error ? (
            <p className="text-destructive text-center py-8">{error}</p>
          ) : receipts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No settled payments found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Memo</th>
                    <th className="text-left py-3 px-4 font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt, index) => (
                    <tr
                      key={index}
                      className="border-b hover:bg-teal-50/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-teal-600" />
                          <span className="text-sm">{formatDate(receipt.payment_date)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {extractScreeningId(receipt.memo) ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{receipt.memo}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMemoClick(receipt.memo)}
                              className="h-7 px-2 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Report
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm font-medium">{receipt.memo}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-teal-700">
                            {formatCurrency(receipt.amount)}
                          </span>
                          <Badge variant="outline" className="border-teal-300 text-teal-700">
                            {receipt.asset}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getStatusBadgeVariant(receipt.status)}>
                          {getStatusDisplay(receipt.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
