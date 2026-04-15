# Root Layout

**Source:** `frontend/app/layout.tsx`

Global Next.js App Router root layout. Client-side component (`'use client'`).

## Providers

Wrapped in this order (outside → inside):

1. `SessionProvider` (`next-auth/react`)
2. `DarkModeProvider` (`@/hooks/useDarkMode`)
3. `QueryClientProvider` (`@tanstack/react-query`)
4. `AuthProvider` (`@/contexts/AuthContext`)

Siblings of `<AuthProvider>` under the query provider:

- `<Toaster />` (`@/components/ui/toaster`)
- `<ReactQueryDevtools initialIsOpen={false} />`

## QueryClient Configuration

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 15000, // poll every 15s
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});
```

Created once via `useState(() => new QueryClient(...))` so it survives re-renders.

## `<head>` Metadata

- `<link rel="manifest" href="/manifest.json">` — PWA manifest.
- `<meta name="theme-color" content="#e84d8a">`.
- Viewport with `viewport-fit=cover` for notch-aware layouts.
- Meta description, keywords, author.
- Icons: `/icon-192.png` for favicon and apple-touch-icon.
- `<title>Bwain.app - Your Personal Productivity Companion</title>`.

## Global CSS

`import './globals.css'` — Tailwind entrypoint plus CSS custom properties.

## HTML Attributes

`<html lang="en" suppressHydrationWarning>` — hydration warning suppressed because `DarkModeProvider` mutates the `html` element.
