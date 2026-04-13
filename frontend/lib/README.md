# lib/ - Frontend Utilities

**Framework:** Next.js 14 + TypeScript
**Purpose:** Shared utility functions and API client for the Bwaincell PWA

---

## Purpose

The `lib/` directory contains shared utilities used across the Bwaincell frontend:

- **API Client** - Authenticated HTTP client for backend communication
- **Utility Functions** - Tailwind CSS class merging and common helpers
- **Database Utilities** - Prisma client and database helpers
- **Google OAuth** - Google authentication configuration

---

## Contents

### Directory Structure

```
lib/
├── api.ts          # API client with Bearer token authentication
├── utils.ts        # Tailwind CSS class merging utility (cn)
├── db/             # Database utilities (Prisma client)
├── google/         # Google OAuth configuration
├── CLAUDE.md       # AI context file
└── README.md       # This file
```

---

## Key Files

### api.ts

**Purpose:** HTTP API client with automatic Bearer token authentication

**Features:**

- Integrates with NextAuth session for Google OAuth tokens
- Supports GET, POST, PATCH, DELETE methods
- Typed generic responses via `ApiResponse<T>` interface
- Automatic error handling and logging
- Uses relative URLs for same-origin API calls (no CORS)

**Usage:**

```typescript
import { api } from '@/lib/api';

// Typed API calls
const tasks = await api.get<Task[]>('/tasks');
const newTask = await api.post<Task>('/tasks', { text: 'New task' });
await api.patch<Task>('/tasks/123', { completed: true });
await api.delete('/tasks/123');
```

**Response Interface:**

```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

---

### utils.ts

**Purpose:** Tailwind CSS class merging utility

**Exports:**

- `cn(...inputs)` - Merges Tailwind CSS classes with conflict resolution using `clsx` + `tailwind-merge`

**Usage:**

```typescript
import { cn } from '@/lib/utils';

// Merge classes with conflict resolution
const className = cn('px-4 py-2', 'px-6', conditionalClass && 'bg-blue-500');
// Result: 'px-6 py-2 bg-blue-500' (px-4 resolved to px-6)
```

---

## Related Documentation

- [Frontend README](../README.md) - Frontend overview and setup
- [App Router README](../app/README.md) - Next.js App Router structure
- [Root README](../../README.md) - Project overview

---

**Directory:** frontend/lib/
**Framework:** Next.js 14 + TypeScript
**Last Updated** 2026-02-11
