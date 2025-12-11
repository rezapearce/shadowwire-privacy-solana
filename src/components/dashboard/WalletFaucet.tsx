'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useFamilyStore } from '@/store/useFamilyStore';
import { topUpWallet } from '@/app/actions/topUpWallet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function WalletFaucet() {
  const { currentUser, fetchFamilyData } = useFamilyStore();
  const [isOpen, setIsOpen] = useState(false);
  const [processingAsset, setProcessingAsset] = useState<'USDC' | 'SOL' | null>(null);

  const handleTopUp = async (amount: number, asset: 'USDC' | 'SOL') => {
    if (!currentUser) {
      toast.error('Please log in to top up wallet');
      return;
    }

    setProcessingAsset(asset);

    try {
      const result = await topUpWallet(currentUser.id, amount, asset);

      if (!result.success) {
        throw new Error(result.error || 'Failed to top up wallet');
      }

      // Refresh wallet data
      await fetchFamilyData(currentUser.id);

      toast.success('Wallet Topped Up!');
      setIsOpen(false);
    } catch (error) {
      console.error('Error topping up wallet:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to top up wallet');
    } finally {
      setProcessingAsset(null);
    }
  };

  const isProcessing = processingAsset !== null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Plus className="h-4 w-4" />
          <span className="sr-only">Add Funds</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Funds</DialogTitle>
          <DialogDescription>
            Top up your wallet balance for testing purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => handleTopUp(100, 'USDC')}
              disabled={isProcessing}
              className="w-full"
            >
              {processingAsset === 'USDC' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                '+ $100 USDC'
              )}
            </Button>
            <Button
              onClick={() => handleTopUp(1, 'SOL')}
              disabled={isProcessing}
              className="w-full"
            >
              {processingAsset === 'SOL' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                '+ 1 SOL'
              )}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isProcessing}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
