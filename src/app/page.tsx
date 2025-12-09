'use client';

import { useState } from 'react';
import { useFamilyStore } from '@/store/useFamilyStore';
import { ChildDashboard } from '@/components/dashboard/ChildDashboard';
import { ParentDashboard } from '@/components/dashboard/ParentDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

async function fetchUserByUsername(username: string): Promise<User | null> {
  try {
    console.log('Fetching user with username:', username);
    
    // First, let's try to get all profiles to see what's actually in the database
    const { data: allProfiles, error: listError } = await supabase
      .from('profiles')
      .select('username, role');
    
    console.log('All profiles in database:', allProfiles);
    
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
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast.error(`User not found: ${username}. Check console for details.`);
      return null;
    }

    if (!data) {
      console.error('No data returned for username:', username);
      toast.error(`User not found: ${username}`);
      return null;
    }

    console.log('Found user:', data);

    // Map Supabase profile to User type
    // Note: User type has email field, but profiles table only has username
    // We'll use username for both name and email
    const user: User = {
      id: data.id,
      role: data.role,
      name: data.username,
      email: data.username, // Using username as email since profiles table doesn't have email
      familyId: data.family_id,
    };

    return user;
  } catch (error) {
    console.error('Error in fetchUserByUsername:', error);
    toast.error('Failed to fetch user');
    return null;
  }
}

export default function Home() {
  const { currentUser, setUser, fetchFamilyData } = useFamilyStore();
  const [isLoading, setIsLoading] = useState(false);

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

  // If user is logged in, show their dashboard
  if (currentUser) {
    if (currentUser.role === 'parent') {
      return <ParentDashboard />;
    } else {
      return <ChildDashboard />;
    }
  }

  // Role switcher for development
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">KiddyGuard</CardTitle>
          <CardDescription>Select a role to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleLoginAsParent}
            className="w-full h-20 text-lg"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Login as Parent'}
          </Button>
          <Button
            onClick={handleLoginAsChild}
            className="w-full h-20 text-lg"
            size="lg"
            variant="secondary"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Login as Child'}
          </Button>
          <p className="text-sm text-muted-foreground text-center mt-4">
            Development mode: Hardcoded login (username: "Daddy Cool" / "Timmy Turner")
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
