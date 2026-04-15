'use client';

import React, { createContext, useContext } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
  email: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider using NextAuth Session
 *
 * Simplified auth context that wraps NextAuth's useSession hook
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const logout = async () => {
    try {
      await signOut({ redirect: false });
      router.push('/login');
    } catch (error) {
      console.error('[AUTH] Logout error:', error);
      router.push('/login');
    }
  };

  const value: AuthContextType = {
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    username: session?.user?.name || null,
    email: session?.user?.email || null,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
