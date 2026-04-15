'use client';

import { useRouter } from 'next/navigation';

// Helper to get auth from storage (try localStorage first, then sessionStorage)
const getAuthFromStorage = () => {
  if (typeof globalThis.window === 'undefined') return null;

  // Try localStorage first
  let auth = globalThis.localStorage.getItem('auth');
  if (auth) return auth;

  // Fallback to sessionStorage (more reliable on iOS PWA)
  auth = globalThis.sessionStorage.getItem('auth');
  return auth;
};

// Helper to set auth in both storages for redundancy
const setAuthInStorage = (value: string) => {
  if (typeof globalThis.window === 'undefined') return;

  try {
    globalThis.localStorage.setItem('auth', value);
    globalThis.sessionStorage.setItem('auth', value);
  } catch {
    // If localStorage fails (quota/privacy mode), at least use sessionStorage
    globalThis.sessionStorage.setItem('auth', value);
  }
};

// Helper to remove auth from both storages
const removeAuthFromStorage = () => {
  if (typeof globalThis.window === 'undefined') return;

  globalThis.localStorage.removeItem('auth');
  globalThis.sessionStorage.removeItem('auth');
};

export function useAuth() {
  const router = useRouter();

  const isAuthenticated = () => {
    if (typeof window === 'undefined') return false;
    return !!getAuthFromStorage();
  };

  const logout = () => {
    removeAuthFromStorage();
    router.push('/login');
  };

  const getUsername = () => {
    if (typeof globalThis.window === 'undefined') return null;
    const auth = getAuthFromStorage();
    if (!auth) return null;
    try {
      const decoded = globalThis.atob(auth);
      return decoded.split(':')[0];
    } catch {
      return null;
    }
  };

  // Export helper for login page to use
  const setAuth = (credentials: string) => {
    setAuthInStorage(credentials);
  };

  return { isAuthenticated, logout, getUsername, setAuth };
}
