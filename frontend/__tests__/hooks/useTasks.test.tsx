import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTasks } from '@/hooks/useTasks';
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

describe('useTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sampleTasks = [
    {
      id: 1,
      userId: 'u1',
      guildId: 'g1',
      description: 'Task 1',
      dueDate: null,
      completed: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  it('returns tasks on successful query', async () => {
    mockApi.get.mockResolvedValueOnce({ success: true, data: sampleTasks });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTasks(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tasks).toEqual(sampleTasks);
    expect(mockApi.get).toHaveBeenCalledWith('/tasks');
  });

  it('returns empty array when response data is missing', async () => {
    mockApi.get.mockResolvedValueOnce({ success: true });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTasks(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tasks).toEqual([]);
  });

  it('sets isLoading true initially', () => {
    mockApi.get.mockImplementation(() => new Promise(() => {}));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTasks(), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.tasks).toEqual([]);
  });

  it('exposes error when query fails', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('Network down'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTasks(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect((result.current.error as Error).message).toBe('Network down');
  });

  it('createTask calls api.post with /tasks', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.post.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTasks(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.createTask({ description: 'New' }));
    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith('/tasks', { description: 'New' })
    );
  });

  it('updateTask calls api.patch with /tasks/:id', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.patch.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTasks(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.updateTask({ id: 5, data: { completed: true } }));
    await waitFor(() =>
      expect(mockApi.patch).toHaveBeenCalledWith('/tasks/5', { completed: true })
    );
  });

  it('deleteTask calls api.delete with /tasks/:id', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.delete.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTasks(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.deleteTask(42));
    await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith('/tasks/42'));
  });

  it('invalidates tasks query after create succeeds', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.post.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useTasks(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.createTask({ description: 'X' }));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks'] }));
  });

  it('invalidates tasks query after update succeeds', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.patch.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useTasks(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.updateTask({ id: 1, data: { completed: true } }));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks'] }));
  });

  it('invalidates tasks query after delete succeeds', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.delete.mockResolvedValueOnce({ success: true, data: {} });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useTasks(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.deleteTask(1));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks'] }));
  });

  it('handles createTask error without throwing', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    mockApi.post.mockRejectedValueOnce(new Error('bad'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTasks(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.createTask({ description: 'X' }));
    await waitFor(() => expect(mockApi.post).toHaveBeenCalled());
  });

  it('exposes mutation pending flags', async () => {
    mockApi.get.mockResolvedValue({ success: true, data: [] });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTasks(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isCreating).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
  });
});
