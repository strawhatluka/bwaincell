import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSchedule } from '@/hooks/useSchedule';
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

describe('useSchedule', () => {
  beforeEach(() => jest.clearAllMocks());

  const sample = [
    {
      id: 1,
      userId: 'u1',
      guildId: 'g1',
      title: 'Meeting',
      description: 'weekly sync',
      datetime: '2026-01-10T10:00:00Z',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  it('returns events on success', async () => {
    mockApi.get.mockResolvedValueOnce({ success: true, data: sample });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSchedule(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.events).toEqual(sample);
    expect(mockApi.get).toHaveBeenCalledWith('/schedule');
  });

  it('returns empty array when data missing', async () => {
    mockApi.get.mockResolvedValueOnce({ success: true });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSchedule(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.events).toEqual([]);
  });

  it('starts in loading state', () => {
    mockApi.get.mockImplementation(() => new Promise(() => {}));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSchedule(), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('exposes error on query failure', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('dead'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSchedule(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it('createEvent calls api.post /schedule', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.post.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSchedule(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const body = { title: 't', description: 'd', datetime: '2026-01-01T00:00:00Z' };
    act(() => result.current.createEvent(body));
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/schedule', body));
  });

  it('updateEvent calls api.patch /schedule/:id', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.patch.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSchedule(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.updateEvent({ id: 8, data: { title: 'new' } }));
    await waitFor(() =>
      expect(mockApi.patch).toHaveBeenCalledWith('/schedule/8', { title: 'new' })
    );
  });

  it('deleteEvent calls api.delete /schedule/:id', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.delete.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSchedule(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.deleteEvent(3));
    await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith('/schedule/3'));
  });

  it('invalidates events after create', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.post.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSchedule(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() =>
      result.current.createEvent({
        title: 't',
        description: 'd',
        datetime: '2026-01-01T00:00:00Z',
      })
    );
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['events'] }));
  });

  it('invalidates events after update', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.patch.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSchedule(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.updateEvent({ id: 1, data: { title: 'x' } }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['events'] }));
  });

  it('invalidates events after delete', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.delete.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper, queryClient } = createWrapper();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSchedule(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.deleteEvent(1));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['events'] }));
  });

  it('exposes pending flags false initially', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSchedule(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isCreating).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
  });
});
