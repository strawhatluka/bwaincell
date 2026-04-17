# Reference Documentation

Quick reference for CLI commands, environment variables, dependencies, glossary, and quick command lookup.

## Available References

- **[Quick Reference](quick-reference.md)** — Fast lookup for common commands, Discord commands, API endpoints, env vars, file locations
- **[Glossary](glossary.md)** — Technical terms including Supabase, RLS, Gemini, Recipe, Sunset Scheduler, MealPlan

---

## CLI Commands

### npm Scripts (Monorepo Root)

**Development:**

- `npm run dev` — Start backend and frontend concurrently
- `npm run dev:backend` — Backend only (Discord bot + API on port 3000)
- `npm run dev:frontend` — Frontend only (Next.js on port 3010)
- `npm run dev:shared` — Watch shared types

**Build:**

- `npm run build` — Build all workspaces (shared → backend → frontend)
- `npm run build:shared` / `build:backend` / `build:frontend`
- `npm run build:all` — TypeScript build for all workspaces

**Testing:**

- `npm test` / `npm run test:backend` / `npm run test:frontend`
- `npm run test:watch` — Watch mode
- `npm run test:coverage` — Coverage reports

**Linting / Formatting / Types:**

- `npm run lint` / `lint:fix` / `lint:backend` / `lint:frontend`
- `npm run typecheck` / `typecheck:watch`
- `npm run format` / `format:check`

**Cleanup:**

- `npm run clean` (and `clean:backend` / `clean:frontend` / `clean:shared`)

**Docker (backend / frontend containers only — database is Supabase):**

- `npm run docker:build` / `docker:up` / `docker:down` / `docker:logs`
- `npm run docker:backend` / `docker:frontend`

**Supabase (local stack):**

- `npm run supabase:start` — Start the Supabase local stack (Docker)
- `npm run supabase:stop` — Stop the Supabase local stack
- `npm run supabase:status` — Show URLs, anon key, service role key
- `npm run supabase:reset` — `supabase db reset` — re-run all migrations + `init.sql`

## Environment Variables

### Required Variables

**Discord Bot:**

- `BOT_TOKEN`, `CLIENT_ID`, `GUILD_ID`, `DEFAULT_REMINDER_CHANNEL`

**User Mapping (email → Discord ID):**

- `USER1_EMAIL`, `USER1_DISCORD_ID`, `USER2_EMAIL`, `USER2_DISCORD_ID`

**Google OAuth:**

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ALLOWED_GOOGLE_EMAILS`

**NextAuth (frontend):**

- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

**JWT:**

- `JWT_SECRET` (`openssl rand -base64 32`)

**API Server:**

- `API_PORT`, `PORT` (both default to 3000)

**Supabase:**

- `SUPABASE_URL` (e.g., `http://127.0.0.1:54321` for local — on the Pi runtime, set `SUPABASE_URL=http://host.docker.internal:54321` because the bot runs in Docker and needs to traverse the `host-gateway` alias to reach the Supabase Kong bound to the Pi host loopback at `:54321`)
- `SUPABASE_SERVICE_ROLE_KEY` (backend / privileged)
- `SUPABASE_ANON_KEY` (frontend / unprivileged)
- `SUPABASE_DB_PASSWORD` (loaded by `supabase/config.toml` via `env()`)

**Application Settings:**

- `TIMEZONE` (e.g., `America/Los_Angeles`)
- `DELETE_COMMAND_AFTER` (ms before auto-deleting Discord command responses)
- `NODE_ENV`, `DEPLOYMENT_MODE`

**GitHub Integration (for `/issues`):**

- `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`

**Gemini AI (for `/random`, recipe normalization, AI shopping-list):**

- `GEMINI_API_KEY`
- `LOCATION_ZIP_CODE` (used by `/random date` and location-aware prompts)

**GitHub Actions deployment secrets (stored in GitHub repo settings, NOT in `.env`):**

- `PI_HOST`, `PI_USERNAME`, `PI_SSH_KEY`, `PI_SSH_PASSPHRASE` (optional), `PI_SSH_PORT` (optional) — Pi SSH access for `deploy-supabase` / `deploy-bot` jobs.
- `PI_GHCR_TOKEN` — GitHub PAT with `read:packages` scope, used by the deploy workflow to `docker login ghcr.io` on the Pi so it can pull the bot image from `ghcr.io/strawhatluka/bwaincell-backend`. Generate at https://github.com/settings/tokens/new → scope: `read:packages`.
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — frontend deployment to Vercel.

### Generate Secrets

```bash
openssl rand -base64 32  # JWT_SECRET, NEXTAUTH_SECRET, SUPABASE_DB_PASSWORD
```

## Dependencies

### Backend / Root Production

- `discord.js` ^14.14.1 — Discord bot framework
- `express` ^4.21.2 — REST API
- `@supabase/supabase-js` (imported in `supabase/supabase.ts`) — Supabase client
- `google-auth-library` ^10.4.0, `googleapis` ^160.0.0 — OAuth
- `jsonwebtoken` ^9.0.2 — JWT
- `winston` ^3.17.0 — Logging
- `joi` ^18.0.1 — Validation
- `luxon` ^3.7.2 — DateTime + timezone
- `node-cron` ^4.2.1 — Reminder / sunset / events schedulers
- `@google/genai` ^1.40.0 — Gemini (recipe normalize, shopping list, random-date)
- `@octokit/rest` ^20.1.1 — GitHub (for `/issues`)
- `skia-canvas` ^3.0.0 — Image generation (`imageService`)

Note: `sequelize` and `pg` are still in `package.json` as a transitional dependency but the active database client is `@supabase/supabase-js`.

### Dev Tooling

- `supabase` ^2.91.0 — Supabase CLI (runs local stack + migrations)
- `typescript`, `ts-jest`, `jest`, `supertest`, `eslint`, `prettier`, `husky`, `lint-staged`
- `concurrently` — Run backend/frontend dev together

### Frontend

- `next` ^14, `react` ^18, `react-dom` ^18
- `next-auth` ^4.24.7
- `@tanstack/react-query` ^5
- `zustand` ^5
- `@supabase/supabase-js` (frontend usage via Next.js API routes and some client contexts)
- Radix UI + Tailwind + shadcn/ui

## Version Requirements

- **Node.js:** ≥ 18.0.0
- **npm:** ≥ 9.0.0
- **Supabase CLI:** ≥ 2.91
- **TypeScript:** 5.9.2 (strict mode)

## Quick Links to Specialized Guides

- [Security Best Practices — RLS, service-role vs anon](../guides/security-best-practices.md)
- [Performance Optimization](../guides/performance-optimization.md)
- [Monitoring and Logging](../guides/monitoring-and-logging.md)
- [Database Migrations (Supabase)](../guides/database-migrations.md)
- [Deployment](../guides/deployment.md)

---

**Last Updated:** 2026-04-15
