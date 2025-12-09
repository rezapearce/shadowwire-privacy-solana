import { create } from 'zustand';
import { User, Transaction, WalletState } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface FamilyStore {
  currentUser: User | null;
  wallet: WalletState;
  transactions: Transaction[];
  
  setUser: (user: User) => void;
  fetchFamilyData: (userId: string) => Promise<void>;
  requestTransaction: (amount: number, description: string) => Promise<void>;
  approveTransaction: (id: string) => Promise<void>;
  rejectTransaction: (id: string) => Promise<void>;
  shieldAssets: (amount: number) => Promise<void>;
}

export const useFamilyStore = create<FamilyStore>((set, get) => ({
  currentUser: null,
  wallet: {
    sol: 0,
    usdc: 0,
    zenzec: 0,
  },
  transactions: [],

  setUser: (user: User) => {
    set({ currentUser: user });
  },

  fetchFamilyData: async (userId: string) => {
    try {
      const { currentUser } = get();
      if (!currentUser) {
        console.error('No current user');
        return;
      }

      const familyId = currentUser.familyId;

      // Fetch wallet data by user_id
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (walletError && walletError.code !== 'PGRST116') {
        // PGRST116 is "not found" - we'll handle that by using defaults
        console.error('Error fetching wallet:', walletError);
        toast.error('Failed to load wallet data');
      }

      // Fetch transactions by family_id
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
        toast.error('Failed to load transactions');
      }

      // Update wallet state with correct column names
      if (walletData) {
        set({
          wallet: {
            sol: Number(walletData.sol_balance) || 0,
            usdc: Number(walletData.usdc_balance) || 0,
            zenzec: Number(walletData.zenzec_balance) || 0,
          },
        });
      }

      // Update transactions state
      if (transactionsData) {
        const mappedTransactions: Transaction[] = transactionsData.map((tx) => ({
          id: tx.id,
          amount: Number(tx.amount),
          status: tx.status,
          type: tx.type,
          description: tx.description,
          date: tx.created_at || new Date().toISOString(),
          requester_id: tx.requester_id,
          created_at: tx.created_at,
        }));
        set({ transactions: mappedTransactions });
      }
    } catch (error) {
      console.error('Error in fetchFamilyData:', error);
      toast.error('Failed to fetch family data');
    }
  },

  requestTransaction: async (amount: number, description: string) => {
    try {
      const { currentUser } = get();
      if (!currentUser) {
        toast.error('You must be logged in to create a transaction');
        return;
      }

      const status = amount < 20 ? 'approved' : 'pending';
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          amount,
          status,
          type: 'public',
          description,
          requester_id: currentUser.id,
          family_id: currentUser.familyId,
          created_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating transaction:', error);
        toast.error('Failed to create transaction');
        return;
      }

      // Add the new transaction to the local state
      const newTransaction: Transaction = {
        id: data.id,
        amount: data.amount,
        status: data.status,
        type: data.type,
        description: data.description,
        date: data.created_at || data.date || now,
      };

      set((state) => ({
        transactions: [newTransaction, ...state.transactions],
      }));

      if (status === 'pending') {
        toast.info('Transaction created. Waiting for parent approval.');
      } else {
        toast.success('Transaction approved!');
      }
    } catch (error) {
      console.error('Error in requestTransaction:', error);
      toast.error('Failed to create transaction');
    }
  },

  approveTransaction: async (id: string) => {
    try {
      const { currentUser } = get();
      
      // Only parents can approve transactions
      if (currentUser?.role !== 'parent') {
        console.warn('Only parents can approve transactions');
        toast.error('Only parents can approve transactions');
        return;
      }

      // Call the RPC function to atomically approve transaction and update wallet
      const { data, error } = await supabase.rpc('approve_transaction_rpc', {
        target_tx_id: id,
        approver_profile_id: currentUser.id,
      });

      if (error) {
        console.error('Error approving transaction:', error);
        toast.error('Failed to approve transaction');
        return;
      }

      // Check RPC response
      if (!data || !data.success) {
        const errorMessage = data?.error || 'Failed to approve transaction';
        console.error('RPC error:', errorMessage);
        toast.error(`Approval Failed: ${errorMessage}`);
        return;
      }

      // Refresh family data to get updated wallet balances and transactions
      await get().fetchFamilyData(currentUser.id);

      toast.success('Transaction Approved & Balance Updated');
    } catch (error) {
      console.error('Error in approveTransaction:', error);
      toast.error('Failed to approve transaction');
    }
  },

  rejectTransaction: async (id: string) => {
    try {
      const { currentUser } = get();
      
      // Only parents can reject transactions
      if (currentUser?.role !== 'parent') {
        console.warn('Only parents can reject transactions');
        toast.error('Only parents can reject transactions');
        return;
      }

      const { error } = await supabase
        .from('transactions')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) {
        console.error('Error rejecting transaction:', error);
        toast.error('Failed to reject transaction');
        return;
      }

      // Update local state
      set((state) => ({
        transactions: state.transactions.map((tx) =>
          tx.id === id ? { ...tx, status: 'rejected' as const } : tx
        ),
      }));

      toast.info('Transaction rejected');
    } catch (error) {
      console.error('Error in rejectTransaction:', error);
      toast.error('Failed to reject transaction');
    }
  },

  shieldAssets: async (amount: number) => {
    try {
      const { currentUser } = get();
      if (!currentUser) {
        toast.error('You must be logged in to shield assets');
        return;
      }

      // Call the RPC function to swap USDC to zenZEC
      const { data, error } = await supabase.rpc('shield_assets_rpc', {
        user_profile_id: currentUser.id,
        amount,
      });

      if (error) {
        console.error('Error shielding assets:', error);
        toast.error('Failed to shield assets');
        return;
      }

      // Check RPC response
      if (!data || !data.success) {
        const errorMessage = data?.error || 'Failed to shield assets';
        console.error('RPC error:', errorMessage);
        toast.error(`Shield Failed: ${errorMessage}`);
        return;
      }

      // Refresh family data to get updated wallet balances
      await get().fetchFamilyData(currentUser.id);

      toast.success('Assets Shielded Successfully');
    } catch (error) {
      console.error('Error in shieldAssets:', error);
      toast.error('Failed to shield assets');
    }
  },
}));

