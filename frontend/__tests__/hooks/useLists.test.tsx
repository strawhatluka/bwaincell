import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLists } from '@/hooks/useLists';
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

describe('useLists', () => {
  beforeEach(() => jest.clearAllMocks());

  const sampleLists = [
    { id: 1, userId: 'u1', guildId: 'g1', name: 'Groceries', items: [], createdAt: '2026-01-01' },
  ];

  it('returns lists on successful query', async () => {
    mockApi.get.mockResolvedValueOnce({ success: true, data: sampleLists });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLists(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.lists).toEqual(sampleLists);
    expect(mockApi.get).toHaveBeenCalledWith('/lists');
  });

  it('returns empty array when data missing', async () => {
    mockApi.get.mockResolvedValueOnce({ success: true });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLists(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.lists).toEqual([]);
  });

  it('starts in loading state', () => {
    mockApi.get.mockImplementation(() => new Promise(() => {}));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLists(), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('exposes error on query failure', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('boom'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLists(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it('createList calls api.post /lists', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.post.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLists(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.createList({ name: 'Shopping' }));
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/lists', { name: 'Shopping' }));
  });

  it('addItem calls api.post with encoded list name', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.post.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLists(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.addItem({ listName: 'my list', item: 'milk' }));
    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith('/lists/my%20list/items', { item: 'milk' })
    );
  });

  it('removeItem calls api.delete with encoded params', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.delete.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLists(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.removeItem({ listName: 'A B', itemText: 'x y' }));
    await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith('/lists/A%20B/items/x%20y'));
  });

  it('toggleItem calls api.patch with toggle endpoint', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.patch.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLists(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggleItem({ listName: 'L', itemText: 'I' }));
    await waitFor(() => expect(mockApi.patch).toHaveBeenCalledWith('/lists/L/items/I/toggle', {}));
  });

  it('clearCompleted calls api.post clear-completed', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.post.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLists(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.clearCompleted('Groceries'));
    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith('/lists/Groceries/clear-completed', {})
    );
  });

  it('deleteList calls api.delete with encoded name', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.delete.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLists(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.deleteList('my list'));
    await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith('/lists/my%20list'));
  });

  it('invalidates lists after createList', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.post.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useLists(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.createList({ name: 'X' }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['lists'] }));
  });

  it('invalidates lists after addItem', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.post.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useLists(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.addItem({ listName: 'L', item: 'I' }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['lists'] }));
  });

  it('invalidates lists after toggleItem', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.patch.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useLists(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggleItem({ listName: 'L', itemText: 'I' }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['lists'] }));
  });

  it('exposes all pending flags as false initially', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useLists(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isCreating).toBe(false);
    expect(result.current.isAddingItem).toBe(false);
    expect(result.current.isRemovingItem).toBe(false);
    expect(result.current.isTogglingItem).toBe(false);
    expect(result.current.isClearingCompleted).toBe(false);
    expect(result.current.isDeleting).toBe(false);
  });
});
