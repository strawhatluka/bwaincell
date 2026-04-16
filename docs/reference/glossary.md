# Glossary

**Version:** 2.2.0
**Last Updated:** 2026-04-16

> **Supabase update (2026-04-15):** Any `backend/database/` references later in this file are stale — the current schema + typed model wrappers live under `supabase/` (`supabase/migrations/`, `supabase/models/`, `supabase/supabase.ts`).

## Added / Updated Terms

- **`@bwaincell/supabase`** — The internal monorepo workspace (name in `supabase/package.json`) containing the Supabase client, migrations, and typed models. Compiled to `supabase/dist/` via `npx tsc --build supabase`; at runtime, `main: dist/index.js` is loaded.
- **`@database/*`** — TypeScript path alias defined in `backend/tsconfig.json` (`"@database/*": ["../supabase/*"]`). Used by all backend code to import Supabase models, the client, and types, e.g. `import Task from '@database/models/Task'`. Do not bypass this alias with raw relative paths — `tsc` does not rewrite cross-workspace relative imports, so the compiled JS breaks at runtime.
- **GHCR (GitHub Container Registry)** — `ghcr.io`. Hosts the prebuilt `bwaincell-backend` image tagged `:latest` (most recent successful build) and `:<git-sha>` (immutable per-commit). The Pi pulls this image at deploy time; it never builds locally.
- **`host.docker.internal`** — Docker DNS alias mapped via `extra_hosts: ["host.docker.internal:host-gateway"]` in `docker-compose.yml`. Lets the bot container reach services bound to the Pi host loopback (the self-hosted Supabase Kong at `:54321`). Required because the bot container and the Supabase stack are in separate compose projects / networks.
- **`PI_GHCR_TOKEN`** — GitHub repository secret storing a Personal Access Token with `read:packages` scope. Used by the `deploy-bot` workflow to `docker login ghcr.io` on the Pi so it can pull the bot image.
- **Supabase** — Managed PostgreSQL + PostgREST + GoTrue + Studio stack used by Bwaincell for all persistence. Local dev via `supabase start` (Docker); production self-hosted on the Pi.
- **Supabase CLI** — `supabase` command-line tool that runs the local stack, applies migrations (`supabase db push` / `supabase db reset`), and manages project links.
- **Row Level Security (RLS)** — PostgreSQL feature that enforces per-row access policies at the database level. Not yet enabled in Bwaincell's migrations; isolation is currently done in application code with the service-role key.
- **Anon Key (`SUPABASE_ANON_KEY`)** — Browser-safe Supabase key; subject to RLS.
- **Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`)** — Privileged Supabase key that bypasses RLS. **Server-side only.**
- **PostgREST** — Supabase's REST-over-Postgres layer; every `supabase-js` query is translated to a PostgREST request.
- **Gemini / `@google/genai`** — Google's LLM API used by `geminiService.ts` for `/random`, recipe ingredient normalization, and AI shopping-list generation.
- **Recipe** — Row in `recipes` table; shared per guild; ingredients/instructions stored as JSONB.
- **Recipe Ingestion** — Pipeline (`recipeScraper.ts` → `recipeIngestion.ts` → `recipeNormalize.ts` → persist) that captures a recipe from URL/video/file/manual input and canonicalizes its ingredients.
- **Ingredient Canonicalization** — Process in `ingredientCanonical.ts` that standardizes ingredient names/units/quantities before storage.
- **MealPlan** — Row in `meal_plans`; one active plan per guild (enforced by partial unique index `idx_meal_plans_guild_active`). Holds parallel 7-slot arrays `recipe_ids` and `servings_per_recipe`.
- **RecipePreferences** — Per-guild row holding `dietary_restrictions` and `excluded_cuisines` (JSONB) used during recipe suggestion.
- **Shopping List (AI)** — Output of `shoppingList.ts`: consolidates ingredients from the active meal plan, scales by servings, canonicalizes, and merges via Gemini.
- **Sunset Scheduler** — `backend/utils/sunsetService.ts` + `node-cron` combination that posts daily "sunset soon" announcements per guild based on `sunset_configs`.
- **EventConfig** — Row in `event_configs`; per-guild local-events announcement scheduling. Consumed by `eventsService.ts`.

Comprehensive glossary of technical terms, project-specific concepts, and acronyms used in Bwaincell documentation and codebase.

---

## Project-Specific Terms

### App Router

Next.js 14+ routing system using the `app/` directory instead of `pages/`. Bwaincell frontend uses App Router with React Server Components and Server Actions.

**Related:** [Next.js](#nextjs), [Server Component](#server-component)
**Reference:** [Next.js App Router Documentation](https://nextjs.org/docs/app)

---

### Autocomplete

Discord.js feature that provides real-time suggestions as users type slash command options. Bwaincell implements autocomplete for task IDs, list names, note titles, and reminder IDs.

**Example:** Typing `/task done` shows pending tasks with IDs and descriptions
**Related:** [Slash Command](#slash-command), [Discord.js](#discordjs)
**Code:** `backend/commands/task.ts` → `autocomplete()` function

---

### Button Interaction

Discord interactive component that triggers actions when clicked. Bwaincell uses buttons for task completion, list management, and navigation.

**Example:** "Mark as Done" button on task embed
**Related:** [Interaction](#interaction), [Embed](#embed), [Modal](#modal)
**Code:** `backend/utils/interactions/` → button handlers

---

### Channel ID

Discord unique identifier (snowflake) for text channels. Bwaincell stores channel IDs for reminder announcements.

**Format:** 18-19 digit numeric string (e.g., "123456789012345678")
**Related:** [Snowflake](#snowflake), [Guild ID](#guild-id), [User ID](#user-id)

---

### CORS (Cross-Origin Resource Sharing)

HTTP security mechanism that allows requests from specific origins. Bwaincell backend allows requests from `http://localhost:3010` (dev) and `https://bwaincell.sunny-stack.com` (prod).

**Configuration:** `backend/src/api/server.ts` → `cors()` middleware
**Related:** [REST API](#rest-api), [Middleware](#middleware)
**Reference:** [Troubleshooting - CORS Errors](../guides/troubleshooting.md#issue-34-cors-errors-on-login)

---

### Deferral

Discord interaction acknowledgment that must occur within 3 seconds. Bwaincell immediately defers all interactions to prevent timeout errors.

```typescript
await interaction.deferReply(); // Must be within 3 seconds
```

**Related:** [Interaction](#interaction), [Unknown Interaction Error](#unknown-interaction-error)
**Reference:** [Discord Commands - Behavior](../api/discord-commands.md)

---

### Discord.js

Node.js library for interacting with Discord API. Bwaincell uses Discord.js 14.14.1 for bot implementation.

**Version:** 14.14.1
**Features:** Slash commands, buttons, modals, embeds, autocomplete
**Related:** [Slash Command](#slash-command), [Interaction](#interaction)
**Reference:** [Discord.js Documentation](https://discord.js.org/)

---

### Embed

Discord rich message format with title, description, fields, color, footer, and thumbnail. Bwaincell uses embeds for all command responses.

**Example:** Task list embed with color-coded status
**Related:** [Interaction](#interaction), [Button Interaction](#button-interaction)
**Code:** `backend/utils/embedBuilder.ts`

---

### ER Diagram (Entity-Relationship Diagram)

Visual representation of database schema showing tables and relationships. Bwaincell ER diagram includes 6 core tables: Users, Tasks, Lists, Notes, Reminders, Schedules.

**Format:** Mermaid diagram in documentation
**Related:** [Database Schema](#database-schema), [Sequelize](#sequelize)
**Reference:** [Database Schema](../architecture/database-schema.md#entity-relationship-diagram)

---

### Guild

Discord server where bot operates. Bwaincell isolates data by guild_id for multi-tenant support.

**Synonyms:** Discord Server
**Related:** [Guild ID](#guild-id), [Multi-Tenant](#multi-tenant)

---

### Guild ID

Discord unique identifier (snowflake) for servers/guilds. Bwaincell uses guild_id to isolate data between Discord servers.

**Format:** 18-19 digit numeric string (e.g., "987654321098765432")
**Usage:** All database queries filter by `guild_id`
**Related:** [Guild](#guild), [User ID](#user-id), [Data Isolation](#data-isolation)

---

### Hydration

React process of attaching event handlers to server-rendered HTML. Bwaincell frontend uses Next.js hydration with SSR.

**Error:** "Hydration failed" occurs when server and client HTML don't match
**Related:** [SSR (Server-Side Rendering)](#ssr-server-side-rendering), [Next.js](#nextjs)
**Reference:** [Troubleshooting - Hydration Failed](../guides/troubleshooting.md#issue-52-hydration-failed-errors)

---

### Interaction

Discord event triggered by user actions (slash commands, buttons, modals, select menus). Bwaincell handles interactions via Discord.js event listeners.

**Types:** Command, Button, Modal, SelectMenu, Autocomplete
**Related:** [Slash Command](#slash-command), [Button Interaction](#button-interaction), [Deferral](#deferral)
**Code:** `backend/src/bot.ts` → `client.on('interactionCreate')`

---

### JSONB

PostgreSQL data type for storing JSON with indexing and querying support. Bwaincell uses JSONB for list items (flexible schema).

**Example:** List items array stored as JSONB in `lists.items` column
**Related:** [PostgreSQL](#postgresql), [Sequelize](#sequelize)
**Reference:** [Database Schema - Lists](../architecture/database-schema.md#3-lists)

---

### JWT (JSON Web Token)

Authentication token format for stateless authentication. Bwaincell uses JWT for REST API authentication (1 hour access, 7 days refresh).

**Format:** Header.Payload.Signature (Base64-encoded)
**Algorithm:** HS256 (HMAC SHA-256)
**Related:** [OAuth 2.0](#oauth-20), [Refresh Token](#refresh-token)
**Reference:** [API Documentation - Authentication](../api/README.md#authentication)

---

---

### Modal

Discord dialog box for collecting user input (forms). Bwaincell uses modals for editing tasks, adding list items, and creating notes.

**Example:** Edit Task modal with text input field
**Limitation:** Buttons that open modals must NOT defer interaction
**Related:** [Interaction](#interaction), [Button Interaction](#button-interaction)
**Code:** `backend/utils/interactions/modalHandler.ts`

---

### Monorepo

Repository containing multiple packages/workspaces. Bwaincell is a monorepo with `backend/`, `frontend/`, and `shared/` workspaces.

**Tool:** npm workspaces
**Benefits:** Shared types, atomic commits, single CI/CD
**Related:** [Workspace](#workspace), [Shared Types](#shared-types)
**Reference:** [Architecture - Monorepo Pattern](../architecture/overview.md#architecture-pattern)

---

### Multi-Tenant

Architecture pattern supporting multiple users/organizations with data isolation. Bwaincell uses guild_id for multi-tenant data isolation.

**Implementation:** All database queries filter by `guild_id`
**Related:** [Guild ID](#guild-id), [Data Isolation](#data-isolation)
**Reference:** [Database Schema - Data Isolation](../architecture/database-schema.md#data-isolation)

---

### Next.js

React framework for server-side rendering, static generation, and API routes. Bwaincell frontend uses Next.js 14.2+ with App Router.

**Version:** 14.2.35
**Features:** App Router, Server Components, Server Actions, PWA support
**Related:** [App Router](#app-router), [SSR](#ssr-server-side-rendering), [PWA](#pwa-progressive-web-app)
**Reference:** [Next.js Documentation](https://nextjs.org/)

---

### OAuth 2.0

Industry-standard authorization protocol. Bwaincell uses Google OAuth 2.0 for user authentication.

**Flow:** User → Google Login → ID Token → Backend Verification → JWT Token
**Library:** google-auth-library 10.4.0
**Related:** [JWT](#jwt-json-web-token), [Refresh Token](#refresh-token)
**Reference:** [API Documentation - Authentication Flow](../api/README.md#authentication-flow)

---

### ORM (Object-Relational Mapping)

Programming technique for converting database data to objects. Bwaincell uses Sequelize ORM for PostgreSQL.

**Example:** `Task.findAll()` converts database rows to Task objects
**Related:** [Sequelize](#sequelize), [PostgreSQL](#postgresql)
**Reference:** [Database Schema](../architecture/database-schema.md)

---

### PostgreSQL

Production-grade relational database management system. Bwaincell uses PostgreSQL 15+ for data persistence.

**Version:** 15-alpine (Docker image)
**Features:** ACID compliance, JSONB, array types, full-text search
**Related:** [Sequelize](#sequelize), [Database Schema](#database-schema)
**Reference:** [Getting Started - Database Setup](../guides/getting-started.md#database-setup)

---

### PWA (Progressive Web App)

Web application that can be installed like native apps. Bwaincell frontend is a PWA with offline support and app manifest.

**Features:** Installable, offline support, push notifications (future)
**Technology:** Next.js + next-pwa 5.6.0
**Related:** [Next.js](#nextjs), [Service Worker](#service-worker)
**Files:** `frontend/public/manifest.json`, `frontend/public/sw.js`

---

### Refresh Token

Long-lived token for obtaining new access tokens. Bwaincell refresh tokens expire after 7 days.

**Usage:** Frontend automatically refreshes access tokens using refresh token
**Storage:** Database (`users.refresh_token` column) and localStorage (frontend)
**Related:** [JWT](#jwt-json-web-token), [OAuth 2.0](#oauth-20)
**Reference:** [API Documentation - Refresh Token](../api/README.md#refresh-jwt-token)

---

### REST API

Architectural style for web services using HTTP methods. Bwaincell provides REST API for programmatic access.

**Base URL:** `http://localhost:3000` (dev), `https://bwaincell.fly.dev` (prod)
**Methods:** GET, POST, PATCH, DELETE
**Authentication:** JWT Bearer token
**Related:** [JWT](#jwt-json-web-token), [CORS](#cors-cross-origin-resource-sharing)
**Reference:** [API Documentation](../api/README.md)

---

### Select Menu

Discord dropdown menu for choosing from multiple options. Bwaincell uses select menus for task/list quick actions.

**Limitation:** Maximum 25 options
**Related:** [Interaction](#interaction), [Autocomplete](#autocomplete)
**Code:** `backend/utils/interactions/selectMenuHandler.ts`

---

### Sequelize

TypeScript/JavaScript ORM for SQL databases. Bwaincell uses Sequelize 6.37.7 for PostgreSQL operations.

**Version:** 6.37.7
**Features:** Models, migrations, associations, transactions, query building
**Related:** [PostgreSQL](#postgresql), [ORM](#orm-object-relational-mapping)
**Reference:** [Database Schema - Model Initialization](../architecture/database-schema.md#model-initialization)

---

### Server Component

React Server Components (RSC) render on server and stream to client. Bwaincell frontend uses RSC for dashboard pages.

**Benefits:** Zero JavaScript bundle, direct database access, improved performance
**Related:** [Next.js](#nextjs), [App Router](#app-router), [SSR](#ssr-server-side-rendering)
**Reference:** [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)

---

### Service Worker

Background script for PWA features (offline support, caching, push notifications). Bwaincell uses next-pwa for service worker generation.

**File:** `frontend/public/sw.js` (auto-generated)
**Related:** [PWA](#pwa-progressive-web-app), [Next.js](#nextjs)

---

### Shared Types

TypeScript type definitions shared across backend and frontend. Bwaincell stores shared types in `shared/types/`.

**Examples:** TaskAttributes, ListAttributes, NoteAttributes
**Build:** `npm run build:shared` (required before backend/frontend)
**Related:** [Monorepo](#monorepo), [Workspace](#workspace)
**Reference:** [Architecture - Monorepo](../architecture/overview.md#directory-structure)

---

### Slash Command

Discord command invoked with `/` prefix. Bwaincell provides 7 slash commands: task, list, note, remind, budget, schedule, random.

**Format:** `/command subcommand <required> [optional]`
**Example:** `/task add description:"Buy groceries" date:"01-15-2026"`
**Related:** [Discord.js](#discordjs), [Interaction](#interaction), [Autocomplete](#autocomplete)
**Reference:** [Discord Commands Reference](../api/discord-commands.md)

---

### Snowflake

Discord unique identifier format (64-bit integer represented as string). Used for user IDs, guild IDs, channel IDs, message IDs.

**Format:** 18-19 digit numeric string
**Example:** "123456789012345678"
**Related:** [Guild ID](#guild-id), [User ID](#user-id), [Channel ID](#channel-id)

---

### SSR (Server-Side Rendering)

Technique for rendering React components on server before sending to client. Bwaincell frontend uses Next.js SSR for initial page load.

**Benefits:** Faster initial load, SEO-friendly, improved performance
**Related:** [Next.js](#nextjs), [Hydration](#hydration), [Server Component](#server-component)

---

### TypeScript

Superset of JavaScript with static type checking. Bwaincell is written in TypeScript 5.9.2 with strict mode.

**Version:** 5.9.2
**Mode:** Strict (strict type checking enabled)
**Benefits:** Type safety, IntelliSense, refactoring support
**Related:** [Shared Types](#shared-types), [Monorepo](#monorepo)

---

### Unknown Interaction Error

Discord error when interaction acknowledgment takes >3 seconds. Bwaincell prevents this by immediately deferring all interactions.

**Error Message:** "This interaction failed" or "Unknown interaction"
**Solution:** Ensure `interaction.deferReply()` is called within 3 seconds
**Related:** [Deferral](#deferral), [Interaction](#interaction)
**Reference:** [Troubleshooting - Unknown Interaction Errors](../guides/troubleshooting.md#issue-12-unknown-interaction-errors)

---

### User ID

Discord unique identifier (snowflake) for users. Bwaincell stores user_id for data isolation and audit trails.

**Format:** 18-19 digit numeric string (e.g., "123456789")
**Usage:** All database records include `user_id` column
**How to Get:** Right-click user in Discord → Copy ID (requires Developer Mode)
**Related:** [Snowflake](#snowflake), [Guild ID](#guild-id), [Data Isolation](#data-isolation)

---

### Workspace

npm workspaces feature for managing monorepo packages. Bwaincell has 3 workspaces: backend, frontend, shared.

**Commands:**

- `npm run dev --workspace=backend`
- `npm run build --workspaces`
- `npm test --workspaces`

**Related:** [Monorepo](#monorepo), [Shared Types](#shared-types)
**Reference:** [package.json](../../package.json) → `"workspaces"` field

---

## General Technical Terms

### API (Application Programming Interface)

Set of rules and protocols for building and interacting with software applications.

**Context:** Bwaincell provides REST API for programmatic access to tasks, lists, notes, reminders, budget, and schedule.

---

### ACID (Atomicity, Consistency, Isolation, Durability)

Set of properties guaranteeing database transaction reliability.

**Context:** PostgreSQL provides ACID compliance for Bwaincell data integrity.

---

### CI/CD (Continuous Integration / Continuous Deployment)

Practice of automating software build, test, and deployment.

**Context:** Bwaincell uses GitHub Actions for auto-deployment to Raspberry Pi.

---

### CLI (Command-Line Interface)

Text-based interface for interacting with programs.

**Context:** Bwaincell uses npm scripts as CLI (e.g., `npm run dev`, `npm test`).

---

### CRUD (Create, Read, Update, Delete)

Basic operations for persistent storage.

**Context:** Bwaincell API provides CRUD operations for tasks, lists, notes, reminders, budget, and schedule.

---

### Docker

Platform for developing, shipping, and running applications in containers.

**Context:** Bwaincell backend + PostgreSQL deploy via Docker Compose.

---

### Docker Compose

Tool for defining and running multi-container Docker applications.

**Context:** Bwaincell uses docker-compose.yml for backend + PostgreSQL deployment.

---

### Middleware

Software layer between application and system services.

**Context:** Bwaincell Express API uses CORS, JSON parser, JWT auth, and error handler middleware.

---

### Migration

Process of evolving database schema over time.

**Context:** Bwaincell uses Sequelize auto-sync (dev) or migrations (prod) for schema changes.

---

### TDD (Test-Driven Development)

Development approach where tests are written before implementation.

**Context:** Bwaincell aims for 80%+ test coverage with TDD for critical paths.

---

## Acronyms

### API

Application Programming Interface

---

### ACID

Atomicity, Consistency, Isolation, Durability

---

---

### CI/CD

Continuous Integration / Continuous Deployment

---

### CLI

Command-Line Interface

---

### CORS

Cross-Origin Resource Sharing

---

### CRUD

Create, Read, Update, Delete

---

### CSP

Content Security Policy

---

### CSRF

Cross-Site Request Forgery

---

### ER

Entity-Relationship (diagram)

---

### HTTP

Hypertext Transfer Protocol

---

### HTTPS

Hypertext Transfer Protocol Secure

---

### JWT

JSON Web Token

---

### NPM

Node Package Manager

---

### OAuth

Open Authorization

---

### ORM

Object-Relational Mapping

---

### PWA

Progressive Web App

---

### REST

Representational State Transfer

---

### RSC

React Server Components

---

### SQL

Structured Query Language

---

### SSL

Secure Sockets Layer

---

### SSR

Server-Side Rendering

---

### TDD

Test-Driven Development

---

### TLS

Transport Layer Security

---

### XSS

Cross-Site Scripting

---

## Related Documentation

- **[FAQ](../guides/faq.md)** - Frequently asked questions with links to detailed docs
- **[Quick Reference](quick-reference.md)** - Commands, endpoints, environment variables
- **[API Documentation](../api/)** - Complete REST API and Discord bot reference
- **[Architecture Overview](../architecture/overview.md)** - System design and technology stack
- **[Database Schema](../architecture/database-schema.md)** - Database structure and models

---

**Last Updated** 2026-01-12
**Version:** 2.0.0
**Total Terms:** 90+ (50 project-specific, 10 general, 30 acronyms)
