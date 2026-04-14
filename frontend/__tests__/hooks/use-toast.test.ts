import { renderHook, act } from '@testing-library/react';
import { useToast, toast, reducer } from '@/hooks/use-toast';

describe('use-toast reducer', () => {
  it('ADD_TOAST adds a toast to state (respecting TOAST_LIMIT of 1)', () => {
    const state = { toasts: [] };
    const next = reducer(state, {
      type: 'ADD_TOAST',
      toast: { id: '1', title: 'Hello', open: true },
    } as any);
    expect(next.toasts).toHaveLength(1);
    expect(next.toasts[0].id).toBe('1');
  });

  it('ADD_TOAST enforces TOAST_LIMIT by slicing older toasts', () => {
    const state = { toasts: [{ id: '1', open: true } as any] };
    const next = reducer(state, {
      type: 'ADD_TOAST',
      toast: { id: '2', open: true } as any,
    });
    expect(next.toasts).toHaveLength(1);
    expect(next.toasts[0].id).toBe('2');
  });

  it('UPDATE_TOAST merges properties of matching toast', () => {
    const state = { toasts: [{ id: '1', title: 'Old', open: true } as any] };
    const next = reducer(state, {
      type: 'UPDATE_TOAST',
      toast: { id: '1', title: 'New' },
    });
    expect(next.toasts[0].title).toBe('New');
  });

  it('DISMISS_TOAST sets open=false on the matching toast', () => {
    const state = { toasts: [{ id: '1', open: true } as any, { id: '2', open: true } as any] };
    const next = reducer(state, { type: 'DISMISS_TOAST', toastId: '1' });
    expect(next.toasts.find((t) => t.id === '1')?.open).toBe(false);
    expect(next.toasts.find((t) => t.id === '2')?.open).toBe(true);
  });

  it('DISMISS_TOAST without toastId closes all toasts', () => {
    const state = { toasts: [{ id: '1', open: true } as any, { id: '2', open: true } as any] };
    const next = reducer(state, { type: 'DISMISS_TOAST' });
    expect(next.toasts.every((t) => t.open === false)).toBe(true);
  });

  it('REMOVE_TOAST with id filters the toast out', () => {
    const state = { toasts: [{ id: '1', open: false } as any, { id: '2', open: false } as any] };
    const next = reducer(state, { type: 'REMOVE_TOAST', toastId: '1' });
    expect(next.toasts).toHaveLength(1);
    expect(next.toasts[0].id).toBe('2');
  });

  it('REMOVE_TOAST without id clears all toasts', () => {
    const state = { toasts: [{ id: '1' } as any, { id: '2' } as any] };
    const next = reducer(state, { type: 'REMOVE_TOAST' });
    expect(next.toasts).toEqual([]);
  });
});

describe('useToast hook', () => {
  beforeEach(() => {
    // Clear any residual toasts from previous tests by dismissing + removing
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.dismiss();
    });
  });

  it('toast() adds a toast to state', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      toast({ title: 'Hello there' });
    });
    expect(result.current.toasts.length).toBeGreaterThanOrEqual(1);
    expect(result.current.toasts[0].title).toBe('Hello there');
    expect(result.current.toasts[0].open).toBe(true);
  });

  it('toast() returns an id, dismiss, and update', () => {
    let api: ReturnType<typeof toast> | undefined;
    act(() => {
      api = toast({ title: 'API test' });
    });
    expect(api).toBeDefined();
    expect(typeof api!.id).toBe('string');
    expect(typeof api!.dismiss).toBe('function');
    expect(typeof api!.update).toBe('function');
  });

  it('dismiss(id) sets open=false on the toast', () => {
    const { result } = renderHook(() => useToast());
    let id = '';
    act(() => {
      id = toast({ title: 'Dismiss me' }).id;
    });
    act(() => {
      result.current.dismiss(id);
    });
    const target = result.current.toasts.find((t) => t.id === id);
    expect(target?.open).toBe(false);
  });

  it('enforces TOAST_LIMIT of 1 concurrent toast', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      toast({ title: 'First' });
      toast({ title: 'Second' });
      toast({ title: 'Third' });
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Third');
  });
});
