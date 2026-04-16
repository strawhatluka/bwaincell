# Quick Reference

**Version:** 2.2.0
**Last Updated:** 2026-04-16

> **Supabase update (2026-04-15):** Tables below that list `backend/database/` as a file location are stale. Replace them as follows:
>
> | Old path                       | New path                                       |
> | ------------------------------ | ---------------------------------------------- |
> | `backend/database/models/`     | `supabase/models/`                             |
> | `backend/database/migrations/` | `supabase/migrations/`                         |
> | `backend/database/index.ts`    | `supabase/supabase.ts`                         |
> | `backend/database/config.js`   | `supabase/config.toml` + `.env` (`SUPABASE_*`) |

## Discord Commands (12)

| Command     | Purpose                                                        |
| ----------- | -------------------------------------------------------------- |
| `/budget`   | Track expenses and income                                      |
| `/events`   | Configure weekly local-events announcements (per guild)        |
| `/issues`   | File GitHub issues directly from Discord                       |
| `/list`     | Manage named lists (shopping, checklists, etc.)                |
| `/note`     | Create and search notes                                        |
| `/quote`    | Store and retrieve quotes                                      |
| `/random`   | AI-powered random suggestions (Gemini)                         |
| `/recipe`   | Capture recipes, manage weekly meal plan, get AI shopping list |
| `/remind`   | Schedule one-time or recurring reminders                       |
| `/schedule` | Calendar events                                                |
| `/sunset`   | Configure daily sunset announcements (per guild)               |
| `/task`     | Task management                                                |

## Backend Express REST API

| Endpoint group | Path                                            | Source                                |
| -------------- | ----------------------------------------------- | ------------------------------------- |
| Health         | `GET /health`                                   | `backend/src/api/routes/health.ts`    |
| Auth           | `/api/auth/*`                                   | `backend/src/api/routes/oauth.ts`     |
| Tasks          | `/api/tasks`                                    | `backend/src/api/routes/tasks.ts`     |
| Lists          | `/api/lists` (+ items, clear-completed, toggle) | `backend/src/api/routes/lists.ts`     |
| Notes          | `/api/notes` (+ search)                         | `backend/src/api/routes/notes.ts`     |
| Reminders      | `/api/reminders`                                | `backend/src/api/routes/reminders.ts` |
| Budget         | `/api/budget` (+ summary, transactions)         | `backend/src/api/routes/budget.ts`    |
| Schedule       | `/api/schedule`                                 | `backend/src/api/routes/schedule.ts`  |

(Recipes / MealPlans / Sunset config / Events config are Discord-only today; see [../api/README.md](../api/README.md).)

## Frontend Next.js API routes

Under `frontend/app/api/`: `auth/[...nextauth]`, `tasks`, `lists`, `notes`, `reminders`, `schedule`, `budget` (each with CRUD and nested routes as needed).

## npm Scripts (Supabase-specific)

| Script                    | Purpose                                               |
| ------------------------- | ----------------------------------------------------- |
| `npm run supabase:start`  | Start local Supabase stack (Docker)                   |
| `npm run supabase:stop`   | Stop local Supabase stack                             |
| `npm run supabase:status` | Print local URLs + anon/service-role keys             |
| `npm run supabase:reset`  | `supabase db reset` — replays `init.sql` + migrations |

## TypeScript Path Aliases (backend)

Defined in `backend/tsconfig.json` under `compilerOptions.paths`. Use these in backend code; raw relative paths across workspaces will break at runtime inside the Docker image.

| Alias                 | Maps to              | Used for                                     |
| --------------------- | -------------------- | -------------------------------------------- |
| `@database/*`         | `../supabase/*`      | Supabase client, typed models, types         |
| `@shared/*`           | `shared/*`           | Backend-local shared utils (`backend/shared/`) |
| `@bwaincell/shared`   | `../shared/src`      | Cross-workspace `@bwaincell/shared` package   |
| `@commands/*`         | `src/commands/*`     | Backend command modules                      |
| `@handlers/*`         | `src/handlers/*`     | Interaction handlers                         |
| `@services/*`         | `src/services/*`     | Backend service modules                      |

Example:

```typescript
import Task from '@database/models/Task';
import supabase from '@database/supabase';
```

## Key File Locations

| Concern                         | Location                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------- |
| Supabase client                 | `supabase/supabase.ts`                                                           |
| Schema (authoritative)          | `supabase/migrations/*.sql`                                                      |
| Bootstrap SQL                   | `supabase/init.sql`                                                              |
| Model wrappers (12)             | `supabase/models/*.ts`                                                           |
| Supabase CLI config             | `supabase/config.toml`                                                           |
| Internal workspace (Supabase)   | `supabase/package.json` (`@bwaincell/supabase`, `main: dist/index.js`)           |
| TypeScript path aliases         | `backend/tsconfig.json` (`compilerOptions.paths`)                                |
| Discord commands (12)           | `backend/commands/*.ts`                                                          |
| Interaction handlers            | `backend/utils/interactions/handlers/*.ts`                                       |
| Schedulers                      | `backend/utils/scheduler.ts`, `sunsetService.ts`, `eventsService.ts`             |
| AI integration                  | `backend/utils/geminiService.ts`, `shoppingList.ts`, `recipeNormalize.ts`        |
| Recipe ingest                   | `backend/utils/recipeScraper.ts`, `recipeIngestion.ts`, `ingredientCanonical.ts` |
| REST routes                     | `backend/src/api/routes/*.ts`                                                    |
| Next.js API routes              | `frontend/app/api/**/route.ts`                                                   |
| Bot image (GHCR)                | `ghcr.io/strawhatluka/bwaincell-backend:{latest,<git-sha>}`                       |
| Deploy workflow                 | `.github/workflows/deploy.yml`                                                   |

Fast reference guide for common commands, Discord bot commands, API endpoints, environment variables, and troubleshooting quick fixes.

---

## Table of Contents

1. [Common Commands](#common-commands)
2. [Discord Bot Commands](#discord-bot-commands)
3. [API Endpoints](#api-endpoints)
4. [Environment Variables](#environment-variables)
5. [File Locations](#file-locations)
6. [Troubleshooting Quick Fixes](#troubleshooting-quick-fixes)

---

## Common Commands

### npm Scripts

| Command                              | Description                                      |
| ------------------------------------ | ------------------------------------------------ |
| `npm install`                        | Install all workspace dependencies               |
| `npm run dev`                        | Start backend + frontend concurrently            |
| `npm run dev:backend`                | Start Discord bot + API server (port 3000)       |
| `npm run dev:frontend`               | Start Next.js dev server (port 3010)             |
| `npm run build`                      | Build all workspaces (shared, backend, frontend) |
| `npm run build:shared`               | Build shared types package (required first)      |
| `npm run build:backend`              | Build backend only                               |
| `npm run build:frontend`             | Build frontend only                              |
| `npm start --workspace=backend`      | Start production backend                         |
| `npm start --workspace=frontend`     | Start production frontend                        |
| `npm test`                           | Run tests across all workspaces                  |
| `npm run test:backend`               | Run backend tests only                           |
| `npm run test:frontend`              | Run frontend tests only                          |
| `npm run test:coverage`              | Generate coverage reports                        |
| `npm run test:watch`                 | Run tests in watch mode (TDD)                    |
| `npm run lint`                       | Lint all workspaces                              |
| `npm run lint:fix`                   | Auto-fix linting issues                          |
| `npm run typecheck`                  | TypeScript type checking                         |
| `npm run clean`                      | Clean build artifacts                            |
| `npm run deploy --workspace=backend` | Deploy Discord slash commands                    |

---

### Docker Commands

The backend image is pulled from GHCR (`ghcr.io/strawhatluka/bwaincell-backend`); no local build on the Pi. Authentication is handled once on the Pi via `echo $PAT | docker login ghcr.io -u strawhatluka --password-stdin` using a GitHub PAT with `read:packages` scope (stored in repo as the `PI_GHCR_TOKEN` secret for the workflow).

| Command                                          | Description                              |
| ------------------------------------------------ | ---------------------------------------- |
| `docker compose pull backend`                    | Pull the latest bot image from GHCR      |
| `docker-compose build`                           | Build Docker images (local dev only — Pi never builds) |
| `docker-compose up -d`                           | Start services in background             |
| `docker-compose down`                            | Stop and remove containers               |
| `docker-compose logs -f`                         | Follow logs for all services             |
| `docker-compose logs -f backend`                 | Follow backend logs only                 |
| `docker-compose logs -f postgres`                | Follow PostgreSQL logs only              |
| `docker-compose ps`                              | List running containers                  |
| `docker-compose restart backend`                 | Restart backend container                |
| `docker-compose restart postgres`                | Restart PostgreSQL container             |
| `docker stats bwaincell-backend bwaincell-db`    | Monitor resource usage                   |
| `docker logs bwaincell-backend --tail 50`        | View last 50 log lines                   |
| `docker exec -it bwaincell-backend sh`           | Shell into backend container             |
| `docker exec -it bwaincell-db psql -U bwaincell` | PostgreSQL shell                         |
| `docker volume ls`                               | List Docker volumes                      |
| `docker volume rm bwaincell_postgres-data`       | Remove database volume (⚠️ deletes data) |

---

### Git Commands

| Command                                                    | Description                      |
| ---------------------------------------------------------- | -------------------------------- |
| `git clone https://github.com/strawhatluka/bwaincell.git` | Clone repository                 |
| `git checkout -b feature/name`                             | Create feature branch            |
| `git status`                                               | Check working directory status   |
| `git add .`                                                | Stage all changes                |
| `git commit -m "feat: add feature"`                        | Commit with conventional message |
| `git push origin feature/name`                             | Push feature branch              |
| `git pull origin main`                                     | Pull latest main branch          |
| `git log --oneline -10`                                    | View last 10 commits             |
| `git diff`                                                 | View unstaged changes            |
| `git stash`                                                | Temporarily save changes         |
| `git stash pop`                                            | Restore stashed changes          |

---

### Database Commands (PostgreSQL)

| Command                                                 | Description                     |
| ------------------------------------------------------- | ------------------------------- |
| `psql -U bwaincell -d bwaincell`                        | Connect to database             |
| `\dt`                                                   | List all tables                 |
| `\d+ tasks`                                             | Describe tasks table            |
| `\l`                                                    | List databases                  |
| `\du`                                                   | List database users             |
| `\q`                                                    | Quit psql                       |
| `SELECT * FROM tasks LIMIT 10;`                         | View first 10 tasks             |
| `SELECT COUNT(*) FROM tasks;`                           | Count total tasks               |
| `EXPLAIN ANALYZE SELECT ...;`                           | Analyze query performance       |
| `pg_dump -U bwaincell -d bwaincell -F c -f backup.dump` | Backup database (custom format) |
| `pg_restore -U bwaincell -d bwaincell backup.dump`      | Restore from backup             |
| `pg_isready -h localhost -p 5433`                       | Check if PostgreSQL is running  |

---

## Discord Bot Commands

### Task Management (`/task`)

| Command                                 | Description                        | Example                                                                  |
| --------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| `/task add <description> [date] [time]` | Create new task                    | `/task add description:"Buy groceries" date:"01-15-2026" time:"2:30 PM"` |
| `/task list [filter]`                   | List tasks (All/Pending/Completed) | `/task list filter:"Pending"`                                            |
| `/task done <task_id>`                  | Mark task as complete              | `/task done task_id:5`                                                   |
| `/task delete <task_id>`                | Delete task                        | `/task delete task_id:7`                                                 |
| `/task edit <task_id> <new_text>`       | Edit task description              | `/task edit task_id:3 new_text:"Updated"`                                |

---

### List Management (`/list`)

| Command                             | Description            | Example                                            |
| ----------------------------------- | ---------------------- | -------------------------------------------------- |
| `/list create <name>`               | Create new list        | `/list create name:"Shopping List"`                |
| `/list show <list_name>`            | Show list items        | `/list show list_name:"Shopping List"`             |
| `/list add <list_name> <item>`      | Add item to list       | `/list add list_name:"Shopping" item:"Milk"`       |
| `/list remove <list_name> <item>`   | Remove item            | `/list remove list_name:"Shopping" item:"Milk"`    |
| `/list complete <list_name> <item>` | Toggle item completion | `/list complete list_name:"Shopping" item:"Bread"` |
| `/list clear <list_name>`           | Clear completed items  | `/list clear list_name:"Shopping"`                 |
| `/list delete <list_name>`          | Delete entire list     | `/list delete list_name:"Shopping"`                |
| `/list all`                         | Show all lists         | `/list all`                                        |

---

### Note Management (`/note`)

| Command                                                   | Description        | Example                                                       |
| --------------------------------------------------------- | ------------------ | ------------------------------------------------------------- |
| `/note add <title> <content> [tags]`                      | Create note        | `/note add title:"Meeting" content:"..." tags:"work,meeting"` |
| `/note list`                                              | List all notes     | `/note list`                                                  |
| `/note view <title>`                                      | View specific note | `/note view title:"Meeting Notes"`                            |
| `/note delete <title>`                                    | Delete note        | `/note delete title:"Meeting Notes"`                          |
| `/note edit <current_title> [new_title] [content] [tags]` | Edit note          | `/note edit current_title:"Meeting" new_title:"Q1 Meeting"`   |
| `/note search <keyword>`                                  | Search notes       | `/note search keyword:"project"`                              |
| `/note tag <tag>`                                         | Find notes by tag  | `/note tag tag:"work"`                                        |
| `/note tags`                                              | List all tags      | `/note tags`                                                  |

---

### Reminder System (`/remind`)

| Command                                 | Description           | Example                                                              |
| --------------------------------------- | --------------------- | -------------------------------------------------------------------- |
| `/remind me <message> <time>`           | One-time reminder     | `/remind me message:"Take out trash" time:"7:00 PM"`                 |
| `/remind daily <message> <time>`        | Daily reminder        | `/remind daily message:"Morning standup" time:"9:00 AM"`             |
| `/remind weekly <message> <day> <time>` | Weekly reminder       | `/remind weekly message:"Team meeting" day:"Monday" time:"10:00 AM"` |
| `/remind list`                          | List active reminders | `/remind list`                                                       |
| `/remind delete <reminder_id>`          | Delete reminder       | `/remind delete reminder_id:5`                                       |

---

### Budget Tracking (`/budget`)

| Command                                         | Description               | Example                                                               |
| ----------------------------------------------- | ------------------------- | --------------------------------------------------------------------- |
| `/budget add <category> <amount> [description]` | Add expense               | `/budget add category:"Groceries" amount:45.50 description:"Walmart"` |
| `/budget income <amount> [description]`         | Add income                | `/budget income amount:1500.00 description:"Paycheck"`                |
| `/budget summary [month]`                       | View summary              | `/budget summary month:12`                                            |
| `/budget categories`                            | List spending by category | `/budget categories`                                                  |
| `/budget recent [limit]`                        | Show recent transactions  | `/budget recent limit:20`                                             |
| `/budget trend [months]`                        | Monthly spending trend    | `/budget trend months:12`                                             |

---

### Schedule Management (`/schedule`)

| Command                                             | Description                     | Example                                                        |
| --------------------------------------------------- | ------------------------------- | -------------------------------------------------------------- |
| `/schedule add <event> <date> <time> [description]` | Add event                       | `/schedule add event:"Meeting" date:"2026-01-15" time:"14:30"` |
| `/schedule list [filter]`                           | List events (Upcoming/Past/All) | `/schedule list filter:"Upcoming"`                             |
| `/schedule delete <event_id>`                       | Delete event                    | `/schedule delete event_id:5`                                  |
| `/schedule countdown <event>`                       | Show countdown                  | `/schedule countdown event:"Team Meeting"`                     |
| `/schedule today`                                   | Today's events                  | `/schedule today`                                              |
| `/schedule week`                                    | This week's events              | `/schedule week`                                               |

---

### Random Utilities (`/random`)

| Command                        | Description             | Example                                        |
| ------------------------------ | ----------------------- | ---------------------------------------------- |
| `/random movie`                | Pick random movie       | `/random movie`                                |
| `/random dinner`               | Pick random dinner      | `/random dinner`                               |
| `/random date`                 | Generate date idea      | `/random date`                                 |
| `/random question`             | Conversation starter    | `/random question`                             |
| `/random choice <options>`     | Pick from options       | `/random choice options:"Pizza,Burgers,Tacos"` |
| `/random number <max>`         | Random number (1-max)   | `/random number max:100`                       |
| `/random coin`                 | Flip coin (heads/tails) | `/random coin`                                 |
| `/random dice <sides> [count]` | Roll dice               | `/random dice sides:20 count:2`                |

---

## API Endpoints

### Authentication Endpoints

| Method | Endpoint                  | Description                        | Auth Required |
| ------ | ------------------------- | ---------------------------------- | ------------- |
| `POST` | `/api/auth/google/verify` | Verify Google ID token, return JWT | No            |
| `POST` | `/api/auth/refresh`       | Refresh expired JWT token          | No            |
| `POST` | `/api/auth/logout`        | Invalidate refresh token           | Yes           |

**Example Request (Verify):**

```bash
curl -X POST http://localhost:3000/api/auth/google/verify \
  -H "Content-Type: application/json" \
  -d '{"idToken":"google_id_token_here"}'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "user": { "email": "user@gmail.com", "discordId": "123456789" }
  }
}
```

---

### Task Endpoints

| Method   | Endpoint         | Description    | Auth Required |
| -------- | ---------------- | -------------- | ------------- |
| `GET`    | `/api/tasks`     | List all tasks | Yes           |
| `POST`   | `/api/tasks`     | Create task    | Yes           |
| `PATCH`  | `/api/tasks/:id` | Update task    | Yes           |
| `DELETE` | `/api/tasks/:id` | Delete task    | Yes           |

**Example Request (Create):**

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Buy groceries","dueDate":"2026-01-15"}'
```

---

### List Endpoints

| Method   | Endpoint                           | Description      | Auth Required |
| -------- | ---------------------------------- | ---------------- | ------------- |
| `GET`    | `/api/lists`                       | Get all lists    | Yes           |
| `POST`   | `/api/lists`                       | Create list      | Yes           |
| `POST`   | `/api/lists/:listId/items`         | Add item to list | Yes           |
| `DELETE` | `/api/lists/:listId/items/:itemId` | Remove item      | Yes           |
| `DELETE` | `/api/lists/:listId`               | Delete list      | Yes           |

---

### Note Endpoints

| Method   | Endpoint                      | Description   | Auth Required |
| -------- | ----------------------------- | ------------- | ------------- |
| `GET`    | `/api/notes`                  | Get all notes | Yes           |
| `POST`   | `/api/notes`                  | Create note   | Yes           |
| `PATCH`  | `/api/notes/:id`              | Update note   | Yes           |
| `DELETE` | `/api/notes/:id`              | Delete note   | Yes           |
| `GET`    | `/api/notes/search?q=keyword` | Search notes  | Yes           |

---

### Reminder Endpoints

| Method   | Endpoint             | Description       | Auth Required |
| -------- | -------------------- | ----------------- | ------------- |
| `GET`    | `/api/reminders`     | Get all reminders | Yes           |
| `POST`   | `/api/reminders`     | Create reminder   | Yes           |
| `PATCH`  | `/api/reminders/:id` | Update reminder   | Yes           |
| `DELETE` | `/api/reminders/:id` | Delete reminder   | Yes           |

---

### Budget Endpoints

| Method | Endpoint                            | Description               | Auth Required |
| ------ | ----------------------------------- | ------------------------- | ------------- |
| `GET`  | `/api/budget/summary?month=YYYY-MM` | Get budget summary        | Yes           |
| `POST` | `/api/budget`                       | Add budget entry          | Yes           |
| `GET`  | `/api/budget/categories`            | List spending by category | Yes           |
| `GET`  | `/api/budget/recent?limit=10`       | Recent transactions       | Yes           |

---

### Schedule Endpoints

| Method   | Endpoint             | Description    | Auth Required |
| -------- | -------------------- | -------------- | ------------- |
| `GET`    | `/api/schedules`     | Get all events | Yes           |
| `POST`   | `/api/schedules`     | Create event   | Yes           |
| `DELETE` | `/api/schedules/:id` | Delete event   | Yes           |

---

### Health Check

| Method | Endpoint  | Description                            | Auth Required |
| ------ | --------- | -------------------------------------- | ------------- |
| `GET`  | `/health` | Health check (uptime, database status) | No            |

**Example:**

```bash
curl http://localhost:3000/health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2026-01-11T12:00:00.000Z",
  "uptime": 12345,
  "database": "connected"
}
```

---

## Environment Variables

### Required Variables (Backend)

| Variable               | Description                             | Example                                               |
| ---------------------- | --------------------------------------- | ----------------------------------------------------- |
| `DISCORD_BOT_TOKEN`    | Discord bot token from Developer Portal | `your_bot_token_here`                                 |
| `DISCORD_CLIENT_ID`    | Discord application client ID           | `your_client_id_here`                                 |
| `DISCORD_GUILD_ID`     | Discord server ID for testing           | `your_guild_id_here`                                  |
| `DATABASE_URL`         | PostgreSQL connection string            | `postgresql://user:password@localhost:5433/bwaincell` |
| `JWT_SECRET`           | Secret for signing JWT tokens           | Generate with: `openssl rand -base64 32`              |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                  | `your-id.apps.googleusercontent.com`                  |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret              | `your-secret`                                         |
| `USER1_EMAIL`          | User 1 Google email                     | `user@gmail.com`                                      |
| `USER1_DISCORD_ID`     | User 1 Discord user ID                  | `123456789`                                           |

---

### Required Variables (Frontend)

| Variable                       | Description                      | Example                                                                     |
| ------------------------------ | -------------------------------- | --------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`          | Backend API URL                  | `http://localhost:3000` (dev)<br>`https://bwaincell.fly.dev` (prod)         |
| `NEXTAUTH_URL`                 | Frontend URL for OAuth callbacks | `http://localhost:3010` (dev)<br>`https://bwaincell.sunny-stack.com` (prod) |
| `NEXTAUTH_SECRET`              | NextAuth.js secret               | Generate with: `openssl rand -base64 32`                                    |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID (public)  | `your-id.apps.googleusercontent.com`                                        |

---

### Optional Variables

| Variable                   | Description                       | Default               |
| -------------------------- | --------------------------------- | --------------------- |
| `API_PORT`                 | Backend API port                  | `3000`                |
| `PORT`                     | Backend port (alias for API_PORT) | `3000`                |
| `NODE_ENV`                 | Environment mode                  | `development`         |
| `TIMEZONE`                 | Timezone for reminders            | `America/Chicago`     |
| `DEFAULT_REMINDER_CHANNEL` | Discord channel ID for reminders  | (none)                |
| `LOG_LEVEL`                | Winston log level                 | `info`                |
| `POSTGRES_USER`            | PostgreSQL username               | `bwaincell`           |
| `POSTGRES_PASSWORD`        | PostgreSQL password               | (required for Docker) |
| `POSTGRES_DB`              | PostgreSQL database name          | `bwaincell`           |

---

### Environment Variable Generation

| Variable            | Command to Generate       |
| ------------------- | ------------------------- |
| `JWT_SECRET`        | `openssl rand -base64 32` |
| `NEXTAUTH_SECRET`   | `openssl rand -base64 32` |
| `POSTGRES_PASSWORD` | `openssl rand -base64 32` |

---

## File Locations

### Commands (Discord Bot)

| File                           | Description                  |
| ------------------------------ | ---------------------------- |
| `backend/commands/task.ts`     | Task management commands     |
| `backend/commands/list.ts`     | List management commands     |
| `backend/commands/note.ts`     | Note management commands     |
| `backend/commands/reminder.ts` | Reminder system commands     |
| `backend/commands/budget.ts`   | Budget tracking commands     |
| `backend/commands/schedule.ts` | Schedule management commands |
| `backend/commands/random.ts`   | Random utility commands      |

---

### API Routes (Express)

| File                                  | Description           |
| ------------------------------------- | --------------------- |
| `backend/src/api/routes/auth.ts`      | Authentication routes |
| `backend/src/api/routes/tasks.ts`     | Task API routes       |
| `backend/src/api/routes/lists.ts`     | List API routes       |
| `backend/src/api/routes/notes.ts`     | Note API routes       |
| `backend/src/api/routes/reminders.ts` | Reminder API routes   |
| `backend/src/api/routes/budget.ts`    | Budget API routes     |
| `backend/src/api/routes/schedules.ts` | Schedule API routes   |

---

### Database Models (Sequelize)

| File                                  | Description                                 |
| ------------------------------------- | ------------------------------------------- |
| `backend/database/models/User.ts`     | User model (Google OAuth + Discord mapping) |
| `backend/database/models/Task.ts`     | Task model                                  |
| `backend/database/models/List.ts`     | List model (with JSONB items)               |
| `backend/database/models/Note.ts`     | Note model (with tags array)                |
| `backend/database/models/Reminder.ts` | Reminder model                              |
| `backend/database/models/Schedule.ts` | Schedule model                              |
| `backend/database/index.ts`           | Database initialization                     |

---

### Configuration Files

| File                      | Description                           |
| ------------------------- | ------------------------------------- |
| `.env`                    | Environment variables (not in Git)    |
| `.env.example`            | Environment template                  |
| `package.json`            | Monorepo workspace configuration      |
| `docker-compose.yml`      | Docker services configuration         |
| `backend/tsconfig.json`   | Backend TypeScript configuration      |
| `frontend/next.config.js` | Next.js + PWA configuration           |
| `shared/tsconfig.json`    | Shared types TypeScript configuration |

---

### Documentation Files

| File                                   | Description                            |
| -------------------------------------- | -------------------------------------- |
| `README.md`                            | Project overview and quick start       |
| `docs/guides/getting-started.md`       | Installation and setup guide           |
| `docs/guides/troubleshooting.md`       | Troubleshooting reference (60+ issues) |
| `docs/guides/faq.md`                   | Frequently asked questions             |
| `docs/api/README.md`                   | REST API documentation                 |
| `docs/api/discord-commands.md`         | Discord bot commands reference         |
| `docs/architecture/overview.md`        | System architecture                    |
| `docs/architecture/database-schema.md` | Database schema documentation          |
| `docs/reference/quick-reference.md`    | This file                              |
| `docs/reference/glossary.md`           | Technical terms glossary               |

---

## Troubleshooting Quick Fixes

### Bot Offline

**Quick Fix:**

```bash
# Check if backend is running
docker ps | grep bwaincell-backend

# Start backend
docker-compose up -d backend

# Check logs
docker logs bwaincell-backend --tail 50
```

**Common Causes:**

- Invalid `DISCORD_BOT_TOKEN` in .env
- Environment validation failed
- Port 3000 already in use

**Reference:** [Troubleshooting - Bot Crashes](../guides/troubleshooting.md#issue-16-bot-crashes-on-startup)

---

### Database Connection Failed

**Quick Fix:**

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5433

# Start PostgreSQL
docker-compose up -d postgres

# Verify DATABASE_URL in .env
grep DATABASE_URL .env
```

**Common Causes:**

- PostgreSQL not running
- Incorrect DATABASE_URL format
- Port 5433 blocked by firewall

**Reference:** [Troubleshooting - Connection Refused](../guides/troubleshooting.md#issue-21-connection-refused--econnrefused)

---

### Commands Not Working

**Quick Fix:**

```bash
# Re-deploy Discord slash commands
npm run deploy --workspace=backend

# Check bot has required permissions in Discord server
# Server Settings → Integrations → Bwaincell → Permissions

# Verify GUILD_ID matches Discord server ID
grep GUILD_ID .env
```

**Common Causes:**

- Commands not registered
- Bot lacks permissions
- Incorrect GUILD_ID

**Reference:** [Troubleshooting - Commands Not Responding](../guides/troubleshooting.md#issue-11-bot-not-responding-to-commands)

---

### Port Already in Use

**Quick Fix:**

```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or change port in .env
echo "PORT=3001" >> .env
```

**Reference:** [Troubleshooting - Port Already in Use](../guides/troubleshooting.md#issue-64-port-already-in-use)

---

### Frontend Shows White Screen

**Quick Fix:**

```bash
# Check browser console (F12) for errors

# Verify backend is running
curl http://localhost:3000/health

# Check NEXT_PUBLIC_API_URL in frontend/.env.local
grep NEXT_PUBLIC_API_URL frontend/.env.local

# Rebuild frontend
npm run build:frontend
```

**Common Causes:**

- JavaScript error in browser console
- API connection failed
- Missing NEXT_PUBLIC_API_URL

**Reference:** [Troubleshooting - White Screen](../guides/troubleshooting.md#issue-51-white-screen--blank-page)

---

### API Returns 401 Unauthorized

**Quick Fix:**

```bash
# Check JWT token is included in request headers
# Format: Authorization: Bearer <your_jwt_token>

# Refresh JWT token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"your_refresh_token"}'

# If refresh token expired, re-login via Google OAuth
```

**Common Causes:**

- JWT token expired (1 hour)
- Missing Authorization header
- Invalid JWT_SECRET

**Reference:** [Troubleshooting - JWT Token Invalid](../guides/troubleshooting.md#issue-31-jwt-token-invalidexpired)

---

### Database Reset (⚠️ Deletes All Data)

**Quick Fix:**

```bash
# Stop services
docker-compose down

# Remove database volume
docker volume rm bwaincell_postgres-data

# Start fresh
docker-compose up -d

# Database schema auto-creates on backend startup
```

**Backup First:**

```bash
pg_dump -U bwaincell -d bwaincell -F c -f backup.dump
```

**Reference:** [Database Schema - Migrations](../architecture/database-schema.md#migration-history)

---

## Related Documentation

- **[Getting Started Guide](../guides/getting-started.md)** - Installation and setup
- **[Troubleshooting Guide](../guides/troubleshooting.md)** - Complete troubleshooting reference (60+ issues)
- **[FAQ](../guides/faq.md)** - Frequently asked questions (60+ FAQs)
- **[API Documentation](../api/README.md)** - Complete REST API reference
- **[Discord Commands](../api/discord-commands.md)** - Discord bot commands reference
- **[Glossary](glossary.md)** - Technical terms and acronyms
- **[Architecture Overview](../architecture/overview.md)** - System design

---

**Last Updated** 2026-01-12
**Version:** 2.0.0
**Quick Reference Sections:** 6 (Commands, Discord Bot, API, Environment Variables, File Locations, Troubleshooting)
