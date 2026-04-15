import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReminders } from '@/hooks/useReminders';
import { api } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

const mockApi = api as jest.Mocked<typeof api>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper, queryClient };
}

describe('useReminders', () => {
  beforeEach(() => jest.clearAllMocks());

  const sample = [
    {
      id: 1,
      userId: 'u1',
      guildId: 'g1',
      message: 'hi',
      frequency: 'once' as const,
      time: '09:00',
      nextTrigger: '2026-01-02T09:00:00Z',
    },
  ];

  it('returns reminders on success', async () => {
    mockApi.get.mockResolvedValueOnce({ success: true, data: sample });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReminders(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.reminders).toEqual(sample);
    expect(mockApi.get).toHaveBeenCalledWith('/reminders');
  });

  it('returns empty array when data missing', async () => {
    mockApi.get.mockResolvedValueOnce({ success: true });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReminders(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.reminders).toEqual([]);
  });

  it('starts in loading state', () => {
    mockApi.get.mockImplementation(() => new Promise(() => {}));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReminders(), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('exposes error on query failure', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('nope'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReminders(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it('deleteReminder calls api.delete /reminders/:id', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.delete.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReminders(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.deleteReminder(42));
    await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith('/reminders/42'));
  });

  it('invalidates reminders after delete', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.delete.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useReminders(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.deleteReminder(1));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['reminders'] }));
  });

  it('handles delete error without throwing', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.delete.mockRejectedValueOnce(new Error('fail'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReminders(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.deleteReminder(1));
    await waitFor(() => expect(mockApi.delete).toHaveBeenCalled());
  });

  it('exposes isDeleting false initially', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReminders(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isDeleting).toBe(false);
  });

  it('does not call post or patch (hook does not expose them)', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    const { Wrapper } = createWrapper();
    renderHook(() => useReminders(), { wrapper: Wrapper });
    await waitFor(() => expect(mockApi.get).toHaveBeenCalled());
    expect(mockApi.post).not.toHaveBeenCalled();
    expect(mockApi.patch).not.toHaveBeenCalled();
  });

  it('re-renders with updated data', async () => {
    mockApi.get.mockResolvedValueOnce({ success: true, data: sample });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useReminders(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.reminders).toHaveLength(1));
    expect(result.current.reminders[0].id).toBe(1);
  });
});
