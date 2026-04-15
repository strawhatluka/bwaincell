import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotes } from '@/hooks/useNotes';
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

describe('useNotes', () => {
  beforeEach(() => jest.clearAllMocks());

  const sampleNotes = [
    {
      id: 1,
      userId: 'u1',
      guildId: 'g1',
      title: 'N',
      content: 'c',
      tags: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  it('returns notes on successful query', async () => {
    mockApi.get.mockResolvedValueOnce({ success: true, data: sampleNotes });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notes).toEqual(sampleNotes);
    expect(mockApi.get).toHaveBeenCalledWith('/notes');
  });

  it('uses search query when provided', async () => {
    mockApi.get.mockResolvedValueOnce({ success: true, data: [] });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotes('hello world'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockApi.get).toHaveBeenCalledWith('/notes?search=hello%20world');
  });

  it('returns empty array when response has no data', async () => {
    mockApi.get.mockResolvedValueOnce({ success: true });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notes).toEqual([]);
  });

  it('starts in loading state', () => {
    mockApi.get.mockImplementation(() => new Promise(() => {}));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('exposes error when query fails', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('fail'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it('createNote calls api.post /notes', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.post.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.createNote({ title: 't', content: 'c' }));
    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith('/notes', { title: 't', content: 'c' })
    );
  });

  it('updateNote calls api.patch /notes/:id', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.patch.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.updateNote({ id: 3, data: { title: 'new' } }));
    await waitFor(() => expect(mockApi.patch).toHaveBeenCalledWith('/notes/3', { title: 'new' }));
  });

  it('deleteNote calls api.delete /notes/:id', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.delete.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.deleteNote(9));
    await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith('/notes/9'));
  });

  it('invalidates notes after create', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.post.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.createNote({ title: 't', content: 'c' }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['notes'] }));
  });

  it('invalidates notes after update', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.patch.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.updateNote({ id: 1, data: { title: 'x' } }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['notes'] }));
  });

  it('invalidates notes after delete', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.delete.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.deleteNote(1));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['notes'] }));
  });

  it('exposes pending flags defaulting to false', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useNotes(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isCreating).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
  });
});
