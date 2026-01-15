import { ShadowWireClient } from '@radr/shadowwire';
import { Connection, PublicKey } from '@solana/web3.js';

/**
 * Privacy configuration for ShadowWire integration
 * Solana Privacy Hackathon 2026
 * 
 * IMPORTANT: This file should only be imported on the server side
 * ShadowWire's ZK proof generation requires Node.js 'fs' module
 */

// USD1 (World Liberty Financial) Devnet Mint Address
export const USD1_MINT_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC Devnet (placeholder for USD1)

// ShadowWire configuration
export const SHADOWWIRE_CONFIG = {
  // Use Solana devnet for the hackathon
  network: 'devnet',
  
  // Privacy settings for Bulletproofs
  privacy: {
    type: 'internal', // Use internal transfers for privacy
    hideAmount: true, // Enable Bulletproofs for amount hiding
    hideSender: true, // Hide sender identity
    hideRecipient: true, // Hide recipient identity
  },
};

// Initialize ShadowWire client
export const createShadowWireClient = (): ShadowWireClient => {
  return new ShadowWireClient({
    network: 'mainnet-beta', // ShadowWire only supports mainnet-beta
    debug: process.env.NODE_ENV === 'development',
  });
};

// USD1 token configuration
export const USD1_CONFIG = {
  mint: new PublicKey(USD1_MINT_ADDRESS),
  decimals: 6, // Standard SPL token decimals
  symbol: 'USD1',
  name: 'USD1 (World Liberty Financial)',
};

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

export default {
  USD1_MINT_ADDRESS,
  SHADOWWIRE_CONFIG,
  createShadowWireClient,
  USD1_CONFIG,
  PRIVACY_FLOW,
  PRIVACY_TX_CONFIG,
};
