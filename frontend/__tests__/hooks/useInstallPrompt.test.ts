import { renderHook, act } from '@testing-library/react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

function createMockPromptEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt') as Event & {
    prompt: jest.Mock;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };
  event.prompt = jest.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

describe('useInstallPrompt', () => {
  it('returns isInstallable false initially', () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isInstallable).toBe(false);
    expect(typeof result.current.promptInstall).toBe('function');
  });

  it('registers a beforeinstallprompt event listener on mount', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    renderHook(() => useInstallPrompt());
    expect(addSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
    addSpy.mockRestore();
  });

  it('sets isInstallable to true when beforeinstallprompt fires', () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(createMockPromptEvent());
    });
    expect(result.current.isInstallable).toBe(true);
  });

  it('promptInstall calls the saved event prompt() method', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const mockEvent = createMockPromptEvent('accepted');

    act(() => {
      window.dispatchEvent(mockEvent);
    });

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(mockEvent.prompt).toHaveBeenCalled();
  });

  it('resets isInstallable to false after accepted outcome', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(createMockPromptEvent('accepted'));
    });
    expect(result.current.isInstallable).toBe(true);

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(result.current.isInstallable).toBe(false);
  });

  it('keeps isInstallable true after dismissed outcome', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => {
      window.dispatchEvent(createMockPromptEvent('dismissed'));
    });
    expect(result.current.isInstallable).toBe(true);

    await act(async () => {
      await result.current.promptInstall();
    });

    expect(result.current.isInstallable).toBe(true);
  });

  it('promptInstall is a no-op when no prompt event has been captured', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    await expect(result.current.promptInstall()).resolves.toBeUndefined();
    expect(result.current.isInstallable).toBe(false);
  });

  it('removes the event listener on unmount', () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useInstallPrompt());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
    removeSpy.mockRestore();
  });
});
