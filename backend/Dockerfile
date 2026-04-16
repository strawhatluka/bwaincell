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

# Copy workspace package files (root + backend + shared + supabase)
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
COPY supabase/package.json ./supabase/

# Install production dependencies only (disable husky during install)
# --ignore-scripts required: postinstall runs tsc which isn't available with --omit=dev
# npm rebuild skia-canvas: downloads prebuilt ARM64 binary that --ignore-scripts skipped
RUN HUSKY=0 npm ci --omit=dev --ignore-scripts && \
    npm rebuild skia-canvas && \
    npm cache clean --force

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
COPY supabase/package.json ./supabase/

# Install ALL dependencies (including devDependencies for TypeScript compilation)
# Skip prepare script (husky) during Docker build
RUN HUSKY=0 npm ci --ignore-scripts

# Copy workspace TypeScript configuration
COPY tsconfig.json ./

# Copy shared source code (backend depends on this)
COPY shared/ ./shared/

# Copy supabase package (TS project reference for backend models)
COPY supabase/ ./supabase/

# Copy backend source files for build
COPY backend/src/ ./backend/src/
COPY backend/commands/ ./backend/commands/
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
RUN rm -rf backend/dist/ shared/dist/ supabase/dist/ *.tsbuildinfo

# Build shared package first (backend depends on this for types)
RUN npm run build --workspace=shared

# Build supabase package (TS project reference for backend)
RUN npx tsc --build supabase

# Compile backend TypeScript
RUN npm run build --workspace=backend

# Validate compiled code exists
RUN test -f backend/dist/src/bot.js || \
    (echo "ERROR: Compiled bot.js not found in backend/dist/src/" && exit 1)

# -----------------------------------------------------------------------------
# Stage 3: Runner
# -----------------------------------------------------------------------------
FROM --platform=linux/arm64 node:18-alpine AS runner

# Install dumb-init for proper signal handling + fonts for skia-canvas text rendering
RUN apk add --no-cache dumb-init curl fontconfig ttf-dejavu && \
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

# Copy compiled supabase models (backend imports these at runtime)
COPY --from=builder --chown=botuser:botuser /app/supabase/dist ./supabase/dist
COPY --chown=botuser:botuser supabase/package.json ./supabase/

# Copy CHANGELOG.md (release notes) for announcements
COPY --chown=botuser:botuser CHANGELOG.md ./

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
# start-period must be generous: bot loads DB, commands, scheduler, Discord login, THEN starts API
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the bot
CMD ["node", "dist/src/bot.js"]
