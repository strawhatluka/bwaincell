# app/ - Next.js 14 App Router

**Framework:** Next.js 14.2+ with App Router
**Language:** TypeScript
**Purpose:** Main application routing and page structure

---

## Overview

This directory contains the Next.js 14 App Router structure for the Bwaincell Progressive Web App (PWA). It uses file-based routing where folders and files define the application's URL structure.

**Key Features:**

- App Router (Next.js 14+) with Server Components by default
- API Routes for backend integration
- Dashboard pages for authenticated users
- Public pages (login, privacy, terms)
- Client-side providers (TanStack Query, NextAuth, Dark Mode)

---

## Directory Structure

```
app/
├── layout.tsx              # Root layout (providers, global styles)
├── page.tsx                # Home page (/)
├── api/                    # API route handlers
│   ├── auth/               # NextAuth.js authentication
│   ├── budget/             # Budget API endpoints
│   ├── lists/              # List management endpoints
│   ├── notes/              # Note management endpoints
│   ├── reminders/          # Reminder management endpoints
│   ├── schedule/           # Schedule management endpoints
│   └── tasks/              # Task management endpoints
├── dashboard/              # Protected dashboard routes
│   ├── page.tsx            # Dashboard home (/dashboard)
│   ├── tasks/              # Task management UI
│   ├── lists/              # List management UI
│   ├── notes/              # Note management UI
│   ├── reminders/          # Reminder management UI
│   └── budget/             # Budget management UI
├── login/                  # Login page (/login)
├── privacy/                # Privacy policy page (/privacy)
└── terms/                  # Terms of service page (/terms)
```

---

## Key Files

### Root Files

#### layout.tsx

**Purpose:** Root layout component with global providers
**Providers:**

- `QueryClientProvider` - TanStack Query for data fetching
- `SessionProvider` - NextAuth.js session management
- `DarkModeProvider` - Dark mode state management
- `AuthProvider` - Custom authentication context
- `Toaster` - Toast notification system

**Configuration:**

- Query refetch interval: 15 seconds
- Refetch on window focus: enabled
- Retry failed queries: 1 attempt

#### page.tsx

**Purpose:** Home page component
**Route:** `/`
**Behavior:** Redirects to `/dashboard` for authenticated users, `/login` for guests

---

## API Routes

API routes in Next.js 14 use Route Handlers (not Pages API). Each route exports HTTP method functions (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`).

### API Structure

```
api/
├── auth/[...nextauth]/     # NextAuth.js dynamic route
├── budget/
│   └── transactions/       # Budget transaction endpoints
├── lists/[listName]/       # List operations by name
│   ├── clear-completed/    # Clear completed items
│   └── items/[itemText]/   # Item operations
├── notes/[id]/             # Note operations by ID
├── reminders/[id]/         # Reminder operations by ID
├── schedule/[id]/          # Schedule operations by ID
└── tasks/[id]/             # Task operations by ID
```

### API Endpoint Patterns

**Collection Endpoints:**

- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create new task

**Resource Endpoints:**

- `GET /api/tasks/[id]` - Get task by ID
- `PUT /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task

**Action Endpoints:**

- `POST /api/lists/[listName]/clear-completed` - Clear completed items
- `PATCH /api/lists/[listName]/items/[itemText]/toggle` - Toggle item status

---

## Dashboard Routes

Protected routes requiring authentication. All dashboard routes check session status and redirect to `/login` if not authenticated.

### Dashboard Pages

```
dashboard/
├── page.tsx                # Dashboard home (/dashboard)
├── tasks/page.tsx          # Task management (/dashboard/tasks)
├── lists/page.tsx          # List management (/dashboard/lists)
├── notes/page.tsx          # Note management (/dashboard/notes)
├── reminders/page.tsx      # Reminder management (/dashboard/reminders)
└── budget/page.tsx         # Budget tracking (/dashboard/budget)
```

**Common Features:**

- Server-side session validation
- Client-side data fetching with TanStack Query
- Real-time updates via polling (15-second interval)
- Optimistic updates for instant feedback
- Error handling with toast notifications

---

## Routing Conventions

### File-Based Routing

Next.js 14 App Router uses files to define routes:

- `page.tsx` - Creates a route (e.g., `app/dashboard/page.tsx` → `/dashboard`)
- `layout.tsx` - Wraps child routes with shared UI
- `loading.tsx` - Loading UI during navigation
- `error.tsx` - Error UI for error boundaries
- `route.ts` - API route handler
- `[param]/` - Dynamic route segment
- `[...param]/` - Catch-all route segment

### Dynamic Routes

**Example:** `app/api/tasks/[id]/route.ts`

- Matches: `/api/tasks/1`, `/api/tasks/abc`, `/api/tasks/123`
- Access via: `params.id` in route handler

**Example:** `app/api/auth/[...nextauth]/route.ts`

- Matches: `/api/auth/signin`, `/api/auth/callback/google`, etc.
- Access via: `params.nextauth` (array) in route handler

---

## Server vs Client Components

### Server Components (Default)

```tsx
// No "use client" directive
export default async function Page() {
  // Can fetch data directly
  const data = await fetchData();
  return <div>{data}</div>;
}
```

**Benefits:**

- Smaller bundle size (no JavaScript sent to client)
- Direct database/API access
- SEO-friendly (rendered on server)
- Better initial page load

**Use For:**

- Static content
- Data fetching
- SEO-critical pages

### Client Components

```tsx
'use client';

import { useState } from 'react';

export default function Component() {
  const [state, setState] = useState(0);
  return <button onClick={() => setState((s) => s + 1)}>{state}</button>;
}
```

**Required For:**

- `useState`, `useEffect`, React hooks
- Browser APIs (localStorage, window, etc.)
- Event handlers (onClick, onChange, etc.)
- Third-party libraries requiring browser environment

**Current Usage:**

- `layout.tsx` - Uses "use client" for providers (QueryClient, SessionProvider)
- Dashboard pages - Use "use client" for interactive UI
- API routes - Always server-side (no "use client")

---

## Data Fetching Patterns

### TanStack Query (React Query)

**Configuration:** (in `layout.tsx`)

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 15000, // Poll every 15 seconds
      refetchOnWindowFocus: true, // Refetch on tab focus
      retry: 1, // Retry failed queries once
    },
  },
});
```

**Usage Example:**

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';

function TaskList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => fetch('/api/tasks').then((r) => r.json()),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return (
    <ul>
      {data.map((task) => (
        <li key={task.id}>{task.title}</li>
      ))}
    </ul>
  );
}
```

### Polling Strategy

**Automatic Polling:**

- Queries refetch every 15 seconds automatically
- Ensures dashboard data stays current
- Reduces need for WebSocket connections

**Manual Refetch:**

```tsx
const { refetch } = useQuery({ queryKey: ["tasks"], ... });
// Call refetch() after mutation to update UI
```

---

## Authentication

### NextAuth.js Integration

**Configuration:** `app/api/auth/[...nextauth]/route.ts`

**Session Access (Server Components):**

```tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  // Render protected content
}
```

**Session Access (Client Components):**

```tsx
'use client';

import { useSession } from 'next-auth/react';

export default function Component() {
  const { data: session, status } = useSession();
  if (status === 'loading') return <div>Loading...</div>;
  if (!session) return <div>Not authenticated</div>;
  return <div>Welcome, {session.user.name}</div>;
}
```

### Protected Routes

**Pattern:** Check session in `page.tsx`, redirect if not authenticated

```tsx
// app/dashboard/page.tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

  return <div>Dashboard content</div>;
}
```

---

## Styling

### Global Styles

**File:** `app/globals.css`
**Imports:** Tailwind CSS base, components, utilities
**Custom Variables:** CSS custom properties for theming

### Tailwind CSS

**Configuration:** `tailwind.config.ts` (in frontend root)
**Content:** Scans `app/**/*.{ts,tsx}` for Tailwind classes
**Dark Mode:** `class` strategy (toggle via `.dark` class on `<html>`)

### Component Library

**UI Components:** Radix UI primitives in `components/ui/`
**Styling:** Tailwind CSS + CSS Modules
**Theming:** Dark mode via `useDarkMode` hook and `DarkModeProvider`

---

## Progressive Web App (PWA)

### PWA Configuration

**Manifest:** `public/manifest.json`
**Service Worker:** Generated by `next-pwa`
**Configuration:** `next.config.js`

**Features:**

- Offline support via service worker
- Install prompt on mobile/desktop
- App-like experience
- Caching strategies for assets

**Offline Handling:**

- `OfflineBanner` component shows when offline
- TanStack Query retries when connection restored
- Cached data available offline

---

## Common Patterns

### Route Handler Example

```ts
// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const tasks = await fetchTasks();
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const newTask = await createTask(body);
  return NextResponse.json({ task: newTask }, { status: 201 });
}
```

### Dynamic Route Handler Example

```ts
// app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const task = await fetchTask(params.id);
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }
  return NextResponse.json({ task });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  await deleteTask(params.id);
  return NextResponse.json({ success: true });
}
```

### Page with Data Fetching

```tsx
// app/dashboard/tasks/page.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function TasksPage() {
  const queryClient = useQueryClient();

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => fetch('/api/tasks').then((r) => r.json()),
  });

  const createTask = useMutation({
    mutationFn: (task) =>
      fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return <div>{/* UI */}</div>;
}
```

---

## Development

### Running Development Server

```bash
cd frontend
npm run dev
```

Server starts at http://localhost:3010

### Building for Production

```bash
cd frontend
npm run build
npm run start
```

### Type Checking

```bash
cd frontend
npm run type-check
```

---

## Testing

### Testing Dashboard Pages

```tsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TasksPage from './page';

test('renders tasks page', () => {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <TasksPage />
    </QueryClientProvider>
  );
  expect(screen.getByText('Tasks')).toBeInTheDocument();
});
```

### Testing API Routes

```tsx
import { GET, POST } from './route';
import { NextRequest } from 'next/server';

test('GET /api/tasks returns tasks', async () => {
  const request = new NextRequest('http://localhost:3010/api/tasks');
  const response = await GET(request);
  const data = await response.json();
  expect(data).toHaveProperty('tasks');
});
```

---

## Common Issues

### "use client" Required

**Symptoms:** "Cannot use useState in Server Component"
**Solution:** Add `"use client";` at top of file

### Session Not Available

**Symptoms:** `useSession()` returns `null` or `undefined`
**Solution:** Ensure component is wrapped in `<SessionProvider>` (check `layout.tsx`)

### Query Not Refetching

**Symptoms:** Data stale after mutation
**Solution:** Call `queryClient.invalidateQueries()` after mutation

### Route Not Found

**Symptoms:** 404 error for existing route
**Solution:** Ensure `page.tsx` exists in route folder (not just `layout.tsx`)

### Dynamic Route Params Missing

**Symptoms:** `params` is `undefined` in route handler
**Solution:** Ensure params destructured from second argument: `{ params }`

---

## Related Documentation

- [Frontend README](../README.md) - Frontend overview and setup
- [Components README](../components/README.md) - UI component library
- [API Documentation](../../docs/api/README.md) - Complete API reference
- [Architecture Overview](../../docs/architecture/overview.md) - System design

---

**Directory:** frontend/app/
**Framework:** Next.js 14.2+ App Router
**Last Updated** 2026-02-11
