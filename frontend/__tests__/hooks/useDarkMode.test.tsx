import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useDarkMode, DarkModeProvider } from '@/hooks/useDarkMode';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DarkModeProvider>{children}</DarkModeProvider>
);

describe('useDarkMode', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('throws when used outside DarkModeProvider', () => {
    // Silence React error logs for this expected throw
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useDarkMode())).toThrow(
      'useDarkMode must be used within a DarkModeProvider'
    );
    spy.mockRestore();
  });

  it('defaults to false/light mode when localStorage is empty', () => {
    const { result } = renderHook(() => useDarkMode(), { wrapper });
    expect(result.current.isDarkMode).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('reads initial value "true" from localStorage', () => {
    localStorage.setItem('darkMode', 'true');
    const { result } = renderHook(() => useDarkMode(), { wrapper });
    expect(result.current.isDarkMode).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('reads initial value "false" from localStorage', () => {
    localStorage.setItem('darkMode', 'false');
    const { result } = renderHook(() => useDarkMode(), { wrapper });
    expect(result.current.isDarkMode).toBe(false);
  });

  it('toggleDarkMode flips the value from false to true', () => {
    const { result } = renderHook(() => useDarkMode(), { wrapper });
    act(() => {
      result.current.toggleDarkMode();
    });
    expect(result.current.isDarkMode).toBe(true);
  });

  it('toggleDarkMode persists to localStorage', () => {
    const { result } = renderHook(() => useDarkMode(), { wrapper });
    act(() => {
      result.current.toggleDarkMode();
    });
    expect(localStorage.getItem('darkMode')).toBe('true');
  });

  it('applies "dark" class to documentElement when enabled', () => {
    const { result } = renderHook(() => useDarkMode(), { wrapper });
    act(() => {
      result.current.toggleDarkMode();
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes "dark" class when toggled back off', () => {
    localStorage.setItem('darkMode', 'true');
    const { result } = renderHook(() => useDarkMode(), { wrapper });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    act(() => {
      result.current.toggleDarkMode();
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('darkMode')).toBe('false');
  });
});
