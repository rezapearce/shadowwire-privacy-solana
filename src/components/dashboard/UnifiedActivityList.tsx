'use client';

import { useEffect, useState } from 'react';
import { Stethoscope, Wallet, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { UnifiedTransaction } from '@/types';
import { getUnifiedHistory } from '@/lib/data/fetchHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UnifiedActivityListProps {
  familyId: string;
}

export function UnifiedActivityList({ familyId }: UnifiedActivityListProps) {
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUnifiedHistory(familyId);
      setTransactions(data);
    } catch (err) {
      console.error('Failed to fetch unified transactions:', err);
      setError('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (familyId) {
      fetchTransactions();
    }
  }, [familyId, refreshKey]);

  // Listen for payment completion events to refresh
  useEffect(() => {
    const handlePaymentComplete = () => {
      // Small delay to ensure database is updated
      setTimeout(() => {
        setRefreshKey((prev) => prev + 1);
      }, 1000);
    };

    window.addEventListener('payment-complete', handlePaymentComplete);
    return () => {
      window.removeEventListener('payment-complete', handlePaymentComplete);
    };
  }, []);

  const formatCurrency = (amount: number, currency?: string) => {
    const currencyCode = currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus.includes('settled') || normalizedStatus === 'approved') {
      return 'default';
    }
    if (normalizedStatus.includes('failed') || normalizedStatus === 'rejected') {
      return 'destructive';
    }
    if (normalizedStatus.includes('pending') || normalizedStatus === 'created') {
      return 'secondary';
    }
    return 'outline';
  };

  const getStatusDisplay = (status: string) => {
    // Capitalize first letter and replace underscores with spaces
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent activity across all transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent activity across all transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-center py-8">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent activity across all transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No transactions found
            </p>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    {tx.type === 'CLINIC_BILL' ? (
                      <Stethoscope className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Wallet className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">
                        {formatCurrency(tx.amount, tx.currency)}
                      </h3>
                      <Badge variant={getStatusBadgeVariant(tx.status)}>
                        {getStatusDisplay(tx.status)}
                      </Badge>
                      {tx.type === 'CLINIC_BILL' && tx.input_tx_ref && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={`https://explorer.solana.com/tx/${tx.input_tx_ref}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View on Solana Explorer</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      {tx.type === 'CLINIC_BILL' ? 'Clinic Payment' : 'Family Transfer'}
                    </p>
                    {tx.description && (
                      <p className="text-sm text-muted-foreground mb-1">{tx.description}</p>
                    )}
                    {tx.status === 'FAILED' && tx.failure_reason && (
                      <div className="flex items-start gap-2 mt-1 mb-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{tx.failure_reason}</p>
                          </TooltipContent>
                        </Tooltip>
                        <p className="text-xs text-destructive">{tx.failure_reason}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDate(tx.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
