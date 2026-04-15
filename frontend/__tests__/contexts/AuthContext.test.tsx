import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuthContext } from '@/contexts/AuthContext';

const mockUseSession = useSession as jest.Mock;
const mockSignOut = signOut as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;

describe('AuthContext', () => {
  const push = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push,
      replace: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      refresh: jest.fn(),
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('exposes authenticated values from session', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { name: 'Alice', email: 'alice@example.com' },
        expires: '2099-01-01',
      },
      status: 'authenticated',
    });

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.username).toBe('Alice');
    expect(result.current.email).toBe('alice@example.com');
  });

  it('returns isLoading=true while session is loading', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'loading' });

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.username).toBeNull();
    expect(result.current.email).toBeNull();
  });

  it('returns isAuthenticated=false when unauthenticated', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.username).toBeNull();
    expect(result.current.email).toBeNull();
  });

  it('logout calls signOut without redirect and pushes to /login', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: 'Bob', email: 'b@x.com' } },
      status: 'authenticated',
    });
    mockSignOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
    expect(push).toHaveBeenCalledWith('/login');
  });

  it('logout still redirects to /login when signOut throws', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: 'Bob', email: 'b@x.com' } },
      status: 'authenticated',
    });
    mockSignOut.mockRejectedValue(new Error('signOut failed'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    await waitFor(() => expect(push).toHaveBeenCalledWith('/login'));
  });

  it('throws when useAuthContext is used outside an AuthProvider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useAuthContext())).toThrow(
      'useAuthContext must be used within an AuthProvider'
    );
  });
});
