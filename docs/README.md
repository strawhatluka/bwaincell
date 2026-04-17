# Documentation

Comprehensive documentation for Bwaincell — a unified monorepo productivity platform (Discord bot + REST API + Next.js PWA) backed by Supabase.

## Documentation Structure

- **[Guides](guides/)** - How-to guides and tutorials
- **[API](api/)** - REST API reference, Discord command reference, and authentication
- **[Architecture](architecture/)** - System design, Supabase schema, ADRs
- **[Reference](reference/)** - CLI commands, environment variables, glossary

## Quick Start

1. **[Getting Started](guides/getting-started.md)** - Installation, Supabase setup, and quick start
2. **[Architecture Overview](architecture/overview.md)** - System design and tech stack
3. **[API Documentation](api/)** - REST API endpoints and authentication

## Tech Stack Summary

- **Runtime:** Node.js 18+, TypeScript 5.9 (strict)
- **Backend:** Express 4.21 + Discord.js 14.14 (single process)
- **Frontend:** Next.js 14 (App Router) + React 18 + NextAuth
- **Database:** Supabase (managed PostgreSQL) with typed model wrappers in `supabase/models/` (internal workspace `@bwaincell/supabase`, imported via the `@database/*` alias)
- **AI:** Google Gemini (`@google/genai`) for recipe normalization, shopping-list generation, `/random` date suggestions
- **Scheduling:** `node-cron` for reminders, sunset announcements, event announcements
- **Deployment:** Bot image built on GitHub Actions (arm64 via Buildx + QEMU) and pushed to GHCR (`ghcr.io/strawhatluka/bwaincell-backend`); Raspberry Pi pulls the prebuilt image. Self-hosted Supabase runs alongside on the Pi; the bot reaches Kong via `host.docker.internal`. Frontend deploys to Vercel.

## Recent Updates

- **2026-04-16** — Backend now builds on GitHub Actions and deploys from GHCR (`ghcr.io/strawhatluka/bwaincell-backend`); the Pi no longer builds the image. All backend imports use the `@database/*` TypeScript alias. See [Deployment](guides/deployment.md), [CI/CD Pipeline](guides/ci-cd-pipeline.md), and [Docker Development](guides/docker-development.md).
- **2026-04-15** — Migrated database layer from Sequelize + local Docker Postgres to Supabase (managed PostgreSQL + typed model wrappers in `supabase/models/`). See [Architecture Overview](architecture/overview.md).

## Discord Commands (12)

`/budget`, `/events`, `/issues`, `/list`, `/note`, `/quote`, `/random`, `/recipe`, `/remind`, `/schedule`, `/sunset`, `/task`

See [api/discord-commands.md](api/discord-commands.md) for full reference.

## Feature Highlights

- **Task / List / Note / Reminder / Budget / Schedule** — Core productivity models shared across Discord + PWA
- **Recipe Management** — Scrape recipes from URL/video/manual, normalize ingredients via Gemini, store per guild
- **AI Shopping List** — Generate a consolidated shopping list from the active weekly meal plan (ingredient canonicalization + Gemini-assisted merging)
- **Weekly Meal Plans** — One active meal plan per guild, 7 recipe slots with per-slot serving overrides
- **Sunset Scheduler** — `/sunset` configures per-guild daily sunset announcements (zip-code lookup + node-cron)
- **Local Events** — `/events` configures weekly local-events announcements per guild
- **Google OAuth + JWT** — Email/Discord-ID mapping, NextAuth on the frontend, JWT for backend REST

## Documentation Categories

### Guides

- [Getting Started](guides/getting-started.md) — Installation and Supabase setup
- [Troubleshooting](guides/troubleshooting.md)
- [FAQ](guides/faq.md)
- [Security Best Practices](guides/security-best-practices.md) — Includes Supabase RLS guidance
- [Performance Optimization](guides/performance-optimization.md)
- [Monitoring and Logging](guides/monitoring-and-logging.md)
- [CI/CD Pipeline](guides/ci-cd-pipeline.md)
- [PWA Features](guides/pwa-features.md)
- [Docker Development](guides/docker-development.md)
- [API Development](guides/api-development.md)
- [Discord Bot Development](guides/discord-bot-development.md)
- [Testing](guides/testing.md)
- [Deployment](guides/deployment.md)
- [Database Migrations](guides/database-migrations.md)

### API Documentation

- [API Overview](api/) — Authentication flow, response format, endpoint groups
- [Discord Bot Commands](api/discord-commands.md) — All 12 commands
- Endpoint groups covered: Tasks, Lists, Notes, Reminders, Budget, Schedule, Recipes, MealPlans, Sunset, Events

### Architecture

- [Architecture Overview](architecture/overview.md)
- [Database Schema](architecture/database-schema.md) — 12 tables, Supabase migrations
- [Architecture Diagrams](architecture/diagrams.md)

### Reference

- [Reference Documentation](reference/)
- [Quick Reference](reference/quick-reference.md)
- [Glossary](reference/glossary.md)

## Documentation Index

**Guides (14):** see above

**API (2):**

- [API Documentation](api/)
- [Discord Bot Commands](api/discord-commands.md)

**Architecture (3):**

- [Architecture Overview](architecture/overview.md)
- [Database Schema](architecture/database-schema.md)
- [Architecture Diagrams](architecture/diagrams.md)

**Reference (3):**

- [Reference Documentation](reference/)
- [Quick Reference](reference/quick-reference.md)
- [Glossary](reference/glossary.md)

## Additional Resources

- **[README.md](../README.md)** - Project overview
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Contribution guidelines
- **[.env.example](../.env.example)** - Environment variable template

### External Links

- GitHub Repository: [github.com/strawhatluka/bwaincell](https://github.com/strawhatluka/bwaincell)
- Discord.js: [discord.js.org](https://discord.js.org/)
- Next.js: [nextjs.org/docs](https://nextjs.org/docs)
- Supabase: [supabase.com/docs](https://supabase.com/docs)
- Google Gemini (`@google/genai`): [ai.google.dev](https://ai.google.dev/)

## Contributing to Documentation

1. Use clear, concise language
2. Include code examples where applicable
3. Link to related documentation
4. Update the index when adding new files
5. Follow Markdown best practices
6. Test all code examples before committing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for general contribution guidelines.

## Support

- **Issues:** [GitHub Issues](https://github.com/strawhatluka/bwaincell/issues)
- **Questions:** [GitHub Discussions](https://github.com/strawhatluka/bwaincell/discussions)

---

**Last Updated:** 2026-04-16
**Version:** 2.2.0
**Maintained by:** [strawhatluka](https://github.com/strawhatluka)
