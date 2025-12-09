'use client';

import { Lock, Globe } from 'lucide-react';
import { useFamilyStore } from '@/store/useFamilyStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function TransactionHistory() {
  const { transactions, currentUser } = useFamilyStore();

  // Filter transactions where requester_id === currentUser.id
  // Sort by created_at (descending) and take top 5
  const userTransactions = transactions
    .filter((tx) => tx.requester_id === currentUser?.id)
    .sort((a, b) => {
      const dateA = a.created_at || a.date;
      const dateB = b.created_at || b.date;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    })
    .slice(0, 5);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const transactionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (transactionDate.getTime() === today.getTime()) {
      // Today
      return `Today, ${date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })}`;
    } else {
      // Other dates
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      }) + ', ' + date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  };

  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Rejected
          </Badge>
        );
    }
  };

  if (userTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your transaction history</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No transactions yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your transaction history</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {userTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Icon */}
                <div className="flex-shrink-0">
                  {tx.type === 'shielded' ? (
                    <Lock className="h-5 w-5 text-purple-600" />
                  ) : (
                    <Globe className="h-5 w-5 text-green-600" />
                  )}
                </div>

                {/* Description and Date */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{tx.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(tx.created_at || tx.date)}
                  </div>
                </div>
              </div>

              {/* Amount and Status */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="font-semibold text-red-600">
                  -${tx.amount.toFixed(2)}
                </div>
                {getStatusBadge(tx.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

