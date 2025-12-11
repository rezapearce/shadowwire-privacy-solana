export type UserRole = 'parent' | 'child';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  familyId: string;
  walletAddress?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  type: 'public' | 'shielded';
  description: string;
  date: string;
  requester_id?: string;
  created_at?: string;
}

export interface WalletState {
  sol: number;
  usdc: number;
  zenzec: number;
}

// Intent-Based Payment Engine Types
export type IntentStatus = 'CREATED' | 'FUNDING_DETECTED' | 'ROUTING' | 'SHIELDING' | 'SETTLED' | 'FAILED';

export type IntentInputMethod = 'USDC_BALANCE' | 'SOL_WALLET' | 'FIAT_GATEWAY';

export interface PaymentIntent {
  intent_id: string;
  family_id: string;
  clinic_id: string;
  fiat_amount: number;
  currency: string;
  input_method: IntentInputMethod;
  status: IntentStatus;
  tx_hash?: string;
  input_tx_ref?: string;
  mpc_sig?: string;
  failure_reason?: string;
  created_at: string;
  updated_at: string;
}

// Unified Transaction History Types
export interface UnifiedTransaction {
  id: string;
  family_id: string;
  amount: number;
  type: 'INTERNAL' | 'CLINIC_BILL';
  status: string;
  description: string;
  created_at: string;
  currency?: string;
  input_tx_ref?: string;
  failure_reason?: string;
}

