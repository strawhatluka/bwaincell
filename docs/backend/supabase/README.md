# Supabase Integration Layer

**Source tree:** `supabase/`

This directory contains everything related to Bwaincell's PostgreSQL/Supabase backend: the client singleton, local CLI config, SQL migrations, and TypeScript model wrappers.

> **Workspace package.** The `supabase/` directory is an npm workspace (`@bwaincell/supabase` per `supabase/package.json`, `main: dist/index.js`). It compiles to `supabase/dist/` via `tsc --build supabase`. Backend imports resolve through the `@database/*` path alias defined in `backend/tsconfig.json` (`"@database/*": ["../supabase/*"]`).

## Contents

```
supabase/
├── supabase.ts        # Proxy-wrapped singleton client
├── config.toml        # Local Supabase CLI configuration
├── init.sql           # Bootstrap schema for fresh environments
├── seed.sql           # Local dev seed data
├── migrations/        # Timestamped schema migrations
├── models/            # TS wrappers (one class per table)
└── types.ts           # Row / Insert / Update types shared across layers
```

## Docs in This Directory

| Doc                              | Topic                                                            |
| -------------------------------- | ---------------------------------------------------------------- |
| [client.md](./client.md)         | Client initialization, env vars, lazy Proxy, `verifyConnection`. |
| [config.md](./config.md)         | Per-key explanation of `supabase/config.toml`.                   |
| [migrations.md](./migrations.md) | Migration authoring workflow, naming, `init.sql`, reset.         |

## Relationship: Models ↔ Migrations

- **Migrations (`supabase/migrations/*.sql`)** are the source of truth for schema. Applied via the Supabase CLI.
- **Models (`supabase/models/*.ts`)** are hand-written TS classes that wrap common queries (`Task.createTask`, `Recipe.getRandom`, …) using the singleton `supabase` client.
- **Types (`supabase/types.ts`)** define `Row` / `Insert` / `Update` interfaces that must match the SQL column definitions. Any migration altering a column requires a corresponding type update.

Whenever you add a migration, update the matching model methods and types in the same commit.

## Used By

- **Backend Discord bot** (`backend/commands/*.ts`, `backend/utils/interactions/**`) — uses the service role key. Always imports via the `@database/*` alias:
  ```ts
  // backend/commands/task.ts
  import Task from '@database/models/Task';

  // backend/utils/interactions/helpers/databaseHelper.ts
  import { Task, List, Reminder } from '@database/index';
  ```
- **Next.js API routes** (`frontend/app/api/**/route.ts`) — uses the service role key after NextAuth session verification.
- Frontend hooks never talk to Supabase directly; they go through `frontend/lib/api.ts` → API routes.
