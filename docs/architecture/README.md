# Architecture Documentation

System architecture, design decisions, and technical specifications.

## Available Documentation

- **[Architecture Overview](overview.md)** - Complete system architecture, tech stack, and design decisions
- **[Database Schema](database-schema.md)** - Supabase-managed PostgreSQL schema with typed model wrappers, ER diagram, and query patterns (12 models)
- **[Architecture Diagrams](diagrams.md)** - Visual documentation with Mermaid diagrams: System Architecture, Component Interaction, Database ER, Authentication Flow, Deployment Architecture, Data Flow

## Architecture Topics

### System Design

- [Architecture Overview](overview.md) — High-level system architecture
- [Database Schema](database-schema.md) — Supabase-managed PostgreSQL schema (12 tables)
- API Design — REST API architecture (See [../api/](../api/))
- Authentication Flow — Google OAuth + JWT (See overview.md)

### Technology Stack

- **Backend:** Discord.js + Express + Supabase client with typed model wrappers in `supabase/models/`
- **Frontend:** Next.js 14 (App Router) + NextAuth + TanStack React Query (calls Next.js API routes that in turn use the Supabase client)
- **Shared:** TypeScript monorepo, types in `shared/`
- **Deployment:** Fly.io or Raspberry Pi (self-hosted Supabase) + Vercel (frontend)

### Design Patterns

- Monorepo Architecture (npm workspaces)
- Three-Interface Pattern (Discord Bot + API + PWA)
- Guild-based data isolation (`guild_id` filter on every query)
- OAuth + JWT auth flow
- Supabase-managed migrations (authoritative SQL in `supabase/migrations/`)

## Data Model (12 tables)

1. `users`
2. `tasks`
3. `lists`
4. `notes`
5. `reminders`
6. `budgets`
7. `schedules`
8. `event_configs` (per-guild local-events scheduler)
9. `sunset_configs` (per-guild sunset announcement scheduler)
10. `recipes`
11. `meal_plans`
12. `recipe_preferences`

See [database-schema.md](database-schema.md) for column-level detail.

## Related Documentation

- [Getting Started](../guides/getting-started.md)
- [API Documentation](../api/)
- [Reference](../reference/)

---

**Last Updated:** 2026-04-15
