'use client';

import { useEffect, useState } from 'react';
import { Lock, Shield, Loader2 } from 'lucide-react';
import { getClinicReceipts, ClinicReceipt } from '@/app/actions/getClinicData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ClinicPage() {
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
                        <span className="text-sm font-medium">{receipt.memo}</span>
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
