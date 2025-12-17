'use server';

import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/supabase-server';
import { IntentSolver } from '@/lib/intents/IntentSolver';
import { IntentInputMethod, IntentStatus } from '@/types';
import { revalidatePath } from 'next/cache';

export interface CreateIntentResult {
  success: boolean;
  intentId?: string;
  error?: string;
}

/**
 * Server Action to create a payment intent and start processing
 */
export async function createPaymentIntent(
  userId: string,
  familyId: string,
  clinicId: string,
  fiatAmount: number,
  inputMethod: IntentInputMethod,
  txHash?: string,
  screeningId?: string
): Promise<CreateIntentResult> {
  try {
    // Validate inputs
    if (!userId || !familyId || !clinicId) {
      return {
        success: false,
        error: 'Missing required parameters',
      };
    }

    if (fiatAmount <= 0) {
      return {
        success: false,
        error: 'Amount must be greater than 0',
      };
    }

    if (!['USDC_BALANCE', 'SOL_WALLET', 'FIAT_GATEWAY'].includes(inputMethod)) {
      return {
        success: false,
        error: 'Invalid input method',
      };
    }

    // Validate transaction hash format for SOL_WALLET
    if (inputMethod === 'SOL_WALLET' && txHash) {
      // Solana transaction signatures are base58 encoded strings, typically 88 characters
      if (typeof txHash !== 'string' || txHash.length < 64 || txHash.length > 128) {
        console.warn(`Invalid transaction hash format: ${txHash?.substring(0, 20)}...`);
        // Don't fail - just log warning, might still be valid
      }
    }

    // Insert new payment intent
    // CRITICAL: screening_id column does NOT exist in payment_intents table
    // Create insert object with ONLY the fields that exist in the schema
    const insertData: Record<string, any> = {};
    insertData.user_id = userId; // Required for RLS policy: auth.uid() = user_id
    insertData.family_id = familyId;
    insertData.clinic_id = clinicId;
    insertData.fiat_amount = fiatAmount;
    insertData.currency = 'IDR';
    insertData.input_method = inputMethod;
    insertData.status = 'CREATED';
    
    // Set network based on input method
    // USDC_BALANCE and SOL_WALLET use Solana network
    // FIAT_GATEWAY might use a different network (set to 'fiat' or 'none')
    if (inputMethod === 'USDC_BALANCE' || inputMethod === 'SOL_WALLET') {
      insertData.network = 'solana-devnet'; // Using devnet for development
    } else if (inputMethod === 'FIAT_GATEWAY') {
      insertData.network = 'fiat'; // Fiat gateway doesn't use blockchain
    } else {
      insertData.network = 'solana-devnet'; // Default to Solana devnet
    }
    
    if (txHash) {
      insertData.input_tx_ref = txHash;
    } else {
      insertData.input_tx_ref = null;
    }
    
    // EXPLICITLY ensure screening_id is NOT included
    // Even if it was somehow set, remove it
    delete insertData.screening_id;
    
    // Log screening_id for reference (but don't insert - column doesn't exist)
    if (screeningId) {
      console.log(`[payment-intent] Context: screening review for ${screeningId} (NOT inserted)`);
    }
    
    console.log(`[payment-intent] Creating payment intent`);
    console.log(`[payment-intent] Input method:`, inputMethod);
    console.log(`[payment-intent] Network value:`, insertData.network);
    console.log(`[payment-intent] Insert data keys:`, Object.keys(insertData));
    console.log(`[payment-intent] Insert data (full):`, JSON.stringify(insertData, null, 2));
    console.log(`[payment-intent] Has network key:`, 'network' in insertData);
    console.log(`[payment-intent] Network value type:`, typeof insertData.network);
    console.log(`[payment-intent] Has screening_id key:`, 'screening_id' in insertData);
    console.log(`[payment-intent] Screening context (NOT in insert):`, screeningId || 'N/A');
    
    console.log("[payment-intent] Initializing Admin Client...");

    // Validate environment variables before creating client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      console.error('[payment-intent] ERROR: NEXT_PUBLIC_SUPABASE_URL is not set!');
      return {
        success: false,
        error: 'Server configuration error: Supabase URL not configured',
      };
    }

    if (!serviceRoleKey) {
      console.error('[payment-intent] ERROR: SUPABASE_SERVICE_ROLE_KEY is not set!');
      console.error('[payment-intent] This is required to bypass RLS policies');
      return {
        success: false,
        error: 'Server configuration error: Service role key not configured. Please set SUPABASE_SERVICE_ROLE_KEY environment variable.',
      };
    }

    console.log('[payment-intent] Environment check passed:');
    console.log('[payment-intent] - Supabase URL:', supabaseUrl.substring(0, 30) + '...');
    console.log('[payment-intent] - Service role key length:', serviceRoleKey.length);

    // FORCE-CREATE ADMIN CLIENT (Bypasses ALL RLS)
    // We create this locally to guarantee it uses the Service Role Key
    // CRITICAL: Use service role key with global option to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      },
    });

    // Verify admin client can bypass RLS by testing a simple query first
    console.log('[payment-intent] Verifying admin client can access database...');
    console.log('[payment-intent] Service role key starts with:', serviceRoleKey.substring(0, 20) + '...');
    console.log('[payment-intent] Service role key ends with:', '...' + serviceRoleKey.substring(serviceRoleKey.length - 20));
    
    const { data: testData, error: testError } = await supabaseAdmin
      .from('payment_intents')
      .select('intent_id')
      .limit(1);
    
    if (testError) {
      console.error('[payment-intent] Test query error:', testError);
      if (testError.code === '42501') {
        console.error('[payment-intent] CRITICAL: Admin client is being blocked by RLS!');
        console.error('[payment-intent] This means the service role key is not working correctly.');
        console.error('[payment-intent] Error:', testError.message);
        console.error('[payment-intent] Possible causes:');
        console.error('[payment-intent] 1. Service role key is incorrect');
        console.error('[payment-intent] 2. RLS policies are too restrictive');
        console.error('[payment-intent] 3. Need to run fix-payment-intents-rls.sql in Supabase SQL Editor');
        return {
          success: false,
          error: 'Server configuration error: Service role key is not bypassing RLS. Please verify SUPABASE_SERVICE_ROLE_KEY is correct and run fix-payment-intents-rls.sql in Supabase SQL Editor.',
        };
      }
      // Non-RLS errors are OK for test query
      console.log('[payment-intent] Test query had non-RLS error (this is OK):', testError.message);
    } else {
      console.log('[payment-intent] Admin client verified successfully - can access database');
    }

    // Perform Insert using the Admin Client
    console.log('[payment-intent] Admin client verified. Performing insert...');
    
    // Force the network field to be present in the payload
    // This ensures it's not stripped out by type checking or Supabase client
    const payload = {
      ...insertData,
      // Ensure network is set. Default to 'solana-devnet' if missing.
      network: insertData.network || 'solana-devnet'
    };
    
    console.log('[payment-intent] DEBUG: Submitting Payload:', JSON.stringify(payload, null, 2));
    console.log('[payment-intent] DEBUG: Network in payload:', payload.network);
    console.log('[payment-intent] DEBUG: Network type:', typeof payload.network);
    
    const { data: insertedIntent, error: insertError } = await supabaseAdmin
      .from('payment_intents')
      .insert(payload)
      .select('intent_id')
      .single();

    if (insertError) {
      console.error('[payment-intent] ========== INSERT ERROR ==========');
      console.error('[payment-intent] Error inserting payment intent:', JSON.stringify(insertError, null, 2));
      console.error('[payment-intent] Error code:', insertError.code);
      console.error('[payment-intent] Error message:', insertError.message);
      console.error('[payment-intent] Error details:', insertError.details);
      console.error('[payment-intent] Error hint:', insertError.hint);
      console.error('[payment-intent] Insert data (for debugging):', JSON.stringify(insertData, null, 2));
      console.error('[payment-intent] Service role key length:', serviceRoleKey?.length || 0);
      console.error('[payment-intent] Supabase URL:', supabaseUrl?.substring(0, 40) + '...');
      console.error('[payment-intent] insertData keys:', Object.keys(insertData));
      console.error('[payment-intent] insertData values:', Object.values(insertData));
      
      // Check if error is about RLS
      if (insertError.code === '42501' || insertError.message?.includes('row-level security')) {
        console.error('[payment-intent] ========== RLS POLICY VIOLATION ==========');
        console.error('[payment-intent] The service role key should bypass RLS, but it is not.');
        console.error('[payment-intent] ========== ACTION REQUIRED ==========');
        console.error('[payment-intent] You MUST run the SQL script to fix RLS policies:');
        console.error('[payment-intent] 1. Open Supabase Dashboard → SQL Editor');
        console.error('[payment-intent] 2. Run the script from: fix-payment-intents-rls.sql');
        console.error('[payment-intent] 3. Or see: APPLY_RLS_FIX.md for instructions');
        console.error('[payment-intent] 4. Restart your dev server after running the script');
        return {
          success: false,
          error: `RLS Policy Violation: ${insertError.message}. Please run the SQL script in Supabase SQL Editor (see APPLY_RLS_FIX.md) and restart your dev server.`,
        };
      }
      
      // Check if error is about screening_id column - this suggests schema cache issue
      if (insertError.message?.includes('screening_id')) {
        console.error('[payment-intent] ERROR: Supabase schema cache may be stale!');
        console.error('[payment-intent] insertData does NOT contain screening_id:', !('screening_id' in insertData));
        console.error('[payment-intent] Try refreshing Supabase schema cache or wait a few minutes');
      }
      
      return {
        success: false,
        error: `Failed to create payment intent: ${insertError.message}`,
      };
    }

    if (!insertedIntent || !insertedIntent.intent_id) {
      return {
        success: false,
        error: 'Failed to create payment intent: No intent ID returned',
      };
    }

    const intentId = insertedIntent.intent_id;

    // Note: Processing is now handled by the client calling processPaymentIntent()
    // This ensures it works correctly on Vercel serverless functions
    // The client will call processPaymentIntent() after receiving the intentId

    // Revalidate the path to update UI
    revalidatePath('/');

    return {
      success: true,
      intentId,
    };
  } catch (error) {
    console.error('Unexpected error in createPaymentIntent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export interface GetPaymentIntentStatusResult {
  success: boolean;
  status?: IntentStatus;
  failureReason?: string | null;
  error?: string;
}

/**
 * Server Action: Get payment intent status
 * Uses admin client to bypass RLS policies
 */
export async function getPaymentIntentStatus(intentId: string): Promise<GetPaymentIntentStatusResult> {
  try {
    if (!intentId) {
      return {
        success: false,
        error: 'Intent ID is required',
      };
    }

    // FORCE-CREATE ADMIN CLIENT (Bypasses ALL RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Try to select failure_reason, but handle gracefully if column doesn't exist
    const { data, error } = await supabaseAdmin
      .from('payment_intents')
      .select('status, failure_reason')
      .eq('intent_id', intentId)
      .single();

    if (error) {
      // If error is about missing column, retry without it
      if (error.code === '42703' && error.message?.includes('failure_reason')) {
        console.warn('[payment-intent] failure_reason column does not exist, querying without it');
        console.warn('[payment-intent] Please run add_failure_reason_to_payment_intents.sql in Supabase SQL Editor');
        
        const { data: dataWithoutFailure, error: errorWithoutFailure } = await supabaseAdmin
          .from('payment_intents')
          .select('status')
          .eq('intent_id', intentId)
          .single();

        if (errorWithoutFailure) {
          console.error('[payment-intent] error fetching status:', errorWithoutFailure);
          return {
            success: false,
            error: `Failed to fetch payment intent status: ${errorWithoutFailure.message}`,
          };
        }

        return {
          success: true,
          status: dataWithoutFailure.status as IntentStatus,
          failureReason: null, // Column doesn't exist
        };
      }

      console.error('[payment-intent] error fetching status:', error);
      return {
        success: false,
        error: `Failed to fetch payment intent status: ${error.message}`,
      };
    }

    return {
      success: true,
      status: data.status as IntentStatus,
      failureReason: data.failure_reason,
    };
  } catch (error) {
    console.error('[payment-intent] unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
