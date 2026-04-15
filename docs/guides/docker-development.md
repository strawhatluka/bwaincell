# Docker Development

Comprehensive guide to Docker development for Bwaincell - containerized development and deployment on Raspberry Pi.

> **Supabase update (2026-04-15):** The **database is no longer a `postgres` service in `docker-compose.yml`**. Postgres (plus PostgREST, GoTrue, Studio) is provisioned and orchestrated by the **Supabase CLI** as a separate container stack started via `npm run supabase:start` (local dev) or `supabase start` on the production Pi. `docker-compose.yml` now only concerns the **backend** (Discord bot + Express API) and, optionally, the **frontend** container for Pi deployments.
>
> Practical consequences:
> - Any section below that references a `postgres` or `db` service inside `docker-compose.yml` is **stale** and should be read as "the Supabase CLI now handles that container stack separately".
> - `DATABASE_URL` is no longer used; the backend reads `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.
> - Start order in local dev: `npm run supabase:start` first, then `npm run dev` (or `docker compose up -d` for containerized runs).
> - On the Pi, both the Bwaincell backend container and the Supabase stack share `127.0.0.1` — the backend reaches Supabase at `http://127.0.0.1:54321`.

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
├── docker-compose.yml          # Production orchestration
├── docker-compose.dev.yml      # Development orchestration
├── .dockerignore               # Ignore files in Docker build
├── backend/
│   ├── Dockerfile              # Backend multi-stage build
│   └── src/
├── frontend/
│   ├── Dockerfile              # Frontend build (not used - Vercel deployment)
│   └── src/
└── database/
    └── init.sql                # Database initialization
```

### Quick Start

**Start Development Environment:**

```bash
# Start all services (backend + database)
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

**Start with Specific Services:**

```bash
# Start only database
docker compose up -d postgres

# Start backend (depends on database)
docker compose up -d backend
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
# PostgreSQL database in separate container (see docker-compose.yml)
# Frontend (PWA) deployed separately on Vercel
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM --platform=linux/arm64 node:18-alpine AS deps

# Install dependencies for native modules (pg for PostgreSQL)
RUN apk add --no-cache libc6-compat postgresql-client && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copy workspace package files (root + backend + shared)
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/

# Install production dependencies only (disable husky during install)
# This installs for all workspaces
RUN HUSKY=0 npm ci --omit=dev --ignore-scripts && npm cache clean --force

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM --platform=linux/arm64 node:18-alpine AS builder

# Install build dependencies for native modules (pg, TypeScript compilation)
RUN apk add --no-cache python3 make g++ postgresql-dev && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copy workspace package files
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/

# Install ALL dependencies (including devDependencies for TypeScript compilation)
# Skip prepare script (husky) during Docker build
RUN HUSKY=0 npm ci --ignore-scripts

# Copy workspace TypeScript configuration
COPY tsconfig.json ./

# Copy shared source code (backend depends on this)
COPY shared/ ./shared/

# Copy backend source files for build
COPY backend/src/ ./backend/src/
COPY backend/commands/ ./backend/commands/
COPY backend/database/ ./backend/database/
COPY backend/utils/ ./backend/utils/
COPY backend/config/ ./backend/config/
COPY backend/types/ ./backend/types/
COPY backend/tsconfig.json ./backend/

# Note: backend also has local shared/, utils/, types/ directories
# These are separate from the monorepo shared/ package
COPY backend/shared/ ./backend/shared/

# Set build environment
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Clean any pre-existing compiled code to force fresh compilation
RUN rm -rf backend/dist/ shared/dist/ *.tsbuildinfo

# Build shared package first (backend depends on this for types)
RUN npm run build --workspace=shared

# Compile backend TypeScript
RUN npm run build --workspace=backend

# Validate compiled code exists
RUN test -f backend/dist/src/bot.js || \
    (echo "ERROR: Compiled bot.js not found in backend/dist/src/" && exit 1)

# -----------------------------------------------------------------------------
# Stage 3: Runner
# -----------------------------------------------------------------------------
FROM --platform=linux/arm64 node:18-alpine AS runner

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 botuser && \
    adduser --system --uid 1001 botuser

# Copy production dependencies from deps stage (npm workspaces installs all deps at root)
COPY --from=deps /app/node_modules ./node_modules

# Copy compiled backend from builder
COPY --from=builder --chown=botuser:botuser /app/backend/dist ./backend/dist

# Copy backend package.json for runtime
COPY --chown=botuser:botuser backend/package.json ./backend/

# Copy compiled shared types (if backend imports them at runtime)
COPY --from=builder --chown=botuser:botuser /app/shared/dist ./shared/dist
COPY --chown=botuser:botuser shared/package.json ./shared/

# Create data and logs directories with proper permissions
RUN mkdir -p /app/data /app/logs && \
    chown -R botuser:botuser /app

# Set working directory to backend for execution
WORKDIR /app/backend

# Switch to non-root user
USER botuser

# Expose health check port (Express API)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000

# Health check (Express API health endpoint)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the bot
CMD ["node", "dist/src/bot.js"]
```

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

---

## Container Orchestration

### docker-compose.yml (Production)

**File:** `docker-compose.yml`

```yaml
# =============================================================================
# Bwaincell - Production Docker Compose (Monorepo)
# =============================================================================
# Architecture:
#   - Backend (Discord Bot + Express API) + PostgreSQL → Raspberry Pi (sunny-pi)
#   - Frontend (Next.js PWA) → Vercel (separate deployment)
# =============================================================================

services:
  # ---------------------------------------------------------------------------
  # PostgreSQL Database - Production
  # ---------------------------------------------------------------------------
  postgres:
    image: postgres:15-alpine
    container_name: bwaincell-db
    restart: unless-stopped

    # Load environment variables from .env
    env_file:
      - .env

    environment:
      POSTGRES_USER: ${POSTGRES_USER:-bwaincell}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-bwaincell}
      # Performance tuning for production (conservative for household bot)
      POSTGRES_SHARED_BUFFERS: 128MB
      POSTGRES_MAX_CONNECTIONS: 20

    volumes:
      # Persistent data storage on Pi
      - postgres-data:/var/lib/postgresql/data
      # Database initialization script
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql

    # Expose port 5433 externally to avoid conflict with sunny-stack-db (5432)
    ports:
      - '5433:5432'

    networks:
      - bwaincell-network

    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-bwaincell}']
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

    # Resource limits optimized for Raspberry Pi 4B
    deploy:
      resources:
        limits:
          cpus: '0.5' # Max 0.5 cores
          memory: 512M # Max 512MB RAM
        reservations:
          cpus: '0.25' # Min 0.25 cores reserved
          memory: 256M # Min 256MB RAM reserved

    # Logging configuration with rotation
    logging:
      driver: 'json-file'
      options:
        max-size: '10m' # Max 10MB per log file
        max-file: '3' # Keep 3 rotated files
        compress: 'true'

    # Security options
    security_opt:
      - no-new-privileges:true

    labels:
      com.bwaincell.service: 'postgres'
      com.bwaincell.environment: 'production'
      com.bwaincell.platform: 'raspberry-pi'

  # ---------------------------------------------------------------------------
  # Backend Service - Discord.js 14 + Express API + PostgreSQL (Monorepo)
  # ---------------------------------------------------------------------------
  backend:
    # Build from monorepo root context
    build:
      context: .
      dockerfile: backend/Dockerfile

    image: bwaincell-backend:latest
    container_name: bwaincell-backend

    # Restart policy for high availability
    restart: unless-stopped

    # Environment variables from production file
    env_file:
      - .env

    # Additional environment overrides
    environment:
      - NODE_ENV=production
      - DEPLOYMENT_MODE=pi
      - TZ=America/Chicago # Set your timezone (important for reminders)

    # Health check configuration (matches Dockerfile HEALTHCHECK)
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

    # Port mapping
    ports:
      - '3000:3000' # Express API + health endpoint

    # Persistent storage for logs
    volumes:
      - ./data:/app/data # Data persistence (if needed)
      - ./logs:/app/logs # Log files persistence

    # Resource limits optimized for Raspberry Pi 4B (4GB RAM model)
    deploy:
      resources:
        limits:
          cpus: '1.0' # Max 1 core (Pi has 4)
          memory: 512M # Max 512MB RAM
        reservations:
          cpus: '0.25' # Min 0.25 cores reserved
          memory: 128M # Min 128MB RAM reserved

    # Logging configuration with rotation
    logging:
      driver: 'json-file'
      options:
        max-size: '25m' # Max 25MB per log file
        max-file: '3' # Keep 3 rotated files (75MB total)
        compress: 'true' # Compress rotated logs

    # Security options
    security_opt:
      - no-new-privileges:true # Prevent privilege escalation

    # Run as non-root user (matches Dockerfile USER)
    user: '1001:1001'

    # Network configuration
    networks:
      - bwaincell-network

    # Wait for PostgreSQL to be healthy before starting
    depends_on:
      postgres:
        condition: service_healthy

    # Labels for management
    labels:
      com.bwaincell.service: 'discord-bot'
      com.bwaincell.environment: 'production'
      com.bwaincell.platform: 'raspberry-pi'

# -----------------------------------------------------------------------------
# Volumes
# -----------------------------------------------------------------------------
volumes:
  postgres-data:
    driver: local
    labels:
      com.bwaincell.description: 'PostgreSQL production database storage'

# -----------------------------------------------------------------------------
# Networks
# -----------------------------------------------------------------------------
networks:
  bwaincell-network:
    driver: bridge
    labels:
      com.bwaincell.description: 'Production network for Pi services'
```

### docker-compose Commands

```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d postgres

# View logs (follow)
docker compose logs -f

# View logs for specific service
docker compose logs -f backend

# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes database data)
docker compose down -v

# Rebuild backend image
docker compose build --no-cache backend

# Restart specific service
docker compose restart backend

# Check service status
docker compose ps

# Execute command in running container
docker compose exec backend sh

# View resource usage
docker stats bwaincell-backend bwaincell-db
```

---

## Environment Variables

### .env File in Docker

**.env File:**

```bash
# =============================================================================
# Bwaincell Environment Variables (Docker Production)
# =============================================================================

# Discord Bot Configuration
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_for_testing

# PostgreSQL Configuration
POSTGRES_USER=bwaincell
POSTGRES_PASSWORD=your_secure_database_password
POSTGRES_DB=bwaincell

# Database connection string (for Docker network)
DATABASE_URL=postgresql://bwaincell:your_secure_database_password@postgres:5432/bwaincell

# JWT Configuration
JWT_SECRET=your_jwt_secret_here

# API Configuration
API_PORT=3000
PORT=3000
NODE_ENV=production
DEPLOYMENT_MODE=pi

# Timezone
TZ=America/Chicago
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

### PostgreSQL Container

**Configuration:**

```yaml
postgres:
  image: postgres:15-alpine
  container_name: bwaincell-db

  environment:
    POSTGRES_USER: ${POSTGRES_USER:-bwaincell}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    POSTGRES_DB: ${POSTGRES_DB:-bwaincell}

  volumes:
    - postgres-data:/var/lib/postgresql/data # Persistent storage
    - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql # Initialization

  ports:
    - '5433:5432' # Expose externally (avoid conflict with port 5432)
```

### Database Initialization

**File:** `database/init.sql`

```sql
-- Database initialization script
-- Runs automatically when PostgreSQL container starts (if database doesn't exist)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables (if using raw SQL instead of Sequelize migrations)
-- CREATE TABLE tasks (...);
-- CREATE TABLE lists (...);
```

### Accessing Database from Host

```bash
# psql from host (if PostgreSQL installed)
psql -h localhost -p 5433 -U bwaincell -d bwaincell

# psql from Docker
docker compose exec postgres psql -U bwaincell -d bwaincell

# List databases
docker compose exec postgres psql -U bwaincell -c "\l"

# List tables
docker compose exec postgres psql -U bwaincell -d bwaincell -c "\dt"

# Dump database
docker compose exec postgres pg_dump -U bwaincell bwaincell > backup.sql

# Restore database
cat backup.sql | docker compose exec -T postgres psql -U bwaincell bwaincell
```

### Database Persistence

**Named Volume (Recommended):**

```yaml
volumes:
  postgres-data:
    driver: local
```

**Data persists even after `docker compose down`**

**Bind Mount (Alternative):**

```yaml
volumes:
  - ./data/postgres:/var/lib/postgresql/data
```

**Data stored in `./data/postgres` on host**

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

# Volume details
docker volume inspect bwaincell_postgres-data
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
# Error: ECONNREFUSED postgres:5432
```

**Fix:**

```bash
# Wait for database to be ready
docker compose up -d postgres
docker compose logs -f postgres
# Wait for "database system is ready to accept connections"

# Then start backend
docker compose up -d backend
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

# Rebuild without cache
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
- **PostgreSQL Docker Image:** [hub.docker.com/\_/postgres](https://hub.docker.com/_/postgres)
- **Node.js Docker Best Practices:** [github.com/nodejs/docker-node/blob/main/docs/BestPractices.md](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)

---

**Last Updated** 2026-01-12
**Version:** 2.0.0
**Maintained by:** Bwaincell Development Team
