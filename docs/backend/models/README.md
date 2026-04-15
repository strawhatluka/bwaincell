# Backend Models

One file per Supabase-backed model. All models live in `supabase/models/*.ts` and expose static methods over the Supabase client (`supabase/supabase.ts`). Schema migrations are in `supabase/migrations/`.

## Index

| Model | Table | Primary Key | Isolation | Related Commands |
| ----- | ----- | ----------- | --------- | ---------------- |
| [User](./User.md) | `users` | `id` (SERIAL), `google_id` UNIQUE, `email` UNIQUE | Global (OAuth identity) | Web dashboard login |
| [Task](./Task.md) | `tasks` | `id` | `guild_id` | `/task` |
| [List](./List.md) | `lists` | `id` | `guild_id` (case-insensitive `name`) | `/list` |
| [Note](./Note.md) | `notes` | `id` | `guild_id` | `/note` |
| [Reminder](./Reminder.md) | `reminders` | `id` | `guild_id` | `/remind` |
| [Schedule](./Schedule.md) | `schedules` | `id` | `guild_id` | `/schedule` |
| [Budget](./Budget.md) | `budgets` | `id` | `guild_id` | `/budget` |
| [Recipe](./Recipe.md) | `recipes` | `id` | `guild_id` | `/recipe` |
| [MealPlan](./MealPlan.md) | `meal_plans` | `id` (one active per guild) | `guild_id` | `/recipe plan` / `/recipe week` |
| [RecipePreferences](./RecipePreferences.md) | `recipe_preferences` | `id`, UNIQUE `guild_id` | `guild_id` | `/recipe preferences` |
| [SunsetConfig](./SunsetConfig.md) | `sunset_configs` | `id`, UNIQUE `guild_id` | `guild_id` | `/sunset` |
| [EventConfig](./EventConfig.md) | `event_configs` | `id`, UNIQUE `guild_id` | `guild_id` | `/events` |

## Cross-cutting conventions

- `guild_id` is the household tenancy key. All query helpers filter by it (see WO-015).
- `user_id` is stored for audit trail only; it is NOT used for access control.
- Timestamps are `TIMESTAMPTZ` everywhere; the app uses Luxon with `process.env.TIMEZONE` (default `America/Los_Angeles`) for human-facing calculations.
- `PGRST116` is the Supabase "no rows found" error — models treat it as `null`.

## See Also

- Migrations: `supabase/migrations/`
- Supabase client: `supabase/supabase.ts`
- Types: `supabase/types.ts`
