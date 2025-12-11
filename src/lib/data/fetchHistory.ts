import { supabase } from '@/lib/supabase';
import { UnifiedTransaction } from '@/types';

/**
 * Fetches unified transaction history for a given family
 * @param familyId - The family ID to fetch transactions for
 * @returns Array of unified transactions sorted by created_at DESC
 */
export async function getUnifiedHistory(familyId: string): Promise<UnifiedTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('unified_transactions')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching unified transaction history:', error);
      throw error;
    }

    return (data || []) as UnifiedTransaction[];
  } catch (error) {
    console.error('Failed to fetch unified transaction history:', error);
    return [];
  }
}
