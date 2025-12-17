'use server';

import { IntentSolver } from '@/lib/intents/IntentSolver';

/**
 * Server Action: Process a payment intent
 * This is called separately to ensure it completes on Vercel serverless
 */
export async function processPaymentIntent(intentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!intentId) {
      return {
        success: false,
        error: 'Intent ID is required',
      };
    }

    console.log(`[processIntent] Starting processing for intent: ${intentId}`);
    
    // Process the intent - this will handle all state transitions
    await IntentSolver.getInstance().processIntent(intentId);
    
    console.log(`[processIntent] Successfully processed intent: ${intentId}`);
    
    return {
      success: true,
    };
  } catch (error) {
    console.error(`[processIntent] Error processing intent ${intentId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

