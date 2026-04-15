# User Model

**Source:** `supabase/models/User.ts`
**Table:** `users`
**Schema:** `supabase/migrations/20260413000000_initial_schema.sql`

Links Google OAuth identity to a Discord user/guild pairing for the web dashboard.

## Columns

| Column          | Type         | Constraints               |
| --------------- | ------------ | ------------------------- |
| `id`            | SERIAL       | PRIMARY KEY               |
| `google_id`     | VARCHAR(255) | NOT NULL, UNIQUE          |
| `email`         | VARCHAR(255) | NOT NULL, UNIQUE          |
| `name`          | VARCHAR(255) | NOT NULL                  |
| `picture`       | VARCHAR(255) | nullable                  |
| `discord_id`    | VARCHAR(255) | NOT NULL                  |
| `guild_id`      | VARCHAR(255) | NOT NULL                  |
| `refresh_token` | TEXT         | nullable                  |
| `created_at`    | TIMESTAMPTZ  | NOT NULL, DEFAULT `NOW()` |
| `updated_at`    | TIMESTAMPTZ  | NOT NULL, DEFAULT `NOW()` |

## Indexes

- `idx_users_email` on `email`
- `idx_users_google_id` on `google_id`

## TypeScript Interface

```ts
export interface UserAttributes {
  id: number;
  google_id: string;
  email: string;
  name: string;
  picture: string | null;
  discord_id: string;
  guild_id: string;
  refresh_token: string | null;
  created_at: string;
  updated_at: string;
}
```

Row / Insert / Update types (`UserRow`, `UserInsert`, `UserUpdate`) are exported from `supabase/types`.

## Static Methods

| Method           | Signature                            | Returns                    | Notes                                                          |
| ---------------- | ------------------------------------ | -------------------------- | -------------------------------------------------------------- |
| `findByGoogleId` | `(googleId: string)`                 | `Promise<UserRow \| null>` | Returns `null` when no row found (PGRST116).                   |
| `findByEmail`    | `(email: string)`                    | `Promise<UserRow \| null>` | Same null-on-missing behavior.                                 |
| `create`         | `(userData: UserInsert)`             | `Promise<UserRow>`         | Throws on error.                                               |
| `update`         | `(id: number, userData: UserUpdate)` | `Promise<UserRow \| null>` | Automatically sets `updated_at` to `new Date().toISOString()`. |

## Guild / User Isolation

Users are keyed by `google_id` (globally unique). Each user row pins the user to a single `discord_id` + `guild_id`. All other models rely on `guild_id` (not `users.id`) for household-scoped access.

## Example Queries

```ts
import User from '@database/models/User';

// Lookup
const user = await User.findByEmail('luka@example.com');

// Create
const created = await User.create({
  google_id: 'goog-123',
  email: 'luka@example.com',
  name: 'Luka',
  picture: null,
  discord_id: '1111111',
  guild_id: '2222222',
});

// Update (e.g., rotate refresh token)
await User.update(created.id, { refresh_token: 'new-refresh-token' });
```

## Related

- OAuth routes: [docs/backend/api/routes/oauth.md](../api/routes/oauth.md)
- OAuth middleware: [docs/backend/api/middleware/oauth.md](../api/middleware/oauth.md)
