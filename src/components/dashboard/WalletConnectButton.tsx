'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';

export function WalletConnectButton() {
  const [mounted, setMounted] = useState(false);

  // Handle hydration - only render on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-10 w-[200px] rounded-md bg-muted animate-pulse" />
    );
  }

  return (
    <div className="wallet-adapter-button-wrapper">
      <WalletMultiButton className="!h-10" />
    </div>
  );
}
