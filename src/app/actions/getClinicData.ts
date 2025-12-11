'use server';

import { supabase } from '@/lib/supabase';

const MOCK_CLINIC_ID = '00000000-0000-0000-0000-000000000001';

export interface ClinicReceipt {
  payment_date: string;
  amount: number;
  asset: string;
  status: string;
  memo: string;
}

/**
 * Server Action to fetch clinic receipts using RPC function
 * This bypasses RLS policies to allow clinic view
 */
export async function getClinicReceipts(): Promise<{
  success: boolean;
  data?: ClinicReceipt[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('get_clinic_receipts', {
      target_clinic_id: MOCK_CLINIC_ID,
    });

    if (error) {
      console.error('Error fetching clinic receipts:', error);
      return {
        success: false,
        error: `Failed to fetch clinic receipts: ${error.message}`,
      };
    }

    // Transform the data to match our interface
    const receipts: ClinicReceipt[] = (data || []).map((receipt: any) => ({
      payment_date: receipt.payment_date,
      amount: Number(receipt.amount),
      asset: receipt.asset || 'ZEC',
      status: receipt.status,
      memo: receipt.memo || 'Medical Service',
    }));

    return {
      success: true,
      data: receipts,
    };
  } catch (error) {
    console.error('Unexpected error in getClinicReceipts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
