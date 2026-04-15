# Database Migrations Guide

**Last Updated:** 2026-04-15
**Database:** Supabase (managed PostgreSQL)
**Tool:** Supabase CLI (`supabase`)

Bwaincell uses Supabase-managed migrations. All schema changes live as timestamped SQL files under `supabase/migrations/` and are applied by the Supabase CLI.

---

## File Layout

```
supabase/
├── config.toml                # Supabase CLI config (references SUPABASE_DB_PASSWORD via env())
├── init.sql                   # Bootstrap SQL (applied on first start)
└── migrations/
    ├── 20260413000000_initial_schema.sql   # Users, tasks, notes, lists, reminders, budgets, schedules, event_configs, sunset_configs
    └── 20260414000000_recipes_schema.sql   # Recipes, meal_plans, recipe_preferences
```

**Filename convention:** `YYYYMMDDHHMMSS_<description>.sql`. The timestamp prefix determines apply order, so migrations must always be strictly increasing.

`init.sql` is intended for **bootstrap-only** content that must exist before any migration runs (e.g., roles, extensions beyond what migrations enable). Schema changes during day-to-day development go into migration files, **not** `init.sql`.

---

## Authoring a New Migration

```bash
# Create a blank migration file with a correct timestamp prefix
supabase migration new <description>

# The CLI creates:
#   supabase/migrations/<YYYYMMDDHHMMSS>_<description>.sql
```

Edit that file with plain SQL:

```sql
-- supabase/migrations/20260501120000_add_task_priority.sql

ALTER TABLE tasks
  ADD COLUMN priority INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks (priority);
```

**Guidelines:**

- Every migration should be idempotent-friendly where reasonable (`IF NOT EXISTS`, `IF EXISTS`).
- Include any new indexes in the same migration that adds the table/column.
- Use the existing ENUM types or create new ones in the same migration that first uses them.
- Prefer `TIMESTAMPTZ` over `TIMESTAMP` for new time columns (matches existing convention).

---

## Applying Migrations Locally

```bash
# Wipe the local DB and replay init.sql + all migrations from scratch:
npm run supabase:reset          # = supabase db reset

# Or, once the stack is already running, apply pending migrations only:
supabase db push
```

`supabase db reset` is the safest way to verify a migration is self-contained — it re-applies everything on an empty database.

---

## Applying Migrations to Remote (Production / Staging)

```bash
# One-time: link the local repo to the remote Supabase project
supabase link --project-ref <project-ref>

# Push any un-applied migrations
supabase db push
```

For the Raspberry Pi self-hosted deployment, `supabase db push` is run against the Pi’s Supabase instance as part of the deployment pipeline (see [deployment.md](deployment.md)).

---

## Reviewing Diffs Before Committing

```bash
# Diff local schema vs. current migrations
supabase db diff

# Generate a new migration from schema drift (use with care — review before committing)
supabase db diff -f <description>
```

The project prefers **hand-authored** migration SQL so reviewers can read intent-clear statements rather than mechanically generated diffs. Use `supabase db diff` as a cross-check, not as the primary authoring tool.

---

## Verifying a Migration

1. `npm run supabase:reset` — replay everything clean.
2. `npm run dev:backend` — start the bot; `verifyConnection()` in `supabase/supabase.ts` will fail fast if the schema is broken.
3. `npm test` — run backend tests against the reset local stack.
4. Hit the relevant Discord command or REST endpoint to exercise the new shape end-to-end.

---

## Rolling Back

Supabase migrations are forward-only. To "roll back":

1. Create a new migration that reverses the change (e.g., `DROP COLUMN`, `DROP INDEX`).
2. Apply it via `supabase db push` (or `supabase db reset` locally).

Never edit an already-committed migration file — it breaks reproducibility for any environment that already applied it.

---

## Model Wrappers

After changing schema, update the matching model wrapper in `supabase/models/`:

- One TypeScript file per table (e.g., `Task.ts`, `Recipe.ts`).
- Keep query logic centralized here so Discord commands, Express routes, and Next.js API routes all share the same data-access layer.

---

## Environment Variables

- `SUPABASE_URL` — CLI local default is `http://127.0.0.1:54321`
- `SUPABASE_SERVICE_ROLE_KEY` — privileged (backend-only)
- `SUPABASE_ANON_KEY` — unprivileged (browser-safe)
- `SUPABASE_DB_PASSWORD` — loaded by `supabase/config.toml` via `env()`

Run `npm run supabase:status` to print the current local URL and keys.

---

## Related Documentation

- [Database Schema](../architecture/database-schema.md) — authoritative table reference
- [Deployment Guide](deployment.md)
- [Troubleshooting](troubleshooting.md)
