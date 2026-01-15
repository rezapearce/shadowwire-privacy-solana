'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useFamilyStore } from '@/store/useFamilyStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldBridge } from './ShieldBridge';
import { TransactionHistory } from './TransactionHistory';

export function ChildDashboard() {
  const { wallet, requestTransaction, setUser, transactions } = useFamilyStore();
  const [amount, setAmount] = useState<string>('');
  
  // Debug: Log transactions
  console.log('Child - All transactions:', transactions);

  const handleBuyToy = async () => {
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    await requestTransaction(numAmount, 'Buy Toy');
    setAmount('');
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Child Dashboard</h1>
        <Button onClick={handleLogout} variant="outline">
          Logout
        </Button>
      </div>
      
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Spending (Public) - USDC */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700">Spending (Public)</CardTitle>
            <CardDescription>Your USDC balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              ${wallet.usdc.toFixed(2)}
            </div>
            <p className="text-sm text-green-600 mt-2">Available for purchases</p>
          </CardContent>
        </Card>

        {/* Savings (Shielded) - USD1 */}
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-purple-700 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Savings (Shielded)
            </CardTitle>
            <CardDescription>Your USD1 balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">
              ${wallet.usd1.toFixed(2)}
            </div>
            <p className="text-sm text-purple-600 mt-2">Protected savings</p>
          </CardContent>
        </Card>
      </div>

      {/* Shield Bridge Section */}
      <ShieldBridge />

      {/* Test Transaction Section */}
      <Card>
        <CardHeader>
          <CardTitle>Test Transaction</CardTitle>
          <CardDescription>Request a purchase</CardDescription>
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
              step="0.01"
            />
            <Button onClick={handleBuyToy}>Buy Toy</Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Transactions over $20 require parent approval
          </p>
        </CardContent>
      </Card>

      {/* Transaction History Section */}
      <TransactionHistory />
    </div>
  );
}

