# useOnlineStatus

**Source:** `frontend/hooks/useOnlineStatus.ts`

Tracks browser online/offline state.

## Signature

```ts
function useOnlineStatus(): boolean;
```

## Behavior

1. Initial state: `true` (optimistic).
2. On mount, reads `globalThis.navigator?.onLine ?? true` and sets state.
3. Attaches `online` and `offline` window listeners that flip the state.
4. Cleanup removes both listeners.

## Example

```ts
const isOnline = useOnlineStatus();
return !isOnline && <OfflineBanner />;
```

## SSR Safety

All `window` and `navigator` access uses `globalThis.*?` so SSR renders assume online.
