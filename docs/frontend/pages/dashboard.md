# Dashboard Shell and Home

**Sources:**

- `frontend/app/dashboard/layout.tsx`
- `frontend/app/dashboard/page.tsx`

## `dashboard/layout.tsx`

Client component guarding all `/dashboard/*` routes.

### Auth Flow

```ts
const { isAuthenticated, isLoading } = useAuthContext();
useEffect(() => {
  if (!isLoading && !isAuthenticated) router.push('/login');
}, [isLoading, isAuthenticated, router]);
```

- While `isLoading` → renders centered spinner.
- When unauthenticated (post-loading) → renders `null` (prevents content flash) and triggers redirect.

### Composition

- Skip-link: `<a href="#main-content" class="sr-only focus:…">`.
- `<Sidebar />` (desktop navigation).
- Main column: `<Header />`, `<OfflineBanner />`, `<main id="main-content">{children}</main>`.

### Imports

- `useEffect` from `react`
- `useRouter` from `next/navigation`
- `useAuthContext` from `@/contexts/AuthContext`
- `Sidebar`, `Header`, `OfflineBanner`

## `dashboard/page.tsx`

Client component. Renders:

- `useAuthContext()` → `{ username }`.
- Welcome heading with tri-color gradient: `"Welcome back, {username || 'User'}!"`.
- Static "letter" content card.

No data fetching. Pure presentation once auth resolves.
