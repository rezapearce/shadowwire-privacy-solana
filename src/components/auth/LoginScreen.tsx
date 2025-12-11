'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useFamilyStore } from '@/store/useFamilyStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { User, UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

async function fetchUserByUsername(username: string): Promise<User | null> {
  try {
    console.log('Fetching user with username:', username);
    
    // Try exact match first
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    // If exact match fails, try case-insensitive (PostgreSQL ilike)
    if (error && error.code === 'PGRST116') {
      console.log('Exact match failed, trying case-insensitive...');
      const { data: caseInsensitiveData, error: caseInsensitiveError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', username)
        .single();
      
      if (!caseInsensitiveError && caseInsensitiveData) {
        data = caseInsensitiveData;
        error = null;
      } else {
        error = caseInsensitiveError;
      }
    }

    if (error) {
      console.error('Error fetching user:', error);
      toast.error(`User not found: ${username}`);
      return null;
    }

    if (!data) {
      console.error('No data returned for username:', username);
      toast.error(`User not found: ${username}`);
      return null;
    }

    console.log('Found user:', data);

    // Map Supabase profile to User type
    const user: User = {
      id: data.id,
      role: data.role,
      name: data.username,
      email: data.username,
      familyId: data.family_id,
      walletAddress: data.wallet_address,
    };

    return user;
  } catch (error) {
    console.error('Error in fetchUserByUsername:', error);
    toast.error('Failed to fetch user');
    return null;
  }
}

async function fetchUserByWalletAddress(walletAddress: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - this is expected for new users
        return null;
      }
      console.error('Error fetching user by wallet address:', error);
      toast.error('Failed to fetch user profile');
      return null;
    }

    if (!data) {
      return null;
    }

    // Map Supabase profile to User type
    const user: User = {
      id: data.id,
      role: data.role,
      name: data.username,
      email: data.username,
      familyId: data.family_id,
      walletAddress: data.wallet_address,
    };

    return user;
  } catch (error) {
    console.error('Error in fetchUserByWalletAddress:', error);
    toast.error('Failed to fetch user profile');
    return null;
  }
}

async function createUserProfile(
  walletAddress: string,
  username: string,
  role: UserRole
): Promise<User | null> {
  try {
    // Generate new family_id
    const familyId = crypto.randomUUID();

    // Insert profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        wallet_address: walletAddress,
        username: username,
        role: role,
        family_id: familyId,
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      toast.error('Failed to create profile');
      return null;
    }

    if (!profileData) {
      toast.error('Failed to create profile');
      return null;
    }

    // Insert initial wallet with sign-up bonus
    const { error: walletError } = await supabase
      .from('wallets')
      .insert({
        user_id: profileData.id,
        sol_balance: 0.1,
        usdc_balance: 10,
        zenzec_balance: 0,
      });

    if (walletError) {
      console.error('Error creating wallet:', walletError);
      toast.error('Failed to create wallet');
      // Continue anyway - profile was created
    }

    // Map to User type
    const user: User = {
      id: profileData.id,
      role: profileData.role,
      name: profileData.username,
      email: profileData.username,
      familyId: profileData.family_id,
      walletAddress: profileData.wallet_address,
    };

    toast.success('Account created successfully!');
    return user;
  } catch (error) {
    console.error('Error in createUserProfile:', error);
    toast.error('Failed to create account');
    return null;
  }
}

export function LoginScreen() {
  const { publicKey } = useWallet();
  const { currentUser, setUser, fetchFamilyData } = useFamilyStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpRole, setSignUpRole] = useState<UserRole>('parent');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted before rendering wallet button
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Watch for wallet connection
  useEffect(() => {
    const checkProfile = async () => {
      if (!publicKey) {
        setShowSignUp(false);
        return;
      }

      const walletAddress = publicKey.toBase58();
      setIsCheckingProfile(true);

      try {
        const user = await fetchUserByWalletAddress(walletAddress);
        
        if (user) {
          // Profile found - log them in
          setUser(user);
          await fetchFamilyData(user.id);
          toast.success('Logged in successfully');
        } else {
          // No profile found - show sign-up form
          setShowSignUp(true);
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        toast.error('Failed to check profile');
      } finally {
        setIsCheckingProfile(false);
      }
    };

    checkProfile();
  }, [publicKey, setUser, fetchFamilyData]);

  const handleLoginAsParent = async () => {
    setIsLoading(true);
    try {
      const user = await fetchUserByUsername('Daddy Cool');
      if (user) {
        setUser(user);
        await fetchFamilyData(user.id);
        toast.success('Logged in as parent');
      }
    } catch (error) {
      console.error('Error logging in as parent:', error);
      toast.error('Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginAsChild = async () => {
    setIsLoading(true);
    try {
      const user = await fetchUserByUsername('Timmy Turner');
      if (user) {
        setUser(user);
        await fetchFamilyData(user.id);
        toast.success('Logged in as child');
      }
    } catch (error) {
      console.error('Error logging in as child:', error);
      toast.error('Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!publicKey) {
      toast.error('Wallet not connected');
      return;
    }

    if (!signUpUsername.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setIsCreatingAccount(true);
    try {
      const walletAddress = publicKey.toBase58();
      const user = await createUserProfile(walletAddress, signUpUsername.trim(), signUpRole);
      
      if (user) {
        setUser(user);
        await fetchFamilyData(user.id);
        setShowSignUp(false);
        setSignUpUsername('');
        toast.success('Welcome to KiddyGuard!');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error('Failed to create account');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">KiddyGuard</CardTitle>
            <CardDescription>
              {publicKey ? 'Wallet connected' : 'Connect your wallet to get started'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center wallet-adapter-button-wrapper">
              {isMounted ? (
                <WalletMultiButton className="wallet-adapter-button-purple" />
              ) : (
                <div className="h-10 w-48 bg-purple-600 rounded-md animate-pulse" />
              )}
            </div>
            
            {isCheckingProfile && (
              <p className="text-sm text-muted-foreground text-center">
                Checking profile...
              </p>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Dev Mode
                </span>
              </div>
            </div>

            <Button
              onClick={handleLoginAsParent}
              className="w-full h-20 text-lg"
              size="lg"
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? 'Loading...' : 'Login as Parent (Demo)'}
            </Button>
            <Button
              onClick={handleLoginAsChild}
              className="w-full h-20 text-lg"
              size="lg"
              variant="outline"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Login as Child (Demo)'}
            </Button>
            <p className="text-sm text-muted-foreground text-center mt-4">
              Development mode: Hardcoded login (username: "Daddy Cool" / "Timmy Turner")
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sign-Up Dialog */}
      <Dialog open={showSignUp} onOpenChange={setShowSignUp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Your Account</DialogTitle>
            <DialogDescription>
              Complete your profile to get started with KiddyGuard
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={signUpUsername}
                onChange={(e) => setSignUpUsername(e.target.value)}
                disabled={isCreatingAccount}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={signUpRole === 'parent' ? 'default' : 'outline'}
                  onClick={() => setSignUpRole('parent')}
                  disabled={isCreatingAccount}
                  className="flex-1"
                >
                  Parent
                </Button>
                <Button
                  type="button"
                  variant={signUpRole === 'child' ? 'default' : 'outline'}
                  onClick={() => setSignUpRole('child')}
                  disabled={isCreatingAccount}
                  className="flex-1"
                >
                  Child
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSignUp}
              disabled={isCreatingAccount || !signUpUsername.trim()}
            >
              {isCreatingAccount ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

