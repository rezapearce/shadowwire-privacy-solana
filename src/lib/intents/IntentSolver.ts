import { supabase } from '@/lib/supabase';
import { PaymentIntent, IntentStatus } from '@/types';
import { signWithMPC } from '@/lib/zenrock/mpc';
import { Connection, PublicKey, LAMPORTS_PER_SOL, ParsedTransaction } from '@solana/web3.js';

/**
 * IntentSolver - Singleton service for processing payment intents
 * Handles the state machine transitions: CREATED -> FUNDING_DETECTED -> ROUTING -> SHIELDING -> SETTLED
 */
export class IntentSolver {
  private static instance: IntentSolver;

  // Exchange rate constants
  private static readonly IDR_TO_USD_RATE = 16000; // 1 USD = 16,000 IDR
  private static readonly USDC_PRICE_USD = 1; // USDC ≈ 1 USD
  private static readonly SOL_PRICE_USD = 100; // Mock SOL price: $100 USD

  // Solana constants
  private static readonly KIDDYGUARD_VAULT_PUBLIC_KEY = '44444444444444444444444444444444444444444444';
  private static readonly SOL_TO_IDR_RATE = 1_600_000; // 1 SOL = 1,600,000 IDR

  // Solana connection
  private readonly solanaConnection: Connection;

  private constructor() {
    // Private constructor for singleton pattern
    // Initialize Solana connection to Devnet
    // Use environment variable if available, otherwise default to public devnet RPC
    const rpcEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://api.devnet.solana.com';
    console.log(`Initializing Solana connection to: ${rpcEndpoint}`);
    this.solanaConnection = new Connection(rpcEndpoint, 'confirmed');
  }

  /**
   * Get the singleton instance of IntentSolver
   */
  public static getInstance(): IntentSolver {
    if (!IntentSolver.instance) {
      IntentSolver.instance = new IntentSolver();
    }
    return IntentSolver.instance;
  }

  /**
   * Process a payment intent through its state machine
   * @param intentId - UUID of the payment intent to process
   */
  public async processIntent(intentId: string): Promise<void> {
    try {
      // 1. Fetch intent from Supabase
      const { data: intent, error: fetchError } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('intent_id', intentId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch intent: ${fetchError.message}`);
      }

      if (!intent) {
        throw new Error(`Intent ${intentId} not found`);
      }

      const paymentIntent = intent as PaymentIntent;

      // 2. Process based on current status
      switch (paymentIntent.status) {
        case 'CREATED':
          await this.handleCreated(paymentIntent);
          break;

        case 'FUNDING_DETECTED':
          await this.handleFundingDetected(paymentIntent);
          break;

        case 'ROUTING':
          await this.handleRouting(paymentIntent);
          break;

        case 'SHIELDING':
          await this.handleShielding(paymentIntent);
          break;

        case 'SETTLED':
          console.log(`Intent ${intentId} is already settled`);
          return;

        case 'FAILED':
          console.log(`Intent ${intentId} has failed and cannot be processed`);
          return;

        default:
          throw new Error(`Unknown status: ${paymentIntent.status}`);
      }
    } catch (error) {
      console.error(`Error processing intent ${intentId}:`, error);
      await this.setIntentStatus(intentId, 'FAILED');
      throw error;
    }
  }

  /**
   * Handle CREATED status -> transition to FUNDING_DETECTED
   */
  private async handleCreated(intent: PaymentIntent): Promise<void> {
    console.log(`Processing intent ${intent.intent_id}: CREATED -> FUNDING_DETECTED`);
    
    // For SOL_WALLET, verify on-chain transaction instead of deducting database balance
    if (intent.input_method === 'SOL_WALLET') {
      // Check if transaction reference exists
      if (!intent.input_tx_ref) {
        const failureReason = 'Missing transaction reference';
        console.error(`Intent ${intent.intent_id} failed: ${failureReason}`);
        await this.setIntentStatus(intent.intent_id, 'FAILED', { failure_reason: failureReason });
        return;
      }

      // Verify on-chain transaction with retry logic
      // Solana transactions may take a few seconds to be fully confirmed and queryable
      const maxRetries = 5;
      const retryDelayMs = 2000; // 2 seconds between retries
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Attempting to verify transaction ${intent.input_tx_ref} (attempt ${attempt}/${maxRetries})`);
          const isValid = await this.verifySolanaTx(intent.input_tx_ref, intent.fiat_amount);
          
          if (isValid) {
            console.log(`Intent ${intent.intent_id}: On-chain verification successful`);
            // SOL already transferred on-chain, skip database balance deduction
            // Proceed directly to FUNDING_DETECTED
            await this.setIntentStatus(intent.intent_id, 'FUNDING_DETECTED');
            await this.processIntent(intent.intent_id);
            return;
          } else {
            // Transaction found but invalid - don't retry
            const failureReason = 'On-chain verification failed: Transaction not found or invalid';
            console.error(`Intent ${intent.intent_id} failed: ${failureReason}`);
            await this.setIntentStatus(intent.intent_id, 'FAILED', { failure_reason: failureReason });
            return;
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.warn(`Attempt ${attempt} failed to verify transaction: ${lastError.message}`);
          
          // If it's the last attempt, fail the intent
          if (attempt === maxRetries) {
            const failureReason = `Failed to verify transaction after ${maxRetries} attempts: ${lastError.message}`;
            console.error(`Intent ${intent.intent_id} failed: ${failureReason}`);
            await this.setIntentStatus(intent.intent_id, 'FAILED', { failure_reason: failureReason });
            return;
          }
          
          // Wait before retrying (exponential backoff)
          const delay = retryDelayMs * attempt;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // Should not reach here, but just in case
      const failureReason = `Failed to verify transaction: ${lastError?.message || 'Unknown error'}`;
      await this.setIntentStatus(intent.intent_id, 'FAILED', { failure_reason: failureReason });
      return;
    }
    
    // For USDC_BALANCE and other methods, check balance and deduct funds
    const balanceResult = await this.checkAndDeductBalance(intent);
    
    if (!balanceResult.success) {
      // Insufficient funds or error - fail the intent
      const failureReason = balanceResult.reason || 'Balance check failed';
      console.error(`Intent ${intent.intent_id} failed: ${failureReason}`);
      await this.setIntentStatus(intent.intent_id, 'FAILED', { failure_reason: failureReason });
      return; // Stop processing
    }
    
    // Balance deducted successfully - proceed to FUNDING_DETECTED
    await this.setIntentStatus(intent.intent_id, 'FUNDING_DETECTED');
    
    // Recursively process the next state
    await this.processIntent(intent.intent_id);
  }

  /**
   * Handle FUNDING_DETECTED status -> transition to ROUTING
   */
  private async handleFundingDetected(intent: PaymentIntent): Promise<void> {
    console.log(`Processing intent ${intent.intent_id}: FUNDING_DETECTED -> ROUTING`);
    
    // Execute swap operation (placeholder)
    await this.executeSwap(intent);
    
    // Update status to ROUTING
    await this.setIntentStatus(intent.intent_id, 'ROUTING');
    
    // Recursively process the next state
    await this.processIntent(intent.intent_id);
  }

  /**
   * Handle ROUTING status -> transition to SHIELDING
   */
  private async handleRouting(intent: PaymentIntent): Promise<void> {
    console.log(`Processing intent ${intent.intent_id}: ROUTING -> SHIELDING`);
    
    // Call MPC signing
    const signed = await signWithMPC(intent.intent_id);
    
    if (!signed) {
      throw new Error('MPC signing failed');
    }

    // Generate mock MPC signature
    const mockMpcSig = `mock_mpc_sig_${intent.intent_id}_${Date.now()}`;
    
    // Update status to SHIELDING and store MPC signature
    await this.setIntentStatus(intent.intent_id, 'SHIELDING', { mpc_sig: mockMpcSig });
    
    // Recursively process the next state
    await this.processIntent(intent.intent_id);
  }

  /**
   * Handle SHIELDING status -> transition to SETTLED
   * Simulates MPC delay by waiting before settling
   */
  private async handleShielding(intent: PaymentIntent): Promise<void> {
    console.log(`Processing intent ${intent.intent_id}: SHIELDING -> SETTLED`);
    
    // Simulate MPC delay - wait 3-5 seconds before settling
    // This gives users time to see the "Shielding..." status
    const delayMs = 3000 + Math.random() * 2000; // 3-5 seconds
    console.log(`Simulating MPC delay of ${delayMs.toFixed(0)}ms for intent ${intent.intent_id}`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    
    // Generate mock transaction hash
    const mockTxHash = `0x${Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;
    
    // Update status to SETTLED and store transaction hash
    await this.setIntentStatus(intent.intent_id, 'SETTLED', { tx_hash: mockTxHash });
    
    console.log(`Intent ${intent.intent_id} successfully settled with tx_hash: ${mockTxHash}`);
  }

  /**
   * Update intent status in Supabase
   */
  private async setIntentStatus(
    intentId: string,
    status: IntentStatus,
    additionalFields?: { tx_hash?: string; mpc_sig?: string; failure_reason?: string }
  ): Promise<void> {
    const updateData: {
      status: IntentStatus;
      tx_hash?: string;
      mpc_sig?: string;
      failure_reason?: string;
    } = {
      status,
      ...additionalFields,
    };

    const { error } = await supabase
      .from('payment_intents')
      .update(updateData)
      .eq('intent_id', intentId);

    if (error) {
      throw new Error(`Failed to update intent status: ${error.message}`);
    }
  }

  /**
   * Placeholder function to simulate swap operation
   * In production, this would interact with a DEX or swap service
   */
  private async executeSwap(intent: PaymentIntent): Promise<void> {
    console.log(`Executing swap for intent ${intent.intent_id}`);
    console.log(`Input method: ${intent.input_method}, Amount: ${intent.fiat_amount} ${intent.currency}`);
    
    // Simulate swap delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    console.log(`Swap completed for intent ${intent.intent_id}`);
  }

  /**
   * Find the parent wallet for a given family_id
   * @param familyId - The family ID to find the parent wallet for
   * @returns Wallet record with user_id, usdc_balance, sol_balance, or null if not found
   */
  private async findParentWallet(familyId: string): Promise<{
    user_id: string;
    usdc_balance: number;
    sol_balance: number;
  } | null> {
    try {
      // First, find the parent user for this family
      const { data: parentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('family_id', familyId)
        .eq('role', 'parent')
        .limit(1)
        .single();

      if (profileError || !parentProfile) {
        console.error(`Failed to find parent profile for family ${familyId}:`, profileError);
        return null;
      }

      // Then, get the wallet for that parent user
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('user_id, usdc_balance, sol_balance')
        .eq('user_id', parentProfile.id)
        .single();

      if (walletError || !wallet) {
        console.error(`Failed to find wallet for parent user ${parentProfile.id}:`, walletError);
        return null;
      }

      return {
        user_id: wallet.user_id,
        usdc_balance: Number(wallet.usdc_balance) || 0,
        sol_balance: Number(wallet.sol_balance) || 0,
      };
    } catch (error) {
      console.error(`Error finding parent wallet for family ${familyId}:`, error);
      return null;
    }
  }

  /**
   * Verify Solana transaction on-chain
   * @param txHash - Transaction signature/hash
   * @param expectedFiatAmount - Expected payment amount in IDR
   * @returns true if transaction is valid, false otherwise
   * @throws Error if there's a network/RPC error (to allow retry)
   */
  private async verifySolanaTx(txHash: string, expectedFiatAmount: number): Promise<boolean> {
    try {
      // Fetch the transaction with timeout handling
      let transaction;
      try {
        transaction = await Promise.race([
          this.solanaConnection.getParsedTransaction(txHash, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Transaction fetch timeout')), 10000)
          ),
        ]) as any;
      } catch (fetchError) {
        // Re-throw network errors to allow retry
        const error = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
        const errorMessage = error.message.toLowerCase();
        if (
          errorMessage.includes('fetch') ||
          errorMessage.includes('network') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('connection') ||
          errorMessage.includes('rpc') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('not available')
        ) {
          throw error; // Re-throw to allow retry
        }
        throw error; // Re-throw other errors too
      }

      // Check 1: Transaction existence
      if (!transaction) {
        // Transaction not found - might still be confirming, throw error to retry
        throw new Error(`Transaction ${txHash} not found on-chain (may still be confirming)`);
      }

      // Check 2 & 3: Verify recipient and amount
      const vaultPubkey = new PublicKey(IntentSolver.KIDDYGUARD_VAULT_PUBLIC_KEY);
      
      // Calculate expected lamports
      const expectedSolAmount = expectedFiatAmount / IntentSolver.SOL_TO_IDR_RATE;
      const expectedLamports = Math.floor(expectedSolAmount * LAMPORTS_PER_SOL);
      
      // Allow 1% slippage/rounding tolerance
      const tolerance = Math.floor(expectedLamports * 0.01);
      const minLamports = expectedLamports - tolerance;
      const maxLamports = expectedLamports + tolerance;

      // Parse transaction instructions to find transfer to vault
      const instructions = transaction.transaction.message.instructions;
      
      for (const instruction of instructions) {
        // Check if this is a transfer instruction
        if ('parsed' in instruction && instruction.parsed?.type === 'transfer') {
          const parsed = instruction.parsed;
          
          // Check if destination is the vault address
          if (parsed.info?.destination === IntentSolver.KIDDYGUARD_VAULT_PUBLIC_KEY) {
            const transferredLamports = parsed.info.lamports;
            
            // Verify amount is within tolerance
            if (transferredLamports >= minLamports && transferredLamports <= maxLamports) {
              console.log(
                `Transaction ${txHash} verified: ${transferredLamports} lamports transferred to vault ` +
                `(expected: ${expectedLamports} ± ${tolerance})`
              );
              return true;
            } else {
              console.error(
                `Transaction ${txHash} amount mismatch: expected ${expectedLamports} ± ${tolerance}, ` +
                `got ${transferredLamports}`
              );
              return false;
            }
          }
        }
        
        // Also check SystemProgram transfer (non-parsed instruction)
        if ('programId' in instruction) {
          const programId = instruction.programId.toString();
          if (programId === '11111111111111111111111111111111') {
            // System Program
            // For non-parsed instructions, check account keys
            const accountKeys = transaction.transaction.message.accountKeys;
            const instructionAccounts = instruction.accounts || [];
            
            // Find the destination account (usually the last account in a transfer)
            if (instructionAccounts.length >= 2) {
              const destIndex = instructionAccounts[instructionAccounts.length - 1];
              
              // Handle both array of PublicKey objects and array of objects with pubkey property
              let destPubkey: PublicKey | null = null;
              if (accountKeys[destIndex]) {
                const account = accountKeys[destIndex];
                if (account instanceof PublicKey) {
                  destPubkey = account;
                } else if (account && 'pubkey' in account) {
                  destPubkey = account.pubkey;
                }
              }
              
              if (destPubkey && destPubkey.toString() === IntentSolver.KIDDYGUARD_VAULT_PUBLIC_KEY) {
                // Check balance changes to get transferred amount
                const preBalances = transaction.meta?.preBalances || [];
                const postBalances = transaction.meta?.postBalances || [];
                
                if (preBalances.length > destIndex && postBalances.length > destIndex) {
                  const balanceChange = postBalances[destIndex] - preBalances[destIndex];
                  
                  if (balanceChange >= minLamports && balanceChange <= maxLamports) {
                    console.log(
                      `Transaction ${txHash} verified: ${balanceChange} lamports transferred to vault ` +
                      `(expected: ${expectedLamports} ± ${tolerance})`
                    );
                    return true;
                  } else {
                    console.error(
                      `Transaction ${txHash} amount mismatch: expected ${expectedLamports} ± ${tolerance}, ` +
                      `got ${balanceChange}`
                    );
                    return false;
                  }
                }
              }
            }
          }
        }
      }

      // Transaction found but no transfer to vault detected
      console.error(`Transaction ${txHash} does not contain transfer to vault address`);
      return false;
    } catch (error) {
      // Always re-throw errors to allow retry logic in handleCreated
      // The caller will decide whether to retry or fail based on error type
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unknown error verifying transaction: ${String(error)}`);
    }
  }

  /**
   * Check balance and deduct funds from the parent wallet
   * @param intent - The payment intent to process
   * @returns Object with success status and optional failure reason
   */
  private async checkAndDeductBalance(intent: PaymentIntent): Promise<{
    success: boolean;
    reason?: string;
  }> {
    try {
      // Calculate cost in USD
      const usdAmount = intent.fiat_amount / IntentSolver.IDR_TO_USD_RATE;

      // Calculate cost in the target cryptocurrency
      let costInCrypto: number;
      let balanceField: 'usdc_balance' | 'sol_balance';
      let currencyName: string;

      if (intent.input_method === 'USDC_BALANCE') {
        // USDC ≈ 1 USD, so cost is the USD amount
        costInCrypto = usdAmount / IntentSolver.USDC_PRICE_USD;
        balanceField = 'usdc_balance';
        currencyName = 'USDC';
      } else if (intent.input_method === 'SOL_WALLET') {
        // SOL price is $100 USD, so cost = USD amount / SOL price
        costInCrypto = usdAmount / IntentSolver.SOL_PRICE_USD;
        balanceField = 'sol_balance';
        currencyName = 'SOL';
      } else {
        return {
          success: false,
          reason: `Unsupported input method: ${intent.input_method}`,
        };
      }

      // Find the parent wallet
      const wallet = await this.findParentWallet(intent.family_id);
      if (!wallet) {
        return {
          success: false,
          reason: 'Parent wallet not found',
        };
      }

      // Check balance
      const currentBalance = balanceField === 'usdc_balance' 
        ? wallet.usdc_balance 
        : wallet.sol_balance;

      if (currentBalance < costInCrypto) {
        return {
          success: false,
          reason: `Insufficient ${currencyName} balance. Required: ${costInCrypto.toFixed(4)}, Available: ${currentBalance.toFixed(4)}`,
        };
      }

      // Deduct balance
      const newBalance = currentBalance - costInCrypto;
      const updateData: { [key: string]: number } = {};
      updateData[balanceField] = newBalance;

      const { error: updateError } = await supabase
        .from('wallets')
        .update(updateData)
        .eq('user_id', wallet.user_id);

      if (updateError) {
        console.error(`Failed to deduct balance:`, updateError);
        return {
          success: false,
          reason: `Failed to update wallet balance: ${updateError.message}`,
        };
      }

      console.log(`Deducted ${costInCrypto.toFixed(4)} ${currencyName} from wallet ${wallet.user_id}. New balance: ${newBalance.toFixed(4)}`);
      return { success: true };
    } catch (error) {
      console.error('Error in checkAndDeductBalance:', error);
      return {
        success: false,
        reason: error instanceof Error ? error.message : 'Unknown error during balance check',
      };
    }
  }
}
