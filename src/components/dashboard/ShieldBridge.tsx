'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useFamilyStore } from '@/store/useFamilyStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ShieldBridge() {
  const { wallet, shieldAssets, currentUser } = useFamilyStore();
  const [amount, setAmount] = useState<string>('');
  const [isShielding, setIsShielding] = useState(false);

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

    setIsShielding(true);
    toast.info('Generating Zero-Knowledge Proof... 🛡️');

    // Wait 3 seconds before calling the actual RPC
    setTimeout(async () => {
      try {
        await shieldAssets(numAmount);
        setAmount('');
      } catch (error) {
        console.error('Error in shield operation:', error);
      } finally {
        setIsShielding(false);
      }
    }, 3000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shield Savings</CardTitle>
        <CardDescription>Convert USDC to zenZEC for protected savings</CardDescription>
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
            Shield Funds
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Available: ${wallet.usdc.toFixed(2)} USDC
        </p>
      </CardContent>
    </Card>
  );
}

