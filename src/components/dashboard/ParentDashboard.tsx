'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { QrCode, Stethoscope, CheckCircle2, Clock, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useFamilyStore } from '@/store/useFamilyStore';
import { signWithMPC } from '@/lib/zenrock/mpc';
import { getFamilyScreenings } from '@/app/actions/submitScreening';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClinicPaymentModal } from '@/components/dashboard/ClinicPaymentModal';
import { ScannerModal } from '@/components/dashboard/ScannerModal';
import { OfficialReportModal } from '@/components/dashboard/OfficialReportModal';
import { UnifiedActivityList } from '@/components/dashboard/UnifiedActivityList';
import { WalletFaucet } from '@/components/dashboard/WalletFaucet';
import { WalletConnectButton } from '@/components/dashboard/WalletConnectButton';
import { ScreeningHistory } from '@/components/screening/ScreeningHistory';
import ScreeningList from '@/components/dashboard/ScreeningList';
import { useScreeningRealtime } from '@/hooks/useScreeningRealtime';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { NotificationBell } from '@/components/dashboard/NotificationBell';

export function ParentDashboard() {
  // 🚀 AGGRESSIVE DEBUG - TOP OF COMPONENT
  console.log('🚀🚀🚀 ParentDashboard MOUNTED - TOP OF COMPONENT 🚀🚀🚀');
  
  const router = useRouter();
  const { wallet, transactions, approveTransaction, rejectTransaction, setUser, currentUser } = useFamilyStore();
  
  // 🔔 DEBUG IMMEDIATELY AFTER HOOKS
  console.log('🔔 NotificationBell Debug - IMMEDIATE:', {
    currentUser: currentUser,
    userId: currentUser?.id,
    shouldRender: !!(currentUser && currentUser.id),
    userRole: currentUser?.role,
    hasId: !!currentUser?.id,
    currentUserType: typeof currentUser,
    currentUserIdType: typeof currentUser?.id
  });
  
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [latestScreening, setLatestScreening] = useState<any | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isLoadingScreening, setIsLoadingScreening] = useState(true);
  const [allScreenings, setAllScreenings] = useState<any[]>([]);

  const totalFamilyValue = wallet.sol + wallet.usdc + wallet.usd1;
  const pendingTransactions = transactions.filter((tx) => tx.status === 'pending');
  
  // Debug: Log transactions to console
  console.log('All transactions:', transactions);
  console.log('Pending transactions:', pendingTransactions);
  
  // Debug: Log user data for notification bell - SECOND CHECK
  console.log('🔔 NotificationBell Debug - SECOND CHECK:', {
    currentUser: currentUser,
    userId: currentUser?.id,
    shouldRender: !!(currentUser && currentUser.id),
    userRole: currentUser?.role
  });

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

  // Enable real-time updates for screenings
  useScreeningRealtime(currentUser?.familyId || null);

  // Fetch latest screening and all screenings
  useEffect(() => {
    const fetchScreenings = async () => {
      if (!currentUser?.familyId) {
        setIsLoadingScreening(false);
        return;
      }

      try {
        setIsLoadingScreening(true);
        const result = await getFamilyScreenings(currentUser.familyId);
        if (result.success && result.screenings) {
          // Get the most recent screening
          if (result.screenings.length > 0) {
            setLatestScreening(result.screenings[0]);
          } else {
            setLatestScreening(null);
          }
          // Set all screenings for the list
          setAllScreenings(result.screenings);
        } else {
          setLatestScreening(null);
          setAllScreenings([]);
        }
      } catch (error) {
        console.error('Error fetching screenings:', error);
        setLatestScreening(null);
        setAllScreenings([]);
      } finally {
        setIsLoadingScreening(false);
      }
    };

    fetchScreenings();
  }, [currentUser?.familyId]);

  // Refetch screening when modal closes to catch status updates
  useEffect(() => {
    if (!isReportModalOpen && currentUser?.familyId) {
      const fetchLatestScreening = async () => {
        try {
          const result = await getFamilyScreenings(currentUser.familyId);
          if (result.success && result.screenings && result.screenings.length > 0) {
            setLatestScreening(result.screenings[0]);
          }
        } catch (error) {
          console.error('Error refetching screening:', error);
        }
      };
      fetchLatestScreening();
    }
  }, [isReportModalOpen, currentUser?.familyId]);

  // Debug: Log that component is rendering
  console.log('ParentDashboard rendering - Scan button should be visible');

  // Show skeleton while loading initial screening data
  if (isLoadingScreening && latestScreening === null) {
    return <DashboardSkeleton />;
  }

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

      {/* SCREENING BUTTON - VERY PROMINENT, RIGHT AFTER QR SCAN */}
      <div 
        style={{ 
          backgroundColor: '#3b82f6', 
          padding: '20px', 
          borderRadius: '12px', 
          marginBottom: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          position: 'relative',
          zIndex: 1000,
          border: '3px solid #2563eb'
        }}
      >
        <button
          onClick={() => {
            console.log('Screening button clicked!');
            router.push('/screening/wizard');
          }}
          style={{
            width: '100%',
            padding: '20px',
            backgroundColor: '#ffffff',
            color: '#3b82f6',
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
          <Stethoscope style={{ width: '28px', height: '28px' }} />
          <span>🏥 START PEDIATRIC DEVELOPMENTAL SCREENING</span>
        </button>
        <p style={{ 
          textAlign: 'center', 
          color: '#dbeafe', 
          fontSize: '14px', 
          marginTop: '12px',
          fontWeight: '500'
        }}>
          Complete a simplified Denver II screening to assess your child&apos;s developmental milestones
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Parent Dashboard</h1>
        <div className="flex gap-2 items-center">
          <WalletConnectButton />
          {(() => {
            // 🔔 AGGRESSIVE DEBUG IN RENDER
            console.log('🔔 RENDER CHECK - About to render NotificationBell:', {
              currentUser: currentUser,
              userId: currentUser?.id,
              hasId: !!currentUser?.id,
              willRender: !!currentUser?.id
            });
            
            if (currentUser?.id) {
              console.log('✅ RENDERING NotificationBell with userId:', currentUser.id);
              return <NotificationBell userId={currentUser.id} />;
            } else {
              console.warn('❌ NOT RENDERING NotificationBell - currentUser?.id is falsy:', {
                currentUser: currentUser,
                id: currentUser?.id,
                type: typeof currentUser?.id
              });
              return (
                <div 
                  style={{ 
                    display: 'block', 
                    padding: '8px', 
                    backgroundColor: '#fee2e2', 
                    border: '2px solid #ef4444',
                    borderRadius: '4px'
                  }} 
                  data-debug="bell-not-rendering"
                >
                  <span style={{ fontSize: '12px', color: '#dc2626' }}>
                    ⚠️ No userId: {JSON.stringify({ id: currentUser?.id, hasUser: !!currentUser })}
                  </span>
                </div>
              );
            }
          })()}
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

      {/* Developmental Checkup Card */}
      <Card className="border-teal-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-teal-600" />
            Developmental Checkup
          </CardTitle>
          <CardDescription>Latest screening status</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingScreening ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
              <span className="ml-3 text-muted-foreground">Loading...</span>
            </div>
          ) : !latestScreening ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No screenings yet</p>
              <Button onClick={() => router.push('/screening/wizard')}>
                Start Your First Screening
              </Button>
            </div>
          ) : latestScreening.status === 'COMPLETED' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{latestScreening.child_name}</h3>
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Results Ready
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Age: {latestScreening.child_age_months} months • {formatDate(latestScreening.created_at)}
                    {latestScreening.clinical_risk_level && (
                      <span className="ml-2">
                        • Final Assessment: <span className="font-semibold">{latestScreening.clinical_risk_level}</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setIsReportModalOpen(true)}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                size="lg"
              >
                View Official Report
              </Button>
            </div>
          ) : latestScreening.status === 'REVIEW_PAID' || latestScreening.status === 'PENDING_REVIEW' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{latestScreening.child_name}</h3>
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                      <Clock className="h-3 w-3 mr-1" />
                      Waiting for Doctor&apos;s Review...
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Age: {latestScreening.child_age_months} months • {formatDate(latestScreening.created_at)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground italic">
                Your screening has been submitted and payment received. A pediatrician will review your child&apos;s assessment shortly.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{latestScreening.child_name}</h3>
                    <Badge variant="outline">
                      {latestScreening.status?.replace('_', ' ') || 'Pending'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Age: {latestScreening.child_age_months} months • {formatDate(latestScreening.created_at)}
                  </p>
                </div>
              </div>
            </div>
          )}
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
      <OfficialReportModal
        isOpen={isReportModalOpen}
        onOpenChange={setIsReportModalOpen}
        screening={latestScreening}
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
              <span className="text-muted-foreground">USD1:</span>{' '}
              <span className="font-semibold">${wallet.usd1.toFixed(2)}</span>
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

      {/* Screening History */}
      {currentUser?.familyId && (
        <Card className="border-teal-200">
          <CardHeader>
            <CardTitle>Screening History</CardTitle>
            <CardDescription>
              Track your child&apos;s developmental screenings and clinical reviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingScreening ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <span className="ml-2 text-muted-foreground">Loading screenings...</span>
              </div>
            ) : (
              <ScreeningList screenings={allScreenings} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Unified Transaction History */}
      {currentUser?.familyId && (
        <UnifiedActivityList familyId={currentUser.familyId} />
      )}
    </div>
  );
}
