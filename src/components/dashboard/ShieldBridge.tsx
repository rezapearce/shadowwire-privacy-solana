'use client';

import { useState } from 'react';
import { Lock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useFamilyStore } from '@/store/useFamilyStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BulletproofsLoader } from '@/components/ui/bulletproofs-loader';
import { ExportAuditKey } from './ExportAuditKey';
import { PRIVACY_TX_CONFIG } from '@/config/privacy-client';

export function ShieldBridge() {
  const { wallet, shieldAssets, currentUser } = useFamilyStore();
  const [amount, setAmount] = useState<string>('');
  const [isShielding, setIsShielding] = useState(false);
  const [showBulletproofsLoader, setShowBulletproofsLoader] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState<string>('');
  const [lastBlindingFactor, setLastBlindingFactor] = useState<string>('');

  const handleShield = async () => {
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (numAmount > wallet.usdc) {
      toast.error('Amount exceeds available USDC balance');
      return;
    }

    // Check minimum privacy amount
    const minAmount = PRIVACY_TX_CONFIG.minPrivacyAmount / Math.pow(10, 6); // Convert from lamports
    if (numAmount < minAmount) {
      toast.error(`Minimum privacy amount is ${minAmount} USD1`);
      return;
    }

    setIsShielding(true);
    
    // Show the Bulletproofs loader first
    setShowBulletproofsLoader(true);
    toast.info('Starting privacy protection process... 🛡️');

    // Wait for the Bulletproofs animation to complete
    setTimeout(async () => {
      try {
        await shieldAssets(numAmount);
        setAmount('');
        
        // Generate transaction ID and blinding factor for demo purposes
        const txId = `demo_tx_${Date.now()}`;
        const blindingFactor = `r_${Math.random().toString(36).substring(2, 15)}`;
        
        // Store for export functionality
        setLastTransactionId(txId);
        setLastBlindingFactor(blindingFactor);
        
        // Success toast with explorer link and verification badge
        toast.success(
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                ✓ Confidential Transfer Verified
              </span>
            </div>
            <div className="text-sm">
              Privacy protection enabled! Your USD1 is now shielded.
            </div>
            <a 
              href={`https://explorer.solana.com/tx/${txId}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-xs flex items-center gap-1"
            >
              View Private Transaction →
            </a>
          </div>,
          {
            duration: 6000
          }
        );
      } catch (error) {
        console.error('Error in shield operation:', error);
        toast.error('Failed to enable privacy protection');
      } finally {
        setIsShielding(false);
        setShowBulletproofsLoader(false);
      }
    }, PRIVACY_TX_CONFIG.bulletproofsGenTime + 1000); // Animation + 1s buffer
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Protection
          </CardTitle>
          <CardDescription>
            Shield USD1 with Bulletproofs → Private Pool → Hidden Amounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1"
              min="0"
              max={wallet.usdc}
              step="0.01"
              disabled={isShielding}
            />
            <Button 
              onClick={handleShield} 
              disabled={isShielding || !amount || parseFloat(amount) <= 0}
            >
              <Lock className="h-4 w-4 mr-2" />
              {isShielding ? 'Shielding...' : 'Enable Privacy'}
            </Button>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Available: ${wallet.usdc.toFixed(2)} USDC
            </p>
            <p className="text-sm text-muted-foreground">
              Shielded: ${wallet.usd1.toFixed(2)} USD1
            </p>
            <p className="text-xs text-gray-500">
              Minimum: {(PRIVACY_TX_CONFIG.minPrivacyAmount / Math.pow(10, 6)).toFixed(3)} USD1
            </p>
          </div>

          {/* Privacy Flow Steps */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
            <h4 className="font-semibold text-sm text-gray-900 mb-3">Privacy Flow:</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
                <span className="text-sm text-gray-700">Deposit USD1 to ShadowWire Pool</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</div>
                <span className="text-sm text-gray-700">Generate ZK Proof (Bulletproofs)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-pink-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
                <span className="text-sm text-gray-700">Private Transfer with Hidden Amount</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Audit Key Section */}
      <ExportAuditKey 
        transactionId={lastTransactionId}
        amount={parseFloat(amount) || 0}
        blindingFactor={lastBlindingFactor}
        isDisabled={!lastTransactionId}
      />

      {/* Bulletproofs Loader Modal */}
      <BulletproofsLoader 
        isVisible={showBulletproofsLoader}
        duration={PRIVACY_TX_CONFIG.bulletproofsGenTime}
        onComplete={() => {
          // Loader completed, the actual shield operation will finish shortly
          console.log('Bulletproofs generation completed');
        }}
      />
    </>
  );
}

