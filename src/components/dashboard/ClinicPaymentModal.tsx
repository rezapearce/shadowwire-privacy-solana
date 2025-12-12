'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useFamilyStore } from '@/store/useFamilyStore';
import { createPaymentIntent } from '@/app/actions/createIntent';
import { IntentInputMethod, IntentStatus } from '@/types';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw } from 'lucide-react';

// Constants
const KIDDYGUARD_VAULT_PUBLIC_KEY = '44444444444444444444444444444444444444444444';
const SOL_TO_IDR_RATE = 1_600_000; // 1 SOL = 1,600,000 IDR

const STATUS_MESSAGES: Record<IntentStatus, string> = {
  CREATED: 'Creating payment...',
  FUNDING_DETECTED: 'Funding detected...',
  ROUTING: 'Routing payment...',
  SHIELDING: 'Shielding...',
  SETTLED: 'Payment sent!',
  FAILED: 'Payment failed',
};

const MOCK_CLINIC_ID = '00000000-0000-0000-0000-000000000001';

interface ClinicPaymentModalProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  screeningId?: string;
}

export function ClinicPaymentModal({ isOpen: controlledIsOpen, onOpenChange, screeningId }: ClinicPaymentModalProps = {} as ClinicPaymentModalProps) {
  const { currentUser } = useFamilyStore();
  const wallet = useWallet();
  const { connection } = useConnection();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;
  const [amount, setAmount] = useState('');
  const [inputMethod, setInputMethod] = useState<IntentInputMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<IntentStatus | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Cleanup polling on unmount or when modal closes
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Fetch SOL balance when wallet is connected and modal opens
  useEffect(() => {
    const fetchBalance = async () => {
      if (isOpen && wallet.connected && wallet.publicKey && connection) {
        setIsLoadingBalance(true);
        try {
          const balance = await connection.getBalance(wallet.publicKey);
          const balanceInSOL = balance / LAMPORTS_PER_SOL;
          setSolBalance(balanceInSOL);
          console.log(`Current SOL balance: ${balanceInSOL} SOL`);
        } catch (error) {
          console.error('Error fetching SOL balance:', error);
          setSolBalance(null);
        } finally {
          setIsLoadingBalance(false);
        }
      } else {
        setSolBalance(null);
      }
    };

    fetchBalance();
  }, [isOpen, wallet.connected, wallet.publicKey, connection]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setInputMethod(null);
      setIsProcessing(false);
      setCurrentStatus(null);
      setIntentId(null);
      setSolBalance(null);
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [isOpen, pollingInterval]);

  // Set default amount when screeningId is provided (screening review payment)
  useEffect(() => {
    if (isOpen && screeningId && !amount) {
      // Set default payment amount for screening review (e.g., 50,000 IDR)
      setAmount('50000');
    }
  }, [isOpen, screeningId, amount]);

  const startPolling = (intentIdToPoll: string) => {
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('payment_intents')
          .select('status, failure_reason')
          .eq('intent_id', intentIdToPoll)
          .single();

        if (error) {
          console.error('Error polling intent status:', error);
          return;
        }

        if (data) {
          const status = data.status as IntentStatus;
          setCurrentStatus(status);

          // Stop polling if settled or failed
          if (status === 'SETTLED' || status === 'FAILED') {
            clearInterval(interval);
            setPollingInterval(null);
            setIsProcessing(false);

            if (status === 'SETTLED') {
              toast.success('Payment Sent!');
              // Refresh wallet balance
              if (currentUser) {
                const store = useFamilyStore.getState();
                await store.fetchFamilyData(currentUser.id);
              }
              // Trigger refresh of UnifiedActivityList
              window.dispatchEvent(new Event('payment-complete'));
              setTimeout(() => {
                setIsOpen(false);
              }, 1500);
            } else {
              const errorMessage = data.failure_reason 
                ? `Payment failed: ${data.failure_reason}`
                : 'Payment failed. Please try again.';
              toast.error(errorMessage);
            }
          }
        }
      } catch (error) {
        console.error('Error in polling:', error);
      }
    }, 1500); // Poll every 1.5 seconds

    setPollingInterval(interval);
  };

  /**
   * Check if a transaction signature exists on-chain
   * Returns true if transaction exists, false otherwise
   */
  const checkTransactionExists = async (signature: string): Promise<boolean> => {
    try {
      const status = await connection.getSignatureStatus(signature);
      return status !== null && status.value !== null;
    } catch (error) {
      console.warn('Error checking transaction status:', error);
      return false;
    }
  };

  const handleSolanaPayment = async (fiatAmount: number): Promise<string> => {
    // Check wallet connection
    if (!wallet.connected || !wallet.publicKey) {
      throw new Error('Please connect your Solana wallet first');
    }

    if (!wallet.sendTransaction) {
      throw new Error('Wallet does not support sending transactions');
    }

    // Verify we're on devnet (check connection endpoint)
    const endpoint = connection.rpcEndpoint;
    if (!endpoint.includes('devnet')) {
      console.warn(`Warning: Not connected to devnet. Endpoint: ${endpoint}`);
      toast.warning('Make sure you are connected to Solana Devnet in your wallet settings', {
        duration: 5000,
      });
    }

    // Check SOL balance before attempting transaction
    // Refresh balance to ensure we have the latest
    try {
      console.log('Checking SOL balance before transaction...');
      const balance = await connection.getBalance(wallet.publicKey);
      const balanceInSOL = balance / LAMPORTS_PER_SOL;
      
      // Update displayed balance
      setSolBalance(balanceInSOL);
      
      // Calculate SOL amount needed (payment + estimated fee)
      const solAmount = fiatAmount / SOL_TO_IDR_RATE;
      const estimatedFee = 0.00001; // Estimated transaction fee
      const totalSOLNeeded = solAmount + estimatedFee;
      
      console.log(`Balance check: ${balanceInSOL.toFixed(6)} SOL available, ${totalSOLNeeded.toFixed(6)} SOL needed`);
      
      if (balanceInSOL < totalSOLNeeded) {
        const errorMessage = `Insufficient SOL balance. You need ${totalSOLNeeded.toFixed(6)} SOL (${solAmount.toFixed(6)} SOL for payment + ${estimatedFee} SOL for fees), but you only have ${balanceInSOL.toFixed(6)} SOL.`;
        const helpMessage = `Please add more SOL to your wallet:\n1. Visit https://faucet.solana.com/\n2. Paste your wallet address: ${wallet.publicKey.toString()}\n3. Request airdrop (up to 2 SOL every 8 hours)\n4. Wait a few seconds for confirmation\n5. Try again`;
        console.error(errorMessage);
        console.log(helpMessage);
        throw new Error(`${errorMessage}\n\n${helpMessage}`);
      }
      
      console.log('Balance check passed');
    } catch (error) {
      // If balance check fails, rethrow the error
      if (error instanceof Error && error.message.includes('Insufficient SOL')) {
        throw error;
      }
      // Otherwise, continue - balance check might fail but transaction could still work
      console.warn('Balance check failed, proceeding with transaction:', error);
    }

    // Calculate SOL amount needed
    const solAmount = fiatAmount / SOL_TO_IDR_RATE;
    
    // Convert to lamports
    const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

    if (lamports <= 0) {
      throw new Error('Amount too small. Minimum payment is 0.000001 SOL');
    }

    // Create transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: new PublicKey(KIDDYGUARD_VAULT_PUBLIC_KEY),
        lamports,
      })
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    let signature: string;
    try {
      // Send transaction with timeout
      // If user doesn't approve within 60 seconds, timeout
      console.log('Requesting transaction approval from wallet...');
      signature = await Promise.race([
        wallet.sendTransaction(transaction, connection),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('Transaction approval timeout - please approve the transaction in your Phantom wallet popup')), 60000)
        ),
      ]);
      
      if (!signature) {
        throw new Error('Transaction signature not received from wallet');
      }
      
      console.log(`Transaction sent, signature: ${signature}`);
      
      // Verify transaction was actually sent (not just signature returned)
      // Wait a moment for transaction to propagate
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const exists = await checkTransactionExists(signature);
      if (!exists) {
        // Check again after a longer delay
        await new Promise(resolve => setTimeout(resolve, 3000));
        const existsRetry = await checkTransactionExists(signature);
        if (!existsRetry) {
          throw new Error('Transaction was not approved in your wallet. Please make sure to approve the transaction in the Phantom popup and try again.');
        }
      }
    } catch (error: any) {
      // Handle wallet rejection or errors
      if (error?.code === 4001 || error?.message?.includes('User rejected') || error?.message?.includes('rejected')) {
        throw new Error('Transaction was cancelled by user. Please try again and approve the transaction in Phantom.');
      }
      if (error?.message?.includes('timeout')) {
        throw new Error('Transaction approval timed out. Please make sure to approve the transaction in your Phantom wallet popup within 60 seconds.');
      }
      if (error?.message?.includes('insufficient') || error?.message?.includes('not enough')) {
        throw new Error('Insufficient SOL balance to complete this transaction. Please add more SOL to your wallet.');
      }
      throw new Error(error?.message || 'Failed to send transaction. Please try again.');
    }

    // Confirm transaction and check status
    // Use a longer timeout for confirmation as Solana transactions can take time
    // Note: If user didn't approve, transaction won't be on-chain, so we check for this
    try {
      console.log(`Waiting for transaction confirmation: ${signature}`);
      
      // First, check if transaction exists on-chain (quick check)
      let transactionExists = false;
      try {
        const quickCheck = await Promise.race([
          connection.getSignatureStatus(signature),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Quick check timeout')), 5000)),
        ]);
        transactionExists = quickCheck !== null;
      } catch (quickError) {
        console.log('Quick status check failed, will try full confirmation');
      }
      
      // If transaction doesn't exist, it likely wasn't approved
      if (!transactionExists) {
        // Wait a bit more and check again
        await new Promise(resolve => setTimeout(resolve, 3000));
        const retryCheck = await connection.getSignatureStatus(signature);
        if (retryCheck === null) {
          throw new Error('Transaction not found on-chain. Please make sure you approved the transaction in your Phantom wallet.');
        }
      }
      
      // Full confirmation with timeout
      const confirmation = await Promise.race([
        connection.confirmTransaction(signature, 'confirmed'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction confirmation timeout - transaction may still be processing')), 45000)
        ),
      ]) as any;
      
      if (confirmation.value?.err) {
        // Transaction failed on-chain
        const errorReason = confirmation.value.err.toString();
        throw new Error(`Transaction failed on-chain: ${errorReason}`);
      }
      
      console.log(`Transaction confirmed successfully: ${signature}`);
    } catch (error: any) {
      // If confirmation fails, check if it's because transaction failed
      if (error?.message?.includes('not found') || error?.message?.includes('not approved')) {
        throw new Error('Transaction was not approved in your wallet. Please try again and make sure to approve the transaction in the Phantom popup.');
      }
      if (error?.message?.includes('failed') || error?.message?.includes('timeout')) {
        // For timeout, still return signature - backend will verify
        if (error?.message?.includes('timeout')) {
          console.warn(`Confirmation timeout for ${signature}, but signature exists - backend will verify`);
          // Don't throw - let backend handle verification
        } else {
          throw error;
        }
      } else {
        // Other errors - log but don't fail, backend will verify
        console.warn('Confirmation check had issues, but signature exists:', signature, error);
      }
    }

    console.log(`Returning transaction signature: ${signature}`);
    return signature;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      toast.error('Please log in to make a payment');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!inputMethod) {
      toast.error('Please select a funding source');
      return;
    }

    setIsProcessing(true);
    setCurrentStatus('CREATED');

    try {
      let txHash: string | undefined;

      // Handle SOL_WALLET payment method
      if (inputMethod === 'SOL_WALLET') {
        try {
          toast.info('Please approve the transaction in your Phantom wallet popup...', {
            duration: 10000, // Show for 10 seconds to give user time
            description: 'Look for the Phantom extension popup and click "Approve"',
          });
          txHash = await handleSolanaPayment(amountNum);
          toast.success('Transaction confirmed! Creating payment intent...');
        } catch (error) {
          console.error('Error processing Solana payment:', error);
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Failed to process Solana payment';
          
          // Extract main message and help text for better display
          const lines = errorMessage.split('\n');
          const mainMessage = lines[0];
          const helpText = lines.slice(1).join(' ');
          
          // Show detailed error toast with helpful instructions
          toast.error(mainMessage, {
            duration: 10000, // Show for 10 seconds
            description: helpText || (errorMessage.includes('approve') || errorMessage.includes('timeout')
              ? 'Make sure to click the Phantom extension icon and approve the transaction'
              : errorMessage.includes('Insufficient')
              ? 'Please add more SOL to your wallet using the faucet'
              : 'Please check your wallet connection and try again'),
          });
          
          setIsProcessing(false);
          setCurrentStatus(null);
          return;
        }
      }

      // Create payment intent (with txHash for SOL_WALLET, undefined for USDC_BALANCE)
      // Include screening_id in payment context if provided
      if (screeningId) {
        console.log(`Creating payment intent for screening review: ${screeningId}`);
      }
      
      const result = await createPaymentIntent(
        currentUser.id,
        currentUser.familyId,
        MOCK_CLINIC_ID,
        amountNum,
        inputMethod,
        txHash,
        screeningId
      );

      if (!result.success || !result.intentId) {
        const errorMsg = result.error || 'Failed to create payment intent';
        console.error('Payment intent creation failed:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log(`Payment intent created successfully: ${result.intentId}, txHash: ${txHash || 'N/A'}`);
      setIntentId(result.intentId);
      startPolling(result.intentId);
      toast.success('Payment initiated');
    } catch (error) {
      console.error('Error creating payment intent:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to create payment intent';
      
      // Show detailed error toast with longer duration
      toast.error(errorMessage, {
        duration: 6000,
        description: 'Please check your wallet connection and try again',
      });
      
      setIsProcessing(false);
      setCurrentStatus(null);
    }
  };

  const isFormValid = amount && parseFloat(amount) > 0 && inputMethod !== null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pay Clinic</DialogTitle>
          <DialogDescription>
            {screeningId 
              ? `Make a payment for screening review. The payment will be automatically routed and shielded.`
              : 'Make a payment to a clinic. The payment will be automatically routed and shielded.'}
          </DialogDescription>
          {screeningId && (
            <div className="mt-2 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-1">Payment Memo:</p>
              <p className="text-sm font-mono text-muted-foreground">
                Screening: {screeningId}
              </p>
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Amount Input */}
            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium">
                Amount (IDR)
              </label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isProcessing}
                required
              />
            </div>

            {/* Funding Source Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Funding Source</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={inputMethod === 'USDC_BALANCE' ? 'default' : 'outline'}
                  onClick={() => setInputMethod('USDC_BALANCE')}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  USDC Balance
                </Button>
                <Button
                  type="button"
                  variant={inputMethod === 'SOL_WALLET' ? 'default' : 'outline'}
                  onClick={() => setInputMethod('SOL_WALLET')}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  Solana Wallet
                </Button>
              </div>
              {/* Show SOL balance when Solana Wallet is selected */}
              {inputMethod === 'SOL_WALLET' && wallet.connected && (
                <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                  <div className="flex items-center justify-between mb-1">
                    {isLoadingBalance ? (
                      <span className="text-muted-foreground">Loading balance...</span>
                    ) : solBalance !== null ? (
                      <>
                        <span className="text-muted-foreground">Your SOL Balance:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{solBalance.toFixed(6)} SOL</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={async () => {
                              if (wallet.publicKey) {
                                setIsLoadingBalance(true);
                                try {
                                  const balance = await connection.getBalance(wallet.publicKey);
                                  const balanceInSOL = balance / LAMPORTS_PER_SOL;
                                  setSolBalance(balanceInSOL);
                                  toast.success('Balance refreshed');
                                } catch (error) {
                                  console.error('Error refreshing balance:', error);
                                  toast.error('Failed to refresh balance');
                                } finally {
                                  setIsLoadingBalance(false);
                                }
                              }
                            }}
                            disabled={isLoadingBalance}
                          >
                            <RefreshCw className={`h-3 w-3 ${isLoadingBalance ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Unable to load balance</span>
                    )}
                  </div>
                  {amount && parseFloat(amount) > 0 && solBalance !== null && (
                    <div className="mt-1 text-xs">
                      <span className="text-muted-foreground">Required: </span>
                      <span className={`font-medium ${solBalance < ((parseFloat(amount) / SOL_TO_IDR_RATE) + 0.00001) ? 'text-destructive' : 'text-foreground'}`}>
                        {((parseFloat(amount) / SOL_TO_IDR_RATE) + 0.00001).toFixed(6)} SOL
                      </span>
                    </div>
                  )}
                  {wallet.connected && solBalance !== null && solBalance < 0.1 && (
                    <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
                      💡 Low balance. Get free SOL from{' '}
                      <a
                        href="https://faucet.solana.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline hover:text-primary/80"
                      >
                        Solana Faucet
                      </a>
                      {' '}(up to 2 SOL every 8 hours)
                    </div>
                  )}
                </div>
              )}
              {inputMethod === 'SOL_WALLET' && !wallet.connected && (
                <div className="mt-2 p-2 bg-muted rounded-md text-sm text-destructive">
                  Please connect your Solana wallet first
                </div>
              )}
            </div>

            {/* Status Display */}
            {isProcessing && currentStatus && (
              <div className={`flex flex-col gap-2 p-4 rounded-md border-2 ${
                currentStatus === 'SHIELDING' 
                  ? 'bg-teal-50 border-teal-300' 
                  : 'bg-muted border-border'
              }`}>
                <div className="flex items-center gap-2">
                  <Loader2 className={`h-5 w-5 animate-spin ${
                    currentStatus === 'SHIELDING' ? 'text-teal-600' : ''
                  }`} />
                  <span className={`text-sm font-medium ${
                    currentStatus === 'SHIELDING' ? 'text-teal-900' : ''
                  }`}>
                    {STATUS_MESSAGES[currentStatus]}
                  </span>
                </div>
                {currentStatus === 'SHIELDING' && (
                  <div className="ml-7 space-y-1">
                    <p className="text-xs text-teal-700">
                      🛡️ Your payment is being shielded for privacy...
                    </p>
                    <p className="text-xs text-teal-600">
                      Parent identity and wallet information will remain anonymous
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Pay Now'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
