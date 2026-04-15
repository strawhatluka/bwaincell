import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBudget } from '@/hooks/useBudget';
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

describe('useBudget', () => {
  beforeEach(() => jest.clearAllMocks());

  const sample = [
    {
      id: 1,
      userId: 'u1',
      guildId: 'g1',
      amount: 10,
      type: 'expense' as const,
      category: 'food',
      description: 'lunch',
      date: '2026-01-01',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  it('returns transactions on success', async () => {
    mockApi.get.mockResolvedValueOnce({ success: true, data: sample });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBudget(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.transactions).toEqual(sample);
    expect(mockApi.get).toHaveBeenCalledWith('/budget/transactions');
  });

  it('returns empty array when data missing', async () => {
    mockApi.get.mockResolvedValueOnce({ success: true });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBudget(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.transactions).toEqual([]);
  });

  it('starts loading', () => {
    mockApi.get.mockImplementation(() => new Promise(() => {}));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBudget(), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('exposes error on query failure', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('fail'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBudget(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it('createTransaction calls api.post /budget/transactions', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.post.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBudget(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const body = {
      amount: 5,
      type: 'income' as const,
      category: 'salary',
      description: 'pay',
      date: '2026-01-01',
    };
    act(() => result.current.createTransaction(body));
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/budget/transactions', body));
  });

  it('updateTransaction calls api.patch /budget/transactions/:id', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.patch.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBudget(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.updateTransaction({ id: 7, data: { amount: 99 } }));
    await waitFor(() =>
      expect(mockApi.patch).toHaveBeenCalledWith('/budget/transactions/7', { amount: 99 })
    );
  });

  it('deleteTransaction calls api.delete /budget/transactions/:id', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.delete.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBudget(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.deleteTransaction(3));
    await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith('/budget/transactions/3'));
  });

  it('invalidates transactions after create', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.post.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useBudget(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() =>
      result.current.createTransaction({
        amount: 1,
        type: 'income',
        category: 'a',
        description: 'b',
        date: '2026-01-01',
      })
    );
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['transactions'] }));
  });

  it('invalidates transactions after update', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.patch.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useBudget(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.updateTransaction({ id: 1, data: { amount: 5 } }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['transactions'] }));
  });

  it('invalidates transactions after delete', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.delete.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useBudget(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.deleteTransaction(1));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['transactions'] }));
  });

  it('exposes pending flags false initially', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBudget(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isCreating).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
  });
});
