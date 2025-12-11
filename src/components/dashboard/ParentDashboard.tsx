'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { QrCode } from 'lucide-react';
import { useFamilyStore } from '@/store/useFamilyStore';
import { signWithMPC } from '@/lib/zenrock/mpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClinicPaymentModal } from '@/components/dashboard/ClinicPaymentModal';
import { ScannerModal } from '@/components/dashboard/ScannerModal';
import { UnifiedActivityList } from '@/components/dashboard/UnifiedActivityList';
import { WalletFaucet } from '@/components/dashboard/WalletFaucet';
import { WalletConnectButton } from '@/components/dashboard/WalletConnectButton';

export function ParentDashboard() {
  const { wallet, transactions, approveTransaction, rejectTransaction, setUser, currentUser } = useFamilyStore();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const totalFamilyValue = wallet.sol + wallet.usdc + wallet.zenzec;
  const pendingTransactions = transactions.filter((tx) => tx.status === 'pending');
  
  // Debug: Log transactions to console
  console.log('All transactions:', transactions);
  console.log('Pending transactions:', pendingTransactions);

  const handleApprove = async (txId: string) => {
    setProcessingIds((prev) => new Set(prev).add(txId));
    
    try {
      await approveTransaction(txId);
      
      // Trigger MPC signing
      const signed = await signWithMPC(txId);
      if (signed) {
        toast.success('Transaction signed with MPC');
      }
    } catch (error) {
      toast.error('Failed to approve transaction');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(txId);
        return next;
      });
    }
  };

  const handleReject = async (txId: string) => {
    try {
      await rejectTransaction(txId);
    } catch (error) {
      toast.error('Failed to reject transaction');
    }
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

  const handleLogout = () => {
    setUser(null);
  };

  const handleScanSuccess = () => {
    setIsPaymentModalOpen(true);
  };

  // Debug: Log that component is rendering
  console.log('ParentDashboard rendering - Scan button should be visible');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* VERY VISIBLE SCAN BUTTON - Using inline styles to ensure it shows */}
      <div 
        style={{ 
          backgroundColor: '#0d9488', 
          padding: '20px', 
          borderRadius: '12px', 
          marginBottom: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          position: 'relative',
          zIndex: 1000
        }}
      >
        <button
          onClick={() => {
            console.log('Scan button clicked!');
            setIsScannerOpen(true);
          }}
          style={{
            width: '100%',
            padding: '20px',
            backgroundColor: '#ffffff',
            color: '#0d9488',
            border: '3px solid #ffffff',
            borderRadius: '8px',
            fontSize: '20px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            minHeight: '60px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          <QrCode style={{ width: '28px', height: '28px' }} />
          <span>📱 SCAN QR CODE TO PAY</span>
        </button>
        <p style={{ 
          textAlign: 'center', 
          color: '#ccfbf1', 
          fontSize: '14px', 
          marginTop: '12px',
          fontWeight: '500'
        }}>
          Point your camera at the clinic&apos;s QR code
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Parent Dashboard</h1>
        <div className="flex gap-2">
          <WalletConnectButton />
          <Button 
            onClick={handleLogout} 
            variant="outline"
            className="hidden sm:inline-flex"
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Quick Actions Card */}
      <Card className="border-teal-200">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Other payment options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setIsPaymentModalOpen(true)}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              Pay Clinic Directly
            </Button>
            <Button 
              onClick={handleLogout} 
              variant="outline"
              size="lg"
              className="w-full sm:hidden"
            >
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Modals */}
      <ScannerModal
        isOpen={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScanSuccess={handleScanSuccess}
      />
      <ClinicPaymentModal
        isOpen={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
      />
      
      {/* Total Family Value */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Total Family Value</CardTitle>
              <CardDescription>Combined wallet balance</CardDescription>
            </div>
            <WalletFaucet />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            ${totalFamilyValue.toFixed(2)}
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            <div>
              <span className="text-muted-foreground">SOL:</span>{' '}
              <span className="font-semibold">${wallet.sol.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">USDC:</span>{' '}
              <span className="font-semibold">${wallet.usdc.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">zenZEC:</span>{' '}
              <span className="font-semibold">${wallet.zenzec.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Center */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Center</CardTitle>
          <CardDescription>
            {pendingTransactions.length === 0
              ? 'No pending transactions'
              : `${pendingTransactions.length} transaction(s) awaiting approval`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Debug info */}
          <div className="mb-4 p-2 bg-muted rounded text-xs">
            <p>Total transactions: {transactions.length}</p>
            <p>Pending: {pendingTransactions.length}</p>
            <p>Approved: {transactions.filter(tx => tx.status === 'approved').length}</p>
            <p>Rejected: {transactions.filter(tx => tx.status === 'rejected').length}</p>
          </div>
          
          {pendingTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              All transactions have been processed
            </p>
          ) : (
            <div className="space-y-4">
              {pendingTransactions.map((tx) => (
                <Card key={tx.id} className="border-l-4 border-l-yellow-500">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">${tx.amount.toFixed(2)}</h3>
                          <Badge variant="outline">{tx.type}</Badge>
                        </div>
                        <p className="text-muted-foreground mb-1">{tx.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(tx.date)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprove(tx.id)}
                          disabled={processingIds.has(tx.id)}
                          variant="default"
                        >
                          {processingIds.has(tx.id) ? 'Processing...' : 'Approve'}
                        </Button>
                        <Button
                          onClick={() => handleReject(tx.id)}
                          disabled={processingIds.has(tx.id)}
                          variant="destructive"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unified Transaction History */}
      {currentUser?.familyId && (
        <UnifiedActivityList familyId={currentUser.familyId} />
      )}
    </div>
  );
}

