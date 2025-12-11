'use client';

import { useFamilyStore } from '@/store/useFamilyStore';
import { ChildDashboard } from '@/components/dashboard/ChildDashboard';
import { ParentDashboard } from '@/components/dashboard/ParentDashboard';
import { LoginScreen } from '@/components/auth/LoginScreen';

export default function Home() {
  const { currentUser } = useFamilyStore();

  // If user is logged in, show their dashboard
  if (currentUser) {
    if (currentUser.role === 'parent') {
      return <ParentDashboard />;
    } else {
      return <ChildDashboard />;
    }
  }

  // Show login screen if not logged in
  return <LoginScreen />;
}
