/**
 * Client-side privacy configuration
 * ShadowWire client components that are safe to use in the browser
 */

// USD1 (World Liberty Financial) Devnet Mint Address
export const USD1_MINT_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC Devnet (placeholder for USD1)

// ShadowWire privacy flow constants
export const PRIVACY_FLOW = {
  // Phase 1: Deposit to private pool
  DEPOSIT: 'deposit',
  // Phase 2: Private transfer with hidden amount
  PRIVATE_TRANSFER: 'private_transfer',
  // Phase 3: Complete
  COMPLETE: 'complete',
};

// Privacy transaction constants
export const PRIVACY_TX_CONFIG = {
  // ZK Proof generation timeout (ms)
  proofTimeout: 30000,
  
  // Maximum retry attempts for privacy transactions
  maxRetries: 3,
  
  // Delay between retries (ms)
  retryDelay: 2000,
  
  // Privacy fee in lamports
  privacyFee: 10000, // 0.00001 SOL
  
  // Bulletproofs generation time (ms) - for UI loading states
  bulletproofsGenTime: 3000, // 3 seconds average
  
  // Minimum amount for privacy transfer (lamports)
  minPrivacyAmount: 1000000, // 0.001 USD1
};

// USD1 token configuration
export const USD1_CONFIG = {
  decimals: 6, // Standard SPL token decimals
  symbol: 'USD1',
  name: 'USD1 (World Liberty Financial)',
};

export default {
  USD1_MINT_ADDRESS,
  PRIVACY_FLOW,
  PRIVACY_TX_CONFIG,
  USD1_CONFIG,
};
