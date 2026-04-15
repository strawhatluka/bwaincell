# Architecture Overview

**Project:** Bwaincell
**Type:** Node.js Monorepo
**Framework:** Discord.js + Express + Next.js
**Version:** 2.1.2
**Last Updated:** 2026-04-15

## System Overview

Bwaincell is a unified monorepo productivity platform providing task management, reminders, lists, notes, budgets, scheduling, recipe management, AI-generated shopping lists, and daily sunset/local-events announcements through three integrated interfaces: **Discord Bot**, **REST API**, and **Progressive Web App**.

All three interfaces share the same Supabase-managed PostgreSQL database. Data is isolated per Discord guild (household-model); `user_id` is retained for audit trail.

## Technology Stack

- **Runtime:** Node.js 18+
- **Package Manager:** npm 9+ (workspaces)
- **Database:** Supabase (managed PostgreSQL) — authoritative schema in `supabase/init.sql` and `supabase/migrations/*.sql`
- **DB Client:** `@supabase/supabase-js` via `supabase/supabase.ts` (lazy-initialized proxied client)
- **Model Layer:** Typed model wrappers in `supabase/models/` — one file per entity

### Backend Stack

- **Discord:** `discord.js` ^14.14.1
- **HTTP:** `express` ^4.21.2
- **Auth:** `google-auth-library` ^10.4.0 + `jsonwebtoken` ^9.0.2
- **Validation:** `joi` ^18.0.1
- **Logging:** `winston` ^3.17.0
- **Scheduling:** `node-cron` ^4.2.1 (reminders, sunset, events, release announcements)
- **AI:** `@google/genai` ^1.40.0 (recipe normalization, shopping-list generation, `/random` suggestions)
- **Image generation:** `skia-canvas` ^3.0.0 (sunset graphics via `imageService`)
- **GitHub Integration:** `@octokit/rest` ^20.1.1 (for `/issues` command)

### Frontend Stack

- **Framework:** Next.js 14 (App Router) + React 18
- **PWA:** `next-pwa`
- **Auth:** NextAuth 4.24.x (Google provider)
- **State:** Zustand + TanStack React Query
- **UI:** Radix UI + shadcn/ui + Tailwind CSS
- **Supabase:** `@supabase/supabase-js` via Next.js API routes and server components

Note: Some earlier documentation referenced Prisma on the frontend. That integration has been removed; the frontend now talks to Supabase directly from its Next.js API routes and hooks.

### Shared

- **TypeScript:** 5.9.2 (strict)
- **Lint/Format:** ESLint + Prettier
- **Testing:** Jest 30 + ts-jest + supertest
- **Supabase CLI:** ^2.91 (local stack + migrations)

## Architecture Pattern

**Pattern:** Monorepo with Workspaces

- **backend/** — Express API + Discord bot (single process)
- **frontend/** — Next.js 14 PWA
- **shared/** — Shared TypeScript types and utilities
- **supabase/** — Supabase configuration, migrations, seed, and typed model wrappers

### Three-Interface Architecture

1. **Discord Bot** — Primary interface via Discord slash commands (12 commands)
2. **REST API** — Express-based API for programmatic access
3. **PWA** — Next.js frontend for web/mobile access

All three interfaces read/write the same Supabase tables. Data isolation is enforced in application code by filtering on `guild_id` (and sometimes `user_id`).

## Directory Structure

```
bwaincell/
├── backend/
│   ├── src/
│   │   ├── bot.ts                 # Discord bot entry point
│   │   ├── api/
│   │   │   ├── server.ts          # Express server configuration
│   │   │   ├── routes/            # tasks, lists, notes, reminders, budget, schedule, oauth, health
│   │   │   └── middleware/        # auth, oauth
│   │   └── deploy-commands.ts
│   ├── commands/                  # 12 Discord slash commands
│   │   ├── budget.ts
│   │   ├── events.ts
│   │   ├── issues.ts
│   │   ├── list.ts
│   │   ├── note.ts
│   │   ├── quote.ts
│   │   ├── random.ts
│   │   ├── recipe.ts
│   │   ├── remind.ts
│   │   ├── schedule.ts
│   │   ├── sunset.ts
│   │   └── task.ts
│   ├── utils/
│   │   ├── interactions/handlers/ # listHandlers, recipeHandlers, reminderHandlers, taskHandlers, randomHandlers, selectMenuHandlers
│   │   ├── scheduler.ts           # Cron job scheduler
│   │   ├── sunsetService.ts       # Sunset announcement scheduling
│   │   ├── eventsService.ts       # Local-events announcement scheduling
│   │   ├── geminiService.ts       # Gemini (@google/genai) client
│   │   ├── shoppingList.ts        # AI shopping-list generation
│   │   ├── recipeScraper.ts       # Recipe ingestion from URL
│   │   ├── recipeIngestion.ts
│   │   ├── recipeNormalize.ts
│   │   ├── ingredientCanonical.ts
│   │   ├── recipeData.ts
│   │   ├── releaseAnnouncer.ts
│   │   ├── githubService.ts
│   │   ├── googleServices.ts
│   │   ├── imageService.ts        # Sunset image rendering
│   │   └── dateHelpers.ts, fractionFormat.ts, validators.ts
│   └── shared/
├── frontend/
│   ├── app/
│   │   ├── dashboard/            # tasks, lists, notes, reminders, budget pages
│   │   ├── api/                  # Next.js API routes (auth, tasks, lists, notes, reminders, schedule, budget)
│   │   ├── login/, privacy/, terms/
│   │   └── layout.tsx
│   ├── components/               # tasks, budget, lists, notes, reminders, common, layout, ui
│   ├── hooks/                    # useAuth, useBudget, useDarkMode, useInstallPrompt, useLists, useNotes, useOnlineStatus, useReminders, useSchedule, useTasks, use-toast
│   ├── contexts/                 # AuthContext
│   └── lib/                      # api.ts, utils.ts, google/
├── supabase/
│   ├── config.toml               # Supabase CLI config
│   ├── init.sql                  # Initial bootstrap SQL (superset of first migration)
│   ├── migrations/               # Timestamped migration files (YYYYMMDDHHMMSS_description.sql)
│   │   ├── 20260413000000_initial_schema.sql
│   │   └── 20260414000000_recipes_schema.sql
│   ├── models/                   # Typed model wrappers (12 models)
│   │   ├── User.ts
│   │   ├── Task.ts
│   │   ├── List.ts
│   │   ├── Note.ts
│   │   ├── Reminder.ts
│   │   ├── Schedule.ts
│   │   ├── Budget.ts
│   │   ├── EventConfig.ts
│   │   ├── SunsetConfig.ts
│   │   ├── Recipe.ts
│   │   ├── MealPlan.ts
│   │   └── RecipePreferences.ts
│   └── supabase.ts               # Lazy-initialized Supabase client (Proxy)
├── shared/
├── tests/
├── docker-compose.yml            # Backend + frontend containers (Supabase runs its own stack)
├── .env.example                  # Environment template
└── package.json                  # Monorepo workspace config
```

## Entry Points

- **Backend:** `backend/src/bot.ts` (boots Discord client + Express + cron schedulers)
- **API Server:** `backend/src/api/server.ts`
- **Frontend:** `frontend/app/page.tsx`

## Data Model (12 tables)

1. `users`
2. `tasks`
3. `lists`
4. `notes`
5. `reminders`
6. `budgets`
7. `schedules`
8. `event_configs` _(new)_
9. `sunset_configs` _(new)_
10. `recipes` _(new)_
11. `meal_plans` _(new)_
12. `recipe_preferences` _(new)_

Schema authoritative source: `supabase/migrations/20260413000000_initial_schema.sql` + `20260414000000_recipes_schema.sql`. See [database-schema.md](database-schema.md).

## Feature Highlights

### Recipe Management

- Ingest recipes from URL / video / file / manual entry via `recipeScraper.ts` + `recipeIngestion.ts`
- Normalize ingredients with Gemini (`geminiService.ts` + `recipeNormalize.ts` + `ingredientCanonical.ts`)
- Recipes are shared per guild (household model) and stored in `recipes` with ingredients as JSONB

### AI Shopping List

- `shoppingList.ts` pulls the active `meal_plans` row for a guild, fans out to `recipes`, canonicalizes ingredients, then uses Gemini to merge/deduplicate into a consolidated shopping list

### Weekly Meal Plans

- Exactly one active meal plan per guild (`archived = FALSE`, enforced by partial unique index)
- 7-slot arrays: `recipe_ids INTEGER[]` parallel to `servings_per_recipe INTEGER[]`

### Sunset Scheduler (`/sunset`)

- Per-guild row in `sunset_configs` (`advance_minutes`, `channel_id`, `zip_code`, `timezone`, `is_enabled`)
- `sunsetService.ts` + `node-cron` schedule a daily calculation and announcement
- Image generated via `skia-canvas` (`imageService.ts`)

### Local Events (`/events`)

- Per-guild row in `event_configs` (`location`, `announcement_channel_id`, `schedule_day/hour/minute`, `timezone`)
- `eventsService.ts` + `node-cron` post weekly events round-ups

### GitHub Issues (`/issues`)

- `githubService.ts` + `@octokit/rest` — file issues directly from Discord

### `/random` / `/quote`

- `/random` uses Gemini + `LOCATION_ZIP_CODE` for date suggestions
- `/quote` stores and retrieves community quotes

## Data Flow

### Discord Bot → Supabase

1. User issues slash command (e.g., `/task add`)
2. Discord.js handles interaction
3. Command handler in `backend/commands/` executes
4. Supabase model wrapper (`supabase/models/*.ts`) issues query via `supabase-js`
5. Response sent back to Discord user

### REST API → Supabase

1. Client sends authenticated HTTP request (JWT)
2. Express middleware (`backend/src/api/middleware/`) validates JWT
3. Route handler in `backend/src/api/routes/` executes
4. Supabase model wrapper queries/updates Supabase
5. JSON response returned to client

### PWA → Next.js API Routes → Supabase

1. User interacts with Next.js PWA
2. React Query hook (e.g., `useTasks`) calls Next.js API route under `frontend/app/api/`
3. API route authenticates via NextAuth session and queries Supabase with `supabase-js`
4. Data returned to PWA; React Query caches it

## User Isolation

All domain tables include `guild_id`. Most also include `user_id` (creator / audit trail). Queries filter by `guild_id` for shared household access (WO-015):

```typescript
// Example: supabase/models/Task.ts
const { data } = await supabase
  .from('tasks')
  .select('*')
  .eq('guild_id', guildId)
  .order('created_at', { ascending: false });
```

## Authentication & Authorization

### Backend Auth Flow

1. PWA user signs in with Google via NextAuth
2. Frontend receives Google ID token
3. Frontend POSTs to `/api/auth/google/verify`
4. Backend verifies token with `google-auth-library`
5. Backend maps Google email → Discord user ID (via `USER1_EMAIL` / `USER2_EMAIL` env mapping)
6. Backend issues JWT access token (1h) + refresh token (7d)
7. Subsequent requests carry `Authorization: Bearer <token>`

### JWT Token Structure

**Access Token (1h):**

```json
{ "userId": "123456789", "email": "user@gmail.com", "guildId": "987654321", "iat": ..., "exp": ... }
```

**Refresh Token (7d):**

```json
{ "userId": "123456789", "type": "refresh", "iat": ..., "exp": ... }
```

## Configuration

- **`.env.example`** — Canonical list of all env vars (Discord, Supabase, Google OAuth, NextAuth, Gemini, GitHub, JWT, timezone, deployment)
- **`supabase/config.toml`** — Supabase CLI configuration; references `SUPABASE_DB_PASSWORD` via `env()`
- **`backend/config/config.ts`** — Loads and validates runtime configuration
- **`docker-compose.yml`** — Backend + frontend containers. Supabase runs its own container stack managed by the Supabase CLI (`supabase start`).

## Build & Deployment

### Development

```bash
npm run supabase:start      # Start local Supabase stack (once)
npm run dev                 # Backend + frontend concurrently
```

### Production (Raspberry Pi + Vercel)

- **Backend:** Raspberry Pi 4B running Docker (backend container) + self-hosted Supabase (managed via `supabase start` on the same Pi)
- **Frontend:** Vercel (automatic on release)
- **GitHub Actions:** `.github/workflows/deploy.yml` → deploy job (Pi via SSH) + deploy-vercel job

See [guides/deployment.md](../guides/deployment.md).

## Performance Targets

- Discord commands: < 3s
- REST endpoints: < 500ms
- PWA page load: < 2s
- DB queries: < 100ms

## Security

- Google OAuth 2.0 for user authentication
- JWT tokens signed with HS256
- Email whitelist (`ALLOWED_GOOGLE_EMAILS`)
- Supabase **service-role key** used only on the server (never shipped to the client); **anon key** used from the browser
- CORS restricted to known origins
- Input validation with Joi
- Discord bot token never exposed to the frontend
- See [guides/security-best-practices.md](../guides/security-best-practices.md) for RLS guidance

## Monitoring & Logging

- **Backend:** Winston (structured JSON)
- **Supabase:** logs + PostgREST logs via Supabase Dashboard
- **Frontend:** browser console + error boundaries
- **Health Check:** `GET /health`

## Testing

- **Backend:** Jest + ts-jest + supertest
- **Local DB for tests:** Supabase local stack (`npm run supabase:start`) + `supabase db reset` between test runs
- **Commands:** `npm test`, `npm run test:watch`, `npm run test:coverage`

## Known Limitations

- Single active meal plan per guild
- No real-time push between Discord and PWA (polling + cache invalidation only)
- Email whitelist is env-based
- No horizontal scaling; single Pi deployment

## Future Enhancements

- WebSocket / Supabase Realtime subscriptions
- Multi-household (multi-guild) support per user
- Admin dashboard
- Rate limiting

---

For API documentation, see [../api/](../api/).
For getting started, see [../guides/getting-started.md](../guides/getting-started.md).
