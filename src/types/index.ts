export type UserRole = 'parent' | 'child';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  familyId: string;
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

