# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add `@supabase/supabase-js` dependency to `backend/package.json`
- Add Supabase CLI current branch tracking file `supabase/.branches/_current_branch`
- Add Supabase CLI temporary data file `supabase/.temp/cli-latest`
- Add Supabase configuration file `supabase/config.toml`
- Add initial Supabase schema migration `supabase/migrations/20260413000000_initial_schema.sql`
- Add Supabase client initialization file `supabase/supabase.ts`
- Add Supabase type definitions file `supabase/types.ts`

### Changed

- Update `.env.example` to reflect Supabase database configuration and variables
- Replace PostgreSQL backup with Supabase connection verification in `deploy-bot.yml` workflow
- Update `docker rm` command for `bwaincell-backend` in `deploy-bot.yml`
- Update `backend/commands/budget.ts` to import `Budget` model from Supabase
- Update `backend/commands/events.ts` to import `EventConfig` model from Supabase
- Update `backend/commands/list.ts` to import `List` model from Supabase
- Update `backend/commands/note.ts` to import `Note` model from Supabase
- Update `backend/commands/remind.ts` to import `Reminder` model from Supabase
- Update `backend/commands/schedule.ts` to import `Schedule` model from Supabase
- Update `backend/commands/sunset.ts` to import `SunsetConfig` model from Supabase
- Update `backend/commands/task.ts` to import `Task` model from Supabase
- Update `backend/jest.config.js` to point to Supabase models instead of Sequelize database models
- Refactor `backend/src/api/routes/oauth.ts` to use Supabase `User` model methods
- Refactor `backend/src/api/routes/tasks.ts` to use Supabase client for task updates
- Replace Sequelize database initialization with Supabase connection verification in `backend/src/bot.ts`
- Update `backend/tests/setup.ts` to configure Supabase environment variables for testing
- Update `backend/tests/unit/api/routes/budget.test.ts` to mock Supabase models
- Update `backend/tests/unit/api/routes/lists.test.ts` to mock Supabase models
- Update `backend/tests/unit/api/routes/notes.test.ts` to mock Supabase models
- Update `backend/tests/unit/api/routes/oauth.test.ts` to mock Supabase models
- Update `backend/tests/unit/api/routes/reminders.test.ts` to mock Supabase models
- Update `backend/tests/unit/api/routes/schedule.test.ts` to mock Supabase models
- Update `backend/tests/unit/api/routes/tasks.test.ts` to mock Supabase models
- Update `backend/tests/unit/commands/budget.test.ts` to mock Supabase models
- Update `backend/tests/unit/commands/events.test.ts` to mock Supabase models
- Update `backend/tests/unit/commands/list.test.ts` to mock Supabase models
- Update `backend/tests/unit/commands/note.test.ts` to mock Supabase models
- Update `backend/tests/unit/commands/schedule.test.ts` to mock Supabase models
- Update `backend/tests/unit/commands/sunset.test.ts` to mock Supabase models
- Update `backend/tests/unit/commands/task.test.ts` to mock Supabase models
- Remove Sequelize `syncSequences` unit tests from `backend/tests/unit/database/syncSequences.test.ts`
- Update `backend/tests/unit/models/Budget.test.ts` to import Supabase model
- Update `backend/tests/unit/models/EventConfig.test.ts` to import Supabase model
- Update `backend/tests/unit/models/List.test.ts` to import Supabase model
- Update `backend/tests/unit/models/Note.test.ts` to import Supabase model
- Update `backend/tests/unit/models/Reminder.test.ts` to import Supabase model
- Update `backend/tests/unit/models/Schedule.test.ts` to import Supabase model
- Update `backend/tests/unit/models/SunsetConfig.test.ts` to import Supabase model
- Update `backend/tests/unit/models/Task.test.ts` to import Supabase model
- Refactor `backend/tests/unit/models/User.test.ts` to test Supabase `User` model methods
- Update `backend/tests/unit/utils/scheduler-events.test.ts` to mock Supabase models
- Update `backend/tsconfig.json` to configure path aliases for Supabase models
- Refactor `backend/utils/interactions/handlers/listHandlers.ts` to use `List.getList` Supabase method
- Refactor `backend/utils/interactions/handlers/randomHandlers.ts` to use `List.getList` Supabase method
- Refactor `backend/utils/interactions/handlers/selectMenuHandlers.ts` to use Supabase client for data retrieval
- Refactor `backend/utils/interactions/handlers/taskHandlers.ts` to use Supabase client for data retrieval
- Update `backend/utils/interactions/helpers/databaseHelper.ts` to import Supabase models
- Refactor `backend/utils/scheduler.ts` to use Supabase client for reminder retrieval and import Supabase models
- Remove PostgreSQL `postgres` service definition from `docker-compose.yml`
- Update `docker-compose.yml` backend service environment variables for Supabase integration
- Update `frontend/.env.example` with Supabase PostgreSQL `DATABASE_URL` format and user mapping variables
- Update `frontend/prisma/schema.prisma` comments to indicate Supabase connection
- Update `package-lock.json` to reflect new `@supabase/supabase-js` dependency
- Update `supabase/index.ts` to export Supabase client and models
- Update `supabase/init.sql` for Supabase initial schema setup
- Update `supabase/models/Budget.ts` for Supabase integration
- Update `supabase/models/EventConfig.ts` for Supabase integration
- Update `supabase/models/List.ts` for Supabase integration
- Update `supabase/models/Note.ts` for Supabase integration
- Update `supabase/models/Reminder.ts` for Supabase integration
- Update `supabase/models/Schedule.ts` for Supabase integration
- Update `supabase/models/SunsetConfig.ts` for Supabase integration
- Update `supabase/models/Task.ts` for Supabase integration
- Update `supabase/models/User.ts` for Supabase integration
- Update `tests/api/tasks.test.ts` for Supabase API interactions
- Update `tests/integration/command-execution.test.ts` for Supabase backend interactions
- Update `tests/integration/database-postgres.test.ts` for Supabase database interactions
- Update `tests/load/database-load.test.ts` for Supabase load testing
- Update `tests/unit/bot.test.simple.ts` for Supabase integration
- Update `tests/unit/bot.test.ts` for Supabase integration
- Update `tests/unit/commands.test.new.test.ts` for Supabase command interactions
- Update `tests/unit/commands.test.ts` for Supabase command interactions
- Update `tests/unit/commands/budget.test.ts` for Supabase budget command interactions
- Update `tests/unit/commands/schedule.test.ts` for Supabase schedule command interactions
- Update `tests/unit/commands/task.test.new.ts` for Supabase task command interactions
- Update `tests/unit/commands/task.test.ts` for Supabase task command interactions
- Update `tests/unit/handlers/listHandlers.test.ts` for Supabase list handler interactions
- Update `tests/unit/handlers/modalHandlers.test.ts` for Supabase modal handler interactions
- Update `tests/unit/handlers/taskHandlers.test.ts` for Supabase task handler interactions
- Update `tsconfig.json` to configure path aliases for Supabase models

### Removed

- Remove `backend/database/associations.ts`
- Remove `backend/database/migrations/20260210-create-event-config.js`
- Remove `backend/database/schema.ts`
- Remove Sequelize-specific `save`, `findOne`, and `findAll` methods from `backend/utils/interactions/types/interactions.ts`

## [2.1.2] - 2026-02-17

### Added

- **Sunset Announcement Feature** - Daily sunset announcements with configurable advance notice (Issue #42)
  - **`/sunset` Discord Command** — 4 subcommands for managing sunset announcements:
    - `/sunset enable` — Enable daily sunset announcements using `LOCATION_ZIP_CODE` and `DEFAULT_REMINDER_CHANNEL`
    - `/sunset disable` — Disable sunset announcements
    - `/sunset set <minutes>` — Configure advance notice (1-120 minutes, default: 60)
    - `/sunset status` — Show current config, today's sunset time, and countdown
  - **SunsetConfig Database Model** — Per-guild configuration with advance_minutes, ZIP code, timezone, enable/disable toggle
  - **Sunset Service** (`sunsetService.ts`) — ZIP-to-coordinates lookup via zippopotam.us API, sunset time fetching via sunrise-sunset.org API, Discord embed formatting
  - **Scheduler Integration** — Daily cron at 00:05 fetches today's sunset, schedules a one-time setTimeout for the announcement (sunset - advance_minutes)
  - **Immediate startup check** — On bot restart, checks if today's sunset announcement should still be scheduled
  - **52 unit tests** across 3 test files:
    - `SunsetConfig.test.ts` (20 tests) — Model CRUD, upsert, toggle, advance minutes
    - `sunsetService.test.ts` (15 tests) — ZIP lookup, sunset API, embed formatting, caching, error handling
    - `sunset.test.ts` (17 tests) — All 4 subcommands, validation, error handling
  - Uses existing `LOCATION_ZIP_CODE` and `DEFAULT_REMINDER_CHANNEL` environment variables (no new env vars)

- **Comprehensive Test Coverage** - 33 new test files with 996 new tests, bringing total from 308 to 1304 (Issue #31)
  - **Wave 1 — Command Unit Tests** (WO-013): 6 files covering all untested Discord slash commands
    - `task.test.ts` — add, list, done, delete, edit subcommands + autocomplete + error handling
    - `list.test.ts` — create, add, show, remove, clear, delete, all, complete subcommands + autocomplete + button disabled states
    - `schedule.test.ts` — add, list, delete, countdown, today, week subcommands + helper functions (parseTimeToMilitaryFormat, formatTimeTo12Hour, formatDateForDisplay) + autocomplete
    - `note.test.ts` — add, list, view, delete, search, edit, tag, tags subcommands + autocomplete + content preview truncation
    - `random.test.ts` — movie, dinner, date, question, choice, number, coin, dice subcommands + AI fallback + reroll buttons
    - `budget.test.ts` — add, income, summary, categories, recent, trend subcommands + color coding + bar chart display
  - **Wave 2 — API Route Unit Tests** (WO-014): 8 files covering all Express API routes
    - `tasks.test.ts`, `lists.test.ts`, `notes.test.ts`, `schedule.test.ts`, `budget.test.ts`, `reminders.test.ts` — full CRUD + user isolation + validation
    - `oauth.test.ts` — Google token verification, JWT generation, token refresh
    - `health.test.ts` — health endpoint with auth check
    - Uses supertest with mini Express app pattern for HTTP-level testing
  - **Wave 3 — Database Model Unit Tests** (WO-015): 6 files covering all untested Sequelize models
    - `Budget.test.ts` (29 tests), `Schedule.test.ts` (25 tests), `List.test.ts` (33 tests), `Note.test.ts` (36 tests), `Task.test.ts` (26 tests), `User.test.ts` (11 tests)
    - Guild isolation verified on all model methods
  - **Wave 4 — Interaction Handler & Middleware Tests** (WO-016): 10 files covering Discord interaction handlers and middleware
    - Handlers: `taskHandlers.test.ts`, `listHandlers.test.ts`, `selectMenuHandlers.test.ts`, `randomHandlers.test.ts`, `reminderHandlers.test.ts`, `modalHandlers.test.ts`
    - Middleware: `rateLimitMiddleware.test.ts`, `errorMiddleware.test.ts`, `validationMiddleware.test.ts`, `loggingMiddleware.test.ts`
    - Button, modal submit, and select menu interaction mocking patterns
  - **Wave 5 — API Auth Middleware & Server Tests** (WO-017): 3 files covering security-critical auth layer
    - `auth.test.ts` — Basic Auth validation, credential parsing, user context injection, error response format
    - `oauth.test.ts` — Google OAuth token exchange, JWT generation/refresh, user creation
    - `server.test.ts` — Express app creation, middleware registration, route mounting, 404 handler
  - **Total test count: 1304 tests across 48 test suites** (was 308 tests across 15 suites)

## [2.1.1] - 2026-02-17

### Added

- **Release Workflow + Deploy-on-Release** - Tag-driven release pipeline with manual publish gate before Pi deployment (PR #37 comment)
  - New `release.yml` workflow triggered by `v*.*.*` tags: validates (tests + build), extracts changelog notes, creates **draft** GitHub Release
  - `deploy-bot.yml` now triggers on `release: published` instead of `push: main` — no more auto-deploy on every merge
  - `workflow_dispatch` preserved on deploy-bot.yml for emergency manual deployments
  - Release flow: tag → validate → draft release → user reviews → publish → deploy

- **Release Notes Announcement** - Bot automatically announces new versions to Discord on startup (Issue #38)
  - New `releaseAnnouncer.ts` utility compares running version against last announced version stored in `data/.last-announced-version`
  - Extracts release notes from CHANGELOG.md and sends a rich Discord embed to `DEFAULT_REMINDER_CHANNEL`
  - Only announces on version change — regular restarts are silent
  - Non-fatal: all failures log warnings without blocking startup
  - Dockerfile updated to include `package.json` and `CHANGELOG.md` in runner stage
  - 11 unit tests covering announcements, skips, error handling, truncation, and first-deploy edge cases
  - **Total test count: 308 tests**

### Fixed

- **PostgreSQL Auto-Increment Sequence Desync** - Fixed `SequelizeUniqueConstraintError` on `/remind me` caused by sequence `reminders_id_seq` falling behind actual `max(id)` (Issue #36)
  - Added self-healing `syncSequences()` utility in `backend/database/index.ts` that runs on every bot startup
  - PL/pgSQL query compares `max(id)` vs sequence `last_value` for all 9 auto-increment tables and calls `setval()` to repair
  - Non-fatal: catches errors and logs warning without blocking startup
  - Called from `loadModels()` in `bot.ts` after `sequelize.sync()`
  - 4 unit tests covering query execution, success logging, error handling, and non-Error exceptions
  - **Total test count: 297 tests**

## [2.1.0] - 2026-02-11

### Added

- **AI-Powered Date Suggestions** - `/random date` command now uses Google Gemini 2.5 Flash with **Google Search grounding** for real-time, event-aware date ideas (Issue #18, #19)
  - Features:
    - **Real-time local event integration** - Gemini searches the web for actual events happening tonight or this weekend near your location and builds date ideas around them
    - **Event links** - Includes a clickable URL to the event page or venue website when available
    - **Location-aware suggestions** based on ZIP code (configured via `LOCATION_ZIP_CODE` environment variable)
    - **Cost estimates**: Budget-friendly, Moderate, or Splurge
    - **Time-of-day recommendations**: Morning, Afternoon, Evening, or Night
    - **Enhanced Discord embeds** with cost, time, and event link fields
    - **Robust fallback mechanism**: Gracefully falls back to static date ideas on API errors (zero user-facing failures)
  - Configuration:
    - `GEMINI_API_KEY` - Get yours at https://ai.google.dev/
    - `LOCATION_ZIP_CODE` - Your ZIP code for location-aware suggestions (e.g., 90210)
  - Technical:
    - `GeminiService` utility class with `@google/genai` SDK and Google Search grounding
    - JSON response parsing with markdown cleanup support
    - 11 unit tests covering API integration, error handling, response parsing, and URL field
    - Model: `gemini-2.5-flash` with `googleSearch` tool enabled
  - Example output: "Reclaim Your Heartbeats: Emo Night Rendezvous - Ignite a spark of nostalgic romance at The Shanty's Broken Hearts Ball Vol. 2 this Friday... 💰 Moderate 🕐 Night 🔗 More Info ✨ Powered by AI"
- **AI-Powered Conversation Starters** - `/random question` command now generates WNRS-inspired questions using Google Gemini 2.5 Flash with **Google Search grounding** (Issue #20)
  - Features:
    - **3 progressive levels** inspired by "We're Not Really Strangers": Level 1 Perception (light/approachable), Level 2 Connection (deeper/vulnerable), Level 3 Reflection (introspective/grateful)
    - **Level-aware Discord embeds** with color coding: green (Perception), blue (Connection), purple (Reflection)
    - **Level badge** displayed on each question embed (e.g., "Level 2: Connection")
    - **Daily Question of the Day** - Automated 5:00 PM post to the announcements channel via scheduler
    - **Robust fallback mechanism**: Gracefully falls back to static conversation starters on API errors (zero user-facing failures)
    - **Reroll support** - "Next Question" button generates fresh AI questions with the same fallback behavior
  - Technical:
    - `GeminiService.generateQuestion()` with WNRS-aware prompt and `WNRSQuestionResponse` interface
    - `parseQuestionResponse()` with level validation (1-3) and levelName auto-lookup fallback
    - Daily question scheduler (`0 17 * * *`) reusing `EventConfig` announcement channels per guild
    - 9 unit tests covering response parsing, prompt structure, level validation, markdown cleanup, API errors
    - Model: `gemini-2.5-flash` with `googleSearch` tool enabled
- **`/events` Discord Command** - AI-powered local event discovery with Google Search grounding (Issue #19)
  - Discovers real local events using Gemini 2.5 Flash with real-time web search
  - Configurable weekly scheduled announcements (day and time)
  - Discord embed formatting with event details, dates, times, locations, and links
  - Features:
    - **Real-time event discovery** - Gemini searches the web for festivals, concerts, markets, community events, and more
    - **Robust time parsing** - Handles varied AI time formats (ranges like "6:00 PM - 9:30 PM", date ranges, vague descriptions)
    - **Scheduled announcements** - Set a day and time for weekly event digests via `/events day:<day> time:<time>`
    - **Database persistence** - Schedule preferences stored in `event_configs` table per guild
    - **Caching** - Results cached with configurable TTL to avoid redundant API calls
    - **Mock provider** - Development/testing mode with sample data
  - Configuration:
    - `EVENTS_AI_SERVICE` - Provider selection (`gemini` or `mock`)
    - `EVENTS_MAX_RESULTS` - Maximum events to return (default: 10)
    - `EVENTS_CACHE_TTL` - Cache duration in seconds (default: 3600)
  - Technical:
    - `EventsService` with provider pattern (GeminiEventProvider, MockEventProvider)
    - 30 unit tests covering discovery, parsing, caching, formatting, error handling, and mock provider
    - Scheduler integration for automated weekly announcements
- **`/remind monthly` Discord Subcommand** - Create monthly recurring reminders (Issue #23)
  - Options: `message` (required), `day` (1-31, required), `time` (12-hour format, required)
  - Usage: `/remind monthly message:"Pay rent" day:1 time:"9:00 AM"`
  - Handles edge cases: day 31 in 30-day months, day 31 in February
  - Automatic adjustment to last day of month when requested day doesn't exist
  - Timezone-aware scheduling using Luxon DateTime
- **`/remind yearly` Discord Subcommand** - Create yearly recurring reminders (Issue #23)
  - Options: `message` (required), `month` (1-12 with names, required), `day` (1-31, required), `time` (12-hour format, required)
  - Usage: `/remind yearly message:"Mom's birthday" month:March day:15 time:"8:00 AM"`
  - Handles leap year edge cases: Feb 29 in leap years, Feb 28 in non-leap years
  - Automatic adjustment for invalid dates (e.g., Feb 31 → Feb 28/29)
  - Perfect for birthdays, anniversaries, annual renewals, tax deadlines
- **Monthly/Yearly Reminder Display** - Enhanced list and autocomplete formatting
  - `/remind list` now shows monthly reminders with 📆 emoji: "Monthly (15th)"
  - `/remind list` now shows yearly reminders with 🎂 emoji: "Yearly (Mar 15)"
  - Autocomplete includes monthly/yearly formatting for easy selection
  - Ordinal day suffixes (1st, 2nd, 3rd, 15th, etc.)
- **Comprehensive Test Suite** - 51 new tests for monthly/yearly reminders and AI date suggestions
  - 15 unit tests for Reminder model date calculations
  - 11 unit tests for command structure validation
  - 15 unit tests for scheduler cron expression generation
  - 10 unit tests for GeminiService (API integration, error handling, response parsing)
  - Edge case coverage: Feb 31, leap years, month boundaries, timezone handling, AI API failures
  - **Total test count: 282 tests**
- **`/issues` Discord Command** - Submit bug reports, feature requests, and suggestions directly to GitHub from Discord
  - Options: `title` (required), `description` (required), `type` (optional: bug/feature/question/documentation)
  - Auto-labels issues based on type selection
  - Includes Discord user metadata (username, user ID, guild ID) in issue body
  - Interactive buttons: "View on GitHub" link and "Submit Another Issue"
- **`/make-it-a-quote` Discord Command** - Generate dramatic quote images from Discord messages
  - Slash command with `Message Link` as required parameter
  - Usage: Right-click message → Copy Message ID → `/make-it-a-quote <Message Link>` → generate quote
  - Features:
    - **Dramatic spotlight design** with radial gradient glow effect
    - **Guild-specific avatars** (uses server profile picture, not default Discord avatar)
    - **Grayscale circular avatar** on the left with extended white spotlight
    - **Smooth gradient transition** from spotlight to pure black background
    - White quote text on right side with italic username attribution
    - 1200x630 canvas (16:9 aspect ratio, optimized for social sharing)
  - Comprehensive error handling for invalid message IDs, missing channels, and API errors
  - All 22 tests passing with 100% coverage
- **GitHub Service** (`backend/utils/githubService.ts`) - Octokit API wrapper for GitHub issue creation
  - Singleton pattern with initialization validation
  - Comprehensive error handling (401, 403, 404, 429 status codes)
  - Graceful degradation when GitHub credentials not configured
- **GitHub Environment Variables** - New configuration options for GitHub integration
  - `GITHUB_TOKEN` - Personal access token with `repo` scope
  - `GITHUB_REPO_OWNER` - Repository owner username
  - `GITHUB_REPO_NAME` - Repository name
- **Backend Test Infrastructure**
  - New test setup file (`backend/tests/setup.ts`)
  - Unit tests for `/issues` command (30 tests)
  - Unit tests for `/make-it-a-quote` command (22 tests)
  - Unit tests for ImageService (13 tests)
  - Unit tests for GitHubService (15 tests)
  - Jest configuration for `@octokit/rest` ESM compatibility

### Changed

- **Gemini SDK Migration** - Migrated from deprecated `@google/generative-ai` to `@google/genai@1.40.0` (Issue #19)
  - Enables Google Search grounding (`googleSearch` tool) for real-time web data access
  - New SDK API surface: centralized `GoogleGenAI` client with `models.generateContent()` and flat response shape
  - Both `GeminiService` and `EventsService` updated to new SDK
- **Reminder Database Schema** - Extended to support monthly/yearly frequencies
  - Added `day_of_month` field (1-31) for monthly/yearly reminders
  - Added `month` field (1-12) for yearly reminders
  - Extended `frequency` ENUM: `'once' | 'daily' | 'weekly' | 'monthly' | 'yearly'`
- **Reminder Model** - Enhanced date calculation logic
  - `calculateNextTrigger()` now handles monthly/yearly with edge cases
  - Invalid date detection using Luxon date rollover check
  - Automatic fallback to month-end for invalid days (e.g., Feb 31 → Feb 28/29)
- **Scheduler Service** - Added cron expression generation for monthly/yearly and daily question announcements
  - Monthly cron format: `${minutes} ${hours} ${dayOfMonth} * *`
  - Yearly cron format: `${minutes} ${hours} ${dayOfMonth} ${month} *`
  - Daily question cron: `0 17 * * *` (5:00 PM) per guild timezone, reusing EventConfig channels
- **Discord Bot** - Now provides **8 slash commands** with **49 total subcommands** (was 7 commands, 47 subcommands)
  - `/remind` command expanded from 5 to 7 subcommands
- **Documentation** - Updated `docs/api/discord-commands.md` with complete `/issues` command reference
- **Discord Bot** - Now provides **10 slash commands** (was 9)
  - Added `/events` command for AI-powered local event discovery
  - Added `/issues` and `/make-it-a-quote` to production command list
- **Documentation** - Updated `docs/api/discord-commands.md` with complete command references
- **Dependencies**
  - Added `@octokit/rest@22.0.1` for GitHub API integration
  - Replaced deprecated `@google/generative-ai@0.24.1` with `@google/genai@1.40.0`
  - Added `luxon` for timezone-aware date handling in events
- **Environment Validation** - Extended Joi schema to validate GitHub and events configuration variables

## [2.0.0] - 2026-01-12

### Overview

Major architecture overhaul migrating from Fly.io + SQLite to self-hosted Raspberry Pi 4B + PostgreSQL with unified monorepo structure. This release transforms Bwaincell from a simple backend API into a comprehensive productivity platform with three integrated interfaces.

**Deployment:** Raspberry Pi 4B (Docker + PostgreSQL 15) | Vercel (Frontend PWA)
**Live URLs:**

- Frontend PWA: https://bwaincell.sunny-stack.com
- Backend API: Self-hosted (Raspberry Pi 4B)

### Breaking Changes

#### Database Migration

- **Migrated from SQLite to PostgreSQL 15**
  - No longer using file-based database (`./data/bwaincell.sqlite`)
  - Requires PostgreSQL server configuration
  - See [docs/architecture/adr/0002-postgresql-migration.md](docs/architecture/adr/0002-postgresql-migration.md)
  - Migration guide: [docs/guides/database-migrations.md](docs/guides/database-migrations.md)

#### Deployment Architecture

- **Migrated from Fly.io to self-hosted Raspberry Pi 4B**
  - Docker Compose configuration for backend + PostgreSQL
  - No longer uses Fly.io deployment (`fly.toml` removed)
  - Custom systemd service management
  - See [docs/guides/deployment.md](docs/guides/deployment.md)

#### Repository Structure

- **Unified monorepo with npm workspaces**
  - Backend moved to `backend/` workspace
  - Frontend moved to `frontend/` workspace
  - Shared types in `shared/` workspace
  - Requires `npm install` at root + `npm run build:shared`

### Added

#### Monorepo Architecture

- **npm Workspaces** structure with three packages:
  - `backend/` - Discord bot + Express API
  - `frontend/` - Next.js 14.2.35 PWA
  - `shared/` - Shared TypeScript types and utilities
- **TypeScript Project References** for efficient cross-package builds
- **Centralized dependency management** at root level
- **Workspace-aware npm scripts** for unified development workflow

#### Database & Infrastructure

- **PostgreSQL 15** production database with:
  - Connection pooling (min: 2, max: 10)
  - Automatic schema migrations via Sequelize
  - Environment-based configuration (`DATABASE_URL`)
  - Docker volume persistence
- **Prisma 5.22.0** ORM for frontend (separate from backend Sequelize)
- **Docker Compose** orchestration:
  - Multi-container setup (backend + postgres)
  - Volume mounts for data persistence
  - Network isolation
  - Health checks and restart policies
- **Raspberry Pi 4B** self-hosting:
  - Systemd service management
  - Automatic startup on boot
  - Resource monitoring
  - Local network deployment

#### Frontend PWA (Integrated)

- **Next.js 14.2.35** Progressive Web App
- **Prisma Client** with PostgreSQL connection
- **Google OAuth 2.0** authentication flow
- **next-pwa** integration:
  - Service worker caching
  - Offline support
  - App installation prompts
  - Background sync
- **Radix UI** component library
- **TanStack Query** for data fetching
- **Tailwind CSS** styling
- **Dark mode** support
- **Responsive design** for mobile/desktop
- **Custom subdomain:** bwaincell.sunny-stack.com

#### New Features

- **Schedule Management** (`/schedule`) - 6 subcommands:
  - Create/list/view/edit/delete schedules
  - View today's and this week's schedules
- **Event Management** with countdown timers
- **Tag-based note organization** with full-text search
- **List consolidation** removed (simplified to 8 subcommands)
- **Budget category analytics** and trend tracking

#### Documentation Overhaul

- **30+ comprehensive documentation files** in `docs/`:
  - `docs/api/` - REST API reference with 39 endpoints
  - `docs/architecture/` - System design, ADRs, database schema
  - `docs/guides/` - Getting started, deployment, testing, CI/CD
  - `docs/reference/` - Glossary, quick reference, environment vars
- **Architecture Decision Records (ADRs)**:
  - 0001-monorepo-architecture.md
  - 0002-postgresql-migration.md
  - 0003-oauth2-jwt-authentication.md
  - 0004-discord-bot-rest-api.md
- **Deployment runbooks** for Raspberry Pi + Vercel
- **Testing documentation** with Jest configuration
- **API documentation** with authentication flows
- **Discord command reference** with all 46 subcommands

#### Development Tools

- **GitHub Actions CI/CD** workflows:
  - Backend testing and Docker build
  - Frontend testing and Vercel deployment
  - Automated dependency updates
- **ESLint** with strict TypeScript rules
- **Prettier** code formatting
- **Husky + lint-staged** pre-commit hooks
- **Jest 30.1.3** with ts-jest for backend
- **Supertest** for API integration testing
- **Coverage badges** generation
- **Docker development** with hot-reload support

#### Testing Infrastructure

- **38 test files** covering:
  - Discord command handlers
  - API endpoints
  - Database models
  - Utility functions
  - Integration tests
- **Backend coverage:** 35% (target: 80%)
- **Frontend coverage:** 45% (target: 80%)
- **Coverage thresholds** enforced in CI/CD
- **Test setup files** with mock implementations

### Changed

#### Configuration

- **Environment variables** restructured:
  - `DATABASE_URL` replaces `DATABASE_PATH`
  - PostgreSQL connection strings
  - Added `NODE_ENV`, `LOG_LEVEL`, `TZ`
  - Workspace-specific `.env` files
- **Custom subdomain** configured: bwaincell.sunny-stack.com (from bwain-app.vercel.app)
- **CORS origins** updated for new frontend domain
- **Port configuration** separated (backend: 3000, frontend: 3010)

#### Discord Bot

- **7 slash commands** with **46 total subcommands**:
  - `/task` - 5 subcommands
  - `/list` - 7 subcommands (removed consolidate)
  - `/note` - 8 subcommands
  - `/remind` - 5 subcommands
  - `/budget` - 6 subcommands
  - `/schedule` - 6 subcommands (NEW)
  - `/random` - 8 subcommands
- **Improved interaction handlers** with button/modal support
- **Enhanced error handling** with user-friendly messages
- **Autocomplete support** for list and note commands

#### REST API

- **39 authenticated endpoints** (up from ~30 in v1.0.0)
- **Schedule endpoints** added for event management
- **Enhanced OAuth flow** with refresh token rotation
- **Improved error responses** with consistent format
- **Request validation** with Joi schemas on all endpoints
- **Rate limiting** middleware for API protection

#### Database Schema

- **PostgreSQL schema** with proper constraints:
  - Foreign keys with CASCADE deletes
  - Indexes on frequently queried columns
  - JSONB columns for flexible data (list items, tags)
  - Timestamps (createdAt, updatedAt) on all tables
- **User isolation** maintained via `userId` + `guildId`
- **Auto-migrations** on server startup
- **Connection pooling** for performance

### Improved

- **Winston 3.17.0** structured logging:
  - JSON format for production
  - Console output for development
  - File rotation with daily logs
  - Separate error log file
  - Context-aware logging with metadata
- **Error handling** across all layers:
  - Try-catch blocks in all async functions
  - Centralized error middleware
  - User-friendly error messages
  - Stack traces in development only
- **Type safety** with shared TypeScript types
- **Code organization** with workspace structure
- **Development workflow** with parallel dev servers
- **Build process** optimized for monorepo
- **Deployment process** streamlined with Docker Compose

### Removed

- **Fly.io deployment** (`fly.toml` removed)
- **SQLite database** (migrated to PostgreSQL)
- **Standalone backend repo** (merged into monorepo)
- **Trinity Method self-references** from user-facing documentation
- **List consolidate subcommand** (simplified to 8 subcommands)

### Security Enhancements

- **PostgreSQL security**:
  - Strong password requirements
  - Network isolation via Docker
  - SSL/TLS connections enforced (production)
- **JWT token rotation** with refresh token blacklisting
- **Environment variable validation** on startup
- **Input sanitization** on all user inputs
- **HTTPS enforcement** on frontend (Vercel)
- **Secrets management** via Docker secrets

### Performance

- **PostgreSQL connection pooling** (min: 2, max: 10)
- **Frontend code splitting** with Next.js App Router
- **Service worker caching** for instant page loads
- **Image optimization** with next/image
- **Lazy loading** for heavy components
- **Database indexes** on common queries
- **Gzip compression** on API responses

### Documentation Improvements

- **Trinity Method references removed** from all user-facing docs
- **BAS Quality Gates** renamed to "Quality Gates"
- **License consistency** fixed (MIT in all files)
- **ADR location** corrected in glossary
- **API endpoint count** updated to 39
- **Subcommand count** updated to 46
- **Version info** updated throughout

### Known Issues

- Backend test coverage at 35% (target: 80%)
- Frontend test coverage at 45% (target: 80%)
- Some Discord commands lack comprehensive error handling
- Database migrations manual (no automated rollback)
- No automated backup system (manual `pg_dump` required)

### Migration Guide

See [docs/guides/database-migrations.md](docs/guides/database-migrations.md) for complete migration instructions from v1.0.0 (SQLite) to v2.0.0 (PostgreSQL).

### Notes

This release represents a complete architectural transformation from a simple Fly.io-hosted API to a self-hosted, production-grade monorepo platform. The migration to PostgreSQL, Raspberry Pi deployment, and unified monorepo structure provides a solid foundation for future development while maintaining all existing functionality.

**Major Achievement:** Successfully integrated frontend PWA into monorepo, migrated to PostgreSQL, and deployed on self-hosted Raspberry Pi infrastructure while maintaining 100% feature parity with v1.0.0.

## [1.0.0] - 2025-10-09

### Overview

Initial production release of Bwaincell - A personal productivity platform combining Discord bot functionality with a RESTful API for web/mobile integration.

**Deployment:** Fly.io + SQLite backend | Vercel frontend PWA
**Live URLs:**

- API: https://bwaincell.fly.dev
- PWA: https://bwain-app.vercel.app

### Added

#### Core Features

- **Task Management** (`/task`) - Create, complete, edit, and delete tasks with optional due dates
- **List Management** (`/list`) - Create multiple named lists with item completion tracking
  - Add/remove items
  - Toggle item completion
  - Clear completed items
  - View all lists with item counts
- **Smart Reminders** (`/remind`) - Schedule notifications with Discord integration
  - One-time reminders
  - Daily recurring reminders
  - Weekly recurring reminders with day selection
  - Automatic notification system
- **Budget Tracking** (`/budget`) - Personal finance management
  - Track expenses by category
  - Record income transactions
  - Monthly summaries
  - Category breakdowns and spending analytics
- **Notes** (`/note`) - Tagged note-taking system
  - Create notes with tags
  - Search by keyword
  - Filter by tags
  - Edit existing notes
- **Random Generators** (`/random`) - Discord-only utility commands
  - Movie picker
  - Dinner suggestions
  - Date ideas
  - Conversation starters
  - Coin flip & dice roll

#### Discord Bot

- **Discord.js 14.14.1** integration with slash commands
- **Multi-user support** with Discord user ID isolation
- **Command deployment script** for server registration
- **Interactive embeds and buttons** for rich user experience

#### REST API

- **Express 4.x** HTTP server
- **Google OAuth 2.0** authentication
- **JWT bearer tokens** for session management (1 hour access, 7 days refresh)
- **CORS configuration** for PWA integration (localhost + Vercel)
- **Health check endpoint** (`/health`) for monitoring
- **39 API endpoints** covering all features:
  - OAuth: `/api/auth/google/verify`, `/api/auth/refresh`, `/api/auth/logout`
  - Tasks: CRUD operations with status filtering
  - Lists: CRUD with item management
  - Notes: CRUD with search and tag filtering
  - Reminders: Create one-time/daily/weekly reminders
  - Budget: Transaction management and summaries

#### Database

- **SQLite 3** with file-based persistence (`./data/bwaincell.sqlite`)
- **Sequelize ORM** for data modeling
- **User isolation** by Discord user ID and guild ID
- **Migration support** for schema changes
- **Connection pooling** for performance

#### Authentication & Security

- **Google OAuth 2.0** ID token verification
- **JWT tokens** with `HS256` algorithm
- **Email whitelist** via `ALLOWED_GOOGLE_EMAILS` environment variable
- **Sequelize ORM** prevents SQL injection
- **Input validation** on all API endpoints
- **No sensitive data** in production logs
- **HTTPS enforcement** on Fly.io

#### Infrastructure

- **TypeScript 5.9.2** with strict mode
- **Node.js 18+** runtime
- **node-cron 4.2.1** for automatic reminder scheduling
- **Winston 3.17.0** structured logging
- **Jest 30.1.3** testing framework
- **Docker** multi-stage build with Alpine Linux
- **Fly.io** production deployment configuration
- **ESLint + Prettier** for code quality
- **npm scripts** for development, testing, and deployment

#### Development Tools

- **Hot reload** development mode
- **Test coverage** reporting
- **Lint and format** automation
- **Environment validation** with Joi schemas
- **Error handling** middleware
- **Timezone support** (configurable via `TIMEZONE` env var)

### Technical Stack

```
Runtime: Node.js 18+
Language: TypeScript 5.9.2
Framework: Express.js 4.x
Discord: Discord.js 14.14.1
Database: SQLite 3 + Sequelize ORM
Auth: Google OAuth 2.0 + JWT
Scheduler: node-cron 4.2.1
Logging: Winston 3.17.0
Testing: Jest 30.1.3
Deployment: Fly.io + Docker
Frontend: Vercel PWA (separate repo)
```

### Browser Compatibility

- ✅ Chrome/Edge (Windows, macOS)
- ✅ Safari (macOS, iOS PWA)
- ✅ Firefox (Windows, macOS)

### Known Limitations

- SQLite database (single-file, not suitable for high concurrency)
- Deployed on Fly.io (later migrated to Raspberry Pi 4B in v1.1.0)
- Frontend in separate repository (later unified in monorepo)
- No PostgreSQL support (added in v1.1.0)
- No workspace structure (added in v1.1.0)

### Notes

This version represents the initial production release built for personal use by the author and his wife. The system was designed as a dual-purpose productivity platform accessible via Discord bot commands and a companion Progressive Web App.

[2.1.0]: https://github.com/lukadfagundes/bwaincell/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/lukadfagundes/bwaincell/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/lukadfagundes/bwaincell/releases/tag/v1.0.0
