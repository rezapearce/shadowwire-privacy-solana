export type UserRole = 'parent' | 'child' | 'pediatrician';

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
  usd1: number; // Replaced zenzec with usd1 for ShadowWire privacy
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
  network?: string; // Network identifier (e.g., 'solana-devnet', 'fiat')
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

// Pediatric Screening Types
export type ScreeningStatus = 'IN_PROGRESS' | 'COMPLETED' | 'PAYMENT_PENDING' | 'PAID';
export type ScreeningRiskLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type ScreeningCategory = 'gross_motor' | 'fine_motor' | 'language' | 'personal_social';
export type ScreeningResponseValue = 'yes' | 'no' | 'sometimes' | 'not_applicable';

export interface ScreeningSession {
  session_id: string;
  family_id: string;
  child_name: string;
  child_age_months: number;
  age_group: string;
  status: ScreeningStatus;
  payment_intent_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScreeningResponse {
  response_id: string;
  session_id: string;
  question_id: string;
  question_text: string;
  category: ScreeningCategory;
  response_value: ScreeningResponseValue;
  milestone_age_months?: number | null;
  created_at: string;
}

export interface ScreeningAnalysis {
  analysis_id: string;
  session_id: string;
  risk_level: ScreeningRiskLevel;
  risk_score?: number | null;
  summary: string;
  recommendations?: string | null;
  ai_model: string;
  ai_provider: string;
  raw_response?: any;
  created_at: string;
}

export interface DenverIIQuestion {
  questionId: string;
  questionText: string;
  category: ScreeningCategory;
  ageGroup: string;
  milestoneAgeMonths: number;
}

export interface ScreeningResults {
  session: ScreeningSession;
  responses: ScreeningResponse[];
  analysis?: ScreeningAnalysis | null;
}

// Export Denver II Question types from screening.ts
export * from './screening';

