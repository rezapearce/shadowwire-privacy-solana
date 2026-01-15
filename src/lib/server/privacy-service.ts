/**
 * Server-side ShadowWire privacy service
 * Handles all ShadowWire operations that require Node.js environment
 */

import { createClient } from '@supabase/supabase-js';
import { createShadowWireClient, USD1_CONFIG, PRIVACY_TX_CONFIG, PRIVACY_FLOW, USD1_MINT_ADDRESS } from '@/config/privacy';
import { ShadowWireClient } from '@radr/shadowwire';
import { Connection, PublicKey } from '@solana/web3.js';

/**
 * Server-side privacy service for ShadowWire operations
 * This class handles all the heavy lifting that requires Node.js 'fs' module
 */
export class PrivacyService {
  private static instance: PrivacyService;
  private readonly shadowWireClient: ShadowWireClient;
  private readonly solanaConnection: Connection;

  private constructor() {
    // Initialize Solana connection
    const rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://api.devnet.solana.com';
    this.solanaConnection = new Connection(rpcEndpoint, 'confirmed');
    
    // Initialize ShadowWire client (server-side only)
    this.shadowWireClient = createShadowWireClient();
    console.log('ShadowWire client initialized on server');
  }

  public static getInstance(): PrivacyService {
    if (!PrivacyService.instance) {
      PrivacyService.instance = new PrivacyService();
    }
    return PrivacyService.instance;
  }

  /**
   * Execute complete ShadowWire privacy flow
   * User Wallet → Private Pool → ZK Proof → Private Transfer
   */
  public async executePrivacyTransfer(params: {
    walletAddress: string;
    amount: number; // Amount in USD1 (smallest units)
  }): Promise<{
    success: boolean;
    txSignature?: string;
    proofPda?: string;
    error?: string;
  }> {
    try {
      console.log(`Starting privacy transfer for ${params.amount} USD1`);
      
      // Phase 1: Deposit to private pool
      console.log('Phase 1: Depositing to private pool...');
      const depositResponse = await this.executeWithRetry(
        () => this.shadowWireClient.deposit({
          wallet: params.walletAddress,
          amount: params.amount,
          token_mint: USD1_MINT_ADDRESS,
        }),
        'ShadowWire deposit',
        3
      );

      if (!depositResponse.success) {
        throw new Error('Deposit failed');
      }

      console.log(`Deposit completed: ${depositResponse.pool_address}`);

      // Phase 2: Generate ZK Proof with Bulletproofs
      console.log('Phase 2: Generating ZK Proof...');
      const proofData = await this.executeWithRetry(
        () => this.shadowWireClient.generateProofLocally(params.amount, 'USD1'),
        'ZK Proof generation',
        2
      );

      console.log(`ZK Proof generated: ${proofData.proofBytes.length} bytes`);

      // Phase 3: Private transfer with hidden amount
      console.log('Phase 3: Executing private transfer...');
      const transferResponse = await this.executeWithRetry(
        () => this.shadowWireClient.transferWithClientProofs({
          sender: params.walletAddress,
          recipient: params.walletAddress, // Self-transfer for privacy
          amount: params.amount,
          token: 'USD1',
          type: 'internal',
          customProof: proofData,
        }),
        'ShadowWire private transfer',
        3
      );

      if (!transferResponse.success) {
        throw new Error('Private transfer failed');
      }

      console.log(`Private transfer completed: ${transferResponse.tx_signature}`);

      return {
        success: true,
        txSignature: transferResponse.tx_signature,
        proofPda: transferResponse.proof_pda,
      };

    } catch (error) {
      console.error('Privacy transfer failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get wallet balance from ShadowWire
   */
  public async getWalletBalance(walletAddress: string): Promise<{
    available: number;
    deposited: number;
    error?: string;
  }> {
    try {
      const balance = await this.shadowWireClient.getBalance(walletAddress, 'USD1');
      return {
        available: balance.available,
        deposited: balance.deposited,
      };
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      return {
        available: 0,
        deposited: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute function with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = PRIVACY_TX_CONFIG.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting ${operationName} (attempt ${attempt}/${maxRetries})`);
        const result = await operation();
        console.log(`${operationName} succeeded on attempt ${attempt}`);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`${operationName} failed on attempt ${attempt}: ${lastError.message}`);
        
        if (attempt === maxRetries) {
          console.error(`${operationName} failed after ${maxRetries} attempts`);
          throw lastError;
        }
        
        const delay = PRIVACY_TX_CONFIG.retryDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying ${operationName} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new Error(`Unknown error in ${operationName}`);
  }
}
