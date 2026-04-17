# Docker Development

Comprehensive guide to Docker development for Bwaincell - containerized development and deployment on Raspberry Pi.

> **Deployment update (2026-04-16):** The backend image is now built on **GitHub Actions** (arm64 via Buildx + QEMU on `ubuntu-latest`) and pushed to **GHCR** (`ghcr.io/strawhatluka/bwaincell-backend:{latest,<git-sha>}`). The Raspberry Pi **never builds** the image — `docker compose up -d` on the Pi only pulls and runs. This saves ~15 minutes per deploy compared to the old Pi-local build. The `build-bot-image` + `deploy-bot` jobs in `.github/workflows/deploy.yml` orchestrate this.
>
> The backend `Dockerfile` no longer hardcodes `--platform=linux/arm64` — Buildx supplies the platform from the workflow.
>
> `docker-compose.yml` on the Pi uses `image: ghcr.io/strawhatluka/bwaincell-backend:latest` (no `build:` block) and adds `extra_hosts: ["host.docker.internal:host-gateway"]` so the bot container can reach the self-hosted Supabase Kong on the Pi host loopback.

> **Supabase update (2026-04-15):** The **database is no longer a `postgres` service in `docker-compose.yml`**. Postgres (plus PostgREST, GoTrue, Studio) is provisioned and orchestrated by the **Supabase CLI** as a separate container stack started via `npm run supabase:start` (local dev) or `supabase start` on the production Pi. `docker-compose.yml` now only concerns the **backend** (Discord bot + Express API).
>
> Practical consequences:
>
> - Any section below that references a `postgres` or `db` service inside `docker-compose.yml` is **stale** and should be read as "the Supabase CLI now handles that container stack separately".
> - `DATABASE_URL` is no longer used; the backend reads `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.
> - Start order in local dev: `npm run supabase:start` first, then `npm run dev` (or `docker compose up -d` for containerized runs).
> - On the Pi, the containerized bot reaches Supabase at `http://host.docker.internal:54321` (not `127.0.0.1` — see ["Why host.docker.internal Matters"](#why-hostdockerinternal-matters) below).

## Table of Contents

1. [Docker Development Setup](#docker-development-setup)
2. [Multi-Stage Dockerfile](#multi-stage-dockerfile)
3. [Container Orchestration](#container-orchestration)
4. [Environment Variables](#environment-variables)
5. [Database in Docker](#database-in-docker)
6. [Hot Reloading](#hot-reloading)
7. [Debugging in Docker](#debugging-in-docker)
8. [Docker Best Practices](#docker-best-practices)
9. [Production vs Development](#production-vs-development)
10. [Docker Troubleshooting](#docker-troubleshooting)

---

## Docker Development Setup

### Prerequisites

**Install Docker:**

```bash
# Ubuntu/Raspberry Pi OS
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# macOS
brew install --cask docker

# Windows
# Download Docker Desktop from docker.com
```

**Verify Installation:**

```bash
docker --version
# Output: Docker version 24.0.0, build 1234abcd

docker compose version
# Output: Docker Compose version v2.20.0
```

### Project Structure

```
bwaincell/
├── docker-compose.yml          # Production orchestration (backend service only)
├── docker-compose.dev.yml      # Development orchestration
├── .dockerignore               # Ignore files in Docker build
├── backend/
│   ├── Dockerfile              # Backend multi-stage build
│   └── src/
├── frontend/
│   ├── Dockerfile              # Frontend build (not used - Vercel deployment)
│   └── src/
├── shared/                     # @bwaincell/shared npm workspace
└── supabase/                   # @bwaincell/supabase npm workspace
    ├── config.toml             # Self-hosted Supabase stack config
    ├── migrations/             # SQL migrations (applied via `supabase migration up`)
    └── models/                 # Backend model layer (imported via @database/*)
```

### Quick Start

**Start Development Environment:**

```bash
# Start the backend container (only service defined in docker-compose.yml)
# The database runs as a separate Supabase stack — start it first with:
#   npm run supabase:start
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

**Start with Specific Services:**

```bash
# Start only the backend (the database is NOT in docker-compose.yml;
# it is the self-hosted Supabase stack, started separately via the Supabase CLI)
docker compose up -d backend

# Start the Supabase stack (local dev)
npm run supabase:start
```

---

## Multi-Stage Dockerfile

### Backend Dockerfile

**File:** `backend/Dockerfile`

```dockerfile
# =============================================================================
# Bwaincell Backend - Multi-Stage Docker Build (Monorepo)
# Build Context: Repository root (.)
# =============================================================================
# This Dockerfile builds the Discord bot + Express API for deployment on Raspberry Pi 4B
# Supabase is managed as a separate CLI-orchestrated Docker stack (not defined here)
# Frontend (PWA) deployed separately on Vercel
#
# Platform: arm64 is supplied by Buildx from the GHA workflow
# (platforms: linux/arm64) — no longer hardcoded with --platform=linux/arm64.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:18-alpine AS deps

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat postgresql-client && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copy workspace package files (root + backend + shared + supabase)
# NOTE: supabase/ is an npm workspace (@bwaincell/supabase) as of 2026-04-15.
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
COPY supabase/package.json ./supabase/

# Install production dependencies only (disable husky during install).
# --ignore-scripts required: postinstall runs tsc which isn't available with --omit=dev.
# npm rebuild skia-canvas pulls the prebuilt ARM64 binary that --ignore-scripts skipped.
RUN HUSKY=0 npm ci --omit=dev --ignore-scripts && \
    npm rebuild skia-canvas && \
    npm cache clean --force

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM node:18-alpine AS builder

RUN apk add --no-cache python3 make g++ postgresql-dev && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copy workspace package files (all four workspaces)
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
COPY supabase/package.json ./supabase/

RUN HUSKY=0 npm ci --ignore-scripts

COPY tsconfig.json ./
COPY shared/ ./shared/
COPY supabase/ ./supabase/       # supabase workspace source (models, client)

# Copy backend source files for build
COPY backend/src/ ./backend/src/
COPY backend/commands/ ./backend/commands/
COPY backend/utils/ ./backend/utils/
COPY backend/config/ ./backend/config/
COPY backend/types/ ./backend/types/
COPY backend/tsconfig.json ./backend/
COPY backend/shared/ ./backend/shared/

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Clean any pre-existing compiled code
RUN rm -rf backend/dist/ shared/dist/ supabase/dist/ *.tsbuildinfo

# Build order: shared first, then supabase (backend imports it via @database/*),
# then backend.
RUN npm run build --workspace=shared
RUN npx tsc --build supabase
RUN npm run build --workspace=backend

# Validate compiled code exists
RUN test -f backend/dist/src/bot.js || \
    (echo "ERROR: Compiled bot.js not found in backend/dist/src/" && exit 1)

# -----------------------------------------------------------------------------
# Stage 3: Runner
# -----------------------------------------------------------------------------
FROM node:18-alpine AS runner

# dumb-init for PID 1 signal handling + fonts for skia-canvas text rendering
RUN apk add --no-cache dumb-init curl fontconfig ttf-dejavu && \
    rm -rf /var/cache/apk/*

WORKDIR /app

RUN addgroup --system --gid 1001 botuser && \
    adduser --system --uid 1001 botuser

# Production dependencies (npm workspaces installs all workspace deps at root)
COPY --from=deps /app/node_modules ./node_modules

# Compiled backend
COPY --from=builder --chown=botuser:botuser /app/backend/dist ./backend/dist
COPY --chown=botuser:botuser backend/package.json ./backend/

# Compiled shared package
COPY --from=builder --chown=botuser:botuser /app/shared/dist ./shared/dist
COPY --chown=botuser:botuser shared/package.json ./shared/

# Compiled supabase workspace — backend imports these at runtime via @database/*
COPY --from=builder --chown=botuser:botuser /app/supabase/dist ./supabase/dist
COPY --chown=botuser:botuser supabase/package.json ./supabase/

# CHANGELOG.md (release notes) for the releaseAnnouncer service
COPY --chown=botuser:botuser CHANGELOG.md ./

RUN mkdir -p /app/data /app/logs && \
    chown -R botuser:botuser /app

WORKDIR /app/backend
USER botuser

EXPOSE 3000
ENV NODE_ENV=production \
    PORT=3000

# start-period must be generous: bot loads DB, commands, scheduler,
# Discord login, THEN starts the Express API.
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/bot.js"]
```

Key differences from the previous (pre-2026-04-15) Dockerfile:

- `FROM node:18-alpine` on all three stages **no longer hardcodes** `--platform=linux/arm64`. The platform is supplied by Buildx in `.github/workflows/deploy.yml` (`platforms: linux/arm64`). This lets the same Dockerfile build natively on amd64 for local Linux/macOS dev if desired.
- `supabase/` is an npm workspace (`@bwaincell/supabase`) — its `package.json` is copied in `deps` and `builder`, its source is copied into `builder`, and its compiled `dist/` is copied into `runner`.
- The builder stage runs `npx tsc --build supabase` before the backend build so backend's `@database/*` imports resolve against compiled `supabase/dist/`.
- The old `COPY backend/database/ ./backend/database/` step is gone — that directory no longer exists; models live in `supabase/models/`.
- Health check uses `--start-period=60s --retries=5` (Pi needs more time on cold boot; the bot initializes DB, commands, scheduler, Discord login, then the Express API).
- Runner installs `fontconfig ttf-dejavu` for `skia-canvas` text rendering.

### Multi-Stage Benefits

**Stage 1: Dependencies**

- Install production dependencies only
- Minimal dependencies (no devDependencies)
- Cached layer (rebuild only if package.json changes)

**Stage 2: Builder**

- Install all dependencies (including devDependencies)
- Compile TypeScript
- Validate build output
- Discarded after build (not in final image)

**Stage 3: Runner**

- Copy only production dependencies
- Copy only compiled code (no source)
- Non-root user for security
- Minimal attack surface

**Why Multi-Stage?**

- **Smaller Image Size:** Final image only contains runtime dependencies
  - Single-stage: ~800 MB
  - Multi-stage: ~200 MB (75% reduction)
- **Faster Deployments:** Smaller images transfer faster
- **Better Security:** No build tools in production image
- **Layer Caching:** Faster rebuilds (only changed layers rebuild)

**Where does the build run?**

As of 2026-04-16, the multi-stage build executes **on GitHub Actions**, not on the Pi. The `build-bot-image` job on `ubuntu-latest` uses QEMU + Buildx to cross-build the arm64 image and pushes it to `ghcr.io/strawhatluka/bwaincell-backend:{latest,<git-sha>}`. The Pi then runs only `docker pull` + `docker compose up -d`, which cuts about 15 minutes off each deploy compared to running the full multi-stage build on the Pi. Buildx also leverages the GitHub Actions cache (`cache-from: type=gha`, `cache-to: type=gha,mode=max`), so unchanged layers are not rebuilt across runs.

---

## Container Orchestration

### docker-compose.yml (Production)

**File:** `docker-compose.yml`

```yaml
# =============================================================================
# Bwaincell - Production Docker Compose (Monorepo)
# =============================================================================
# Architecture:
#   - Backend (Discord Bot + Express API) → Raspberry Pi (sunny-pi)
#   - Database: Self-hosted Supabase on the Pi (managed by `supabase start`,
#     NOT defined here; see supabase/config.toml)
#   - Frontend (Next.js PWA) → Vercel (separate deployment)
# =============================================================================

services:
  # ---------------------------------------------------------------------------
  # Backend Service - Discord.js 14 + Express API + Supabase (Monorepo)
  # ---------------------------------------------------------------------------
  backend:
    # Image is built on GitHub Actions (ubuntu-latest, arm64 via Buildx+QEMU)
    # and pushed to GHCR. On the Pi, `docker compose up -d` only PULLS this image.
    image: ghcr.io/strawhatluka/bwaincell-backend:latest
    container_name: bwaincell-backend

    restart: unless-stopped

    env_file:
      - .env

    environment:
      - NODE_ENV=production
      - DEPLOYMENT_MODE=pi
      - TZ=America/Los_Angeles
      # Supabase connection (bot reads these at boot)
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/health']
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s

    ports:
      - '3000:3000'

    # Map host.docker.internal to the Docker host so the bot can reach
    # services running on the Pi itself (self-hosted Supabase Kong on :54321).
    # Required for SUPABASE_URL=http://host.docker.internal:54321 to resolve.
    extra_hosts:
      - 'host.docker.internal:host-gateway'

    volumes:
      - ./data:/app/data
      - ./logs:/app/logs

    # NOTE: deploy.resources is intentionally OMITTED — the Pi kernel lacks
    # the cgroup support Compose's deploy.resources requires.

    logging:
      driver: 'json-file'
      options:
        max-size: '25m'
        max-file: '3'
        compress: 'true'

    security_opt:
      - no-new-privileges:true

    user: '1001:1001'

    networks:
      - bwaincell-network

    labels:
      com.bwaincell.service: 'discord-bot'
      com.bwaincell.environment: 'production'
      com.bwaincell.platform: 'raspberry-pi'

# -----------------------------------------------------------------------------
# Networks
# -----------------------------------------------------------------------------
networks:
  bwaincell-network:
    driver: bridge
    labels:
      com.bwaincell.description: 'Production network for Pi services'
```

Key differences from the previous compose file:

- **No `postgres` service.** Supabase Postgres (plus Kong, PostgREST, GoTrue, Studio) runs as a separate CLI-managed Docker stack started with `supabase start` on the Pi. Do **not** define a `postgres` service here.
- **`image:` (no `build:`).** The Pi pulls the image from GHCR. To build locally for testing, run `docker build -t ghcr.io/strawhatluka/bwaincell-backend:latest -f backend/Dockerfile .` manually.
- **`extra_hosts: host.docker.internal:host-gateway`** — required for the bot to reach Supabase Kong on the Pi host loopback (see next section).
- **`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `environment:`** — explicit pass-through from `.env` so compose-time substitution fails loudly if they are missing.
- **`TZ=America/Los_Angeles`** set explicitly on the backend service so
  scheduled reminders and cron jobs fire in the intended local timezone.
- **`deploy.resources` removed** — the Pi kernel lacks the cgroup support Compose's `deploy.resources` requires.
- **No `depends_on: postgres`** — there is no postgres service in this compose file.
- **Health check** uses `retries: 5`, `start_period: 60s` (matches the Dockerfile HEALTHCHECK).

### Why `host.docker.internal` Matters

On the Pi, two separate Docker stacks run side by side:

1. **The Bwaincell backend** (this `docker-compose.yml`) — the bot container on `bwaincell-network`.
2. **The Supabase stack** (started by `supabase start` from the CLI) — Kong bound to `127.0.0.1:54321` on the **Pi host**.

Because they are separate compose projects, the bot container and the Supabase containers are on **different Docker networks**. From inside the bot container, `127.0.0.1:54321` is the bot itself — not the Supabase Kong. The bot cannot reach Kong directly by container name either, because it is not on the Supabase network.

The fix is a special DNS alias:

```yaml
extra_hosts:
  - 'host.docker.internal:host-gateway'
```

On Linux, Docker resolves `host-gateway` to the host's default bridge IP (commonly `172.17.0.1`). Kong is bound on the Pi host loopback at `:54321`, so from inside the bot container, `http://host.docker.internal:54321` reaches it through the host-gateway.

Therefore `.env` on the Pi must set:

```env
SUPABASE_URL=http://host.docker.internal:54321
```

Using `http://127.0.0.1:54321` inside the container will fail with `ECONNREFUSED`. `127.0.0.1:54321` is still correct for the Pi host itself (e.g., the health-check curl inside the `deploy-supabase` workflow job, or running `npm run dev` natively without Docker).

> **Pi prerequisite — disable IPv6 at the kernel level.** The Raspberry Pi OS gives the Pi an IPv6 Unique Local Address but often has no IPv6 route, so Node's DNS resolver stalls on AAAA lookups inside the container before failing over to IPv4. Run once on the Pi:
>
> ```bash
> sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1
> sudo sysctl -w net.ipv6.conf.default.disable_ipv6=1
> sudo sysctl -w net.ipv6.conf.lo.disable_ipv6=1
> # Persist by adding the same lines to /etc/sysctl.d/99-disable-ipv6.conf
> ```

### docker-compose Commands

```bash
# Start all services
docker compose up -d

# Start specific service (only `backend` is defined in docker-compose.yml;
# the database is the separately-managed Supabase stack — see `supabase start`)
docker compose up -d backend

# View logs (follow)
docker compose logs -f

# View logs for specific service
docker compose logs -f backend

# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes database data)
docker compose down -v

# Rebuild backend image (local dev only — production uses GHCR pull; see deployment.md)
docker compose build --no-cache backend

# Restart specific service
docker compose restart backend

# Check service status
docker compose ps

# Execute command in running container
docker compose exec backend sh

# View resource usage (only the backend container is in docker-compose.yml;
# Supabase runs its own containers — list them with `docker ps` and pass by name)
docker stats bwaincell-backend
```

---

## Environment Variables

### .env File in Docker

**.env File:**

```bash
# =============================================================================
# Bwaincell Environment Variables (Docker Production)
# =============================================================================
# This is an abridged subset of `.env.example` at the repo root — see that file
# for the full list (Google OAuth, NextAuth, GitHub integration, Gemini, etc.).
# =============================================================================

# Discord Bot Configuration (REQUIRED)
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_for_testing

# User mapping — Email to Discord ID (REQUIRED for API authentication)
USER1_EMAIL=your@email.com
USER1_DISCORD_ID=your_discord_user_id_here
USER2_EMAIL=partner@email.com
USER2_DISCORD_ID=partner_discord_user_id_here

# Supabase Configuration (REQUIRED)
# On the Pi (containerized bot), `host.docker.internal` resolves to the Pi host
# where the self-hosted Supabase Kong is bound on :54321. For `npm run dev`
# natively (no Docker), use http://127.0.0.1:54321.
SUPABASE_URL=http://host.docker.internal:54321
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_DB_PASSWORD=generate_with_openssl_rand_base64_32

# JWT + NextAuth secrets (generate with: openssl rand -base64 32)
JWT_SECRET=your_jwt_secret_here
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://bwaincell.sunny-stack.com

# API / runtime
API_PORT=3000
PORT=3000
NODE_ENV=production
DEPLOYMENT_MODE=pi

# Timezone (must match docker-compose.yml `TZ:` on the backend service)
TIMEZONE=America/Los_Angeles
TZ=America/Los_Angeles
```

### Loading Environment Variables

**docker-compose.yml:**

```yaml
services:
  backend:
    env_file:
      - .env # Load from file

    environment:
      - NODE_ENV=production # Override specific variables
      - DEPLOYMENT_MODE=pi
```

**Dockerfile:**

```dockerfile
# Build-time arguments
ARG NODE_ENV=production

# Runtime environment variables
ENV NODE_ENV=${NODE_ENV} \
    PORT=3000
```

### Environment Variable Precedence

1. **Dockerfile ENV** (lowest priority)
2. **docker-compose.yml environment**
3. **.env file**
4. **Shell environment variables** (highest priority)

```bash
# Override from command line
NODE_ENV=development docker compose up
```

---

## Database in Docker

As of 2026-04-15, Bwaincell no longer runs a standalone `postgres` service in
`docker-compose.yml`. The database layer is **self-hosted Supabase**, which
provisions its own container stack (Postgres, Kong, PostgREST, GoTrue, Studio,
etc.) separately from this compose file.

**Managed by the Supabase CLI, not `docker-compose.yml`:**

- Local dev: `npm run supabase:start` / `npm run supabase:stop` /
  `npm run supabase:status` / `npm run supabase:reset`.
- Production (Pi): `supabase start` from the repo root on the Pi.
- Config: `supabase/config.toml` (api on `:54321`, db on `:5433`,
  studio on `:54323`).
- Migrations live in `supabase/migrations/` and are applied via
  `supabase migration up` (or automatically on `supabase:reset`).
- Persistence is handled by Supabase's own Docker volumes; do not add a
  `postgres-data` volume to `docker-compose.yml`.

For the full database setup, migrations, backup strategy, and troubleshooting,
see [`docs/backend/supabase/README.md`](../backend/supabase/README.md) and the
[Supabase update note](#) at the top of this page.

---

## Hot Reloading

### Development Setup

**docker-compose.dev.yml:**

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
      target: deps # Stop at deps stage (development dependencies)

    command: npm run dev --workspace=backend

    volumes:
      - ./backend/src:/app/backend/src # Mount source code
      - ./backend/commands:/app/backend/commands
      - ./shared/src:/app/shared/src

    environment:
      - NODE_ENV=development
```

**Start Development:**

```bash
# Use development compose file
docker compose -f docker-compose.dev.yml up

# Watch logs
docker compose -f docker-compose.dev.yml logs -f backend
```

**Why Volume Mounts?**

- Changes in source code immediately reflected in container
- No need to rebuild image for every change
- Faster development iteration

### ts-node-dev for Hot Reload

**package.json:**

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/bot.ts"
  }
}
```

**ts-node-dev:**

- Watches for file changes
- Automatically restarts on change
- Faster than tsc + node (transpile-only mode)

---

## Debugging in Docker

### Attach Debugger

**docker-compose.dev.yml:**

```yaml
services:
  backend:
    command: node --inspect=0.0.0.0:9229 dist/src/bot.js

    ports:
      - '9229:9229' # Debugger port
```

**VS Code Launch Configuration (.vscode/launch.json):**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Docker",
      "address": "localhost",
      "port": 9229,
      "localRoot": "${workspaceFolder}/backend",
      "remoteRoot": "/app/backend",
      "sourceMaps": true
    }
  ]
}
```

### View Logs

```bash
# Follow logs (real-time)
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100 backend

# Logs since timestamp
docker compose logs --since="2026-01-11T12:00:00" backend

# Export logs to file
docker compose logs --no-color backend > backend-logs.txt
```

### Execute Commands in Container

```bash
# Open shell in running container
docker compose exec backend sh

# Run npm commands
docker compose exec backend npm run lint

# Check file contents
docker compose exec backend cat /app/backend/dist/src/bot.js

# Check environment variables
docker compose exec backend env
```

### Inspect Container

```bash
# Container details
docker inspect bwaincell-backend

# Resource usage
docker stats bwaincell-backend

# Network configuration
docker network inspect bwaincell-network

# Volume details (list all volumes first — the backend mounts ./data and ./logs
# as bind mounts, not named volumes; Supabase manages its own Postgres volumes)
docker volume ls
```

---

## Docker Best Practices

### .dockerignore

**File:** `.dockerignore`

```
# Node modules (installed during build)
node_modules/
**/node_modules/
npm-debug.log*

# Build artifacts
dist/
build/
*.tsbuildinfo

# Test files
coverage/
*.test.ts
*.spec.ts

# Development files
.env
.env.local
.git/
.gitignore
.vscode/
.idea/

# Documentation
docs/
*.md
!README.md

# Logs
logs/
*.log

# OS files
.DS_Store
Thumbs.db
```

### Layer Caching

**Optimize Dockerfile Layer Order:**

```dockerfile
# ❌ BAD: Rebuild everything if source code changes
COPY . /app
RUN npm ci
RUN npm run build

# ✅ GOOD: Cache dependencies (rebuild only if package.json changes)
COPY package.json package-lock.json ./
RUN npm ci  # Cached layer

COPY . /app  # Only invalidates this layer and below
RUN npm run build
```

### Security Best Practices

```dockerfile
# ✅ Run as non-root user
USER botuser

# ✅ Use Alpine Linux (smaller attack surface)
FROM node:18-alpine

# ✅ Remove unnecessary packages
RUN apk del python3 make g++

# ✅ Scan for vulnerabilities
docker scan bwaincell-backend:latest
```

### Resource Limits

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0' # Prevent CPU hogging
      memory: 512M # Prevent memory leaks from crashing system
    reservations:
      cpus: '0.25' # Guaranteed minimum
      memory: 128M
```

---

## Production vs Development

### Production Configuration

**Dockerfile (Multi-Stage):**

- Build stage: Install all dependencies, compile TypeScript
- Runtime stage: Only production dependencies, compiled code

**docker-compose.yml:**

- Restart policy: `unless-stopped` (high availability)
- Health checks enabled
- Resource limits enforced
- Logging with rotation
- Non-root user

**Environment:**

```bash
NODE_ENV=production
```

### Development Configuration

**docker-compose.dev.yml:**

- Hot reloading with volume mounts
- Development dependencies included
- No resource limits (faster development)
- Verbose logging
- Debugger port exposed

**Environment:**

```bash
NODE_ENV=development
```

### Comparison

| Feature         | Production       | Development     |
| --------------- | ---------------- | --------------- |
| Image Size      | 200 MB           | 600 MB          |
| Restart Policy  | `unless-stopped` | `no`            |
| Hot Reload      | No               | Yes             |
| Debugger        | No               | Yes (port 9229) |
| Resource Limits | Yes              | No              |
| Health Checks   | Yes              | Optional        |
| Log Level       | `info`           | `debug`         |
| Source Maps     | No               | Yes             |

---

## Docker Troubleshooting

### Common Issues

**1. Container Won't Start:**

```bash
# Check logs
docker compose logs backend

# Common issues:
# - Missing environment variables
# - Database connection failed
# - Port already in use
```

**Fix:**

```bash
# Verify .env file exists
cat .env

# Check if port is in use
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Restart services
docker compose restart
```

**2. Database Connection Failed:**

```bash
# Error: ECONNREFUSED 127.0.0.1:54321  (or host.docker.internal:54321)
```

**Fix:**

```bash
# Start the self-hosted Supabase stack first (separate from docker-compose.yml)
npm run supabase:start
npm run supabase:status  # confirm Kong is listening on :54321

# Then start the backend container
docker compose up -d backend

# From inside the container, SUPABASE_URL must be http://host.docker.internal:54321
# (127.0.0.1 inside the container is the container itself, not the Pi host)
```

**3. Out of Disk Space:**

```bash
# Error: no space left on device
```

**Fix:**

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused containers
docker container prune

# Remove everything (WARNING: deletes all Docker data)
docker system prune -a --volumes
```

**4. Permission Denied:**

```bash
# Error: permission denied while trying to connect to Docker daemon
```

**Fix:**

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again
exit
```

**5. Build Failed:**

```bash
# Error: npm ERR! code E404
```

**Fix:**

```bash
# Clear npm cache
npm cache clean --force

# Rebuild without cache (local dev only — production uses GHCR pull; see deployment.md)
docker compose build --no-cache backend
```

### Health Check Failures

```bash
# Check health status
docker compose ps

# View health check logs
docker inspect bwaincell-backend | grep -A 10 Health

# Test health endpoint manually
curl http://localhost:3000/health
```

### Network Issues

```bash
# List networks
docker network ls

# Inspect network
docker network inspect bwaincell-network

# Recreate network
docker compose down
docker compose up -d
```

---

## Related Documentation

- **[Security Best Practices](security-best-practices.md)** - Docker security, secrets management
- **[Performance Optimization](performance-optimization.md)** - Resource limits, optimization
- **[CI/CD Pipeline](ci-cd-pipeline.md)** - Docker builds in CI/CD
- **[Architecture Overview](../architecture/overview.md)** - Deployment architecture

---

## External Resources

- **Docker Documentation:** [docs.docker.com](https://docs.docker.com/)
- **Docker Compose Documentation:** [docs.docker.com/compose/](https://docs.docker.com/compose/)
- **Supabase Self-Hosting:** [supabase.com/docs/guides/self-hosting](https://supabase.com/docs/guides/self-hosting)
- **Node.js Docker Best Practices:** [github.com/nodejs/docker-node/blob/main/docs/BestPractices.md](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)

---

**Last Updated** 2026-01-12
**Version:** 2.0.0
**Maintained by:** Bwaincell Development Team
