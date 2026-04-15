# Supabase Migrations

**Sources:** `supabase/migrations/`, `supabase/init.sql`

## Current Migrations

| File                                                    | Purpose                                                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `supabase/init.sql`                                     | Bootstrap SQL run against brand-new environments (mirror of migrations for first-time setup).                      |
| `supabase/migrations/20260413000000_initial_schema.sql` | Initial schema — `users`, `tasks`, `lists`, `notes`, `reminders`, `schedule`, `budget`.                            |
| `supabase/migrations/20260414000000_recipes_schema.sql` | Recipe-management tables — `recipes`, `recipe_preferences`, `meal_plans`, plus `event_config` and `sunset_config`. |

## Naming Convention

`YYYYMMDDHHMMSS_short_description.sql`. The timestamp prefix controls execution order; Supabase CLI sorts lexically. Always generate via `supabase migration new <name>` so timestamps are unique.

## Authoring Workflow

1. Make the schema change locally (either by hand-writing SQL in a new migration or by altering the DB through Studio/psql).
2. `supabase db diff -f <description>` to auto-generate a migration from pending changes, or create one manually with `supabase migration new <description>`.
3. Review the generated SQL; ensure it is idempotent where possible and guards destructive operations.
4. `supabase db reset` — drops the local DB, replays every migration, then runs `seed.sql`. This is the authoritative verification step.
5. Commit the new `.sql` file along with any corresponding TypeScript type updates in `supabase/types.ts` and model wrappers in `supabase/models/`.
6. Push via `supabase db push` (or via CI) to apply to hosted Supabase.

## Reset Flow (local)

```bash
supabase db reset      # drops + re-creates + applies migrations + seed
supabase migration up  # applies unapplied migrations without dropping
```

## Roll-Forward Only

No down-migrations are maintained; corrections are made by adding a new forward migration. `init.sql` is kept in sync with the cumulative migration state for environments that bootstrap without the CLI.

## Relationship to Models

TypeScript wrappers in `supabase/models/*.ts` are hand-written against the schema. When a migration changes a table, the matching model and the shared `supabase/types.ts` row/update/insert types must be updated in the same commit.
