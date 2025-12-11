'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export interface TopUpWalletResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action to top up wallet balance for testing/development
 */
export async function topUpWallet(
  userId: string,
  amount: number,
  asset: 'USDC' | 'SOL'
): Promise<TopUpWalletResult> {
  try {
    // Validate inputs
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
      };
    }

    if (amount <= 0) {
      return {
        success: false,
        error: 'Amount must be greater than 0',
      };
    }

    if (!['USDC', 'SOL'].includes(asset)) {
      return {
        success: false,
        error: 'Asset must be either USDC or SOL',
      };
    }

    // Determine which column to update
    const columnName = asset === 'USDC' ? 'usdc_balance' : 'sol_balance';

    // First, check if wallet exists
    const { data: existingWallet, error: fetchError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" - we'll handle that below
      console.error('Error fetching wallet:', fetchError);
      return {
        success: false,
        error: `Failed to fetch wallet: ${fetchError.message}`,
      };
    }

    if (!existingWallet) {
      // Wallet doesn't exist, create it with the top-up amount
      const { error: insertError } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          usdc_balance: asset === 'USDC' ? amount : 0,
          sol_balance: asset === 'SOL' ? amount : 0,
          zenzec_balance: 0,
        });

      if (insertError) {
        console.error('Error creating wallet:', insertError);
        return {
          success: false,
          error: `Failed to create wallet: ${insertError.message}`,
        };
      }
    } else {
      // Wallet exists, increment the balance
      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          [columnName]: (Number(existingWallet[columnName]) || 0) + amount,
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating wallet:', updateError);
        return {
          success: false,
          error: `Failed to update wallet: ${updateError.message}`,
        };
      }
    }

    // Revalidate the dashboard path to refresh UI
    revalidatePath('/');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Unexpected error in topUpWallet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
