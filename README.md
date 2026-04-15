# Bwaincell

A **unified monorepo productivity platform** providing task management, reminders, lists, notes, budgets, scheduling, recipe management, AI-powered suggestions, and random generators through three integrated interfaces: **Discord Bot** (12 slash commands with multiple subcommands each), **REST API** (authenticated endpoints), and **Progressive Web App** (Next.js 15).

**Built for personal and household productivity** with guild-based data sharing, deployed on **Raspberry Pi 4B** (backend + self-hosted Supabase) and **Vercel** (frontend PWA).

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-14.14.1-purple)](https://discord.js.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
  - [Discord Bot Commands](#discord-bot-commands)
  - [REST API Endpoints](#rest-api-endpoints)
  - [Progressive Web App](#progressive-web-app)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Documentation](#documentation)
- [Development](#development)
  - [Setup Development Environment](#setup-development-environment)
  - [Running Tests](#running-tests)
  - [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Changelog](#changelog)
- [Support](#support)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## Quick Start Summary

**For Users:**

1. Add the Discord bot to your server → Use `/task`, `/list`, `/note`, `/remind`, `/budget`, `/schedule`, `/random`, `/recipe`, `/sunset`, `/events`, `/issues`, `/make-it-a-quote` commands
2. Or access the PWA at [https://bwaincell.sunny-stack.com](https://bwaincell.sunny-stack.com) → Sign in with Google
3. Full guide: [docs/guides/getting-started.md](docs/guides/getting-started.md)

**For Developers:**

```bash
# Clone repository
git clone https://github.com/lukadfagundes/bwaincell.git
cd bwaincell

# Install dependencies and build shared types
npm install
npm run build:shared

# Setup environment variables
cp .env.example .env
# Edit .env with your Discord bot token, Google OAuth credentials, Supabase keys, etc.

# Start local Supabase (required for backend)
npm run supabase:start

# Start development (backend + frontend)
npm run dev

# Deploy Discord commands
npm run deploy --workspace=backend
```

**For Self-Hosting:**

- Backend: Raspberry Pi 4B with Docker Compose + self-hosted Supabase → [docs/guides/deployment.md](docs/guides/deployment.md)
- Frontend: Deploy to Vercel → [docs/guides/deployment.md](docs/guides/deployment.md)

---

## Features

### Core Interfaces

- **Discord Bot** - Primary interface via 12 slash commands (/task, /list, /note, /remind, /budget, /schedule, /random, /recipe, /sunset, /events, /issues, /make-it-a-quote) with multiple subcommands for each feature
- **REST API** - Express 4.21.2 API with Google OAuth 2.0 + JWT authentication for programmatic access
- **Progressive Web App** - Next.js 15 PWA with offline support, installable on iOS, Android, and desktop (see [frontend/README.md](frontend/README.md) for installation guide)

### Productivity Features

- **Task Management** - Create tasks with due dates, mark complete, filter by status, edit descriptions
- **List Management** - Shareable lists with checkable items, completion tracking, bulk operations
- **Note Taking** - Rich notes with tagging, full-text search, edit history, tag-based organization
- **Smart Reminders** - One-time, daily, weekly, monthly, and yearly reminders with timezone support and automated scheduling
- **Budget Tracking** - Income/expense tracking, category spending, monthly summaries, trend analysis
- **Event Scheduling** - Event management with countdown timers, today/week views, upcoming/past filters
- **Recipe Management** - Recipe storage, meal planning, and AI-generated shopping lists based on planned meals and household preferences
- **Sunset Scheduler** - Daily sunset announcements configurable per Discord server (channel + timing)
- **Random Utilities** - Movie picker, dinner suggestions, date ideas, dice roller, coin flipper, and more
- **AI-Powered Features** - Gemini-powered date suggestions with local events, WNRS-inspired conversation starters, AI shopping list generation, daily question scheduler
- **Local Events** - AI-powered local event discovery and announcement configuration
- **GitHub Issues** - Browse and view project issues directly from Discord
- **Make It A Quote** - Transform any Discord message into a shareable styled quote image

### Technical Architecture

- **User Isolation** - Guild-based data segregation (shared household model) with user audit trails
- **Supabase** - Managed PostgreSQL with Supabase client (@supabase/supabase-js), row-level security, and migration-based schema management
- **Docker Deployment** - Containerized backend alongside self-hosted Supabase on Raspberry Pi 4B with GitHub Actions CI/CD
- **Monorepo** - npm workspaces (backend/, frontend/, shared/) with shared TypeScript types across packages
- **TypeScript 5.9** - Strict mode, shared type definitions, compile-time safety across all interfaces
- **Testing** - Jest + ts-jest with unit and integration tests (target: 80% coverage), integration tests with Supertest
- **Monitoring** - Winston 3.17.0 structured logging, health endpoints, Docker stats, resource monitoring
- **Security** - Google OAuth 2.0, JWT access/refresh tokens, email whitelist, input validation with Joi

---

## Installation

### Prerequisites

- **Node.js** 18.0 or higher
- **npm** 9.0 or higher
- **Supabase CLI** (for local development — [install guide](https://supabase.com/docs/guides/cli))
- **Docker** (required by Supabase CLI and deployment)
- **Discord Bot Token** ([Discord Developer Portal](https://discord.com/developers/applications))
- **Google OAuth 2.0 Credentials** ([Google Cloud Console](https://console.cloud.google.com))
- **Google Gemini API Key** ([Google AI Studio](https://ai.google.dev/)) — for AI features

### Install from Source

```bash
# Clone the repository
git clone https://github.com/lukadfagundes/bwaincell.git
cd bwaincell

# Install dependencies for all workspaces
npm install

# Build shared types package
npm run build:shared

# Create environment file
cp .env.example .env

# Edit .env with your credentials
# Required: Discord bot token, Google OAuth credentials, Supabase keys, JWT secret, Gemini API key

# Start local Supabase (spins up PostgreSQL + Studio in Docker)
npm run supabase:start
```

---

## Quick Start

### Backend (Discord Bot + REST API)

```bash
# Development mode (starts both Discord bot and API server)
npm run dev:backend

# Production build and start
npm run build:backend
npm start --workspace=backend

# Deploy Discord slash commands
npm run deploy --workspace=backend
```

### Frontend (Progressive Web App)

```bash
# Development mode (port 3010)
npm run dev:frontend

# Production build
npm run build:frontend
npm start --workspace=frontend

# Deploy to Vercel
vercel deploy --prod
```

### Full Stack Development

```bash
# Start backend and frontend concurrently
npm run dev

# Run tests across all workspaces
npm test

# Lint all workspaces
npm run lint
```

---

## Usage

### Discord Bot Commands

```bash
# Task Management (/task)
/task add <description> [date] [time]   - Create a new task with optional due date
/task list [filter]                     - View tasks (filter: All, Pending, Completed)
/task done <task_id>                    - Mark task as complete
/task edit <task_id> <new_text>         - Edit task description
/task delete <task_id>                  - Delete a task

# List Management (/list)
/list create <name>                     - Create a new list
/list show <list_name>                  - View list items with completion status
/list add <list_name> <item>            - Add item to list
/list remove <list_name> <item>         - Remove item from list
/list complete <list_name> <item>       - Toggle item completion
/list clear <list_name>                 - Clear completed items
/list delete <list_name>                - Delete entire list
/list all                               - Show all lists

# Note Management (/note)
/note add <title> <content> [tags]      - Create a note with optional tags
/note list                              - View all notes
/note view <title>                      - Display specific note
/note edit <current_title> [new_title] [content] [tags] - Edit note
/note delete <title>                    - Delete a note
/note search <keyword>                  - Search notes by keyword
/note tag <tag>                         - Find notes by tag
/note tags                              - List all tags

# Reminder System (/remind)
/remind me <message> <time>             - Set one-time reminder
/remind daily <message> <time>          - Set daily recurring reminder
/remind weekly <message> <day> <time>   - Set weekly recurring reminder
/remind monthly <message> <day> <time>  - Set monthly recurring reminder
/remind yearly <message> <date> <time>  - Set yearly recurring reminder
/remind list                            - View active reminders
/remind delete <reminder_id>            - Delete a reminder

# Budget Tracking (/budget)
/budget add <category> <amount> [description]     - Add expense
/budget income <amount> [description]             - Add income
/budget summary [month]                           - View monthly summary
/budget categories                                - List spending by category
/budget recent [limit]                            - Show recent transactions
/budget trend [months]                            - Show monthly spending trend

# Schedule Management (/schedule)
/schedule add <event> <date> <time> [description] - Schedule an event
/schedule list [filter]                           - View events (Upcoming, Past, All)
/schedule delete <event_id>                       - Delete event
/schedule countdown <event>                       - Show countdown to event
/schedule today                                   - Show today's events
/schedule week                                    - Show this week's events

# Random Utilities (/random)
/random movie                           - Pick random movie with details
/random dinner                          - Pick random dinner suggestion
/random date                            - Generate AI-powered date idea (with local events)
/random question                        - Get AI-powered WNRS-style conversation starter
/random choice <options>                - Pick from comma-separated options
/random number <max>                    - Generate random number (1-max)
/random coin                            - Flip a coin
/random dice <sides> [count]            - Roll dice (2-100 sides, 1-10 count)

# Recipe Management (/recipe)
/recipe add                             - Add a new recipe with ingredients and instructions
/recipe list                            - Browse saved recipes
/recipe view <recipe>                   - View recipe details
/recipe plan                            - Plan meals for the week
/recipe shopping-list                   - Generate an AI-powered shopping list from planned meals
/recipe preferences                     - Configure dietary preferences and household settings

# Sunset Scheduler (/sunset)
/sunset configure                       - Configure daily sunset announcements (channel + timing)
/sunset status                          - View current sunset announcement configuration

# Events (/events)
/events upcoming                        - View upcoming local events (AI-powered)
/events configure                       - Configure event announcements for your server

# GitHub Issues (/issues)
/issues list                            - Browse open project issues
/issues view <number>                   - View specific issue details

# Make It A Quote (/make-it-a-quote)
/make-it-a-quote <message>              - Generate a styled quote image from a Discord message
```

### REST API Endpoints

All REST API endpoints (except `/health` and `/api/auth/*`) require JWT authentication via `Authorization: Bearer <token>` header.

**Base URL:** `http://localhost:3000` (development) | Your Raspberry Pi IP address (production)

**Authentication:**

```http
POST /api/auth/google/verify    - Verify Google ID token, return JWT + refresh token
POST /api/auth/refresh          - Refresh expired JWT token (requires refresh token)
POST /api/auth/logout           - Invalidate refresh token
```

**Resource Endpoints:**

```http
# Tasks
GET    /api/tasks              - List all tasks (with filtering support)
POST   /api/tasks              - Create new task
PATCH  /api/tasks/:id          - Update task (description, completed, due_date)
DELETE /api/tasks/:id          - Delete task

# Lists
GET    /api/lists              - Get all lists
POST   /api/lists              - Create new list
GET    /api/lists/:id          - Get specific list with items
DELETE /api/lists/:id          - Delete list
POST   /api/lists/:id/items    - Add item to list
DELETE /api/lists/:id/items/:itemId - Remove item from list

# Notes
GET    /api/notes              - Get all notes
POST   /api/notes              - Create new note
GET    /api/notes/:id          - Get specific note
PATCH  /api/notes/:id          - Update note
DELETE /api/notes/:id          - Delete note
GET    /api/notes/search?q=    - Search notes by keyword

# Reminders
GET    /api/reminders          - Get active reminders
POST   /api/reminders          - Create new reminder
DELETE /api/reminders/:id      - Delete reminder

# Budget
GET    /api/budget/summary     - Get budget summary (supports ?month= query param)
POST   /api/budget             - Add budget entry (expense or income)
GET    /api/budget/categories  - List spending by category
GET    /api/budget/recent      - Get recent transactions (supports ?limit= query param)

# Schedule
GET    /api/schedules          - Get scheduled events (supports ?filter= query param)
POST   /api/schedules          - Create new event
DELETE /api/schedules/:id      - Delete event

# Recipes
GET    /api/recipes            - List recipes
POST   /api/recipes            - Create new recipe
GET    /api/recipes/:id        - Get specific recipe
PATCH  /api/recipes/:id        - Update recipe
DELETE /api/recipes/:id        - Delete recipe

# Health Check (no auth required)
GET    /health                 - Service health status
```

**Complete API Documentation:** [docs/api/README.md](docs/api/README.md)
**Discord Bot Commands Reference:** [docs/api/discord-commands.md](docs/api/discord-commands.md)

### Progressive Web App

1. Open [https://bwaincell.sunny-stack.com](https://bwaincell.sunny-stack.com)
2. Sign in with Google OAuth
3. Access tasks, lists, notes, reminders, budget tracking, and recipes
4. Install as PWA (Add to Home Screen)

---

## Configuration

### Environment Variables

Create a `.env` file in the project root (see `.env.example` for the full template):

```bash
# Discord Bot Configuration
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_for_testing

# User-Discord ID Mapping (email whitelist)
USER1_EMAIL=user@gmail.com
USER1_DISCORD_ID=123456789
USER2_EMAIL=partner@gmail.com
USER2_DISCORD_ID=987654321

# Google OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
ALLOWED_GOOGLE_EMAILS=user1@gmail.com,user2@gmail.com

# NextAuth (frontend)
NEXTAUTH_URL=http://localhost:3010
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# JWT Configuration
JWT_SECRET=generate_with_openssl_rand_base64_32

# REST API Configuration
API_PORT=3000
PORT=3000

# Supabase Configuration
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_DB_PASSWORD=postgres

# Application Settings
NODE_ENV=development
TIMEZONE=America/Los_Angeles
DEFAULT_REMINDER_CHANNEL=your_channel_id_for_reminders

# GitHub Integration (for /issues)
GITHUB_TOKEN=ghp_your_github_personal_access_token_here
GITHUB_REPO_OWNER=your-github-username
GITHUB_REPO_NAME=Bwaincell

# Gemini AI Configuration (for /random date and /recipe shopping-list)
GEMINI_API_KEY=your_gemini_api_key_here
LOCATION_ZIP_CODE=ZIP_CODE_HERE
```

### Configuration Files

**docker-compose.yml** - Docker containerization for backend
**supabase/config.toml** - Supabase local and self-hosted configuration
**supabase/migrations/** - SQL migrations applied by Supabase CLI
**backend/tsconfig.json** - TypeScript configuration for backend
**frontend/next.config.js** - Next.js configuration with PWA support
**shared/tsconfig.json** - Shared types TypeScript configuration

---

## API Reference

### Authentication Flow

1. User authenticates with Google OAuth (PWA or external client)
2. Backend verifies Google ID token with `google-auth-library`
3. Backend maps Google email to Discord user ID (from environment variables)
4. Backend generates JWT access token and refresh token
5. Client stores tokens and sends JWT in `Authorization: Bearer <token>` header
6. All protected routes require valid JWT token

### Discord Bot Commands

Slash commands are registered via the backend `deploy` script and follow Discord.js 14 interaction patterns:

- Commands located in `backend/commands/`
- Interaction handlers in `backend/utils/interactions/`
- Database operations via Supabase client with user_id + guild_id isolation

### REST API Routes

All API routes (except `/health` and `/api/auth/*`) require JWT authentication:

- Routes located in `backend/src/api/routes/`
- Middleware: CORS → JSON → OAuth → JWT → Logging → Error
- Standardized response format: `{ success: true/false, data/error }`

Complete API reference: [docs/api/README.md](docs/api/README.md)

---

## Documentation

Comprehensive documentation organized into user guides, API references, architecture documents, and development resources.

### Getting Started

**New to Bwaincell?** Start here:

- **[Getting Started Guide](docs/guides/getting-started.md)** - Installation, prerequisites, project structure, quick start
- **[Deployment Guide](docs/guides/deployment.md)** - Raspberry Pi 4B deployment with Docker + self-hosted Supabase
- **[Troubleshooting Guide](docs/guides/troubleshooting.md)** - Common issues, debugging, performance optimization
- **[FAQ](docs/guides/faq.md)** - Frequently asked questions and answers

### API Documentation

**REST API & Discord Bot References:**

- **[API Overview](docs/api/README.md)** - Complete REST API reference with authentication flow
- **[Discord Bot Commands](docs/api/discord-commands.md)** - All 12 slash commands with detailed subcommands and examples

### Architecture Documentation

**System design and technical architecture:**

- **[Architecture Overview](docs/architecture/overview.md)** - Multi-interface design, tech stack, data flow, deployment
- **[Database Schema](docs/architecture/database-schema.md)** - Supabase-managed PostgreSQL schema (12 models: User, Task, List, Note, Reminder, Schedule, Budget, Recipe, RecipePreferences, MealPlan, SunsetConfig, EventConfig)
- **[Architecture Diagrams](docs/architecture/diagrams.md)** - System architecture, component diagrams, data flow visuals
- **[Architecture Decision Records](docs/architecture/adr/README.md)** - ADRs including the Supabase migration

### Development Guides

**For contributors and developers:**

- **[API Development](docs/guides/api-development.md)** - Creating new REST API endpoints
- **[Discord Bot Development](docs/guides/discord-bot-development.md)** - Adding new Discord slash commands
- **[Testing Guide](docs/guides/testing.md)** - Unit, integration, and E2E testing strategies
- **[Database Migrations](docs/guides/database-migrations.md)** - Supabase migration management
- **[Docker Development](docs/guides/docker-development.md)** - Docker Compose setup and workflows
- **[CI/CD Pipeline](docs/guides/ci-cd-pipeline.md)** - GitHub Actions automated deployment
- **[Security Best Practices](docs/guides/security-best-practices.md)** - OAuth, JWT, input validation, OWASP compliance
- **[Performance Optimization](docs/guides/performance-optimization.md)** - Database indexing, query optimization, caching
- **[Monitoring & Logging](docs/guides/monitoring-and-logging.md)** - Winston logging, health checks, metrics
- **[PWA Features](docs/guides/pwa-features.md)** - Progressive Web App capabilities and offline support

### Reference Documentation

**Quick lookups and specifications:**

- **[Quick Reference](docs/reference/quick-reference.md)** - CLI commands, Docker commands, npm scripts
- **[Environment Variables](docs/reference/README.md)** - Complete .env configuration reference
- **[Glossary](docs/reference/glossary.md)** - Project terminology and technical definitions

---

## Development

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/lukadfagundes/bwaincell.git
cd bwaincell

# Install all workspace dependencies
npm install

# Build shared types (required before running backend/frontend)
npm run build:shared

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start local Supabase (PostgreSQL + Studio via Docker)
npm run supabase:start

# Check Supabase status and get local keys
npm run supabase:status

# Database migrations in supabase/migrations/ are applied automatically by Supabase CLI.
# To reset the local database:
#   npm run supabase:reset

# Start development servers
npm run dev  # Starts both backend and frontend
```

### Running Tests

```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend

# Generate coverage reports
npm run test:coverage

# Watch mode for TDD
npm run test:watch
```

### Project Structure

```
bwaincell/
├── backend/                    # Discord bot + REST API (Express + Discord.js)
│   ├── src/
│   │   ├── bot.ts             # Discord bot entry point
│   │   ├── api/               # Express REST API
│   │   │   ├── server.ts      # API server configuration
│   │   │   ├── routes/        # API route handlers (tasks, lists, notes, etc.)
│   │   │   └── middleware/    # CORS, JWT auth, error handling, logging
│   │   ├── types/             # Backend type definitions
│   │   └── deploy-commands.ts # Discord slash command registration
│   ├── commands/              # Discord slash commands (12 commands)
│   │   ├── task.ts            # Task management (/task)
│   │   ├── list.ts            # List management (/list)
│   │   ├── note.ts            # Note management (/note)
│   │   ├── remind.ts          # Reminder system (/remind)
│   │   ├── budget.ts          # Budget tracking (/budget)
│   │   ├── schedule.ts        # Event scheduling (/schedule)
│   │   ├── random.ts          # Random utilities (/random)
│   │   ├── recipe.ts          # Recipe management (/recipe)
│   │   ├── sunset.ts          # Sunset announcements (/sunset)
│   │   ├── events.ts          # Local events (AI-powered) (/events)
│   │   ├── issues.ts          # GitHub issues browser (/issues)
│   │   └── make-it-a-quote.ts # Styled quote image generator (/make-it-a-quote)
│   ├── utils/
│   │   ├── interactions/      # Discord interaction handlers (buttons, modals, selects)
│   │   ├── scheduler.ts       # Node-cron reminder & daily question scheduler
│   │   ├── geminiService.ts   # Google Gemini AI service (date ideas, WNRS questions, shopping lists)
│   │   ├── eventsService.ts   # Local event discovery service
│   │   ├── githubService.ts   # GitHub API integration
│   │   ├── imageService.ts    # Image generation service (quote images)
│   │   ├── googleServices.ts  # Google API utilities
│   │   ├── validators.ts      # Input validation utilities
│   │   └── dateHelpers.ts     # Date/time helper functions
│   ├── config/                # Configuration files
│   ├── tests/                 # Jest unit and integration tests
│   ├── Dockerfile             # Multi-stage Docker build
│   ├── package.json           # Backend dependencies and scripts
│   └── tsconfig.json          # TypeScript configuration
├── supabase/                   # Supabase database layer (source of truth)
│   ├── init.sql               # Initial SQL bootstrap
│   ├── config.toml            # Supabase CLI configuration
│   ├── migrations/            # SQL migrations applied by Supabase CLI
│   ├── models/                # Typed model wrappers (12 models)
│   └── supabase.ts            # Shared Supabase client factory
├── frontend/                   # Next.js 15 PWA
│   ├── app/                   # App Router (Next.js)
│   │   ├── dashboard/         # Dashboard pages (tasks, lists, notes, etc.)
│   │   ├── api/               # API routes (NextAuth, health)
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Landing page
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui base components (Radix UI)
│   │   └── dashboard/        # Dashboard-specific components
│   ├── hooks/                 # Custom React hooks (useTasks, useLists, useNotes)
│   ├── lib/
│   │   ├── api-client.ts     # Axios-style API client with JWT handling
│   │   ├── utils.ts          # Utility functions
│   │   └── supabase.ts       # Supabase client for frontend
│   ├── public/
│   │   ├── manifest.json     # PWA manifest
│   │   └── icons/            # PWA icons (various sizes)
│   ├── next.config.js         # Next.js config with PWA support
│   ├── package.json           # Frontend dependencies
│   └── tsconfig.json          # TypeScript configuration
├── shared/                     # Shared TypeScript types (monorepo workspace)
│   ├── types/                 # Shared interfaces (task, list, note, reminder, budget, schedule, recipe, etc.)
│   ├── utils/
│   │   └── logger.ts         # Shared Winston logger
│   └── validation/
│       └── env.ts            # Environment variable validation
├── tests/                      # Integration and E2E tests (cross-workspace)
├── docs/                       # Comprehensive project documentation
│   ├── guides/                # User and developer guides
│   ├── api/                   # API and Discord command references
│   ├── architecture/          # System architecture, database schema, ADRs
│   └── reference/             # Quick references and glossary
├── .github/
│   └── workflows/             # GitHub Actions CI/CD
├── docker-compose.yml          # Docker services (backend container)
├── .env.example                # Environment variable template
├── package.json                # Monorepo workspace configuration
└── tsconfig.json               # Root TypeScript configuration
```

---

## Contributing

Contributions are welcome!

### Contribution Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Implement changes with tests (80%+ coverage target)
4. Run quality gates: `npm run lint`, `npm test`, `npm run typecheck`
5. Commit with conventional commits: `git commit -m "feat: add new feature"`
6. Push to branch: `git push origin feature/your-feature-name`
7. Open a Pull Request with:
   - Investigation findings (if applicable)
   - Implementation details
   - Test coverage report
   - Breaking changes (if any)

### Code Standards

- **TypeScript Strict Mode** - All code must pass `tsc --strict`
- **ESLint Compliance** - Run `npm run lint` before committing
- **Test Coverage** - 80%+ target
- **Documentation** - JSDoc for public functions, inline comments for complex logic
- **Error Handling** - Use Winston logger, try-catch for async operations
- **Commit Messages** - Conventional commits format

---

## Changelog

Version history and release notes are tracked in [CHANGELOG.md](CHANGELOG.md), following the Keep-a-Changelog standard format.

---

## Support

### Documentation Resources

- **Complete Documentation** - [docs/](docs/) directory with comprehensive guides
- **Getting Started Guide** - [docs/guides/getting-started.md](docs/guides/getting-started.md)
- **Troubleshooting** - [docs/guides/troubleshooting.md](docs/guides/troubleshooting.md)
- **API Reference** - [docs/api/README.md](docs/api/README.md)
- **Discord Commands** - [docs/api/discord-commands.md](docs/api/discord-commands.md)

### Get Help

- **Bug Reports** - [GitHub Issues](https://github.com/lukadfagundes/bwaincell/issues)
- **Feature Requests** - [GitHub Issues](https://github.com/lukadfagundes/bwaincell/issues/new)
- **Discussions** - [GitHub Discussions](https://github.com/lukadfagundes/bwaincell/discussions)
- **Contact** - Via [GitHub Profile](https://github.com/lukadfagundes)

### Common Resources

- **FAQ**: [docs/guides/faq.md](docs/guides/faq.md)

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

### Backend Frameworks & Libraries

- **Discord.js 14.14.1** - Discord bot framework with slash commands ([discord.js.org](https://discord.js.org/))
- **Express 4.21.2** - Fast, minimalist web framework for Node.js ([expressjs.com](https://expressjs.com/))
- **@supabase/supabase-js 2.x** - Supabase client for PostgreSQL access ([supabase.com](https://supabase.com/))
- **Winston 3.17.0** - Structured logging library ([github.com/winstonjs/winston](https://github.com/winstonjs/winston))
- **Joi 18.0.1** - Schema description and validation ([joi.dev](https://joi.dev/))
- **node-cron 4.2.1** - Task scheduler for reminder system ([github.com/node-cron/node-cron](https://github.com/node-cron/node-cron))
- **jsonwebtoken 9.0.2** - JWT implementation ([github.com/auth0/node-jsonwebtoken](https://github.com/auth0/node-jsonwebtoken))
- **@google/genai 1.x** - Google Gemini AI SDK for date ideas, conversation questions, and AI shopping lists
- **skia-canvas 3.x** - Canvas rendering for generated quote images

### Frontend Frameworks & Libraries

- **Next.js 15.5** - React framework with App Router ([nextjs.org](https://nextjs.org/))
- **React 19.2** - JavaScript library for building user interfaces ([react.dev](https://react.dev/))
- **@supabase/supabase-js 2.x** - Supabase client used in the PWA ([supabase.com](https://supabase.com/))
- **TanStack Query 5.90** - Powerful data synchronization for React ([tanstack.com/query](https://tanstack.com/query))
- **NextAuth 4.24.13** - Authentication for Next.js ([next-auth.js.org](https://next-auth.js.org/))
- **Radix UI** - Unstyled, accessible component primitives ([radix-ui.com](https://www.radix-ui.com/))
- **shadcn/ui** - Beautifully designed components built with Radix UI and Tailwind CSS ([ui.shadcn.com](https://ui.shadcn.com/))
- **Tailwind CSS 3.4** - Utility-first CSS framework ([tailwindcss.com](https://tailwindcss.com/))
- **Zustand 5.0** - Lightweight state management ([github.com/pmndrs/zustand](https://github.com/pmndrs/zustand))

### Infrastructure & Deployment

- **Supabase** - PostgreSQL-based backend platform with migrations, auth, and storage ([supabase.com](https://supabase.com/))
- **PostgreSQL 15** - Managed by Supabase ([postgresql.org](https://www.postgresql.org/))
- **Docker** - Containerization platform ([docker.com](https://www.docker.com/))
- **Raspberry Pi 4B** - Self-hosted backend deployment ([raspberrypi.com](https://www.raspberrypi.com/))
- **Vercel** - Frontend deployment platform with edge network ([vercel.com](https://vercel.com/))
- **GitHub Actions** - CI/CD automation ([github.com/features/actions](https://github.com/features/actions))

### Authentication & Security

- **Google OAuth 2.0** - Authentication provider ([developers.google.com/identity](https://developers.google.com/identity/protocols/oauth2))
- **google-auth-library 10.4.0** - Google authentication client library

### Development Tools

- **TypeScript 5.9** - Typed superset of JavaScript ([typescriptlang.org](https://www.typescriptlang.org/))
- **Jest 30** - JavaScript testing framework ([jestjs.io](https://jestjs.io/))
- **ESLint 8.x** - JavaScript linter ([eslint.org](https://eslint.org/))
- **Prettier 3.0** - Code formatter ([prettier.io](https://prettier.io/))
- **Supabase CLI** - Local Supabase development and migrations ([supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli))

---

**Version:** 2.2.0
**Status:** Production Ready
**Last Updated:** 2026-04-15
**Framework:** TypeScript 5.9 + Discord.js 14.14.1 + Express 4.21.2 + Next.js 15.5
**Database:** Supabase-managed PostgreSQL 15
**Deployment:** Backend (Raspberry Pi 4B + Docker + self-hosted Supabase) + Frontend (Vercel)
**Discord Commands:** 12 commands with multiple subcommands each
**Documentation:** 30+ comprehensive documentation files in docs/
**Maintained by:** [lukadfagundes](https://github.com/lukadfagundes)

---

**Built for personal and household productivity management**
_A unified platform for tasks, lists, notes, reminders, budgets, schedules, and recipes_
_Same Fweak, Same Bwaincell_
