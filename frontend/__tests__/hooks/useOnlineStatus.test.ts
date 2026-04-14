import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

describe('useOnlineStatus', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  it('should return true when online', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('should return false when offline on mount', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it('should update to false when offline event fires', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current).toBe(false);
  });

  it('should update to true when online event fires', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current).toBe(true);
  });

  it('should clean up event listeners on unmount', () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    removeSpy.mockRestore();
  });
});
