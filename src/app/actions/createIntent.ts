'use server';

import { supabase } from '@/lib/supabase';
import { IntentSolver } from '@/lib/intents/IntentSolver';
import { IntentInputMethod } from '@/types';
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
  txHash?: string
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
    const insertData = {
      family_id: familyId,
      clinic_id: clinicId,
      fiat_amount: fiatAmount,
      currency: 'IDR',
      input_method: inputMethod,
      status: 'CREATED' as const,
      input_tx_ref: txHash || null,
    };
    
    console.log(`Creating payment intent with data:`, {
      ...insertData,
      input_tx_ref: txHash ? `${txHash.substring(0, 8)}...` : null,
    });
    
    const { data: insertedIntent, error: insertError } = await supabase
      .from('payment_intents')
      .insert(insertData)
      .select('intent_id')
      .single();

    if (insertError) {
      console.error('Error inserting payment intent:', insertError);
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

    // Start processing the intent (non-blocking)
    // We don't await this to avoid blocking the response
    IntentSolver.getInstance()
      .processIntent(intentId)
      .catch((error) => {
        console.error(`Error processing intent ${intentId}:`, error);
        // Update intent status to FAILED if processing fails
        supabase
          .from('payment_intents')
          .update({
            status: 'FAILED',
            failure_reason: error instanceof Error ? error.message : 'Unknown error during processing',
          })
          .eq('intent_id', intentId)
          .then(({ error: updateError }) => {
            if (updateError) {
              console.error(`Failed to update intent ${intentId} status to FAILED:`, updateError);
            }
          });
      });

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
