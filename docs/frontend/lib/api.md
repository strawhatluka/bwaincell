# lib/api

**Source:** `frontend/lib/api.ts`

Wrapper around `fetch` for calling Next.js API routes. Exports a singleton `api` instance.

## Exports

- `interface ApiResponse<T = unknown>` — `{ success: boolean; data?: T; error?: string; message?: string }`.
- `class ApiClient` — internal class.
- `const api = new ApiClient(process.env.NEXT_PUBLIC_API_URL || '/api')`.

## Base URL Resolution

```ts
new ApiClient(process.env.NEXT_PUBLIC_API_URL || '/api');
```

Uses relative `/api` by default so the frontend calls same-origin Next.js API routes (no CORS). `NEXT_PUBLIC_API_URL` can override when the API lives elsewhere.

## Authentication

`private async getAuthHeader(): Promise<Record<string, string>>`:

1. `const session = await getSession()` (from `next-auth/react`).
2. If `session.googleAccessToken` exists → `{ Authorization: \`Bearer ${token}\` }`.
3. Otherwise logs `"[API-CLIENT] No Google access token in session"` and returns `{}`.
4. Errors return `{}`.

The Google access token is injected by the NextAuth `jwt` callback (see [../api/auth.md](../api/auth.md)).

## Exported Methods

All methods return `Promise<ApiResponse<T>>` and throw `Error(errorData.message || 'HTTP {status}')` on non-2xx responses.

### `get<T>(endpoint): Promise<ApiResponse<T>>`

Adds `Content-Type: application/json` + auth header; logs request + response status.

### `post<T>(endpoint, body: unknown): Promise<ApiResponse<T>>`

### `patch<T>(endpoint, body: unknown): Promise<ApiResponse<T>>`

### `delete<T>(endpoint): Promise<ApiResponse<T>>`

All methods parse JSON bodies on both success and error, swallowing `JSON.parse` failures with an empty object.

## Logging

- Every request logs `[API] METHOD /endpoint` with `hasAuth` boolean.
- Every response logs status + `ok`.
- Errors logged with `[API] METHOD /endpoint failed:` prefix.

## Usage

```ts
import { api } from '@/lib/api';

const response = await api.get<Task[]>('/tasks');
if (response.success) console.log(response.data);
```

## Related

- NextAuth session: [../api/auth.md](../api/auth.md)
- React Query hooks using `api`: [../hooks/README.md](../hooks/README.md)
