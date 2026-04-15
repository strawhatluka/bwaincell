# OfflineBanner

**Source:** `frontend/components/common/OfflineBanner.tsx`

Renders a yellow banner while the browser is offline.

## Props

None.

## Hooks

`useOnlineStatus()` — returns `true`/`false`.

## Rendering

- Returns `null` when online.
- When offline: `WifiOff` icon + copy `"You're offline. Viewing cached data. Changes will sync when you reconnect."` on a `bg-yellow-50` banner with a yellow bottom border.

## Integration

Mounted in `app/dashboard/layout.tsx` directly under `<Header />`.

## Dependencies

- `useOnlineStatus` hook.
- lucide: `WifiOff`.
