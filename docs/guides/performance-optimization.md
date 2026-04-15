# Performance Optimization

Comprehensive performance optimization guide for Bwaincell - maximizing speed, efficiency, and scalability.

> **Supabase update (2026-04-15):** Sequelize-specific database guidance below (eager loading, `include`, `Op.like` patterns) is historical. The current equivalents:
>
> **Indexes** — Define in the same migration that introduces the column. Authoritative indexes live in `supabase/migrations/*.sql`. Key existing indexes: `idx_tasks_guild_completed`, `idx_reminders_next_trigger` (partial `WHERE active = TRUE`), `idx_meal_plans_guild_active` (unique partial for "one active plan per guild"), `idx_recipes_guild_favorite`.
>
> **Query depth / nested selects** — When using `supabase.from('x').select('... , related(...)')` with relationship expansion, keep the depth to 1–2 levels. Deep PostgREST selects are convenient but can mask N+1 at the client layer.
>
> **Pagination** — Prefer `.range(from, to)` with explicit ordering instead of OFFSET-based pagination when possible; PostgREST translates both cleanly but keyset pagination on an indexed column scales better.
>
> **Connection pooling** — In production, connect backend to Supabase through its built-in pooler (the `pgbouncer`-style connection string exposed by Supabase). For the self-hosted Pi stack this is `127.0.0.1:54322` + the pooler port described in `supabase status` output.
>
> **JSONB columns** — `lists.items`, `notes.tags`, `recipes.ingredients`, `recipes.instructions`, `recipes.dietary_tags`, `recipe_preferences.dietary_restrictions` are all JSONB. Queries that filter inside these columns should use `@>` / `?` operators and a `GIN` index if hot.
>
> **Gemini calls** — `geminiService.ts` is an external network hop. Cache canonicalized ingredients in the DB (already done for recipes) so reads don't re-invoke the model.

## Table of Contents

1. [Database Performance](#database-performance)
2. [API Performance](#api-performance)
3. [Frontend Performance](#frontend-performance)
4. [Discord Bot Performance](#discord-bot-performance)
5. [Caching Strategies](#caching-strategies)
6. [Query Optimization](#query-optimization)
7. [Profiling and Monitoring](#profiling-and-monitoring)
8. [Load Testing](#load-testing)
9. [Performance Budgets](#performance-budgets)
10. [Optimization Checklist](#optimization-checklist)

---

## Database Performance

### PostgreSQL Indexes

**Why Indexes Matter:**

Without indexes, PostgreSQL performs full table scans (O(n) complexity). Indexes enable fast lookups (O(log n) complexity).

**Bwaincell Index Strategy:**

```sql
-- backend/database/migrations/add-indexes.sql

-- Tasks table: Most common queries filter by discordUserId
CREATE INDEX idx_tasks_discord_user_id ON tasks(discord_user_id);

-- Compound index for user + completed status (common filter combination)
CREATE INDEX idx_tasks_user_completed ON tasks(discord_user_id, completed);

-- Index on due_date for reminder queries
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;

-- Lists table: Filter by user
CREATE INDEX idx_lists_discord_user_id ON lists(discord_user_id);

-- Notes table: Filter by user
CREATE INDEX idx_notes_discord_user_id ON notes(discord_user_id);

-- Reminders table: Filter by user + active status
CREATE INDEX idx_reminders_user_active ON reminders(discord_user_id, active);

-- Budget entries: Filter by user + date range
CREATE INDEX idx_budget_user_date ON budget_entries(discord_user_id, date);
```

**Verify Index Usage:**

```sql
-- Check if index is being used
EXPLAIN ANALYZE
SELECT * FROM tasks
WHERE discord_user_id = '123456789'
  AND completed = false;

-- Expected output (index scan):
-- Index Scan using idx_tasks_user_completed on tasks  (cost=0.29..8.31 rows=1 width=...)
--   Index Cond: ((discord_user_id = '123456789') AND (completed = false))
```

**Index Maintenance:**

```sql
-- Check index usage statistics
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Find unused indexes (idx_scan = 0)
SELECT schemaname, tablename, indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE 'pg_toast_%';

-- Drop unused indexes
DROP INDEX IF EXISTS idx_unused_index;
```

### Connection Pooling

**Sequelize Connection Pool:**

```typescript
// backend/database/connection.ts
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,

  pool: {
    max: 20, // Maximum connections in pool
    min: 5, // Minimum connections maintained
    acquire: 30000, // Maximum time (ms) to acquire connection before timeout
    idle: 10000, // Maximum time (ms) connection can be idle before release
  },

  dialectOptions: {
    ssl:
      process.env.NODE_ENV === 'production'
        ? {
            require: true,
            rejectUnauthorized: false, // Allow self-signed certificates
          }
        : false,
  },
});
```

**Why Connection Pooling?**

- Avoid overhead of creating new connections for each query
- Reuse existing connections
- Limit total connections (prevent database overload)

**Optimal Pool Size:**

```
Connections = ((core_count * 2) + effective_spindle_count)

Raspberry Pi 4B (4 cores, 1 SSD):
max = (4 * 2) + 1 = 9 connections

Bwaincell uses max=20 for safety margin
```

### Query Result Pagination

**Problem: Fetching All Records is Slow**

```typescript
// ❌ BAD: Fetch all tasks (could be thousands)
const tasks = await Task.findAll({
  where: { discordUserId: req.user.discordId },
});
```

**Solution: Paginate Results**

```typescript
// ✅ GOOD: Fetch 20 tasks at a time
const page = parseInt(req.query.page as string) || 1;
const limit = 20;
const offset = (page - 1) * limit;

const { count, rows: tasks } = await Task.findAndCountAll({
  where: { discordUserId: req.user.discordId },
  limit: limit,
  offset: offset,
  order: [['createdAt', 'DESC']],
});

res.json({
  success: true,
  data: tasks,
  pagination: {
    page: page,
    limit: limit,
    total: count,
    totalPages: Math.ceil(count / limit),
  },
});
```

**Cursor-Based Pagination (Better for Large Datasets):**

```typescript
// Fetch tasks after specific ID (cursor)
const cursor = req.query.cursor as string | undefined;

const tasks = await Task.findAll({
  where: {
    discordUserId: req.user.discordId,
    ...(cursor ? { id: { [Op.gt]: cursor } } : {}),
  },
  limit: 20,
  order: [['id', 'ASC']],
});

const nextCursor = tasks.length > 0 ? tasks[tasks.length - 1].id : null;

res.json({
  success: true,
  data: tasks,
  nextCursor: nextCursor,
});
```

### Database Query Optimization

**Use EXPLAIN ANALYZE:**

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT t.*, l.name as list_name
FROM tasks t
LEFT JOIN lists l ON t.list_id = l.id
WHERE t.discord_user_id = '123456789'
  AND t.completed = false
ORDER BY t.due_date ASC NULLS LAST;

-- Output shows:
-- - Execution time
-- - Index usage
-- - Rows scanned
-- - Bottlenecks
```

**Common Optimizations:**

```typescript
// ✅ Select only needed columns (not SELECT *)
const tasks = await Task.findAll({
  attributes: ['id', 'title', 'completed', 'dueDate'], // Only fetch these
  where: { discordUserId: req.user.discordId },
});

// ✅ Use COUNT queries efficiently
const taskCount = await Task.count({
  where: { discordUserId: req.user.discordId, completed: false },
});

// ✅ Batch operations (insert multiple records at once)
await Task.bulkCreate([
  { title: 'Task 1', discordUserId: userId },
  { title: 'Task 2', discordUserId: userId },
  { title: 'Task 3', discordUserId: userId },
]);
```

### PostgreSQL Configuration (Raspberry Pi)

```yaml
# docker-compose.yml
services:
  postgres:
    environment:
      # Performance tuning for Raspberry Pi 4B (4GB RAM)
      POSTGRES_SHARED_BUFFERS: 128MB # 25% of available RAM for PostgreSQL
      POSTGRES_MAX_CONNECTIONS: 20 # Limit concurrent connections
      POSTGRES_WORK_MEM: 4MB # Memory per query operation
      POSTGRES_MAINTENANCE_WORK_MEM: 64MB # Memory for VACUUM, indexes
      POSTGRES_EFFECTIVE_CACHE_SIZE: 512MB # OS disk cache size
```

**VACUUM and ANALYZE:**

```sql
-- Reclaim space and update statistics (run weekly)
VACUUM ANALYZE tasks;
VACUUM ANALYZE lists;
VACUUM ANALYZE notes;
VACUUM ANALYZE reminders;
VACUUM ANALYZE budget_entries;

-- Auto-vacuum configuration (postgresql.conf)
autovacuum = on
autovacuum_max_workers = 2
autovacuum_naptime = 1min
```

---

## API Performance

### Response Compression

**gzip Compression:**

```typescript
// backend/src/api/server.ts
import compression from 'compression';

app.use(
  compression({
    threshold: 1024, // Only compress responses > 1KB
    level: 6, // Compression level (0-9, 6 is balanced)
    filter: (req, res) => {
      // Don't compress if client doesn't support it
      if (req.headers['x-no-compression']) {
        return false;
      }

      // Compress JSON, text, HTML, JavaScript, CSS
      return compression.filter(req, res);
    },
  })
);
```

**Before/After:**

```
Without compression:
  Response size: 45 KB
  Transfer time: 450ms (at 800 Kbps)

With gzip compression:
  Response size: 8 KB (82% reduction)
  Transfer time: 80ms (at 800 Kbps)
```

### Response Caching

**Cache-Control Headers:**

```typescript
// backend/src/api/middleware/cache.ts
export function cacheControl(duration: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', `public, max-age=${duration}`);
    next();
  };
}

// Usage
router.get('/tasks', cacheControl(60), async (req, res) => {
  // Cache response for 60 seconds
  const tasks = await Task.findAll({
    where: { discordUserId: req.user.discordId },
  });

  res.json({ success: true, data: tasks });
});
```

**ETag Support:**

```typescript
// Express automatically generates ETags
app.set('etag', 'strong'); // Enable strong ETags

// Client sends If-None-Match header:
// If-None-Match: "abc123"

// Server responds with 304 Not Modified (no body) if ETag matches
```

### API Response Format Optimization

**JSON Minification:**

```typescript
// ✅ GOOD: Minimal JSON (reduce payload size)
{
  "success": true,
  "data": [
    { "id": 1, "title": "Task 1", "completed": false },
    { "id": 2, "title": "Task 2", "completed": true }
  ]
}

// ❌ BAD: Verbose JSON (larger payload)
{
  "success": true,
  "message": "Tasks retrieved successfully",
  "timestamp": "2026-01-11T12:00:00Z",
  "data": [
    {
      "id": 1,
      "title": "Task 1",
      "description": null,
      "completed": false,
      "priority": "medium",
      "createdAt": "2026-01-10T10:00:00Z",
      "updatedAt": "2026-01-10T10:00:00Z"
    }
  ],
  "meta": {
    "total": 2,
    "page": 1
  }
}
```

**Field Filtering:**

```typescript
// Allow clients to request specific fields
const fields = (req.query.fields as string)?.split(',') || undefined;

const tasks = await Task.findAll({
  attributes: fields || ['id', 'title', 'completed', 'dueDate'],
  where: { discordUserId: req.user.discordId },
});
```

### Parallel Requests

**Sequential Requests (Slow):**

```typescript
// ❌ BAD: Wait for each request to complete (total: 3 seconds)
const tasks = await Task.findAll({ where: { discordUserId } }); // 1s
const lists = await List.findAll({ where: { discordUserId } }); // 1s
const notes = await Note.findAll({ where: { discordUserId } }); // 1s
```

**Parallel Requests (Fast):**

```typescript
// ✅ GOOD: Execute all queries in parallel (total: 1 second)
const [tasks, lists, notes] = await Promise.all([
  Task.findAll({ where: { discordUserId } }),
  List.findAll({ where: { discordUserId } }),
  Note.findAll({ where: { discordUserId } }),
]);
```

### Rate Limiting (Prevent Abuse)

See [Security Best Practices - Rate Limiting](security-best-practices.md#rate-limiting) for implementation.

---

## Frontend Performance

### Code Splitting

**Next.js Dynamic Imports:**

```typescript
// frontend/components/BudgetChart.tsx
import dynamic from 'next/dynamic';

// ✅ Lazy load heavy chart component (only when needed)
const BudgetChart = dynamic(() => import('./BudgetChart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false,  // Don't render on server (client-side only)
});

export default function BudgetPage() {
  return (
    <div>
      <h1>Budget</h1>
      <BudgetChart />  {/* Loaded on demand */}
    </div>
  );
}
```

**Before/After:**

```
Before code splitting:
  Initial bundle: 500 KB
  Time to Interactive: 3.2s

After code splitting:
  Initial bundle: 200 KB
  Time to Interactive: 1.4s
  BudgetChart loaded on demand: +100 KB (when user visits /budget)
```

### Image Optimization

**Next.js Image Component:**

```typescript
// frontend/components/TaskList.tsx
import Image from 'next/image';

// ✅ Optimized image loading
<Image
  src="/icon-192.png"
  alt="Bwain icon"
  width={48}
  height={48}
  loading="lazy"  // Lazy load images below the fold
  quality={75}    // Compress image (default: 75)
/>

// ❌ Unoptimized <img> tag
<img src="/icon-192.png" alt="Bwain icon" />
```

**Image Formats:**

```
Original PNG: 45 KB
Optimized WebP: 12 KB (73% reduction)
Optimized AVIF: 8 KB (82% reduction)
```

### Bundle Size Optimization

**Analyze Bundle:**

```bash
# Install bundle analyzer
npm install --save-dev @next/bundle-analyzer

# Configure next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // Next.js config
});

# Run analysis
ANALYZE=true npm run build
```

**Tree Shaking:**

```typescript
// ✅ GOOD: Import only what you need (tree-shakeable)
import { useState, useEffect } from 'react';

// ❌ BAD: Import entire library (bundles everything)
import * as React from 'react';
```

**Remove Unused Dependencies:**

```bash
# Find unused dependencies
npm install -g depcheck
depcheck

# Output:
# Unused dependencies:
# * lodash
# * moment

# Remove unused dependencies
npm uninstall lodash moment
```

### PWA Caching

**Service Worker:**

```javascript
// frontend/public/service-worker.js
const CACHE_NAME = 'bwaincell-v1';

// Cache static assets
const urlsToCache = ['/', '/dashboard', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Serve from cache (if available)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response or fetch from network
      return response || fetch(event.request);
    })
  );
});
```

**Cache Strategies:**

1. **Cache First (Static Assets):**
   - Check cache → If found, return cached version
   - If not found, fetch from network and cache

2. **Network First (Dynamic Data):**
   - Fetch from network → If successful, cache and return
   - If network fails, return cached version (stale)

3. **Stale-While-Revalidate (Best of Both Worlds):**
   - Return cached version immediately (fast)
   - Fetch from network in background (update cache)

### React Performance

**Memoization:**

```typescript
// Prevent unnecessary re-renders
import { memo, useMemo, useCallback } from 'react';

// ✅ Memoize expensive calculations
const TaskList = memo(({ tasks }) => {
  const sortedTasks = useMemo(() => {
    return tasks.sort((a, b) => a.dueDate - b.dueDate);
  }, [tasks]);  // Only recalculate if tasks change

  const handleTaskClick = useCallback((taskId) => {
    console.log('Task clicked:', taskId);
  }, []);  // Function identity stable

  return (
    <ul>
      {sortedTasks.map(task => (
        <li key={task.id} onClick={() => handleTaskClick(task.id)}>
          {task.title}
        </li>
      ))}
    </ul>
  );
});
```

**Virtual Scrolling:**

```typescript
// For very long lists (1000+ items)
import { FixedSizeList } from 'react-window';

function TaskList({ tasks }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      {tasks[index].title}
    </div>
  );

  return (
    <FixedSizeList
      height={600}      // Viewport height
      itemCount={tasks.length}
      itemSize={50}     // Row height
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

---

## Discord Bot Performance

### Command Response Time

**Defer Slow Commands:**

```typescript
// backend/commands/task.ts
export default {
  data: new SlashCommandBuilder().setName('task').setDescription('Manage tasks'),

  async execute(interaction) {
    // Defer reply for slow operations (>3 seconds)
    await interaction.deferReply({ ephemeral: true });

    try {
      // Slow database operation
      const tasks = await Task.findAll({
        where: { discordUserId: interaction.user.id },
        include: [{ model: List }],
      });

      // Edit deferred reply
      await interaction.editReply({
        content: `You have ${tasks.length} tasks`,
      });
    } catch (error) {
      await interaction.editReply({
        content: 'Error fetching tasks',
      });
    }
  },
};
```

**Why Defer?**

- Discord requires response within 3 seconds
- Deferring gives you 15 minutes to respond
- Shows "Bot is thinking..." to user

### Batch Operations

**Sequential Operations (Slow):**

```typescript
// ❌ BAD: Send 10 messages sequentially (10 seconds)
for (const task of tasks) {
  await channel.send(`Task: ${task.title}`);
}
```

**Batch Operations (Fast):**

```typescript
// ✅ GOOD: Send 1 message with all tasks (1 second)
const taskList = tasks.map((task) => `• ${task.title}`).join('\n');
await channel.send(`**Your Tasks:**\n${taskList}`);
```

### Embed Optimization

**Minimize Embed Size:**

```typescript
// ✅ GOOD: Compact embed (500 bytes)
const embed = new EmbedBuilder()
  .setTitle('Your Tasks')
  .setDescription(tasks.map((t) => `• ${t.title}`).join('\n'))
  .setColor(0xe84d8a);

// ❌ BAD: Verbose embed (2000 bytes)
const embed = new EmbedBuilder()
  .setTitle('Your Tasks')
  .setDescription('Here are all your tasks:')
  .addFields(
    { name: 'Task 1', value: 'Description 1', inline: false },
    { name: 'Task 2', value: 'Description 2', inline: false }
    // ... 20 more fields
  )
  .setFooter({ text: 'Powered by Bwaincell' })
  .setTimestamp();
```

### Discord API Rate Limits

**Respect Rate Limits:**

Discord enforces:

- 50 requests per second (global)
- 5 requests per 5 seconds (per channel)
- 120 commands per 60 seconds (per guild)

```typescript
// discord.js automatically handles rate limits
client.on('rateLimit', (rateLimitData) => {
  logger.warn('[DISCORD] Rate limit hit', {
    timeout: rateLimitData.timeout,
    limit: rateLimitData.limit,
    method: rateLimitData.method,
    path: rateLimitData.path,
  });
});
```

**Queue Commands:**

```typescript
// Use queue for bulk operations
import { RateLimiter } from 'limiter';

const limiter = new RateLimiter({
  tokensPerInterval: 5,
  interval: 5000, // 5 requests per 5 seconds
});

async function sendMultipleMessages(channel, messages) {
  for (const message of messages) {
    await limiter.removeTokens(1); // Wait if rate limited
    await channel.send(message);
  }
}
```

### Caching Discord Data

```typescript
// Cache guild data (avoid repeated API calls)
const guildCache = new Map();

async function getGuild(guildId: string) {
  if (guildCache.has(guildId)) {
    return guildCache.get(guildId);
  }

  const guild = await client.guilds.fetch(guildId);
  guildCache.set(guildId, guild);

  // Expire cache after 1 hour
  setTimeout(() => guildCache.delete(guildId), 60 * 60 * 1000);

  return guild;
}
```

---

## Caching Strategies

### In-Memory Caching (Node.js)

**LRU Cache:**

```typescript
// Install node-cache
npm install node-cache

// backend/src/cache/memoryCache.ts
import NodeCache from 'node-cache';

// Create cache with 10 minute TTL
const cache = new NodeCache({
  stdTTL: 600,  // 10 minutes
  checkperiod: 120,  // Check for expired keys every 2 minutes
  maxKeys: 1000,  // Maximum 1000 keys
});

// Get from cache or fetch from database
export async function getCachedTasks(discordUserId: string) {
  const cacheKey = `tasks:${discordUserId}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.info('[CACHE] Cache hit', { key: cacheKey });
    return cached;
  }

  // Fetch from database
  logger.info('[CACHE] Cache miss', { key: cacheKey });
  const tasks = await Task.findAll({
    where: { discordUserId },
  });

  // Store in cache
  cache.set(cacheKey, tasks);

  return tasks;
}

// Invalidate cache on update
export function invalidateTaskCache(discordUserId: string) {
  const cacheKey = `tasks:${discordUserId}`;
  cache.del(cacheKey);
  logger.info('[CACHE] Cache invalidated', { key: cacheKey });
}
```

**Usage:**

```typescript
// backend/src/api/routes/tasks.ts
import { getCachedTasks, invalidateTaskCache } from '../../cache/memoryCache';

// GET /tasks (cached)
router.get('/tasks', authenticateUser, async (req, res) => {
  const tasks = await getCachedTasks(req.user.discordId);
  res.json({ success: true, data: tasks });
});

// POST /tasks (invalidate cache)
router.post('/tasks', authenticateUser, async (req, res) => {
  const task = await Task.create({
    ...req.body,
    discordUserId: req.user.discordId,
  });

  // Invalidate cache
  invalidateTaskCache(req.user.discordId);

  res.json({ success: true, data: task });
});
```

### HTTP Caching

**Cache-Control Headers:**

```typescript
// Cache static assets (1 year)
app.use(
  '/static',
  express.static('public', {
    maxAge: 31536000, // 1 year in seconds
    immutable: true, // Asset will never change
  })
);

// Cache API responses (5 minutes)
router.get('/tasks', cacheControl(300), async (req, res) => {
  const tasks = await Task.findAll({
    where: { discordUserId: req.user.discordId },
  });

  res.json({ success: true, data: tasks });
});
```

### Redis Caching (Advanced)

**Install Redis:**

```bash
npm install redis
```

**Redis Implementation:**

```typescript
// backend/src/cache/redisCache.ts
import { createClient } from 'redis';

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

client.on('error', (err) => logger.error('[REDIS] Error', { error: err }));

await client.connect();

// Get from cache or fetch from database
export async function getCachedTasks(discordUserId: string) {
  const cacheKey = `tasks:${discordUserId}`;

  // Check Redis cache
  const cached = await client.get(cacheKey);
  if (cached) {
    logger.info('[REDIS] Cache hit', { key: cacheKey });
    return JSON.parse(cached);
  }

  // Fetch from database
  logger.info('[REDIS] Cache miss', { key: cacheKey });
  const tasks = await Task.findAll({
    where: { discordUserId },
  });

  // Store in Redis (10 minute TTL)
  await client.setEx(cacheKey, 600, JSON.stringify(tasks));

  return tasks;
}

// Invalidate cache
export async function invalidateTaskCache(discordUserId: string) {
  const cacheKey = `tasks:${discordUserId}`;
  await client.del(cacheKey);
  logger.info('[REDIS] Cache invalidated', { key: cacheKey });
}
```

**Redis vs In-Memory Cache:**

| Feature     | In-Memory (NodeCache) | Redis                             |
| ----------- | --------------------- | --------------------------------- |
| Performance | Faster (local)        | Slightly slower (network)         |
| Persistence | Lost on restart       | Persists across restarts          |
| Scalability | Single server only    | Shared across multiple servers    |
| Memory      | Limited by Node.js    | Dedicated Redis server            |
| Use Case    | Single-server apps    | Multi-server apps (load balancer) |

---

## Query Optimization

### N+1 Query Problem

**Problem: N+1 Queries (Slow):**

```typescript
// ❌ BAD: 1 query for tasks + N queries for lists (11 queries total)
const tasks = await Task.findAll({
  where: { discordUserId: req.user.discordId },
});

// For each task, fetch its list (N queries)
for (const task of tasks) {
  task.list = await List.findByPk(task.listId); // Separate query!
}
```

**Solution: Eager Loading (Fast):**

```typescript
// ✅ GOOD: 1 query with JOIN (1 query total)
const tasks = await Task.findAll({
  where: { discordUserId: req.user.discordId },
  include: [
    {
      model: List,
      as: 'list',
    },
  ],
});

// list data already loaded (no additional queries)
```

**Generated SQL:**

```sql
-- Eager loading with JOIN
SELECT tasks.*, lists.id AS "list.id", lists.name AS "list.name"
FROM tasks
LEFT OUTER JOIN lists ON tasks.list_id = lists.id
WHERE tasks.discord_user_id = '123456789';
```

### Select Only Needed Columns

```typescript
// ❌ BAD: Fetch all columns (SELECT *)
const tasks = await Task.findAll({
  where: { discordUserId: req.user.discordId },
});

// ✅ GOOD: Fetch only needed columns
const tasks = await Task.findAll({
  attributes: ['id', 'title', 'completed', 'dueDate'],
  where: { discordUserId: req.user.discordId },
});
```

### Limit Result Sets

```typescript
// ❌ BAD: Fetch all tasks (could be thousands)
const tasks = await Task.findAll({
  where: { discordUserId: req.user.discordId },
});

// ✅ GOOD: Limit to recent tasks
const tasks = await Task.findAll({
  where: { discordUserId: req.user.discordId },
  limit: 20,
  order: [['createdAt', 'DESC']],
});
```

### Use Transactions for Consistency

```typescript
// Wrap multiple operations in transaction
import { sequelize } from '../database/connection';

await sequelize.transaction(async (t) => {
  // Create task
  const task = await Task.create(
    {
      title: 'New task',
      discordUserId: userId,
    },
    { transaction: t }
  );

  // Update list count
  await List.increment('taskCount', {
    where: { id: task.listId },
    transaction: t,
  });

  // If any operation fails, entire transaction is rolled back
});
```

---

## Profiling and Monitoring

### Winston Logger Performance Monitoring

```typescript
// shared/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Performance logging
export function logPerformance(operation: string, duration: number) {
  logger.info('[PERF] Operation completed', {
    operation: operation,
    duration: duration,
    unit: 'ms',
  });
}
```

**Usage:**

```typescript
// Measure operation performance
const startTime = Date.now();

const tasks = await Task.findAll({
  where: { discordUserId: req.user.discordId },
});

const duration = Date.now() - startTime;
logPerformance('fetchTasks', duration);

// Log output:
// {"level":"info","message":"[PERF] Operation completed","operation":"fetchTasks","duration":45,"unit":"ms","timestamp":"2026-01-11T12:00:00Z"}
```

### Express Middleware Performance Tracking

```typescript
// backend/src/api/middleware/performanceMonitor.ts
export function performanceMonitor(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Track when response is finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('[PERF] Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: duration,
      unit: 'ms',
    });

    // Alert on slow requests (>1 second)
    if (duration > 1000) {
      logger.warn('[PERF] Slow request detected', {
        method: req.method,
        path: req.path,
        duration: duration,
      });
    }
  });

  next();
}

// Apply to all routes
app.use(performanceMonitor);
```

### Database Query Performance Monitoring

```typescript
// Log slow queries (Sequelize)
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  logging: (sql, timing) => {
    // Log queries taking >100ms
    if (timing && timing > 100) {
      logger.warn('[DB] Slow query detected', {
        sql: sql,
        duration: timing,
        unit: 'ms',
      });
    }
  },
  benchmark: true, // Enable query timing
});
```

### Node.js Performance Profiling

```bash
# CPU profiling
node --prof backend/dist/src/bot.js

# Generate flamegraph
node --prof-process isolate-*.log > profile.txt

# Memory profiling
node --inspect backend/dist/src/bot.js

# Open Chrome DevTools → Memory → Take heap snapshot
```

---

## Load Testing

### Artillery (HTTP Load Testing)

**Install:**

```bash
npm install --save-dev artillery
```

**Load Test Configuration:**

```yaml
# artillery-config.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10 # 10 requests per second
      name: 'Warm up'
    - duration: 120
      arrivalRate: 50 # 50 requests per second
      name: 'Sustained load'
    - duration: 60
      arrivalRate: 100 # 100 requests per second
      name: 'Peak load'

scenarios:
  - name: 'Get tasks'
    flow:
      - get:
          url: '/api/tasks'
          headers:
            Authorization: 'Basic {{ base64(username:password) }}'
          capture:
            - json: '$.data[0].id'
              as: 'taskId'
      - think: 1 # Wait 1 second
      - get:
          url: '/api/tasks/{{ taskId }}'
          headers:
            Authorization: 'Basic {{ base64(username:password) }}'
```

**Run Load Test:**

```bash
# Run load test
artillery run artillery-config.yml

# Output:
# Summary report:
#   scenarios launched: 10800
#   scenarios completed: 10800
#   requests completed: 21600
#   mean response time: 45 ms
#   p95 response time: 120 ms
#   p99 response time: 250 ms
#   errors: 0 (0%)
```

### k6 (Advanced Load Testing)

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 10 }, // Ramp up to 10 users
    { duration: '3m', target: 50 }, // Stay at 50 users
    { duration: '1m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'], // Error rate < 1%
  },
};

export default function () {
  const auth = __ENV.BASIC_AUTH; // username:password (base64)

  const res = http.get('http://localhost:3000/api/tasks', {
    headers: { Authorization: `Basic ${auth}` },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**Run k6:**

```bash
k6 run --env BASIC_AUTH=$(echo -n "user:pass" | base64) load-test.js
```

---

## Performance Budgets

### Metrics to Track

**Backend Performance:**

| Metric                    | Target | Critical |
| ------------------------- | ------ | -------- |
| API response time (p95)   | <200ms | <500ms   |
| Database query time (p95) | <50ms  | <200ms   |
| Memory usage              | <256MB | <512MB   |
| CPU usage                 | <50%   | <80%     |

**Frontend Performance:**

| Metric                         | Target | Critical |
| ------------------------------ | ------ | -------- |
| First Contentful Paint (FCP)   | <1.5s  | <3s      |
| Largest Contentful Paint (LCP) | <2.5s  | <4s      |
| Time to Interactive (TTI)      | <3s    | <5s      |
| Total bundle size              | <300KB | <500KB   |

**Discord Bot Performance:**

| Metric                | Target | Critical |
| --------------------- | ------ | -------- |
| Command response time | <1s    | <3s      |
| Memory usage          | <128MB | <256MB   |
| Gateway latency       | <100ms | <300ms   |

---

## Optimization Checklist

### Backend Optimization

- [ ] **Database**
  - [ ] Indexes created for common queries (discordUserId, completed, dueDate)
  - [ ] Connection pool configured (max=20, min=5)
  - [ ] Pagination implemented (limit=20)
  - [ ] N+1 queries eliminated (eager loading)
  - [ ] VACUUM ANALYZE scheduled (weekly)

- [ ] **API**
  - [ ] Response compression enabled (gzip)
  - [ ] Cache-Control headers configured
  - [ ] ETag support enabled
  - [ ] Parallel requests used (Promise.all)
  - [ ] Rate limiting configured

- [ ] **Caching**
  - [ ] In-memory cache implemented (NodeCache or Redis)
  - [ ] Cache invalidation on updates
  - [ ] Cache TTL configured (10 minutes)

### Frontend Optimization

- [ ] **Bundle Size**
  - [ ] Code splitting implemented (dynamic imports)
  - [ ] Tree shaking enabled
  - [ ] Unused dependencies removed
  - [ ] Bundle analyzer run (npm run analyze)

- [ ] **Images**
  - [ ] Next.js Image component used
  - [ ] Lazy loading enabled
  - [ ] WebP/AVIF formats used
  - [ ] Image quality optimized (75%)

- [ ] **Caching**
  - [ ] Service worker installed
  - [ ] Static assets cached
  - [ ] Cache-first strategy for static assets
  - [ ] Network-first strategy for dynamic data

- [ ] **Performance**
  - [ ] React.memo for expensive components
  - [ ] useMemo for expensive calculations
  - [ ] Virtual scrolling for long lists (1000+ items)

### Discord Bot Optimization

- [ ] **Commands**
  - [ ] Slow commands deferred (>3 seconds)
  - [ ] Batch operations used (single message vs multiple)
  - [ ] Embeds optimized (minimal size)

- [ ] **Rate Limiting**
  - [ ] Rate limit event handler configured
  - [ ] Command queue for bulk operations

- [ ] **Caching**
  - [ ] Guild data cached
  - [ ] User data cached
  - [ ] Cache expiration configured (1 hour)

### Monitoring

- [ ] Performance logging enabled (Winston)
- [ ] Slow query logging enabled (>100ms)
- [ ] Slow request logging enabled (>1 second)
- [ ] Load testing performed (Artillery or k6)

---

## Related Documentation

- **[Security Best Practices](security-best-practices.md)** - Rate limiting, input validation
- **[Monitoring and Logging](monitoring-and-logging.md)** - Winston logger, performance metrics
- **[Database Schema](../architecture/database-schema.md)** - Table structure, relationships
- **[Architecture Overview](../architecture/overview.md)** - System design, deployment

---

## External Resources

- **PostgreSQL Performance:** [postgresql.org/docs/current/performance-tips.html](https://www.postgresql.org/docs/current/performance-tips.html)
- **Next.js Performance:** [nextjs.org/docs/advanced-features/measuring-performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- **Web Vitals:** [web.dev/vitals/](https://web.dev/vitals/)
- **Discord.js Performance:** [discordjs.guide/improving-dev-experience/best-practices.html](https://discordjs.guide/improving-dev-experience/best-practices.html)

---

**Last Updated** 2026-01-12
**Version:** 2.0.0
**Maintained by:** Bwaincell Development Team
