import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    pushMock.mockClear();
  });

  it('isAuthenticated returns false when no credentials stored', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated()).toBe(false);
  });

  it('isAuthenticated returns true when auth exists in localStorage', () => {
    localStorage.setItem('auth', 'dGVzdDpwYXNz');
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated()).toBe(true);
  });

  it('isAuthenticated falls back to sessionStorage when localStorage is empty', () => {
    sessionStorage.setItem('auth', 'dGVzdDpwYXNz');
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated()).toBe(true);
  });

  it('setAuth stores credentials in both localStorage and sessionStorage', () => {
    const { result } = renderHook(() => useAuth());
    act(() => {
      result.current.setAuth('dGVzdDpwYXNz');
    });
    expect(localStorage.getItem('auth')).toBe('dGVzdDpwYXNz');
    expect(sessionStorage.getItem('auth')).toBe('dGVzdDpwYXNz');
  });

  it('getUsername decodes base64 credentials and returns username', () => {
    // btoa('alice:secret') = 'YWxpY2U6c2VjcmV0'
    localStorage.setItem('auth', 'YWxpY2U6c2VjcmV0');
    const { result } = renderHook(() => useAuth());
    expect(result.current.getUsername()).toBe('alice');
  });

  it('getUsername returns null when no credentials stored', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.getUsername()).toBeNull();
  });

  it('getUsername returns null for malformed credentials', () => {
    localStorage.setItem('auth', '!!!not-base64!!!');
    const { result } = renderHook(() => useAuth());
    expect(result.current.getUsername()).toBeNull();
  });

  it('logout clears storage and redirects to /login', () => {
    localStorage.setItem('auth', 'dGVzdDpwYXNz');
    sessionStorage.setItem('auth', 'dGVzdDpwYXNz');
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.logout();
    });

    expect(localStorage.getItem('auth')).toBeNull();
    expect(sessionStorage.getItem('auth')).toBeNull();
    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});
