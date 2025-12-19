'use client';

import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface VerificationBadgeProps {
  verificationHash?: string | null;
  showHash?: boolean;
  className?: string;
}

export function VerificationBadge({ 
  verificationHash, 
  showHash = false,
  className = '' 
}: VerificationBadgeProps) {
  if (!verificationHash) {
    return null;
  }

  const truncatedHash = verificationHash.length > 16 
    ? `${verificationHash.substring(0, 8)}...${verificationHash.substring(verificationHash.length - 8)}`
    : verificationHash;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none flex items-center gap-1">
        <Shield className="h-3 w-3" />
        Privacy-Preserving Payment Verified
      </Badge>
      {showHash && (
        <div className="text-xs text-muted-foreground font-mono">
          Hash: {truncatedHash}
        </div>
      )}
    </div>
  );
}

