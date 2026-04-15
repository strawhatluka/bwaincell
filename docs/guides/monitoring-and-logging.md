# Monitoring and Logging

Comprehensive guide for monitoring and logging in Bwaincell - ensuring observability, debugging, and production readiness.

> **Supabase update (2026-04-15):** In addition to the Winston-based Express logging described below, Bwaincell now has two new log surfaces:
>
> **Supabase Logs Dashboard** — The self-hosted Supabase instance on the Pi exposes a Studio UI at `http://<pi-host>:54323` (default). Database logs, Auth logs, Storage logs, and Realtime logs are browsable from there.
>
> **PostgREST Logs** — Every Supabase query from `@supabase/supabase-js` goes through PostgREST. Query logs show up in the Supabase Dashboard's "Logs → API" panel and are invaluable when debugging RLS or unexpected 4xx responses.
>
> **Retention:** Self-hosted Supabase retains logs per its own Postgres log-retention settings; tune via `supabase/config.toml` or Postgres parameters. Winston backend logs retain per the existing volume-rotation policy.
>
> **Recommended alerting additions:**
> - Alarm on `supabase-js` errors emitted via Winston (`logger.error('Supabase connection failed', ...)` in `supabase/supabase.ts`).
> - Alarm on `sunsetService` / `eventsService` cron failures.
> - Alarm on Gemini quota errors (`geminiService.ts`).

## Table of Contents

1. [Winston Logger Configuration](#winston-logger-configuration)
2. [Log Levels](#log-levels)
3. [Structured Logging](#structured-logging)
4. [Log Aggregation](#log-aggregation)
5. [Application Monitoring](#application-monitoring)
6. [Database Monitoring](#database-monitoring)
7. [Discord Bot Monitoring](#discord-bot-monitoring)
8. [Alerting Strategies](#alerting-strategies)
9. [Log Retention and Rotation](#log-retention-and-rotation)
10. [Debugging with Logs](#debugging-with-logs)

---

## Winston Logger Configuration

### Installation

```bash
# Already installed in Bwaincell monorepo
npm install winston
```

### Shared Logger Configuration

**File:** `shared/utils/logger.ts`

```typescript
import winston from 'winston';

/**
 * Winston logger configuration for Bwaincell
 * Provides structured logging with JSON format
 */
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',

  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }), // Capture error stack traces
    winston.format.splat(), // String interpolation
    winston.format.json() // JSON format for machine parsing
  ),

  defaultMeta: {
    service: 'bwaincell',
    environment: process.env.NODE_ENV || 'development',
  },

  transports: [
    // Console output (development)
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),

    // Error log file (all environments)
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5, // Keep 5 rotated files
    }),

    // Combined log file (all levels)
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10, // Keep 10 rotated files
    }),
  ],

  // Handle exceptions and rejections
  exceptionHandlers: [new winston.transports.File({ filename: 'logs/exceptions.log' })],
  rejectionHandlers: [new winston.transports.File({ filename: 'logs/rejections.log' })],
});

// Stream for Morgan (HTTP request logging)
export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};
```

### Usage in Backend

```typescript
// backend/src/bot.ts
import { logger } from '@shared/utils/logger';

logger.info('[BOT] Starting Discord bot', {
  nodeVersion: process.version,
  discordVersion: require('discord.js').version,
});

client.on('ready', () => {
  logger.info('[BOT] Bot is ready', {
    username: client.user?.tag,
    guildCount: client.guilds.cache.size,
  });
});

client.on('error', (error) => {
  logger.error('[BOT] Discord client error', {
    error: error.message,
    stack: error.stack,
  });
});
```

### Usage in API

```typescript
// backend/src/api/server.ts
import { logger, morganStream } from '@shared/utils/logger';
import morgan from 'morgan';

// HTTP request logging
app.use(morgan('combined', { stream: morganStream }));

// Application logging
logger.info('[API] Express server starting', {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV,
});

app.listen(port, () => {
  logger.info('[API] Server is running', {
    port: port,
    url: `http://localhost:${port}`,
  });
});
```

---

## Log Levels

### Winston Log Levels

Winston uses npm log levels (highest to lowest priority):

```typescript
{
  error: 0,    // Application errors, exceptions
  warn: 1,     // Warnings, non-critical issues
  info: 2,     // General information, events
  http: 3,     // HTTP requests (Morgan)
  verbose: 4,  // Verbose information
  debug: 5,    // Debugging information
  silly: 6,    // Very detailed debugging
}
```

### When to Use Each Level

#### error - Critical Issues

**When to use:**

- Application crashes
- Unhandled exceptions
- Database connection failures
- External API failures
- Security violations

**Example:**

```typescript
try {
  await sequelize.authenticate();
} catch (error) {
  logger.error('[DB] Database connection failed', {
    error: error.message,
    stack: error.stack,
    databaseUrl: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':***@'), // Mask password
  });
  process.exit(1); // Exit on critical error
}
```

#### warn - Non-Critical Issues

**When to use:**

- Deprecated API usage
- Configuration warnings
- Performance degradation
- Rate limit warnings
- Invalid user input

**Example:**

```typescript
logger.warn('[AUTH] Failed login attempt', {
  username: username,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date().toISOString(),
});

if (slowQueryTime > 100) {
  logger.warn('[DB] Slow query detected', {
    sql: query,
    duration: slowQueryTime,
    threshold: 100,
  });
}
```

#### info - General Events

**When to use:**

- Application startup/shutdown
- Successful operations
- State changes
- User actions
- Scheduled tasks execution

**Example:**

```typescript
logger.info('[BOT] Command executed', {
  command: interaction.commandName,
  user: interaction.user.tag,
  guild: interaction.guild?.name,
  duration: Date.now() - startTime,
});

logger.info('[CRON] Reminder check completed', {
  remindersFound: reminders.length,
  remindersSent: sentCount,
  duration: Date.now() - startTime,
});
```

#### http - HTTP Requests

**When to use:**

- HTTP request logging (via Morgan)
- API endpoint access
- Response status codes

**Example:**

```typescript
// Automatically logged by Morgan middleware
// GET /api/tasks 200 45ms
// POST /api/tasks 201 120ms
```

#### debug - Debugging Information

**When to use:**

- Development debugging
- Variable values
- Control flow tracing
- Algorithm steps

**Example:**

```typescript
logger.debug('[AUTH] Validating JWT token', {
  token: token.substring(0, 20) + '...', // Truncate for security
  expiresIn: decoded.exp - Math.floor(Date.now() / 1000),
});

logger.debug('[CACHE] Cache lookup', {
  key: cacheKey,
  hit: !!cachedValue,
  ttl: cachedValue ? cache.getTtl(cacheKey) : null,
});
```

### Log Level Configuration

**Environment-Based:**

```typescript
// Development: Show all logs (debug level)
// Production: Show only important logs (info level)
const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || logLevel,
  // ...
});
```

**.env Configuration:**

```bash
# Override log level (optional)
LOG_LEVEL=debug  # development
# LOG_LEVEL=info  # production
# LOG_LEVEL=warn  # production (minimal logging)
# LOG_LEVEL=error  # production (errors only)
```

---

## Structured Logging

### JSON Format Benefits

**Why JSON?**

- Machine-readable (easy to parse)
- Searchable (grep, jq, log aggregation tools)
- Structured data (key-value pairs)
- Language-agnostic (any tool can read JSON)

**Example Log Entry:**

```json
{
  "level": "info",
  "message": "[AUTH] Authentication successful",
  "username": "strawhatluka",
  "path": "/api/tasks",
  "method": "GET",
  "duration": 45,
  "timestamp": "2026-01-11 12:00:00",
  "service": "bwaincell",
  "environment": "production"
}
```

### Metadata Best Practices

**Include Context:**

```typescript
// ✅ GOOD: Rich context
logger.info('[TASK] Task created', {
  taskId: task.id,
  title: task.title,
  userId: req.user.discordId,
  listId: task.listId,
  priority: task.priority,
  duration: Date.now() - startTime,
});

// ❌ BAD: Minimal context
logger.info('Task created');
```

**Avoid Sensitive Data:**

```typescript
// ❌ BAD: Logging passwords
logger.info('[AUTH] Login attempt', {
  username: username,
  password: password, // NEVER log passwords!
});

// ✅ GOOD: Mask sensitive data
logger.info('[AUTH] Login attempt', {
  username: username,
  passwordLength: password.length,
  ip: req.ip,
});

// ✅ GOOD: Mask database URLs
logger.info('[DB] Connecting to database', {
  url: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':***@'),
});
```

### Logging Patterns

**Entry/Exit Logging:**

```typescript
async function updateTask(taskId: string, updates: Partial<Task>) {
  const startTime = Date.now();

  logger.debug('[TASK] updateTask ENTRY', {
    taskId: taskId,
    updates: updates,
  });

  try {
    const task = await Task.findByPk(taskId);

    if (!task) {
      logger.warn('[TASK] Task not found', { taskId: taskId });
      throw new Error('Task not found');
    }

    await task.update(updates);

    logger.info('[TASK] Task updated', {
      taskId: taskId,
      updates: Object.keys(updates),
      duration: Date.now() - startTime,
    });

    return task;
  } catch (error) {
    logger.error('[TASK] updateTask ERROR', {
      taskId: taskId,
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime,
    });
    throw error;
  }
}
```

**Transaction Logging:**

```typescript
await sequelize.transaction(async (t) => {
  logger.info('[TRANSACTION] Starting transaction', {
    operation: 'bulkTaskUpdate',
    taskCount: tasks.length,
  });

  try {
    // Perform operations
    await Task.bulkCreate(tasks, { transaction: t });

    logger.info('[TRANSACTION] Transaction committed', {
      operation: 'bulkTaskUpdate',
      taskCount: tasks.length,
    });
  } catch (error) {
    logger.error('[TRANSACTION] Transaction rolled back', {
      operation: 'bulkTaskUpdate',
      error: error.message,
    });
    throw error;
  }
});
```

---

## Log Aggregation

### Local Log Files

**Log Directory Structure:**

```
logs/
├── combined.log       # All logs
├── error.log          # Error logs only
├── exceptions.log     # Unhandled exceptions
├── rejections.log     # Unhandled promise rejections
├── combined.log.1     # Rotated log (oldest)
├── combined.log.2
└── error.log.1
```

**Reading Logs:**

```bash
# Tail combined log (follow new entries)
tail -f logs/combined.log

# Search for errors
grep "ERROR" logs/combined.log

# Search for specific user
grep "discordId.*123456789" logs/combined.log

# Count errors in last hour
grep "$(date -d '1 hour ago' '+%Y-%m-%d %H:')" logs/error.log | wc -l
```

### JSON Log Parsing with jq

```bash
# Install jq (JSON processor)
# macOS: brew install jq
# Ubuntu: apt-get install jq

# Pretty print JSON logs
cat logs/combined.log | jq '.'

# Filter by log level
cat logs/combined.log | jq 'select(.level == "error")'

# Filter by timestamp (last hour)
cat logs/combined.log | jq 'select(.timestamp >= "2026-01-11 11:00:00")'

# Extract specific fields
cat logs/combined.log | jq '{level, message, duration}'

# Count logs by level
cat logs/combined.log | jq -s 'group_by(.level) | map({level: .[0].level, count: length})'
```

### Docker Logs

```bash
# View backend logs
docker compose logs -f backend

# View last 100 lines
docker compose logs --tail=100 backend

# View logs since timestamp
docker compose logs --since="2026-01-11T12:00:00" backend

# Follow multiple services
docker compose logs -f backend postgres

# Export logs to file
docker compose logs --no-color backend > backend-logs.txt
```

### External Log Aggregation (Production)

**Popular Tools:**

1. **ELK Stack (Elasticsearch, Logstash, Kibana)**
   - Self-hosted log aggregation
   - Powerful search and visualization
   - Resource-intensive

2. **Loki + Grafana**
   - Lightweight alternative to ELK
   - Designed for Kubernetes/Docker
   - Lower resource usage

3. **Cloud Services:**
   - **Logtail** (free tier available)
   - **Papertrail** (simple, easy setup)
   - **Datadog** (comprehensive monitoring)
   - **Splunk** (enterprise solution)

**Winston Transport for External Services:**

```typescript
// Example: Logtail integration
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';

const logtail = new Logtail(process.env.LOGTAIL_TOKEN);

export const logger = winston.createLogger({
  transports: [
    new LogtailTransport(logtail), // Send logs to Logtail
    // ... other transports
  ],
});
```

---

## Application Monitoring

### Health Check Endpoint

```typescript
// backend/src/api/routes/health.ts
import { Router } from 'express';
import { sequelize } from '../../database/connection';
import { logger } from '@shared/utils/logger';

const router = Router();

router.get('/health', async (req, res) => {
  const startTime = Date.now();

  try {
    // Check database connection
    await sequelize.authenticate();

    const health = {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: require('../../../package.json').version,
      database: 'connected',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB',
      },
      cpu: {
        usage: process.cpuUsage(),
      },
      responseTime: Date.now() - startTime,
    };

    logger.debug('[HEALTH] Health check passed', health);

    res.status(200).json(health);
  } catch (error) {
    logger.error('[HEALTH] Health check failed', {
      error: error.message,
      stack: error.stack,
    });

    res.status(503).json({
      status: 'unhealthy',
      error: 'Service unavailable',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
```

**Docker Health Check:**

```dockerfile
# backend/Dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### Uptime Monitoring

**Cron Job (Raspberry Pi):**

```bash
#!/bin/bash
# /home/pi/bwaincell/monitor.sh

# Check health endpoint
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)

if [ $HEALTH -ne 200 ]; then
  echo "Health check failed with status $HEALTH"
  # Send alert (email, Discord webhook, etc.)
  exit 1
fi

echo "Health check passed"
```

**Crontab:**

```bash
# Check health every 5 minutes
*/5 * * * * /home/pi/bwaincell/monitor.sh >> /home/pi/bwaincell/logs/monitor.log 2>&1
```

### Response Time Tracking

```typescript
// backend/src/api/middleware/performanceMonitor.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '@shared/utils/logger';

export function performanceMonitor(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('[PERF] Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: duration,
      unit: 'ms',
      userAgent: req.headers['user-agent'],
    });

    // Alert on slow requests (>1 second)
    if (duration > 1000) {
      logger.warn('[PERF] Slow request detected', {
        method: req.method,
        path: req.path,
        duration: duration,
        threshold: 1000,
      });
    }
  });

  next();
}

// Apply to all routes
app.use(performanceMonitor);
```

### Error Rate Monitoring

```typescript
// Track error rates over time
let errorCount = 0;
let requestCount = 0;

setInterval(() => {
  const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;

  logger.info('[METRICS] Error rate', {
    errorCount: errorCount,
    requestCount: requestCount,
    errorRate: errorRate.toFixed(2) + '%',
  });

  // Alert if error rate > 5%
  if (errorRate > 5) {
    logger.error('[METRICS] High error rate detected', {
      errorRate: errorRate.toFixed(2) + '%',
      threshold: '5%',
    });
  }

  // Reset counters
  errorCount = 0;
  requestCount = 0;
}, 60000); // Every minute
```

---

## Database Monitoring

### Sequelize Query Logging

```typescript
// backend/database/connection.ts
import { Sequelize } from 'sequelize';
import { logger } from '@shared/utils/logger';

const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',

  logging: (sql: string, timing?: number) => {
    // Log all queries in development
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[DB] Query executed', {
        sql: sql,
        duration: timing,
        unit: 'ms',
      });
    }

    // Log slow queries in production (>100ms)
    if (timing && timing > 100) {
      logger.warn('[DB] Slow query detected', {
        sql: sql,
        duration: timing,
        threshold: 100,
        unit: 'ms',
      });
    }
  },

  benchmark: true, // Enable query timing
});
```

### Connection Pool Monitoring

```typescript
// Monitor connection pool usage
setInterval(() => {
  const pool = sequelize.connectionManager.pool;

  logger.info('[DB] Connection pool status', {
    size: pool.size, // Current connections
    available: pool.available, // Available connections
    waiting: pool.pending, // Waiting requests
    max: pool.max, // Max connections
    min: pool.min, // Min connections
  });

  // Alert if pool is exhausted
  if (pool.available === 0 && pool.pending > 0) {
    logger.warn('[DB] Connection pool exhausted', {
      waiting: pool.pending,
      maxConnections: pool.max,
    });
  }
}, 60000); // Every minute
```

### PostgreSQL Monitoring

```sql
-- Active queries
SELECT pid, age(clock_timestamp(), query_start), usename, query
FROM pg_stat_activity
WHERE query != '<IDLE>' AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY query_start DESC;

-- Long-running queries (>1 minute)
SELECT pid, age(clock_timestamp(), query_start), usename, query
FROM pg_stat_activity
WHERE query_start < NOW() - INTERVAL '1 minute'
  AND state = 'active';

-- Connection count by user
SELECT usename, COUNT(*) as connection_count
FROM pg_stat_activity
GROUP BY usename
ORDER BY connection_count DESC;

-- Database size
SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname))
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;

-- Table sizes
SELECT relname AS table_name,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

**Monitoring Script:**

```bash
#!/bin/bash
# /home/pi/bwaincell/db-monitor.sh

docker compose exec postgres psql -U bwaincell -d bwaincell -c "
SELECT COUNT(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';
" >> /home/pi/bwaincell/logs/db-monitor.log
```

---

## Discord Bot Monitoring

### Bot Event Logging

```typescript
// backend/src/bot.ts
import { Client, Events } from 'discord.js';
import { logger } from '@shared/utils/logger';

const client = new Client({
  /* ... */
});

// Bot ready
client.on(Events.ClientReady, () => {
  logger.info('[BOT] Bot is ready', {
    username: client.user?.tag,
    id: client.user?.id,
    guildCount: client.guilds.cache.size,
    userCount: client.users.cache.size,
  });
});

// Command execution
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const startTime = Date.now();

  logger.info('[BOT] Command received', {
    command: interaction.commandName,
    user: interaction.user.tag,
    userId: interaction.user.id,
    guild: interaction.guild?.name,
    guildId: interaction.guild?.id,
  });

  try {
    await command.execute(interaction);

    logger.info('[BOT] Command executed successfully', {
      command: interaction.commandName,
      user: interaction.user.tag,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('[BOT] Command execution failed', {
      command: interaction.commandName,
      user: interaction.user.tag,
      error: error.message,
      stack: error.stack,
    });
  }
});

// Error handling
client.on(Events.Error, (error) => {
  logger.error('[BOT] Discord client error', {
    error: error.message,
    stack: error.stack,
  });
});

// Warning handling
client.on(Events.Warn, (warning) => {
  logger.warn('[BOT] Discord client warning', {
    warning: warning,
  });
});

// Rate limit warnings
client.on(Events.RateLimit, (rateLimitData) => {
  logger.warn('[BOT] Rate limit hit', {
    timeout: rateLimitData.timeout,
    limit: rateLimitData.limit,
    method: rateLimitData.method,
    path: rateLimitData.path,
    route: rateLimitData.route,
  });
});

// Shard disconnect
client.on(Events.ShardDisconnect, (event, shardId) => {
  logger.error('[BOT] Shard disconnected', {
    shardId: shardId,
    code: event.code,
    reason: event.reason,
  });
});

// Shard reconnect
client.on(Events.ShardReconnecting, (shardId) => {
  logger.info('[BOT] Shard reconnecting', {
    shardId: shardId,
  });
});
```

### Command Usage Metrics

```typescript
// Track command usage
const commandStats = new Map<string, number>();

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.commandName;

  // Increment counter
  commandStats.set(command, (commandStats.get(command) || 0) + 1);
});

// Log statistics every hour
setInterval(
  () => {
    const stats = Array.from(commandStats.entries())
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count);

    logger.info('[BOT] Command usage statistics', {
      totalCommands: stats.reduce((sum, s) => sum + s.count, 0),
      commandBreakdown: stats,
    });

    // Reset counters
    commandStats.clear();
  },
  60 * 60 * 1000
); // Every hour
```

### Gateway Latency Monitoring

```typescript
// Monitor WebSocket latency
setInterval(() => {
  const ping = client.ws.ping;

  logger.info('[BOT] Gateway latency', {
    ping: ping,
    unit: 'ms',
  });

  // Alert if latency > 300ms
  if (ping > 300) {
    logger.warn('[BOT] High gateway latency', {
      ping: ping,
      threshold: 300,
    });
  }
}, 60000); // Every minute
```

---

## Alerting Strategies

### Email Alerts

```typescript
// backend/src/utils/alerting.ts
import nodemailer from 'nodemailer';
import { logger } from '@shared/utils/logger';

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.ALERT_EMAIL,
    pass: process.env.ALERT_EMAIL_PASSWORD,
  },
});

export async function sendAlert(subject: string, message: string) {
  try {
    await transporter.sendMail({
      from: process.env.ALERT_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: `[Bwaincell Alert] ${subject}`,
      text: message,
    });

    logger.info('[ALERT] Email alert sent', { subject });
  } catch (error) {
    logger.error('[ALERT] Failed to send email alert', {
      subject: subject,
      error: error.message,
    });
  }
}

// Usage
if (errorRate > 10) {
  sendAlert('High Error Rate', `Error rate: ${errorRate}% (threshold: 10%)`);
}
```

### Discord Webhook Alerts

```typescript
// backend/src/utils/alerting.ts
import axios from 'axios';

export async function sendDiscordAlert(message: string) {
  try {
    await axios.post(process.env.DISCORD_WEBHOOK_URL!, {
      content: `🚨 **Bwaincell Alert**\n${message}`,
      username: 'Bwaincell Monitoring',
    });

    logger.info('[ALERT] Discord webhook sent');
  } catch (error) {
    logger.error('[ALERT] Failed to send Discord webhook', {
      error: error.message,
    });
  }
}

// Usage
if (databaseConnectionFailed) {
  sendDiscordAlert('Database connection failed! Service may be down.');
}
```

### Alert Thresholds

```typescript
// backend/src/monitoring/thresholds.ts
export const ALERT_THRESHOLDS = {
  // Response time thresholds
  slowRequestMs: 1000,
  criticalRequestMs: 5000,

  // Error rate thresholds
  warningErrorRate: 5, // 5%
  criticalErrorRate: 10, // 10%

  // Database thresholds
  slowQueryMs: 100,
  criticalQueryMs: 500,

  // Memory thresholds
  warningMemoryMB: 400,
  criticalMemoryMB: 480,

  // Gateway latency thresholds
  warningLatencyMs: 200,
  criticalLatencyMs: 500,
};
```

---

## Log Retention and Rotation

### Winston File Rotation

```typescript
// shared/utils/logger.ts
export const logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB per file
      maxFiles: 5, // Keep 5 rotated files (50MB total)
      tailable: true, // Latest logs in base file
    }),

    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB per file
      maxFiles: 10, // Keep 10 rotated files (100MB total)
      tailable: true,
    }),
  ],
});
```

### Manual Log Rotation (logrotate)

```bash
# /etc/logrotate.d/bwaincell
/home/pi/bwaincell/logs/*.log {
    daily                # Rotate daily
    missingok            # Ignore missing files
    rotate 14            # Keep 14 days of logs
    compress             # Compress rotated logs
    delaycompress        # Compress on next rotation (not immediately)
    notifempty           # Don't rotate empty files
    create 0640 pi pi    # Create new log files with these permissions
    sharedscripts
    postrotate
        docker compose -f /home/pi/bwaincell/docker-compose.yml restart backend
    endscript
}
```

### Log Cleanup Script

```bash
#!/bin/bash
# /home/pi/bwaincell/cleanup-logs.sh

LOG_DIR="/home/pi/bwaincell/logs"

# Delete logs older than 30 days
find "$LOG_DIR" -name "*.log.*" -mtime +30 -delete

# Delete compressed logs older than 60 days
find "$LOG_DIR" -name "*.log.*.gz" -mtime +60 -delete

echo "Log cleanup completed"
```

**Crontab:**

```bash
# Run log cleanup weekly (Sunday 3 AM)
0 3 * * 0 /home/pi/bwaincell/cleanup-logs.sh
```

---

## Debugging with Logs

### Log Searching Techniques

**Find Authentication Failures:**

```bash
grep "AUTH.*Invalid credentials" logs/combined.log | tail -n 20
```

**Find Slow Queries:**

```bash
grep "Slow query detected" logs/combined.log | jq '{sql: .sql, duration: .duration}'
```

**Find Errors for Specific User:**

```bash
grep "discordId.*123456789" logs/error.log
```

**Count Errors by Type:**

```bash
cat logs/error.log | jq -r '.error' | sort | uniq -c | sort -rn
```

### Debugging Workflows

**1. Identify the Problem:**

```bash
# Check recent errors
tail -n 50 logs/error.log

# Check health endpoint
curl http://localhost:3000/health
```

**2. Find Related Logs:**

```bash
# Search for transaction ID or user ID
grep "transactionId.*abc123" logs/combined.log
```

**3. Analyze Timeline:**

```bash
# Show logs around specific time
grep "2026-01-11 12:3[0-9]:" logs/combined.log
```

**4. Check Performance:**

```bash
# Find slow operations
grep "duration.*[0-9]{4,}" logs/combined.log | tail -n 20
```

### Correlation IDs

```typescript
// Add correlation ID to all logs for a request
import { v4 as uuidv4 } from 'uuid';

export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.correlationId = uuidv4();

  // Attach to all logs in this request
  logger.defaultMeta.correlationId = req.correlationId;

  res.on('finish', () => {
    delete logger.defaultMeta.correlationId;
  });

  next();
}

// All logs will include correlationId
logger.info('[API] Request received', {
  path: req.path,
  // correlationId: "abc-123-def" (automatically included)
});
```

---

## Related Documentation

- **[Security Best Practices](security-best-practices.md)** - Security logging, authentication failures
- **[Performance Optimization](performance-optimization.md)** - Performance logging, slow queries
- **[Troubleshooting](troubleshooting.md)** - Using logs for debugging
- **[Architecture Overview](../architecture/overview.md)** - System architecture

---

## External Resources

- **Winston Documentation:** [github.com/winstonjs/winston](https://github.com/winstonjs/winston)
- **jq Manual:** [stedolan.github.io/jq/manual/](https://stedolan.github.io/jq/manual/)
- **Docker Logging:** [docs.docker.com/config/containers/logging/](https://docs.docker.com/config/containers/logging/)
- **PostgreSQL Monitoring:** [postgresql.org/docs/current/monitoring-stats.html](https://www.postgresql.org/docs/current/monitoring-stats.html)

---

**Last Updated** 2026-01-12
**Version:** 2.0.0
**Maintained by:** Bwaincell Development Team
