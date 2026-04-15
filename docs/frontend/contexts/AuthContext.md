# AuthContext

**Source:** `frontend/contexts/AuthContext.tsx`

React Context + hook that wraps NextAuth's `useSession` to provide a single consumption point for authentication state and sign-out.

## Exports

- `AuthProvider` — provider component; mounted under `<SessionProvider>` in `app/layout.tsx`.
- `useAuthContext()` — hook consumed by `app/dashboard/layout.tsx`, `Header`, `MobileNav`, and `dashboard/page.tsx`.

## Context Value

```ts
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
  email: string | null;
  logout: () => Promise<void>;
}
```

## Provider Behavior

```ts
const { data: session, status } = useSession();

value = {
  isAuthenticated: status === 'authenticated',
  isLoading: status === 'loading',
  username: session?.user?.name || null,
  email: session?.user?.email || null,
  logout,
};
```

### `logout`

```ts
try {
  await signOut({ redirect: false });
  router.push('/login');
} catch (error) {
  console.error('[AUTH] Logout error:', error);
  router.push('/login');
}
```

Always navigates to `/login`, even on signOut failure.

## Error Handling

`useAuthContext` throws `"useAuthContext must be used within an AuthProvider"` when called outside the provider tree.

## Relationship to NextAuth

This context does not duplicate session state — it reflects `useSession` directly. The NextAuth session is populated by the `[...nextauth]/route.ts` JWT callback ([../api/auth.md](../api/auth.md)). `session.googleAccessToken` (set in that callback) is consumed by [lib/api.md](../lib/api.md) for Bearer headers.
