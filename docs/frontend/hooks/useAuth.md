# useAuth

**Source:** `frontend/hooks/useAuth.ts`

Legacy hook wrapping `localStorage`/`sessionStorage`-based auth credentials. Kept for pre-NextAuth flows. Current app flow uses `useAuthContext` (NextAuth-backed); see [../contexts/AuthContext.md](../contexts/AuthContext.md).

## Signature

```ts
function useAuth(): {
  isAuthenticated: () => boolean;
  logout: () => void;
  getUsername: () => string | null;
  setAuth: (credentials: string) => void;
}
```

## Storage Strategy

The hook writes credentials to **both** `localStorage` and `sessionStorage` for redundancy (iOS PWA reliability). `getAuthFromStorage` reads `localStorage` first, then falls back to `sessionStorage`.

## Return Value

| Field | Type | Behavior |
|---|---|---|
| `isAuthenticated()` | `() => boolean` | Returns `true` iff a credentials string exists in either storage. SSR-safe (returns `false` when `window` undefined). |
| `logout()` | `() => void` | Clears both storages and calls `router.push('/login')`. |
| `getUsername()` | `() => string \| null` | `atob(credentials).split(':')[0]`; returns `null` on decode failure. |
| `setAuth(credentials)` | `(string) => void` | Writes to both storages; falls back to `sessionStorage`-only on quota errors. |

## Side-effects

- Reads `globalThis.window`, `localStorage`, `sessionStorage`.
- Calls `router.push` on logout.
- Does not use React Query.

## Example

```ts
const { isAuthenticated, getUsername, logout } = useAuth();
if (!isAuthenticated()) router.push('/login');
```
