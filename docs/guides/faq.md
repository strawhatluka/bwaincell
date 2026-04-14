# Frequently Asked Questions (FAQ)

**Version:** 2.0.0
**Last Updated** 2026-01-12

Complete FAQ covering installation, Discord bot, development, deployment, and troubleshooting for Bwaincell productivity platform.

---

## Table of Contents

1. [General Questions](#general-questions)
2. [Installation & Setup](#installation--setup)
3. [Discord Bot](#discord-bot)
4. [Development](#development)
5. [Deployment](#deployment)
6. [Troubleshooting](#troubleshooting)

---

## General Questions

### What is Bwaincell?

Bwaincell is a unified monorepo productivity platform providing task management, reminders, lists, notes, budgets, and scheduling through three integrated interfaces: Discord Bot, REST API, and Progressive Web App.

**Key Features:**

- 💬 Discord Bot with slash commands
- 🌐 REST API with Google OAuth 2.0
- 📱 Progressive Web App (PWA)
- 🗄️ PostgreSQL database with Sequelize ORM
- 🔒 User isolation by Discord user_id and guild_id

**Learn more:** [README.md](../../README.md) | [Architecture Overview](../architecture/overview.md)

---

### What platforms are supported?

**Backend (Discord Bot + REST API):**

- Windows 10/11 (development)
- macOS 10.15+ (development)
- Linux (Ubuntu 20.04+, Debian 10+)
- Raspberry Pi 4B (production deployment)

**Frontend (PWA):**

- Any modern browser supporting PWA (Chrome, Edge, Safari, Firefox)
- iOS 11.3+ (Safari)
- Android 5.0+ (Chrome)

**Database:**

- PostgreSQL 15+ (production)
- Docker with PostgreSQL 15-alpine image

**Learn more:** [Getting Started Guide](getting-started.md)

---

### Is Bwaincell free and open source?

Yes, Bwaincell is open source under the ISC License.

**Repository:** https://github.com/lukadfagundes/bwaincell

**License:** ISC (permissive open source license)

**Contributions:** Welcome via Pull Requests

**Learn more:** [Contributing Guidelines](../../README.md#contributing)

---

### How do I get support?

**Documentation:**

- [Getting Started Guide](getting-started.md)
- [Troubleshooting Guide](troubleshooting.md)
- [API Documentation](../api/)

**Issue Tracker:**

- [GitHub Issues](https://github.com/lukadfagundes/bwaincell/issues)

**Discussions:**

- [GitHub Discussions](https://github.com/lukadfagundes/bwaincell/discussions)

**Learn more:** [Support Section](../../README.md#support)

---

### How do I contribute?

To contribute to Bwaincell:

1. Fork the repository
2. Create feature branch: `git checkout -b feature/your-feature-name`
3. Implement changes with tests (80%+ coverage target)
4. Run quality gates: `npm run lint`, `npm test`, `npm run typecheck`
5. Commit with conventional commits: `git commit -m "feat: add feature"`
6. Push and open Pull Request

**Learn more:** [Contributing Section](../../README.md#contributing)

---

### What programming languages are used?

**Primary Language:** TypeScript 5.9.2 (strict mode)

**Backend:**

- TypeScript (Discord bot + Express API)
- SQL (PostgreSQL 15 database)

**Frontend:**

- TypeScript (Next.js 14.2+)
- TSX (React components)
- CSS (Tailwind CSS 3.4.1)

**Configuration:**

- JavaScript (config files)
- JSON (package.json, tsconfig.json)
- YAML (docker-compose.yml)

**Learn more:** [Architecture Overview](../architecture/overview.md#technology-stack)

---

### Can I self-host Bwaincell?

Yes! Bwaincell is designed for self-hosting.

**Recommended Setup:**

- Backend: Docker Compose on any Linux server (Raspberry Pi 4B works great)
- Database: PostgreSQL 15 in Docker container
- Frontend: Vercel (free tier) or self-host with Next.js standalone build

**Deployment Guide:** [Getting Started](getting-started.md) | [Troubleshooting - Deployment Issues](troubleshooting.md#6-deployment-issues)

---

### What's the difference between Discord Bot, API, and PWA?

**Discord Bot:**

- Primary interface for Discord server members
- Slash commands (`/task`, `/list`, `/note`, etc.)
- Interactive buttons, modals, and embeds
- Real-time notifications via Discord
- **Best for:** Users already on Discord

**REST API:**

- Express-based HTTP API
- Google OAuth 2.0 + JWT authentication
- Standard JSON request/response
- Programmatic access to all features
- **Best for:** Integrations with external tools

**Progressive Web App (PWA):**

- Next.js 14.2+ web application
- Installable on mobile/desktop
- Offline support with service workers
- Modern UI with Tailwind CSS
- **Best for:** Users not on Discord or wanting mobile access

**Learn more:** [Architecture Overview](../architecture/overview.md#three-interface-architecture)

---

### How is user data isolated?

All database tables include `user_id` (Discord user ID) and `guild_id` (Discord server ID) columns. Every query automatically filters by these columns.

**Default Behavior (Shared Household):**

- Queries filter by `guild_id` only
- All members of Discord server share data
- User_id stored for audit purposes

**Optional (Per-User Isolation):**

- Queries filter by `user_id` AND `guild_id`
- Each user has private data
- Can be enabled by modifying model queries

**Learn more:** [Database Schema - Data Isolation](../architecture/database-schema.md#data-isolation)

---

## Installation & Setup

### What are the minimum system requirements?

**Backend (Discord Bot + API):**

- Node.js 18.0+
- npm 9.0+
- PostgreSQL 15+
- 512MB RAM minimum (1GB recommended)
- 1GB disk space

**Frontend (PWA):**

- Node.js 18.0+ (development only)
- Modern web browser (for production)

**Development:**

- 4GB RAM recommended
- 2GB disk space for dependencies

**Learn more:** [Getting Started - Prerequisites](getting-started.md#prerequisites)

---

### Can I run Bwaincell on Windows/Mac/Linux?

**Windows:** Yes (development mode)

- Backend: ✅ Works natively or via Docker
- Frontend: ✅ Works natively
- Database: ✅ PostgreSQL via Docker recommended

**macOS:** Yes (development mode)

- Backend: ✅ Works natively or via Docker
- Frontend: ✅ Works natively
- Database: ✅ PostgreSQL via Docker or Homebrew

**Linux:** Yes (development and production)

- Backend: ✅ Works natively or via Docker
- Frontend: ✅ Works natively
- Database: ✅ PostgreSQL native or Docker

**Raspberry Pi:** Yes (production deployment)

- Tested on Raspberry Pi 4B (4GB RAM)
- Docker Compose deployment recommended

**Learn more:** [Getting Started Guide](getting-started.md)

---

### Do I need Docker?

**Development:** Optional but recommended

- Docker Compose simplifies PostgreSQL setup
- Alternative: Install PostgreSQL natively

**Production:** Highly recommended

- Docker ensures consistent environment
- Easier deployment and updates
- Resource limits and health checks built-in

**Without Docker:**

- Install PostgreSQL 15+ natively
- Configure connection manually in .env
- Manage service lifecycle manually

**Learn more:** [Getting Started - Database Setup](getting-started.md#database-setup)

---

### Can I use SQLite instead of PostgreSQL?

No, Bwaincell requires PostgreSQL 15+ as of version 2.0.0.

**Why PostgreSQL?**

- Production-grade relational database
- ACID compliance for data integrity
- Better performance for concurrent access
- Native JSONB support (used for list items)
- Array types (used for note tags)

**Migration from SQLite:**

- Legacy SQLite database path removed (was `./data/bwaincell.sqlite`)
- See [Database Schema](../architecture/database-schema.md) for migration guide

**Learn more:** [Architecture - Why PostgreSQL?](../architecture/overview.md#why-postgresql)

---

### How do I get a Discord Bot Token?

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name your application (e.g., "Bwaincell Bot")
4. Go to "Bot" tab in sidebar
5. Click "Add Bot" and confirm
6. Click "Reset Token" and copy the token
7. Paste token into `.env` as `DISCORD_BOT_TOKEN=your_token_here`

**Important:**

- Keep token secret (never commit to Git)
- Regenerate token if exposed
- Enable "Message Content Intent" in Bot settings

**Learn more:** [Getting Started - Prerequisites](getting-started.md#prerequisites)

---

### How do I set up Google OAuth 2.0?

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Add authorized redirect URIs:
   - Development: `http://localhost:3010/api/auth/callback/google`
   - Production: `https://bwaincell.sunny-stack.com/api/auth/callback/google`
7. Copy Client ID and Client Secret
8. Paste into `.env`:
   ```
   GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-secret
   ```

**Learn more:** [Getting Started - Environment Configuration](getting-started.md#environment-configuration) | [Troubleshooting - OAuth Issues](troubleshooting.md#issue-32-google-oauth-verification-failed)

---

### How do I map Google email to Discord user ID?

Add user mappings to `.env`:

```bash
USER1_EMAIL=your@gmail.com
USER1_DISCORD_ID=your_discord_user_id_here
USER2_EMAIL=partner@gmail.com
USER2_DISCORD_ID=partner_discord_user_id_here
```

**How to get Discord User ID:**

1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click your username in Discord
3. Click "Copy ID"
4. Paste as `USER1_DISCORD_ID`

**Learn more:** [Troubleshooting - User Email Not Mapped](troubleshooting.md#issue-33-user-email-not-mapped-to-discord-id)

---

### What environment variables are required?

**Required for Backend:**

```bash
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_guild_id_for_testing
DATABASE_URL=postgresql://user:password@localhost:5433/bwaincell
JWT_SECRET=generate_with_openssl_rand_base64_32
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
USER1_EMAIL=user@gmail.com
USER1_DISCORD_ID=123456789
```

**Required for Frontend:**

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3010
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
```

**Learn more:** [.env.example](../../.env.example) | [Quick Reference - Environment Variables](../reference/quick-reference.md#environment-variables)

---

### How do I generate JWT_SECRET?

Use OpenSSL to generate a secure 256-bit random secret:

```bash
openssl rand -base64 32
```

Copy the output and paste into `.env`:

```bash
JWT_SECRET=<paste_generated_secret_here>
NEXTAUTH_SECRET=<paste_another_generated_secret_here>
```

**Important:**

- Use different secrets for `JWT_SECRET` and `NEXTAUTH_SECRET`
- Never commit secrets to Git
- Rotate secrets periodically in production

**Learn more:** [Getting Started - Environment Configuration](getting-started.md#environment-configuration)

---

## Discord Bot

### How do I add the bot to my Discord server?

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to "OAuth2" → "URL Generator"
4. Select scopes:
   - `bot`
   - `applications.commands`
5. Select bot permissions:
   - Send Messages
   - Embed Links
   - Use Slash Commands
   - Read Message History
6. Copy generated URL and open in browser
7. Select your Discord server and authorize

**Learn more:** [Discord Bot Commands](../api/discord-commands.md) | [Troubleshooting - Permission Denied](troubleshooting.md#issue-110-permission-denied-errors)

---

### What permissions does the bot need?

**Required Permissions:**

- Send Messages
- Embed Links
- Use Slash Commands

**Optional Permissions:**

- Send Messages in Threads (if using threads)
- Attach Files (for future image features)

**Permissions Integer:** 2147551232

**Learn more:** [Discord Commands - Permissions](../api/discord-commands.md#permissions)

---

### How do I deploy slash commands?

After updating command definitions in `backend/commands/`, run:

```bash
npm run deploy --workspace=backend
```

**What this does:**

- Reads all files in `backend/commands/`
- Registers commands with Discord API
- Uses `GUILD_ID` for testing (instant)
- Or removes `GUILD_ID` for global commands (1-2 hours)

**When to run:**

- After adding new commands
- After modifying command options
- After changing command descriptions
- When commands don't appear in Discord

**Learn more:** [Discord Commands - Deployment](../api/discord-commands.md#deployment) | [Troubleshooting - Commands Not Appearing](troubleshooting.md#issue-17-commands-not-loadingregistering)

---

### Can I create custom commands?

Yes! Add a new file to `backend/commands/` following this template:

```typescript
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('custom').setDescription('Your custom command'),

  async execute(interaction: CommandInteraction) {
    await interaction.deferReply();

    // Your command logic here

    await interaction.editReply('Command executed!');
  },
};
```

Then deploy commands:

```bash
npm run deploy --workspace=backend
```

**Learn more:** [Discord.js Guide - Commands](https://discordjs.guide/creating-your-bot/command-handling.html)

---

### Can I self-host the bot?

Yes! The Discord bot is designed for self-hosting.

**Recommended Setup:**

- Host: Raspberry Pi 4B or any Linux server
- Deployment: Docker Compose
- Database: PostgreSQL 15 in Docker container
- Logging: Winston with file persistence

**Steps:**

1. Clone repository on server
2. Create `.env` with production credentials
3. Run `docker-compose build`
4. Run `docker-compose up -d`
5. Check logs: `docker-compose logs -f backend`

**Learn more:** [Getting Started - Production Deployment](getting-started.md) | [Docker Compose Usage](../../docker-compose.yml)

---

### How do I debug bot commands?

**Enable Debug Logging:**

```bash
# .env
LOG_LEVEL=debug
NODE_ENV=development
```

**View Logs:**

```bash
# Docker
docker logs bwaincell-backend -f

# Native
npm run dev:backend
```

**Common Issues:**

- Commands not appearing → Run `npm run deploy --workspace=backend`
- "Unknown Interaction" → Check interaction deferral timing
- Data not loading → Verify `GUILD_ID` in `.env` matches Discord server

**Learn more:** [Troubleshooting Guide](troubleshooting.md#1-discord-bot-issues)

---

### Why do commands take 3 seconds to respond?

Discord requires interaction acknowledgment within 3 seconds. All Bwaincell commands use immediate deferral:

```typescript
await interaction.deferReply(); // Must be within 3 seconds
// ... expensive operations ...
await interaction.editReply('Result'); // Can take longer
```

**If commands timeout:**

- Check database query performance
- Add indexes to queried columns
- Implement pagination for large datasets
- Optimize N+1 queries with eager loading

**Learn more:** [Troubleshooting - Unknown Interaction Errors](troubleshooting.md#issue-12-unknown-interaction-errors)

---

### Can I use the bot in multiple Discord servers?

Yes, but with limitations:

**Current Behavior:**

- Bot can be in multiple servers
- Each server has isolated data (filtered by `guild_id`)
- Same users across servers have separate data per server

**Limitation:**

- One guild per user in environment variables (USER1_EMAIL maps to single USER1_DISCORD_ID)

**Future Enhancement:**

- Multi-guild support per user (planned)

**Learn more:** [Architecture - User Isolation](../architecture/overview.md#user-isolation)

---

### How do I run tests?

```bash
# Run all tests
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend

# Generate coverage report
npm run test:coverage

# Watch mode for TDD
npm run test:watch
```

**Coverage Targets:**

- Overall: 80%+
- Critical paths (auth, database): 100%
- Current: 35% backend, 45% frontend

---

### What's the contribution workflow?

1. Fork repository
2. Create feature branch: `git checkout -b feature/name`
3. Implement changes with tests
4. Run quality gates:
   ```bash
   npm run lint
   npm test
   npm run typecheck
   ```
5. Commit with conventional commits: `git commit -m "feat: add feature"`
6. Push: `git push origin feature/name`
7. Open Pull Request with:
   - Investigation findings (if applicable)
   - Implementation details
   - Test coverage report
   - Breaking changes (if any)

**Learn more:** [Contributing Guidelines](../../README.md#contributing)

---

### How do I debug issues?

**Backend Debugging:**

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev:backend

# Node.js inspector
node --inspect backend/src/bot.ts

# Docker logs
docker logs bwaincell-backend -f
```

**Frontend Debugging:**

```bash
# Next.js debug mode
npm run dev:frontend

# Browser DevTools
# Open browser, press F12, check Console/Network tabs
```

**Database Debugging:**

```bash
# Connect to PostgreSQL
psql -U bwaincell -d bwaincell -h localhost -p 5433

# Check tables
\dt

# Check data
SELECT * FROM tasks LIMIT 10;

# Check query performance
EXPLAIN ANALYZE SELECT * FROM tasks WHERE guild_id = '123';
```

**Learn more:** [Troubleshooting Guide](troubleshooting.md)

---

### How do I add database indexes?

Database indexes are defined in Sequelize models (`backend/database/models/`):

```typescript
// Example: Adding index to tasks.guild_id
Task.init(
  {
    // ... field definitions ...
  },
  {
    sequelize,
    tableName: 'tasks',
    indexes: [
      { fields: ['guild_id'] },
      { fields: ['completed'] },
      { fields: ['due_date'], where: { due_date: { [Op.ne]: null } } },
    ],
  }
);
```

Or add manually via SQL:

```sql
CREATE INDEX idx_tasks_guild_id ON tasks(guild_id);
```

**Learn more:** [Database Schema - Indexes](../architecture/database-schema.md#indexes-and-performance)

---

### How do I add a new Discord command?

1. Create file in `backend/commands/yourcommand.ts`
2. Use SlashCommandBuilder to define command
3. Implement `execute()` and optional `autocomplete()` functions
4. Export default object with `data` and `execute`
5. Deploy commands: `npm run deploy --workspace=backend`

**Example:**

```typescript
import { SlashCommandBuilder } from '@discordjs/builders';

export default {
  data: new SlashCommandBuilder().setName('hello').setDescription('Says hello'),

  async execute(interaction) {
    await interaction.reply('Hello!');
  },
};
```

**Learn more:** [Discord Commands Reference](../api/discord-commands.md)

---

### How do I update shared types?

Shared types are in `shared/types/` and used by both backend and frontend.

**Update Process:**

1. Edit type definition in `shared/types/yourtype.ts`
2. Rebuild shared package:
   ```bash
   npm run build:shared
   ```
3. Types automatically available in backend and frontend

**Auto-rebuild during development:**

```bash
npm run dev:shared  # Watches for changes
```

**Learn more:** [Architecture - Monorepo Pattern](../architecture/overview.md#architecture-pattern)

---

## Deployment

### Can I deploy to Heroku/AWS/DigitalOcean?

Yes! Bwaincell can deploy to any platform supporting Node.js + PostgreSQL.

**Heroku:**

- Add Heroku PostgreSQL add-on
- Set environment variables in Heroku dashboard
- Deploy: `git push heroku main`

**AWS:**

- EC2 instance with Docker
- RDS PostgreSQL instance
- Set environment variables via AWS Secrets Manager
- Deploy via GitHub Actions

**DigitalOcean:**

- App Platform with Node.js + PostgreSQL
- Or Droplet with Docker Compose
- Set environment variables in platform settings

**Raspberry Pi (Recommended):**

- Docker Compose deployment
- Local PostgreSQL container
- Auto-deployment via GitHub Actions

**Learn more:** [Getting Started - Deployment](getting-started.md) | [docker-compose.yml](../../docker-compose.yml)

---

### How do I configure environment variables for production?

**Docker Compose Deployment:**

1. Create `.env` file on server
2. Copy variables from `.env.example`
3. Replace with production credentials
4. Set `NODE_ENV=production`
5. Start: `docker-compose up -d`

**Vercel (Frontend):**

1. Go to Vercel dashboard → Project → Settings → Environment Variables
2. Add each variable (NEXT*PUBLIC*\_, NEXTAUTH\_\_, etc.)
3. Redeploy: `vercel deploy --prod`

**Security:**

- Never commit `.env` to Git
- Use secure secrets management (GitHub Secrets, AWS Secrets Manager)
- Rotate JWT_SECRET periodically
- Use different secrets for development and production

**Learn more:** [.env.example](../../.env.example) | [Quick Reference - Environment Variables](../reference/quick-reference.md#environment-variables)

---

### What's the recommended deployment method?

**Backend:** Docker Compose on Raspberry Pi 4B or Linux server

**Pros:**

- Consistent environment
- Easy updates (rebuild + restart)
- Resource limits and health checks
- PostgreSQL containerized
- Self-hosted (no recurring costs)

**Frontend:** Vercel

**Pros:**

- Automatic deployment on git push
- Global CDN
- Free SSL certificates
- Serverless scaling
- Free tier available

**Learn more:** [Architecture - Deployment](../architecture/overview.md#build--deployment)

---

### How do I backup my data?

**PostgreSQL Backup:**

```bash
# Full backup (custom format, compressed)
pg_dump -U bwaincell -d bwaincell -F c -f "backup-$(date +%Y%m%d-%H%M%S).dump"

# Plain SQL backup (human-readable)
pg_dump -U bwaincell -d bwaincell -f "backup-$(date +%Y%m%d-%H%M%S).sql"

# Docker Compose
docker-compose exec postgres pg_dump -U bwaincell bwaincell > backup.sql
```

**Automated Backups (cron):**

```bash
# Add to crontab
0 2 * * * pg_dump -U bwaincell -d bwaincell -F c -f "/backups/bwaincell-$(date +\%Y\%m\%d).dump"
```

**Restore from Backup:**

```bash
# Create fresh database
psql -U postgres -c "DROP DATABASE IF EXISTS bwaincell;"
psql -U postgres -c "CREATE DATABASE bwaincell OWNER bwaincell;"

# Restore from dump
pg_restore -U bwaincell -d bwaincell -c backup.dump

# Or from SQL file
psql -U bwaincell -d bwaincell -f backup.sql
```

**Learn more:** [Database Schema - Backup and Restore](../architecture/database-schema.md#backup-and-restore) | [Troubleshooting - Backup/Restore Failures](troubleshooting.md#issue-210-backuprestore-failures)

---

### How do I deploy to Raspberry Pi?

**Prerequisites:**

- Raspberry Pi 4B (4GB RAM recommended)
- Raspberry Pi OS (64-bit)
- Docker and Docker Compose installed
- SSH access configured

**Deployment Steps:**

1. SSH into Raspberry Pi: `ssh pi@raspberry-pi`
2. Clone repository: `git clone https://github.com/lukadfagundes/bwaincell.git`
3. Create `.env` file with production credentials
4. Build images: `docker-compose build`
5. Start services: `docker-compose up -d`
6. Check logs: `docker-compose logs -f backend`
7. Health check: `curl http://localhost:3000/health`

**Auto-Deployment via GitHub Actions:**

- Set `PI_HOST`, `PI_USERNAME`, `PI_SSH_KEY` secrets in GitHub
- Push to main branch triggers auto-deployment
- See [.env.example](../../.env.example) for GitHub Actions secrets setup

**Learn more:** [docker-compose.yml](../../docker-compose.yml#usage-instructions)

---

### How do I monitor production deployment?

**Health Check Endpoint:**

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

**Docker Stats:**

```bash
docker stats bwaincell-backend bwaincell-db
```

**Logs:**

```bash
# Backend logs
docker logs bwaincell-backend -f

# Database logs
docker logs bwaincell-db -f

# All logs
docker-compose logs -f
```

**Resource Usage:**

- Backend: 128-512MB RAM
- PostgreSQL: 256-512MB RAM
- Total: ~1GB RAM on Raspberry Pi 4B

**Learn more:** [Troubleshooting - Health Check Failing](troubleshooting.md#issue-68-health-check-failing)

---

## Troubleshooting

### Bot is offline, what do I do?

**Check Bot Status:**

```bash
# Docker
docker ps | grep bwaincell-backend

# Native
ps aux | grep "node.*bot.ts"
```

**If not running:**

```bash
# Docker
docker-compose up -d backend

# Native
npm run dev:backend
```

**Check Logs:**

```bash
docker logs bwaincell-backend --tail 50
```

**Common Causes:**

- Invalid `DISCORD_BOT_TOKEN` in .env
- Bot not added to Discord server
- Bot lacks required permissions
- Environment validation failed

**Learn more:** [Troubleshooting - Bot Crashes on Startup](troubleshooting.md#issue-16-bot-crashes-on-startup)

---

### Database connection failed, how to fix?

**Check PostgreSQL is Running:**

```bash
# Docker
docker ps | grep postgres

# Native
pg_isready -h localhost -p 5433
```

**If not running:**

```bash
# Docker
docker-compose up -d postgres

# Native (Linux)
sudo service postgresql start
```

**Verify DATABASE_URL:**

```bash
# Check .env
grep DATABASE_URL .env

# Correct format:
DATABASE_URL=postgresql://bwaincell:password@localhost:5433/bwaincell
```

**Test Connection:**

```bash
psql -h localhost -p 5433 -U bwaincell -d bwaincell
```

**Learn more:** [Troubleshooting - Connection Refused](troubleshooting.md#issue-21-connection-refused--econnrefused) | [Getting Started - Database Setup](getting-started.md#database-setup)

---

### Commands not working, what's wrong?

**Common Issues:**

1. **Commands not registered:**

   ```bash
   npm run deploy --workspace=backend
   ```

2. **Bot lacks permissions:**
   - Check Discord server settings → Integrations → Bwaincell
   - Ensure "Send Messages", "Embed Links", "Use Slash Commands" enabled

3. **Incorrect GUILD_ID:**
   - Verify `GUILD_ID` in `.env` matches Discord server ID
   - Right-click server → Copy ID (requires Developer Mode)

4. **Bot offline:**
   - Check logs: `docker logs bwaincell-backend`
   - Restart: `docker-compose restart backend`

**Learn more:** [Troubleshooting - Commands Not Responding](troubleshooting.md#issue-11-bot-not-responding-to-commands)

---

### Where are the logs?

**Docker Deployment:**

```bash
# Backend logs (last 50 lines)
docker logs bwaincell-backend --tail 50

# Follow logs in real-time
docker logs bwaincell-backend -f

# Database logs
docker logs bwaincell-db -f

# All services
docker-compose logs -f
```

**Native Deployment:**

```bash
# Console output
npm run dev:backend

# Log files (if configured)
cat logs/combined.log
cat logs/error.log
```

**Log Rotation:**

- Docker: Max 25MB per log file, 3 files retained (75MB total)
- Native: Configure Winston file transport for rotation

**Learn more:** [Troubleshooting - Logs Not Persisting](troubleshooting.md#issue-66-logs-not-persisting) | [docker-compose.yml - Logging Configuration](../../docker-compose.yml)

---

### How do I reset the database?

**WARNING:** This deletes all data permanently.

**Docker:**

```bash
# Stop services
docker-compose down

# Remove database volume
docker volume rm bwaincell_postgres-data

# Start fresh
docker-compose up -d
```

**Native:**

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE bwaincell;"
psql -U postgres -c "CREATE DATABASE bwaincell OWNER bwaincell;"

# Restart backend (runs migrations)
npm run dev:backend
```

**Backup First (Recommended):**

```bash
# Backup before reset
pg_dump -U bwaincell -d bwaincell -F c -f "backup-before-reset-$(date +%Y%m%d).dump"
```

**Learn more:** [Database Schema - Migrations](../architecture/database-schema.md#migration-history)

---

### Frontend shows white screen, why?

**Check Browser Console:**

1. Open browser (F12)
2. Check Console tab for JavaScript errors
3. Common errors:
   - "Hydration failed" → SSR/CSR mismatch
   - "Cannot read property 'map' of undefined" → Missing data check
   - "Failed to fetch" → API connection issue

**Check API Connection:**

```bash
# Verify backend is running
curl http://localhost:3000/health

# Check NEXT_PUBLIC_API_URL in frontend/.env.local
grep NEXT_PUBLIC_API_URL frontend/.env.local
```

**Check Build Errors:**

```bash
npm run build:frontend
```

**Learn more:** [Troubleshooting - White Screen](troubleshooting.md#issue-51-white-screen--blank-page) | [Troubleshooting - Hydration Failed](troubleshooting.md#issue-52-hydration-failed-errors)

---

### API returns 401 Unauthorized, why?

**Check JWT Token:**

- Verify token is included in request headers
- Format: `Authorization: Bearer <your_jwt_token>`

**Check Token Expiry:**

- Access tokens expire after 1 hour
- Frontend should auto-refresh using refresh token
- If refresh token also expired, user must re-login

**Check JWT_SECRET:**

```bash
# Ensure JWT_SECRET matches between backend and token generation
grep JWT_SECRET .env
```

**Manual Token Refresh:**

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"your_refresh_token"}'
```

**Learn more:** [Troubleshooting - JWT Token Invalid](troubleshooting.md#issue-31-jwt-token-invalidexpired) | [API Documentation - Authentication](../api/README.md#authentication)

---

### Port already in use, how to fix?

**Find Process Using Port:**

```bash
# Windows
netstat -ano | findstr :3000

# macOS/Linux
lsof -i :3000
```

**Kill Process:**

```bash
# Windows
taskkill /PID <pid> /F

# macOS/Linux
kill -9 <pid>
```

**Or Change Port:**

```bash
# Edit .env
API_PORT=3001
PORT=3001

# Restart backend
npm run dev:backend
```

**Docker:**

```bash
# Stop all containers using port
docker stop $(docker ps -q --filter "expose=3000")
```

**Learn more:** [Troubleshooting - Port Already in Use](troubleshooting.md#issue-64-port-already-in-use)

---

## Additional Resources

- **[Getting Started Guide](getting-started.md)** - Installation and setup
- **[Troubleshooting Guide](troubleshooting.md)** - Complete troubleshooting reference (60+ issues)
- **[API Documentation](../api/README.md)** - REST API and Discord bot reference
- **[Architecture Overview](../architecture/overview.md)** - System design and data flow
- **[Database Schema](../architecture/database-schema.md)** - Database structure and queries
- **[Quick Reference](../reference/quick-reference.md)** - Commands, endpoints, environment variables

---

**Last Updated** 2026-01-12
**Version:** 2.0.0
**Questions:** 60+ FAQs across 6 categories
