# Troubleshooting Guide

**Version:** 2.1.2
**Last Updated:** 2026-04-15

> **Supabase update (2026-04-15):** Key troubleshooting entries for the current stack.
>
> **"SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ... environment variables are required"** — Thrown by `supabase/supabase.ts` on the first query. Set both in `.env` (local) or in your deployment environment. Service-role or anon key is accepted; service-role is preferred server-side.
>
> **Supabase local stack won't start** — `npm run supabase:status`. If Docker is not running, start Docker Desktop. If ports 54321–54324 are in use, stop the conflicting process. `npm run supabase:stop` then `npm run supabase:start` clears a hung stack.
>
> **Migrations out of sync** — `npm run supabase:reset` locally replays `init.sql` + all migrations from scratch. Never edit an already-applied migration; add a new forward migration instead.
>
> **RLS denying reads** — We currently do not ship RLS policies; if you add them and the backend starts returning zero rows with the anon key, check `auth.jwt() ->> 'guild_id'` matches the row's `guild_id` and/or test with the service-role key to confirm it's an RLS issue.
>
> **Service-role vs anon key mismatch** — If inserts succeed from Discord but fail from the PWA, you're likely using the anon key without matching RLS policies in place. Either use the service-role key on the server-side API route or add the RLS policy.
>
> **Recipe scraper fails on a URL** — `backend/utils/recipeScraper.ts`. Check logs; many sites block scraping. Fallback: use `/recipe add` with manual entry.
>
> **Gemini errors** — `GEMINI_API_KEY` missing / quota exhausted / network issue. Recipe ingestion will store the raw ingredient text without normalization. `/random date` and AI shopping-list will fail outright.
>
> **Sunset announcement didn't fire** — Check `sunset_configs.is_enabled`, `channel_id` validity, bot channel permissions, and that the Pi was online at the computed trigger time (`sunset - advance_minutes`).
> **Last Updated** 2026-01-12

Comprehensive troubleshooting guide for common issues in Bwaincell's Discord bot, database, authentication, API, frontend, and deployment.

## Quick Diagnostics

Before diving into specific issues, run these quick checks:

```bash
# Check all services are running
npm run dev

# Check backend logs
docker logs bwaincell-bot

# Check database connection
npm run db:test --workspace=backend

# Check environment variables
npm run env:check
```

---

## 1. Discord Bot Issues

### Issue 1.1: Bot Not Responding to Commands

**Symptoms:**

- Bot appears online but doesn't respond to slash commands
- No error messages in Discord
- Commands don't autocomplete when typing `/`

**Diagnosis:**

```bash
# Check bot is logged in
docker logs bwaincell-bot | grep "Bot logged in"

# Verify slash commands are registered
npm run deploy --workspace=backend

# Check for interaction errors
docker logs bwaincell-bot | grep "interactionCreate"
```

**Solution:**

1. Deploy slash commands to Discord:
   ```bash
   npm run deploy --workspace=backend
   ```
2. Verify BOT_TOKEN in .env is correct
3. Ensure bot has required permissions in Discord server:
   - Send Messages
   - Use Slash Commands
   - Embed Links
   - Read Message History
4. Check bot status at [Discord Developer Portal](https://discord.com/developers/applications)

**Prevention:**

- Always run `npm run deploy` after updating command definitions
- Use `GUILD_ID` in .env for faster testing (guild commands register instantly)
- Verify bot permissions before adding to new servers

---

### Issue 1.2: "Unknown Interaction" Errors

**Symptoms:**

- Discord shows "This interaction failed" message
- Backend logs show `Error code 10062: Unknown interaction`
- Commands work inconsistently

**Diagnosis:**

```bash
# Check for duplicate interaction processing
docker logs bwaincell-bot | grep "Duplicate interaction"

# Check interaction acknowledgment timing
docker logs bwaincell-bot | grep "deferred"
```

**Solution:**

1. Issue is usually caused by slow interaction acknowledgment
2. Backend should defer within 3 seconds (current implementation: <100ms)
3. Check logs for specific command that's timing out:
   ```bash
   docker logs bwaincell-bot | grep "Unknown interaction" -B 5
   ```
4. If specific command is slow, optimize database queries or add pagination

**Code Fix (if needed):**

```typescript
// In backend/src/bot.ts - ensure immediate deferral
if (!interaction.replied && !interaction.deferred) {
  if (interaction.isButton()) {
    await interaction.deferUpdate();
  } else {
    await interaction.deferReply();
  }
}
```

**Prevention:**

- Always defer interactions immediately (within first 3 lines of handler)
- Use pagination for commands returning large datasets
- Avoid expensive computations before deferral

---

### Issue 1.3: Commands Loading Incorrect Data

**Symptoms:**

- Task/list/note commands show another user's data
- Data appears mixed between users
- Commands return empty results despite data existing

**Diagnosis:**

```bash
# Check user_id and guild_id filtering
psql -U bwaincell -d bwaincell -c "SELECT user_id, guild_id, COUNT(*) FROM tasks GROUP BY user_id, guild_id;"

# Check environment variable mapping
grep "DISCORD_ID\|GUILD_ID" .env
```

**Solution:**

1. Verify correct user_id/guild_id filtering in database queries
2. Check environment variables map emails correctly to Discord IDs:
   ```bash
   # .env should contain:
   USER1_EMAIL=user@gmail.com
   USER1_DISCORD_ID=123456789
   GUILD_ID=987654321
   ```
3. Database models now filter by **guild_id only** (shared household feature - see WO-015)
4. If you need per-user isolation, modify models to filter by `user_id AND guild_id`

**Prevention:**

- Always include guild_id in WHERE clauses
- Use middleware to inject user context into requests
- Test commands with multiple users before deploying

---

### Issue 1.4: Button Interactions Not Working

**Symptoms:**

- Clicking buttons shows "This interaction failed"
- Modal dialogs don't appear after button click
- Button handlers never execute

**Diagnosis:**

```bash
# Check button handler registration
docker logs bwaincell-bot | grep "handleButtonInteraction"

# Check for modal-opening buttons (should NOT defer)
grep "modal_" backend/utils/interactions.ts
```

**Solution:**

1. Buttons that open modals must NOT defer the interaction:

   ```typescript
   // backend/src/bot.ts
   const modalButtons = [
     'list_add_',
     'task_edit_',
     'task_add_new',
     'reminder_edit_',
     'reminder_create_',
   ];
   const opensModal = modalButtons.some((prefix) => interaction.customId.startsWith(prefix));

   if (!opensModal) {
     await interaction.deferUpdate(); // Only defer non-modal buttons
   }
   ```

2. Regular buttons should use `deferUpdate()` not `deferReply()`

**Prevention:**

- Document which buttons open modals in command files
- Use consistent naming: `*_edit_*`, `*_add_*`, `*_create_*` for modal buttons
- Test button interactions manually before deploying

---

### Issue 1.5: Task/Reminder Scheduler Not Running

**Symptoms:**

- Recurring reminders don't trigger
- Scheduled tasks never complete
- No scheduler logs in backend

**Diagnosis:**

```bash
# Check scheduler initialization
docker logs bwaincell-bot | grep "Scheduler initialized"

# Check active reminders in database
psql -U bwaincell -d bwaincell -c "SELECT * FROM reminders WHERE active = true;"

# Check next trigger times
psql -U bwaincell -d bwaincell -c "SELECT id, message, next_trigger FROM reminders WHERE active = true ORDER BY next_trigger;"
```

**Solution:**

1. Ensure scheduler is initialized in bot.ts:

   ```typescript
   await setupScheduler(); // Should be called in init()
   ```

2. Verify timezone configuration:

   ```bash
   # .env should contain
   TIMEZONE=America/Los_Angeles
   ```

3. Check node process timezone:

   ```typescript
   // backend/src/bot.ts (must be FIRST line)
   process.env.TZ = process.env.TIMEZONE || 'America/Los_Angeles';
   ```

4. Restart backend to apply timezone changes:
   ```bash
   npm run dev:backend
   ```

**Prevention:**

- Always set TIMEZONE before creating Date objects
- Use Luxon for timezone-aware date calculations
- Test reminders with near-future trigger times (e.g., 2 minutes ahead)

---

### Issue 1.6: Bot Crashes on Startup

**Symptoms:**

- Bot process exits immediately after starting
- Logs show "Environment validation failed"
- Error: "Missing required environment variables"

**Diagnosis:**

```bash
# Check environment variables
npm run env:check

# Check logs for specific missing variable
docker logs bwaincell-bot 2>&1 | head -20
```

**Solution:**

1. Copy .env.example to .env:

   ```bash
   cp .env.example .env
   ```

2. Fill in required variables:

   ```bash
   # Required for bot to start
   DISCORD_BOT_TOKEN=your_token_here
   DISCORD_CLIENT_ID=your_client_id
   DATABASE_URL=postgresql://user:password@localhost:5433/bwaincell
   JWT_SECRET=$(openssl rand -base64 32)
   ```

3. Restart backend:
   ```bash
   npm run dev:backend
   ```

**Prevention:**

- Use .env.example as template for new deployments
- Validate environment before deployment
- Store production secrets in secure vault (e.g., Fly.io secrets)

---

### Issue 1.7: Commands Not Loading/Registering

**Symptoms:**

- Logs show "Total commands loaded: 0"
- Some commands missing from Discord
- New commands don't appear after adding files

**Diagnosis:**

```bash
# Check commands directory exists
ls -la backend/commands/

# Check for TypeScript compilation errors
npm run build:backend 2>&1 | grep "error TS"

# Check command file structure
head -10 backend/commands/task.ts
```

**Solution:**

1. Ensure all command files export correct structure:

   ```typescript
   // backend/commands/example.ts
   export default {
     data: new SlashCommandBuilder().setName('example').setDescription('Example command'),
     async execute(interaction) {
       // Command logic
     },
   };
   ```

2. Verify files have correct extension (.ts in dev, .js in prod)

3. Redeploy commands:
   ```bash
   npm run deploy --workspace=backend
   ```

**Prevention:**

- Use template for new commands
- Test locally before deploying
- Check logs after adding new commands

---

### Issue 1.8: Duplicate Command Responses

**Symptoms:**

- Bot responds to commands multiple times
- Database entries are duplicated
- Logs show same interaction ID processed twice

**Diagnosis:**

```bash
# Check for duplicate interaction processing
docker logs bwaincell-bot | grep "Duplicate interaction detected"

# Check if multiple bot instances are running
ps aux | grep "node.*bot.ts"
docker ps | grep bwaincell
```

**Solution:**

1. Stop all bot instances:

   ```bash
   docker stop bwaincell-bot
   pkill -f "node.*bot.ts"
   ```

2. Start single instance:

   ```bash
   npm run dev:backend
   ```

3. Duplicate prevention is built-in (backend/src/bot.ts):
   ```typescript
   const processedInteractions = new Set();
   if (processedInteractions.has(interaction.id)) {
     return; // Skip duplicate
   }
   processedInteractions.add(interaction.id);
   ```

**Prevention:**

- Only run one bot instance per token
- Use PM2 or Docker for production (single instance management)
- Monitor process count in deployment scripts

---

### Issue 1.9: Autocomplete Not Working

**Symptoms:**

- Slash command options don't show autocomplete suggestions
- Autocomplete shows incorrect or empty results
- Backend logs show autocomplete errors

**Diagnosis:**

```bash
# Check if command has autocomplete handler
grep "autocomplete" backend/commands/note.ts

# Check autocomplete logs
docker logs bwaincell-bot | grep "autocomplete"
```

**Solution:**

1. Ensure command file exports autocomplete function:

   ```typescript
   export default {
     data: new SlashCommandBuilder().setName('note').addStringOption(
       (option) => option.setName('tag').setDescription('Note tag').setAutocomplete(true) // Enable autocomplete
     ),
     async execute(interaction) {
       /* ... */
     },
     async autocomplete(interaction) {
       const focusedValue = interaction.options.getFocused();
       const allTags = await Note.getAllTags(guildId);
       const filtered = allTags.filter((tag) =>
         tag.toLowerCase().includes(focusedValue.toLowerCase())
       );
       await interaction.respond(filtered.slice(0, 25).map((tag) => ({ name: tag, value: tag })));
     },
   };
   ```

2. Redeploy commands after adding autocomplete:
   ```bash
   npm run deploy --workspace=backend
   ```

**Prevention:**

- Always set `.setAutocomplete(true)` on options with autocomplete
- Limit autocomplete results to 25 items (Discord limit)
- Filter results based on user input

---

### Issue 1.10: Permission Denied Errors

**Symptoms:**

- Bot shows "Missing Permissions" error in Discord
- Commands fail with "I don't have permission to do that"
- Embeds or buttons don't appear

**Diagnosis:**

```bash
# Check bot permissions in Discord server settings
# Go to: Server Settings → Integrations → Bwaincell → Permissions

# Required permissions (binary):
# - Send Messages (2048)
# - Embed Links (16384)
# - Use Slash Commands (2147483648)
# - Read Message History (65536)
```

**Solution:**

1. Re-invite bot with correct permissions:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Select your application
   - OAuth2 → URL Generator
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: Send Messages, Embed Links, Use Slash Commands, Read Message History
   - Use generated URL to re-invite bot

2. Or update permissions in server settings:
   - Server Settings → Integrations → Bwaincell
   - Enable required permissions

**Prevention:**

- Use generated OAuth URL with all required permissions
- Document required permissions in README
- Check bot role in server role hierarchy

---

## 2. Database Issues

### Issue 2.1: Connection Refused / ECONNREFUSED

**Symptoms:**

- Backend fails to start with "ECONNREFUSED 127.0.0.1:5433"
- Logs show "Failed to authenticate database connection"
- Cannot connect to PostgreSQL

**Diagnosis:**

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5433

# Check Docker container (if using Docker)
docker ps | grep postgres

# Test connection manually
psql -h localhost -p 5433 -U bwaincell -d bwaincell
```

**Solution:**

1. Start PostgreSQL:

   ```bash
   # Docker
   docker-compose up -d postgres

   # Or native PostgreSQL
   sudo service postgresql start
   ```

2. Verify DATABASE_URL in .env:

   ```bash
   # Correct format:
   DATABASE_URL=postgresql://user:password@host:port/database

   # Example:
   DATABASE_URL=postgresql://bwaincell:mypassword@localhost:5433/bwaincell
   ```

3. Check firewall isn't blocking port 5433:

   ```bash
   # Linux
   sudo ufw allow 5433/tcp

   # Windows
   # Add inbound rule for port 5433 in Windows Firewall
   ```

**Prevention:**

- Use Docker Compose for consistent database setup
- Document DATABASE_URL format in README
- Add health check endpoint that tests database connection

---

### Issue 2.2: Authentication Failed for User

**Symptoms:**

- Error: "password authentication failed for user bwaincell"
- Cannot connect to database
- psql prompts for password but rejects it

**Diagnosis:**

```bash
# Check PostgreSQL user exists
psql -U postgres -c "\du"

# Check database exists
psql -U postgres -c "\l" | grep bwaincell

# Test connection with password
psql -h localhost -p 5433 -U bwaincell -d bwaincell
```

**Solution:**

1. Create database user:

   ```sql
   CREATE USER bwaincell WITH PASSWORD 'your_secure_password';
   ```

2. Create database:

   ```sql
   CREATE DATABASE bwaincell OWNER bwaincell;
   ```

3. Grant privileges:

   ```sql
   GRANT ALL PRIVILEGES ON DATABASE bwaincell TO bwaincell;
   ```

4. Update .env with correct password:
   ```bash
   DATABASE_URL=postgresql://bwaincell:your_secure_password@localhost:5433/bwaincell
   ```

**Prevention:**

- Use strong passwords for production
- Store credentials in environment variables, never in code
- Use pg_hba.conf for proper authentication methods

---

### Issue 2.3: Table Does Not Exist

**Symptoms:**

- Error: "relation 'tasks' does not exist"
- Fresh database has no tables
- Migration hasn't run

**Diagnosis:**

```bash
# Check if tables exist
psql -U bwaincell -d bwaincell -c "\dt"

# Check Sequelize sync logs
docker logs bwaincell-bot | grep "Database synced"
```

**Solution:**

1. Sequelize auto-syncs on startup (backend/src/bot.ts):

   ```typescript
   await sequelize.sync(); // Creates tables automatically
   ```

2. Force sync (⚠️ drops existing data):

   ```typescript
   await sequelize.sync({ force: true });
   ```

3. Or manually create tables:
   ```bash
   psql -U bwaincell -d bwaincell -f backend/database/schema.sql
   ```

**Prevention:**

- Use migrations for production databases
- Never use `force: true` in production
- Backup database before schema changes

---

### Issue 2.4: Slow Query Performance

**Symptoms:**

- Commands take >3 seconds to respond
- Database queries time out
- High CPU usage on PostgreSQL process

**Diagnosis:**

```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';

-- Check table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Solution:**

1. Add indexes on frequently queried columns:

   ```sql
   -- Index guild_id columns (used in WHERE clauses)
   CREATE INDEX idx_tasks_guild_id ON tasks(guild_id);
   CREATE INDEX idx_lists_guild_id ON lists(guild_id);
   CREATE INDEX idx_notes_guild_id ON notes(guild_id);
   CREATE INDEX idx_reminders_guild_id_active ON reminders(guild_id, active);

   -- Index next_trigger for scheduler
   CREATE INDEX idx_reminders_next_trigger ON reminders(next_trigger) WHERE active = true;
   ```

2. Use pagination for large result sets:

   ```typescript
   // Add limit/offset to queries
   const tasks = await Task.findAll({
     where: { guild_id: guildId },
     limit: 50,
     offset: page * 50,
     order: [['created_at', 'DESC']],
   });
   ```

3. Optimize N+1 queries with eager loading:

   ```typescript
   // Bad (N+1 query)
   const lists = await List.findAll();
   for (const list of lists) {
     const items = await list.getItems(); // Separate query for each list
   }

   // Good (single query)
   const lists = await List.findAll({
     include: [{ model: Item, as: 'items' }],
   });
   ```

**Prevention:**

- Add indexes during schema design
- Monitor query performance with pg_stat_statements
- Use EXPLAIN ANALYZE to understand query plans
- Implement pagination for all list endpoints

---

### Issue 2.5: Database Connection Pool Exhausted

**Symptoms:**

- Error: "Too many clients already"
- Backend hangs after several requests
- Database refuses new connections

**Diagnosis:**

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'bwaincell';

-- Check max connections
SHOW max_connections;

-- Check connection sources
SELECT client_addr, state, count(*)
FROM pg_stat_activity
WHERE datname = 'bwaincell'
GROUP BY client_addr, state;
```

**Solution:**

1. Configure Sequelize connection pool (backend/database/config.js):

   ```javascript
   module.exports = {
     production: {
       // ...
       pool: {
         max: 10, // Maximum connections
         min: 2, // Minimum connections
         acquire: 30000, // Max time to acquire connection
         idle: 10000, // Max idle time before release
       },
     },
   };
   ```

2. Ensure connections are properly closed:

   ```typescript
   // Close sequelize on shutdown
   process.on('SIGTERM', async () => {
     await sequelize.close();
     process.exit(0);
   });
   ```

3. Increase PostgreSQL max_connections:

   ```bash
   # postgresql.conf
   max_connections = 100

   # Restart PostgreSQL
   sudo service postgresql restart
   ```

**Prevention:**

- Configure connection pooling appropriately
- Monitor connection count
- Use connection poolers (PgBouncer) for high-traffic apps
- Close connections after use

---

### Issue 2.6: Data Type Mismatch Errors

**Symptoms:**

- Error: "column 'due_date' is of type date but expression is of type text"
- Insert/update operations fail
- Type coercion errors

**Diagnosis:**

```sql
-- Check column types
\d+ tasks

-- Check actual data types being inserted
-- Enable query logging temporarily
SET log_statement = 'all';
```

**Solution:**

1. Ensure Sequelize models match database schema:

   ```typescript
   // backend/database/models/Task.ts
   interface TaskAttributes {
     id: number;
     description: string;
     due_date: Date | null; // Match database DATE type
     completed: boolean;
     created_at: Date;
     completed_at: Date | null;
     user_id: string;
     guild_id: string;
   }
   ```

2. Convert types before insertion:

   ```typescript
   // Convert string to Date
   const dueDate = input.dueDate ? new Date(input.dueDate) : null;

   await Task.create({
     description: input.description,
     due_date: dueDate, // Pass Date object, not string
     guild_id: guildId,
   });
   ```

3. Use CAST in raw queries:
   ```sql
   INSERT INTO tasks (due_date) VALUES ('2026-01-15'::date);
   ```

**Prevention:**

- Define TypeScript interfaces matching database schema
- Use type validation libraries (Zod, Yup)
- Test with various input types
- Enable strict TypeScript mode

---

### Issue 2.7: Foreign Key Constraint Violations

**Symptoms:**

- Error: "violates foreign key constraint"
- Cannot delete records with dependencies
- Cascading deletes not working

**Diagnosis:**

```sql
-- Check foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

**Solution:**

1. Current schema has no foreign keys (by design - simpler architecture)

2. If adding foreign keys, define cascade behavior:

   ```sql
   ALTER TABLE tasks
   ADD CONSTRAINT fk_user
   FOREIGN KEY (user_id)
   REFERENCES users(discord_id)
   ON DELETE CASCADE;  -- Delete tasks when user deleted
   ```

3. Or handle deletions manually:
   ```typescript
   // Delete related records before parent
   await Task.destroy({ where: { user_id: userId } });
   await User.destroy({ where: { discord_id: userId } });
   ```

**Prevention:**

- Document foreign key relationships
- Use ON DELETE CASCADE where appropriate
- Test deletion scenarios
- Consider soft deletes for important data

---

### Issue 2.8: Migration Conflicts

**Symptoms:**

- Migration fails with "relation already exists"
- Schema out of sync with migrations
- Cannot run migrations

**Diagnosis:**

```bash
# Check migration status
npx sequelize-cli db:migrate:status

# Check actual schema
psql -U bwaincell -d bwaincell -c "\d+ tasks"
```

**Solution:**

1. Bwaincell uses auto-sync (no migrations by default):

   ```typescript
   // backend/src/bot.ts
   await sequelize.sync(); // Creates/updates tables automatically
   ```

2. To use migrations instead:

   ```bash
   # Generate migration
   npx sequelize-cli migration:generate --name add-budget-table

   # Run migrations
   npx sequelize-cli db:migrate

   # Rollback if needed
   npx sequelize-cli db:migrate:undo
   ```

3. Reset database (⚠️ deletes all data):
   ```bash
   psql -U postgres -c "DROP DATABASE bwaincell;"
   psql -U postgres -c "CREATE DATABASE bwaincell OWNER bwaincell;"
   npm run dev:backend  # Re-sync schema
   ```

**Prevention:**

- Use migrations for production
- Version control migration files
- Test migrations on staging before production
- Document migration process

---

### Issue 2.9: Transaction Deadlocks

**Symptoms:**

- Error: "deadlock detected"
- Concurrent updates fail
- Database operations hang

**Diagnosis:**

```sql
-- Check for locks
SELECT
  pg_stat_activity.pid,
  pg_stat_activity.query,
  pg_locks.mode,
  pg_locks.granted
FROM pg_stat_activity
JOIN pg_locks ON pg_stat_activity.pid = pg_locks.pid
WHERE NOT pg_locks.granted;

-- Check deadlock count
SELECT deadlocks FROM pg_stat_database WHERE datname = 'bwaincell';
```

**Solution:**

1. Use transactions with proper isolation:

   ```typescript
   const result = await sequelize.transaction(async (t) => {
     const task = await Task.findByPk(taskId, {
       transaction: t,
       lock: true, // Lock row for update
     });

     task.completed = true;
     await task.save({ transaction: t });

     return task;
   });
   ```

2. Order operations consistently to avoid circular waits:

   ```typescript
   // Always update tasks before lists (consistent order)
   await Task.update({
     /* ... */
   });
   await List.update({
     /* ... */
   });
   ```

3. Reduce transaction duration:

   ```typescript
   // Bad: Long transaction
   await sequelize.transaction(async (t) => {
     await expensiveApiCall(); // Don't do this in transaction
     await Task.create(
       {
         /* ... */
       },
       { transaction: t }
     );
   });

   // Good: Short transaction
   const data = await expensiveApiCall();
   await sequelize.transaction(async (t) => {
     await Task.create(data, { transaction: t });
   });
   ```

**Prevention:**

- Keep transactions short
- Lock rows explicitly when needed
- Use consistent operation ordering
- Monitor deadlock metrics

---

### Issue 2.10: Backup/Restore Failures

**Symptoms:**

- pg_dump fails with permission errors
- Restore creates schema but no data
- Backup files are corrupted

**Diagnosis:**

```bash
# Test backup
pg_dump -U bwaincell -d bwaincell -F c -f backup.dump

# Check backup file
file backup.dump

# Test restore (to test database)
pg_restore -U bwaincell -d bwaincell_test backup.dump
```

**Solution:**

1. Backup with proper permissions:

   ```bash
   # Full backup (custom format, compressed)
   pg_dump -U bwaincell -d bwaincell -F c -f "backup-$(date +%Y%m%d-%H%M%S).dump"

   # Plain SQL backup (human-readable)
   pg_dump -U bwaincell -d bwaincell -f "backup-$(date +%Y%m%d-%H%M%S).sql"
   ```

2. Restore from backup:

   ```bash
   # Create fresh database
   psql -U postgres -c "DROP DATABASE IF EXISTS bwaincell;"
   psql -U postgres -c "CREATE DATABASE bwaincell OWNER bwaincell;"

   # Restore from custom format
   pg_restore -U bwaincell -d bwaincell -c backup.dump

   # Or from SQL file
   psql -U bwaincell -d bwaincell -f backup.sql
   ```

3. Automate backups with cron:
   ```bash
   # Add to crontab
   0 2 * * * pg_dump -U bwaincell -d bwaincell -F c -f "/backups/bwaincell-$(date +\%Y\%m\%d).dump"
   ```

**Prevention:**

- Schedule automated backups
- Test restore process regularly
- Store backups off-site (S3, Backblaze)
- Document backup/restore procedures

---

## 3. Authentication Issues

### Issue 3.1: JWT Token Invalid/Expired

**Symptoms:**

- API returns 401 Unauthorized
- Frontend shows "Please log in again"
- Error: "jwt expired" or "invalid token"

**Diagnosis:**

```bash
# Check token expiration
node -e "console.log(JSON.parse(Buffer.from('YOUR_JWT_TOKEN'.split('.')[1], 'base64').toString()))"

# Check JWT_SECRET in .env
grep JWT_SECRET .env

# Check backend logs
docker logs bwaincell-bot | grep "JWT"
```

**Solution:**

1. Token expired (normal behavior):
   - Frontend should automatically refresh using refresh token
   - If refresh token also expired, user must re-login

2. Check token refresh logic (frontend/lib/api.ts):

   ```typescript
   // Should automatically refresh on 401
   if (response.status === 401) {
     const newToken = await refreshAccessToken();
     // Retry request with new token
   }
   ```

3. Generate new JWT_SECRET if compromised:
   ```bash
   openssl rand -base64 32
   # Update .env with new secret
   # All users must re-login
   ```

**Prevention:**

- Implement automatic token refresh
- Use appropriate expiry times (1 hour access, 7 days refresh)
- Store tokens securely (httpOnly cookies or secure storage)
- Monitor failed auth attempts

---

### Issue 3.2: Google OAuth Verification Failed

**Symptoms:**

- Error: "Invalid Google ID token"
- Login button doesn't work
- OAuth callback returns error

**Diagnosis:**

```bash
# Check Google OAuth credentials
grep "GOOGLE_CLIENT" .env

# Check OAuth redirect URIs in Google Cloud Console
# Should match: http://localhost:3010/api/auth/callback/google (dev)
#               https://bwaincell.sunny-stack.com/api/auth/callback/google (prod)

# Check backend logs
docker logs bwaincell-bot | grep "Google OAuth"
```

**Solution:**

1. Verify Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - APIs & Services → Credentials
   - Check Client ID and Secret match .env

2. Add authorized redirect URIs:

   ```
   Development: http://localhost:3010/api/auth/callback/google
   Production: https://bwaincell.sunny-stack.com/api/auth/callback/google
   ```

3. Ensure google-auth-library is properly configured:

   ```typescript
   // backend/src/api/middleware/oauth.ts
   const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

   const ticket = await client.verifyIdToken({
     idToken: token,
     audience: process.env.GOOGLE_CLIENT_ID,
   });
   ```

**Prevention:**

- Document OAuth setup in README
- Use environment-specific OAuth apps (dev vs prod)
- Test OAuth flow after deployment
- Monitor OAuth error rates

---

### Issue 3.3: User Email Not Mapped to Discord ID

**Symptoms:**

- Error: "User not found" after successful Google login
- Cannot map Google account to Discord user
- API returns 403 Forbidden

**Diagnosis:**

```bash
# Check user mapping in .env
grep "USER.*EMAIL\|USER.*DISCORD" .env

# Expected format:
# USER1_EMAIL=user@gmail.com
# USER1_DISCORD_ID=123456789
# USER2_EMAIL=other@gmail.com
# USER2_DISCORD_ID=987654321
```

**Solution:**

1. Add user mapping to .env:

   ```bash
   # Get Discord user ID:
   # Right-click user in Discord → Copy ID (requires Developer Mode enabled)

   USER1_EMAIL=your-email@gmail.com
   USER1_DISCORD_ID=123456789012345678
   GUILD_ID=987654321098765432
   ```

2. Restart backend to load new environment:

   ```bash
   npm run dev:backend
   ```

3. User must re-login after mapping is added

**Prevention:**

- Document user mapping process in README
- Create admin endpoint to add user mappings
- Consider database-backed user management
- Validate user mappings on startup

---

### Issue 3.4: CORS Errors on Login

**Symptoms:**

- Browser console shows "CORS policy: No 'Access-Control-Allow-Origin' header"
- Login requests fail with CORS error
- OPTIONS preflight requests fail

**Diagnosis:**

```bash
# Check CORS configuration
grep "CORS\|PWA_URL" backend/src/api/server.ts

# Test CORS with curl
curl -X OPTIONS http://localhost:3000/api/auth/google/verify \
  -H "Origin: http://localhost:3010" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

**Solution:**

1. Configure CORS in backend (backend/src/api/server.ts):

   ```typescript
   import cors from 'cors';

   app.use(
     cors({
       origin: [
         'http://localhost:3010', // Development
         'https://bwaincell.sunny-stack.com', // Production
       ],
       credentials: true,
       methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
       allowedHeaders: ['Content-Type', 'Authorization'],
     })
   );
   ```

2. Ensure PWA_URL environment variable is set:

   ```bash
   # .env
   PWA_URL=http://localhost:3010  # Dev
   # PWA_URL=https://bwaincell.sunny-stack.com  # Prod
   ```

3. Restart backend after CORS changes

**Prevention:**

- Configure CORS during initial setup
- Use environment variables for allowed origins
- Test CORS with frontend and API on different ports/domains
- Document CORS configuration

---

### Issue 3.5: Refresh Token Not Working

**Symptoms:**

- Access token expires but refresh fails
- User logged out unexpectedly
- Error: "Invalid refresh token"

**Diagnosis:**

```bash
# Check refresh token in database
psql -U bwaincell -d bwaincell -c "SELECT email, refresh_token FROM users WHERE email = 'user@gmail.com';"

# Check refresh endpoint logs
docker logs bwaincell-bot | grep "/api/auth/refresh"
```

**Solution:**

1. Ensure refresh tokens are stored in database:

   ```typescript
   // backend/src/api/routes/auth.ts
   await User.update({ refreshToken: newRefreshToken }, { where: { email: user.email } });
   ```

2. Implement refresh logic in frontend:

   ```typescript
   // frontend/lib/api.ts
   async function refreshAccessToken() {
     const refreshToken = localStorage.getItem('refreshToken');

     const response = await fetch('http://localhost:3000/api/auth/refresh', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ refreshToken }),
     });

     const { data } = await response.json();
     localStorage.setItem('accessToken', data.accessToken);
     return data.accessToken;
   }
   ```

3. Validate refresh token on backend:

   ```typescript
   // Verify refresh token exists in database
   const user = await User.findOne({
     where: { refreshToken: body.refreshToken },
   });

   if (!user) {
     return res.status(401).json({
       success: false,
       error: 'Invalid refresh token',
     });
   }
   ```

**Prevention:**

- Store refresh tokens securely (httpOnly cookies in production)
- Rotate refresh tokens on use
- Implement refresh token expiration
- Clear tokens on logout

---

### Issue 3.6: Session Persistence Issues

**Symptoms:**

- User logged out on page refresh
- Session lost after closing browser
- Must re-login frequently

**Diagnosis:**

```bash
# Check token storage method
# Open browser DevTools → Application → Local Storage

# Check cookie configuration (if using cookies)
# DevTools → Application → Cookies
```

**Solution:**

1. Current implementation uses localStorage (persists across browser sessions):

   ```typescript
   // frontend/lib/api.ts
   localStorage.setItem('accessToken', token);
   localStorage.setItem('refreshToken', refreshToken);
   ```

2. For production, use httpOnly cookies (more secure):

   ```typescript
   // backend/src/api/routes/auth.ts
   res.cookie('accessToken', token, {
     httpOnly: true,
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'strict',
     maxAge: 60 * 60 * 1000, // 1 hour
   });
   ```

3. Implement "Remember Me" functionality:
   ```typescript
   // Longer refresh token expiry if user opts in
   const refreshTokenExpiry = rememberMe ? '30d' : '7d';
   ```

**Prevention:**

- Use httpOnly cookies in production
- Implement proper token refresh
- Test session persistence across browser restarts
- Document session behavior

---

### Issue 3.7: Authorization Middleware Not Applied

**Symptoms:**

- Protected routes accessible without token
- Anyone can access API endpoints
- No 401 errors even with invalid tokens

**Diagnosis:**

```bash
# Test protected endpoint without token
curl http://localhost:3000/api/tasks

# Should return 401, if it returns data, auth is bypassed

# Check middleware order
grep "authenticateJWT\|app.use" backend/src/api/server.ts
```

**Solution:**

1. Ensure authentication middleware is applied to all routes:

   ```typescript
   // backend/src/api/server.ts
   import { authenticateJWT } from './middleware/auth';

   // Public routes (no auth)
   app.use('/health', healthRoutes);
   app.use('/api/auth', authRoutes);

   // Protected routes (require auth)
   app.use('/api/tasks', authenticateJWT, taskRoutes);
   app.use('/api/lists', authenticateJWT, listRoutes);
   app.use('/api/notes', authenticateJWT, noteRoutes);
   app.use('/api/reminders', authenticateJWT, reminderRoutes);
   ```

2. Verify JWT middleware implementation:

   ```typescript
   // backend/src/api/middleware/auth.ts
   export function authenticateJWT(req, res, next) {
     const authHeader = req.headers.authorization;

     if (!authHeader) {
       return res.status(401).json({
         success: false,
         error: 'No token provided',
       });
     }

     const token = authHeader.split(' ')[1];

     jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
       if (err) {
         return res.status(401).json({
           success: false,
           error: 'Invalid token',
         });
       }

       req.user = user;
       next();
     });
   }
   ```

**Prevention:**

- Apply auth middleware at router level, not route level
- Test protected routes without authentication
- Use middleware groups for different auth levels
- Document which routes require authentication

---

### Issue 3.8: Basic Auth Conflicts with JWT

**Symptoms:**

- API accepts both Basic Auth and JWT
- Confusion about which auth method to use
- Authorization header conflicts

**Diagnosis:**

```bash
# Check if both auth methods are implemented
grep "Basic\|Bearer" backend/src/api/middleware/auth.ts

# Test both methods
curl -u strawhatluka:password http://localhost:3000/api/tasks
curl -H "Authorization: Bearer token" http://localhost:3000/api/tasks
```

**Solution:**

1. Current implementation has BOTH auth methods:
   - Basic Auth: For legacy/testing (username:password)
   - JWT Auth: For production (OAuth + JWT tokens)

2. Choose one method per deployment:

   ```typescript
   // Development: Use Basic Auth for quick testing
   if (process.env.NODE_ENV === 'development') {
     app.use('/api', authenticateBasic);
   } else {
     // Production: Use JWT
     app.use('/api', authenticateJWT);
   }
   ```

3. Or support both but prioritize JWT:

   ```typescript
   function authenticateEither(req, res, next) {
     const authHeader = req.headers.authorization;

     if (authHeader.startsWith('Bearer ')) {
       return authenticateJWT(req, res, next);
     } else if (authHeader.startsWith('Basic ')) {
       return authenticateBasic(req, res, next);
     } else {
       return res.status(401).json({
         success: false,
         error: 'No valid authentication provided',
       });
     }
   }
   ```

**Prevention:**

- Document supported auth methods
- Use single auth method in production
- Deprecate legacy auth methods with warnings
- Version API if changing auth methods

---

## 4. API Issues

### Issue 4.1: 404 Not Found on Valid Endpoints

**Symptoms:**

- API returns 404 for documented endpoints
- Routes work locally but not in production
- Specific HTTP methods return 404

**Diagnosis:**

```bash
# Check registered routes
curl http://localhost:3000/api/tasks
curl -X POST http://localhost:3000/api/tasks

# Check backend logs
docker logs bwaincell-bot | grep "Route"

# List all registered routes
node -e "const app = require('./backend/src/api/server').default; console.log(app._router.stack.filter(r => r.route).map(r => r.route.path));"
```

**Solution:**

1. Verify routes are registered (backend/src/api/server.ts):

   ```typescript
   import taskRoutes from './routes/tasks';
   import listRoutes from './routes/lists';

   app.use('/api/tasks', authenticateJWT, taskRoutes);
   app.use('/api/lists', authenticateJWT, listRoutes);
   ```

2. Check route definitions (backend/src/api/routes/tasks.ts):

   ```typescript
   import express from 'express';
   const router = express.Router();

   router.get('/', async (req, res) => {
     /* ... */
   });
   router.post('/', async (req, res) => {
     /* ... */
   });

   export default router;
   ```

3. Ensure correct base path:

   ```typescript
   // ✅ Correct: /api/tasks/
   app.use('/api/tasks', taskRoutes);

   // ❌ Wrong: /tasks/ (missing /api prefix)
   app.use('/tasks', taskRoutes);
   ```

**Prevention:**

- Use consistent API base path
- Test all endpoints after adding routes
- Document API base URL
- Use route testing tools (Postman, Insomnia)

---

### Issue 4.2: Request Body Empty/Undefined

**Symptoms:**

- req.body is undefined or {}
- POST/PATCH requests fail
- Error: "Missing required field"

**Diagnosis:**

```bash
# Check Content-Type header
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{"text":"Test task"}' \
  -v

# Check body parser middleware
grep "express.json\|bodyParser" backend/src/api/server.ts
```

**Solution:**

1. Ensure body parser middleware is registered:

   ```typescript
   // backend/src/api/server.ts
   import express from 'express';

   const app = express();

   // MUST be before routes
   app.use(express.json());
   app.use(express.urlencoded({ extended: true }));

   // Then register routes
   app.use('/api/tasks', taskRoutes);
   ```

2. Send correct Content-Type header:
   ```typescript
   // Frontend fetch
   fetch('http://localhost:3000/api/tasks', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       Authorization: `Bearer ${token}`,
     },
     body: JSON.stringify({ text: 'New task' }),
   });
   ```

**Prevention:**

- Register body parser middleware early
- Always set Content-Type: application/json
- Log req.body for debugging
- Validate request body with schemas

---

### Issue 4.3: Response Timeout on Large Datasets

**Symptoms:**

- API hangs for >30 seconds
- No response received
- Browser shows "Failed to fetch"

**Diagnosis:**

```bash
# Check query performance
docker logs bwaincell-bot | grep "Duration:"

# Time specific endpoint
time curl http://localhost:3000/api/tasks

# Check database query times
psql -U bwaincell -d bwaincell -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"
```

**Solution:**

1. Implement pagination:

   ```typescript
   // backend/src/api/routes/tasks.ts
   router.get('/', async (req, res) => {
     const page = parseInt(req.query.page) || 0;
     const limit = parseInt(req.query.limit) || 50;
     const offset = page * limit;

     const tasks = await Task.findAndCountAll({
       where: { guild_id: req.user.guildId },
       limit,
       offset,
       order: [['created_at', 'DESC']],
     });

     res.json({
       success: true,
       data: {
         tasks: tasks.rows,
         total: tasks.count,
         page,
         pages: Math.ceil(tasks.count / limit),
       },
     });
   });
   ```

2. Add database indexes (see Issue 2.4)

3. Implement request timeout:
   ```typescript
   // backend/src/api/server.ts
   app.use((req, res, next) => {
     res.setTimeout(30000, () => {
       res.status(504).json({
         success: false,
         error: 'Request timeout',
       });
     });
     next();
   });
   ```

**Prevention:**

- Always paginate large result sets
- Add database indexes
- Monitor query performance
- Set reasonable timeout limits

---

### Issue 4.4: Inconsistent Response Format

**Symptoms:**

- Some endpoints return `{ data: {...} }`, others return raw data
- Error responses have different formats
- Frontend parsing breaks

**Diagnosis:**

```bash
# Test multiple endpoints
curl http://localhost:3000/api/tasks
curl http://localhost:3000/api/lists
curl http://localhost:3000/api/notes

# Compare response structures
```

**Solution:**

1. Use consistent response wrapper:

   ```typescript
   // backend/src/api/utils/response.ts
   export function success(data: any) {
     return { success: true, data };
   }

   export function error(message: string) {
     return { success: false, error: message };
   }

   // backend/src/api/routes/tasks.ts
   import { success, error } from '../utils/response';

   router.get('/', async (req, res) => {
     try {
       const tasks = await Task.findAll();
       res.json(success(tasks));
     } catch (err) {
       res.status(500).json(error('Failed to fetch tasks'));
     }
   });
   ```

2. Implement global error handler:

   ```typescript
   // backend/src/api/server.ts
   app.use((err, req, res, next) => {
     logger.error('API error', { error: err.message, stack: err.stack });

     res.status(err.status || 500).json({
       success: false,
       error: err.message || 'Internal server error',
     });
   });
   ```

**Prevention:**

- Use response helpers for all endpoints
- Document response format in API docs
- Test response parsing in frontend
- Use TypeScript interfaces for responses

---

### Issue 4.5: PATCH vs PUT Confusion

**Symptoms:**

- Update endpoint requires all fields
- Partial updates not working
- Documentation unclear on which method to use

**Diagnosis:**

```bash
# Test PATCH with partial data
curl -X PATCH http://localhost:3000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{"completed":true}'

# Test PUT with full data
curl -X PUT http://localhost:3000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{"text":"Updated","completed":true,"dueDate":null}'
```

**Solution:**

1. Use PATCH for partial updates (current implementation):

   ```typescript
   // backend/src/api/routes/tasks.ts
   router.patch('/:id', async (req, res) => {
     const updates = {};

     // Only update provided fields
     if (req.body.text !== undefined) updates.text = req.body.text;
     if (req.body.completed !== undefined) updates.completed = req.body.completed;
     if (req.body.dueDate !== undefined) updates.dueDate = req.body.dueDate;

     await Task.update(updates, {
       where: { id: req.params.id, guild_id: req.user.guildId },
     });

     res.json(success({ updated: true }));
   });
   ```

2. Or implement both PATCH and PUT:

   ```typescript
   // PATCH: Partial update
   router.patch('/:id', partialUpdateHandler);

   // PUT: Full replacement
   router.put('/:id', fullUpdateHandler);
   ```

**Prevention:**

- Use PATCH for partial updates, PUT for full replacement
- Document which fields are optional
- Validate required fields
- Reject extra fields in strict mode

---

### Issue 4.6: Query Parameter Type Issues

**Symptoms:**

- Filters don't work (e.g., ?completed=true)
- Numeric IDs treated as strings
- Boolean parameters fail

**Diagnosis:**

```bash
# Test query parameters
curl "http://localhost:3000/api/tasks?completed=true&limit=10"

# Check backend logs
docker logs bwaincell-bot | grep "Query params:"
```

**Solution:**

1. Parse query parameters correctly:

   ```typescript
   // backend/src/api/routes/tasks.ts
   router.get('/', async (req, res) => {
     const where: any = { guild_id: req.user.guildId };

     // Parse boolean (query params are always strings)
     if (req.query.completed !== undefined) {
       where.completed = req.query.completed === 'true';
     }

     // Parse number
     const limit = parseInt(req.query.limit as string) || 50;

     // Parse date
     if (req.query.dueDate) {
       where.due_date = new Date(req.query.dueDate as string);
     }

     const tasks = await Task.findAll({ where, limit });
     res.json(success(tasks));
   });
   ```

2. Use query validation library:

   ```typescript
   import { z } from 'zod';

   const taskQuerySchema = z.object({
     completed: z.enum(['true', 'false']).optional(),
     limit: z.string().regex(/^\d+$/).optional(),
     page: z.string().regex(/^\d+$/).optional(),
   });

   router.get('/', async (req, res) => {
     const query = taskQuerySchema.parse(req.query);
     // Now query is typed and validated
   });
   ```

**Prevention:**

- Always parse query parameters to correct types
- Validate query parameters with schemas
- Document query parameter types
- Provide sensible defaults

---

### Issue 4.7: Error Messages Leak Internal Details

**Symptoms:**

- Error responses include stack traces
- Database errors exposed to client
- Internal paths visible in production

**Diagnosis:**

```bash
# Trigger error and check response
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -d '{}'

# Check if stack trace is visible
```

**Solution:**

1. Implement safe error handler:

   ```typescript
   // backend/src/api/server.ts
   app.use((err, req, res, next) => {
     // Log full error internally
     logger.error('API error', {
       error: err.message,
       stack: err.stack,
       path: req.path,
     });

     // Send safe error to client
     const isDevelopment = process.env.NODE_ENV === 'development';

     res.status(err.status || 500).json({
       success: false,
       error: isDevelopment ? err.message : 'Internal server error',
       ...(isDevelopment && { stack: err.stack }),
     });
   });
   ```

2. Use custom error classes:

   ```typescript
   // backend/src/api/utils/errors.ts
   export class ValidationError extends Error {
     status = 400;
     constructor(message: string) {
       super(message);
       this.name = 'ValidationError';
     }
   }

   export class NotFoundError extends Error {
     status = 404;
     constructor(message: string) {
       super(message);
       this.name = 'NotFoundError';
     }
   }

   // Usage
   throw new ValidationError('Missing required field: text');
   ```

**Prevention:**

- Never expose stack traces in production
- Use generic error messages for internal errors
- Log detailed errors server-side
- Use error monitoring service (Sentry)

---

### Issue 4.8: Rate Limiting Not Working

**Symptoms:**

- API accepts unlimited requests
- Server overload from spam
- No rate limit headers

**Diagnosis:**

```bash
# Test rate limiting
for i in {1..100}; do
  curl http://localhost:3000/api/tasks &
done

# Check rate limit headers
curl -I http://localhost:3000/api/tasks
```

**Solution:**

1. Currently NO rate limiting is implemented

2. Add rate limiting middleware:

   ```bash
   npm install express-rate-limit
   ```

   ```typescript
   // backend/src/api/server.ts
   import rateLimit from 'express-rate-limit';

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // 100 requests per window
     message: {
       success: false,
       error: 'Too many requests, please try again later',
     },
     standardHeaders: true,
     legacyHeaders: false,
   });

   app.use('/api/', limiter);
   ```

3. Different limits for different endpoints:

   ```typescript
   const strictLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 10,
   });

   app.use('/api/auth/login', strictLimiter);
   ```

**Prevention:**

- Implement rate limiting in production
- Monitor rate limit violations
- Use Redis for distributed rate limiting
- Document rate limits in API docs

---

## 5. Frontend Issues

### Issue 5.1: White Screen / Blank Page

**Symptoms:**

- Frontend shows white screen
- No errors in UI
- Browser console shows errors

**Diagnosis:**

```bash
# Check browser console (F12)
# Look for JavaScript errors

# Check Next.js build errors
npm run build:frontend

# Check dev server logs
npm run dev:frontend
```

**Solution:**

1. Common causes:
   - JavaScript error breaking React rendering
   - Missing environment variables
   - Failed API request during SSR

2. Check browser console for errors:

   ```
   Uncaught Error: Hydration failed
   → Check for SSR/client mismatch

   Cannot read property 'map' of undefined
   → Check if data is loaded before rendering
   ```

3. Add error boundary:

   ```typescript
   // frontend/components/ErrorBoundary.tsx
   'use client';
   import { Component } from 'react';

   class ErrorBoundary extends Component {
     state = { hasError: false, error: null };

     static getDerivedStateFromError(error) {
       return { hasError: true, error };
     }

     render() {
       if (this.state.hasError) {
         return (
           <div>
             <h1>Something went wrong</h1>
             <pre>{this.state.error?.message}</pre>
           </div>
         );
       }

       return this.props.children;
     }
   }
   ```

**Prevention:**

- Use TypeScript for type safety
- Add error boundaries around major components
- Test builds before deploying
- Monitor frontend errors with Sentry

---

### Issue 5.2: "Hydration Failed" Errors

**Symptoms:**

- Warning: "Hydration failed because the initial UI does not match"
- Content flashes or disappears
- Console shows hydration errors

**Diagnosis:**

```bash
# Check for SSR/CSR mismatches
# Look for:
# - Date/time rendered during SSR
# - LocalStorage access during SSR
# - window object access during SSR
```

**Solution:**

1. Common causes:

   ```typescript
   // ❌ Wrong: Accessing localStorage during SSR
   const token = localStorage.getItem('token');

   // ✅ Correct: Check if window exists
   const token = typeof window !== 'undefined'
     ? localStorage.getItem('token')
     : null;

   // ❌ Wrong: Different content on server vs client
   <div>{new Date().toLocaleString()}</div>

   // ✅ Correct: Use useEffect for client-only rendering
   const [time, setTime] = useState(null);
   useEffect(() => {
     setTime(new Date().toLocaleString());
   }, []);
   ```

2. Use 'use client' directive for client-only components:

   ```typescript
   'use client';
   // Component that uses browser APIs
   ```

3. Suppress hydration warning (only if intentional):
   ```typescript
   <div suppressHydrationWarning>{clientOnlyContent}</div>
   ```

**Prevention:**

- Check for browser APIs (window, localStorage, document)
- Test SSR rendering
- Use 'use client' for interactive components
- Keep server and client renders identical

---

### Issue 5.3: API Requests Failing from Frontend

**Symptoms:**

- Fetch returns error
- No data shown in UI
- Network tab shows failed requests

**Diagnosis:**

```bash
# Check browser Network tab (F12)
# Look for:
# - Status code (401, 404, 500)
# - CORS errors
# - Request/response headers

# Check API base URL
grep "API_URL\|NEXT_PUBLIC" frontend/.env.local
```

**Solution:**

1. Verify API URL in environment:

   ```bash
   # frontend/.env.local
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

2. Check API client configuration:

   ```typescript
   // frontend/lib/api.ts
   const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

   export async function fetchTasks() {
     const token = localStorage.getItem('accessToken');

     const response = await fetch(`${API_URL}/api/tasks`, {
       headers: {
         Authorization: `Bearer ${token}`,
         'Content-Type': 'application/json',
       },
     });

     if (!response.ok) {
       throw new Error(`HTTP ${response.status}: ${await response.text()}`);
     }

     return response.json();
   }
   ```

3. Handle authentication errors:
   ```typescript
   try {
     const data = await fetchTasks();
   } catch (error) {
     if (error.message.includes('401')) {
       // Token expired, try refresh
       await refreshToken();
       return fetchTasks(); // Retry
     }
     throw error;
   }
   ```

**Prevention:**

- Use environment variables for API URL
- Implement automatic token refresh
- Add request/response interceptors
- Log failed requests for debugging

---

### Issue 5.4: State Not Updating in UI

**Symptoms:**

- UI doesn't reflect state changes
- State updates logged but UI unchanged
- Stale data shown

**Diagnosis:**

```bash
# Check React DevTools
# - Components tab → Find component
# - Check hooks state
# - Check if component re-renders

# Check for mutation instead of immutable updates
```

**Solution:**

1. Common causes:

   ```typescript
   // ❌ Wrong: Mutating state directly
   const [tasks, setTasks] = useState([]);
   tasks.push(newTask); // Doesn't trigger re-render

   // ✅ Correct: Create new array
   setTasks([...tasks, newTask]);

   // ❌ Wrong: Mutating object
   task.completed = true;
   setTasks(tasks); // Same reference, no re-render

   // ✅ Correct: Create new object
   setTasks(tasks.map((t) => (t.id === task.id ? { ...t, completed: true } : t)));
   ```

2. Use React Query for automatic refetching:

   ```typescript
   import { useQuery, useMutation } from '@tanstack/react-query';

   function TaskList() {
     const { data: tasks } = useQuery(['tasks'], fetchTasks);

     const completeTask = useMutation((taskId) => updateTask(taskId, { completed: true }), {
       onSuccess: () => {
         queryClient.invalidateQueries(['tasks']); // Refetch tasks
       },
     });
   }
   ```

**Prevention:**

- Never mutate state directly
- Use immutable update patterns
- Use React Query for server state
- Use Zustand/Redux for complex state

---

### Issue 5.5: Infinite Re-render Loop

**Symptoms:**

- Browser becomes unresponsive
- Console shows thousands of logs
- "Maximum update depth exceeded" error

**Diagnosis:**

```bash
# Check browser console
# Look for repeated component name in stack trace

# Check useEffect dependencies
# Look for missing or incorrect dependencies
```

**Solution:**

1. Common causes:

   ```typescript
   // ❌ Wrong: Setting state in render
   function Component() {
     const [count, setCount] = useState(0);
     setCount(count + 1); // Infinite loop!
     return <div>{count}</div>;
   }

   // ✅ Correct: Set state in effect or event handler
   useEffect(() => {
     setCount(1);
   }, []); // Empty deps = run once

   // ❌ Wrong: Object in dependency array
   useEffect(() => {
     fetchData(options);
   }, [options]); // New object every render

   // ✅ Correct: Destructure or use useMemo
   const { page, limit } = options;
   useEffect(() => {
     fetchData({ page, limit });
   }, [page, limit]);
   ```

2. Use React DevTools Profiler to identify cause

**Prevention:**

- Never set state during render
- Properly specify useEffect dependencies
- Use ESLint react-hooks plugin
- Memoize objects/arrays passed as dependencies

---

### Issue 5.6: PWA Not Installing

**Symptoms:**

- No "Install App" prompt
- PWA not detected by browser
- Manifest errors in console

**Diagnosis:**

```bash
# Check manifest.json
curl http://localhost:3010/manifest.json

# Check service worker
curl http://localhost:3010/sw.js

# Chrome DevTools → Application tab
# - Manifest: Check for errors
# - Service Workers: Check registration
```

**Solution:**

1. Verify manifest.json:

   ```json
   {
     "name": "Bwaincell",
     "short_name": "Bwaincell",
     "description": "Productivity platform",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#ffffff",
     "theme_color": "#000000",
     "icons": [
       {
         "src": "/icon-192.png",
         "sizes": "192x192",
         "type": "image/png"
       },
       {
         "src": "/icon-512.png",
         "sizes": "512x512",
         "type": "image/png"
       }
     ]
   }
   ```

2. Add manifest link to HTML:

   ```html
   <!-- frontend/app/layout.tsx -->
   <head>
     <link rel="manifest" href="/manifest.json" />
   </head>
   ```

3. Ensure HTTPS in production (required for PWA)

**Prevention:**

- Validate manifest with PWA Builder
- Test on mobile devices
- Use HTTPS in production
- Provide icons in all required sizes

---

### Issue 5.7: Images Not Loading

**Symptoms:**

- Broken image icons
- 404 errors for images
- Next.js Image optimization fails

**Diagnosis:**

```bash
# Check image paths
ls frontend/public/

# Check Next.js config
cat frontend/next.config.js

# Check browser Network tab for 404s
```

**Solution:**

1. Use correct image paths:

   ```typescript
   // ✅ Correct: Public folder
   <Image src="/logo.png" alt="Logo" width={200} height={50} />

   // ❌ Wrong: Incorrect path
   <Image src="logo.png" alt="Logo" />
   <Image src="/public/logo.png" alt="Logo" />
   ```

2. Configure Next.js for external images:

   ```javascript
   // frontend/next.config.js
   module.exports = {
     images: {
       domains: ['example.com'], // Allow external images
       remotePatterns: [
         {
           protocol: 'https',
           hostname: '**.example.com',
         },
       ],
     },
   };
   ```

3. Optimize image formats:
   ```bash
   # Use WebP/AVIF for better compression
   # Next.js automatically optimizes during build
   ```

**Prevention:**

- Use Next.js Image component
- Store images in public/ folder
- Configure external domains
- Test images in production build

---

### Issue 5.8: Dark Mode Toggle Not Working

**Symptoms:**

- Theme doesn't change
- Theme resets on page refresh
- Flash of wrong theme

**Diagnosis:**

```bash
# Check theme storage
# Browser DevTools → Application → Local Storage → theme

# Check CSS variables
# DevTools → Elements → Inspect <html> class
```

**Solution:**

1. Implement theme persistence:

   ```typescript
   // frontend/hooks/useTheme.ts
   import { useState, useEffect } from 'react';

   export function useTheme() {
     const [theme, setTheme] = useState<'light' | 'dark'>('light');

     useEffect(() => {
       // Load from storage
       const saved = localStorage.getItem('theme');
       if (saved) setTheme(saved as 'light' | 'dark');
     }, []);

     const toggleTheme = () => {
       const newTheme = theme === 'light' ? 'dark' : 'light';
       setTheme(newTheme);
       localStorage.setItem('theme', newTheme);
       document.documentElement.classList.toggle('dark');
     };

     return { theme, toggleTheme };
   }
   ```

2. Prevent flash of wrong theme:
   ```typescript
   // frontend/app/layout.tsx
   export default function RootLayout({ children }) {
     return (
       <html suppressHydrationWarning>
         <head>
           <script dangerouslySetInnerHTML={{
             __html: `
               (function() {
                 const theme = localStorage.getItem('theme') || 'light';
                 document.documentElement.classList.toggle('dark', theme === 'dark');
               })();
             `
           }} />
         </head>
         <body>{children}</body>
       </html>
     );
   }
   ```

**Prevention:**

- Store theme preference in localStorage
- Apply theme before first render
- Use CSS variables for theme colors
- Test theme persistence

---

## 6. Deployment Issues

### Issue 6.1: Docker Build Fails

**Symptoms:**

- `docker build` exits with error
- Missing dependencies
- COPY command fails

**Diagnosis:**

```bash
# Check Dockerfile syntax
docker build -t bwaincell-test .

# Check .dockerignore
cat .dockerignore

# Build with no cache
docker build --no-cache -t bwaincell-test .
```

**Solution:**

1. Ensure proper build context:

   ```dockerfile
   # Dockerfile
   FROM node:18-alpine

   WORKDIR /app

   # Copy package files first (better caching)
   COPY package*.json ./
   COPY backend/package*.json ./backend/

   # Install dependencies
   RUN npm install
   RUN npm install --workspace=backend

   # Copy source files
   COPY . .

   # Build
   RUN npm run build:backend

   CMD ["npm", "start", "--workspace=backend"]
   ```

2. Check .dockerignore:

   ```
   node_modules
   .git
   .env
   npm-debug.log
   dist
   build
   ```

3. Multi-stage build for smaller image:

   ```dockerfile
   # Stage 1: Build
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY . .
   RUN npm install
   RUN npm run build:backend

   # Stage 2: Production
   FROM node:18-alpine
   WORKDIR /app
   COPY --from=builder /app/dist ./dist
   COPY --from=builder /app/node_modules ./node_modules
   CMD ["node", "dist/backend/src/bot.js"]
   ```

**Prevention:**

- Test Docker builds locally
- Use multi-stage builds
- Minimize layers
- Cache dependencies properly

---

### Issue 6.2: Environment Variables Not Loading

**Symptoms:**

- App crashes with "Missing env var"
- Environment variables are undefined
- Works locally but not in deployment

**Diagnosis:**

```bash
# Check environment in container
docker exec bwaincell-bot env | grep DISCORD

# Check if .env is mounted
docker inspect bwaincell-bot | grep -A 10 "Env"

# Test with docker-compose
docker-compose config
```

**Solution:**

1. Use docker-compose for environment:

   ```yaml
   # docker-compose.yml
   version: '3.8'
   services:
     bot:
       build: .
       env_file:
         - .env
       environment:
         - NODE_ENV=production
   ```

2. Or pass environment variables:

   ```bash
   docker run -e DISCORD_BOT_TOKEN=xxx -e DATABASE_URL=xxx bwaincell-bot
   ```

3. For production, use secrets management:

   ```bash
   # Fly.io
   fly secrets set DISCORD_BOT_TOKEN=xxx

   # Docker Swarm
   echo "xxx" | docker secret create discord_token -
   ```

**Prevention:**

- Use env_file in docker-compose
- Never commit .env to Git
- Use secrets management in production
- Validate environment on startup

---

### Issue 6.3: Database Connection Fails in Production

**Symptoms:**

- Backend connects locally but not in production
- ECONNREFUSED or timeout errors
- SSL certificate errors

**Diagnosis:**

```bash
# Check database accessibility
psql $DATABASE_URL

# Check network connectivity
docker exec bwaincell-bot ping -c 3 database-host

# Check SSL requirements
psql $DATABASE_URL?sslmode=require
```

**Solution:**

1. Update DATABASE_URL for production:

   ```bash
   # Development (localhost)
   DATABASE_URL=postgresql://user:pass@localhost:5433/bwaincell

   # Production (external host)
   DATABASE_URL=postgresql://user:pass@db.example.com:5432/bwaincell?sslmode=require
   ```

2. Configure Sequelize for SSL:

   ```javascript
   // backend/database/config.js
   module.exports = {
     production: {
       url: process.env.DATABASE_URL,
       dialect: 'postgres',
       dialectOptions: {
         ssl: {
           require: true,
           rejectUnauthorized: false, // For self-signed certs
         },
       },
     },
   };
   ```

3. Ensure database allows external connections:

   ```bash
   # PostgreSQL pg_hba.conf
   host all all 0.0.0.0/0 md5

   # postgresql.conf
   listen_addresses = '*'
   ```

**Prevention:**

- Use connection pooling
- Test production database connection
- Use managed databases (AWS RDS, Fly Postgres)
- Enable SSL in production

---

### Issue 6.4: Port Already in Use

**Symptoms:**

- Error: "EADDRINUSE: port 3000 already in use"
- Cannot start backend
- Multiple instances running

**Diagnosis:**

```bash
# Check what's using port 3000
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # macOS/Linux

# Check running containers
docker ps | grep 3000
```

**Solution:**

1. Stop conflicting process:

   ```bash
   # Find PID
   lsof -i :3000

   # Kill process
   kill -9 <PID>
   ```

2. Change port in .env:

   ```bash
   API_PORT=3001
   ```

3. Stop all Docker containers:
   ```bash
   docker stop $(docker ps -q)
   ```

**Prevention:**

- Use unique ports for each service
- Stop services before restarting
- Use process managers (PM2) to prevent duplicates
- Document port assignments

---

### Issue 6.5: Memory Leak / High Memory Usage

**Symptoms:**

- Container memory usage grows over time
- OOM (Out of Memory) errors
- Server becomes unresponsive

**Diagnosis:**

```bash
# Check container memory usage
docker stats bwaincell-bot

# Check Node.js memory usage
docker exec bwaincell-bot node -e "console.log(process.memoryUsage())"

# Profile memory usage
node --inspect backend/src/bot.ts
# Open chrome://inspect and take heap snapshot
```

**Solution:**

1. Common memory leak causes:
   - Event listeners not removed
   - Timers not cleared
   - Database connections not closed
   - Large objects in closures

2. Clean up event listeners:

   ```typescript
   // ❌ Wrong: Listener never removed
   client.on('message', handler);

   // ✅ Correct: Remove on shutdown
   const handler = (msg) => {
     /* ... */
   };
   client.on('message', handler);

   process.on('SIGTERM', () => {
     client.off('message', handler);
   });
   ```

3. Set memory limits:

   ```bash
   # Docker
   docker run --memory=512m bwaincell-bot

   # Node.js
   node --max-old-space-size=512 backend/src/bot.js
   ```

**Prevention:**

- Monitor memory usage
- Clean up resources properly
- Use weak references where appropriate
- Profile memory periodically

---

### Issue 6.6: Logs Not Persisting

**Symptoms:**

- Logs disappear after container restart
- Cannot debug past issues
- Log files not found

**Diagnosis:**

```bash
# Check container logs
docker logs bwaincell-bot

# Check log file location
docker exec bwaincell-bot ls -la /var/log/

# Check volume mounts
docker inspect bwaincell-bot | grep -A 10 "Mounts"
```

**Solution:**

1. Mount logs volume:

   ```yaml
   # docker-compose.yml
   services:
     bot:
       volumes:
         - ./logs:/app/logs
   ```

2. Configure logger to write to file:

   ```typescript
   // backend/src/shared/utils/logger.ts
   import winston from 'winston';

   const logger = winston.createLogger({
     transports: [
       new winston.transports.Console(),
       new winston.transports.File({
         filename: '/app/logs/combined.log',
         maxsize: 10485760, // 10MB
         maxFiles: 5,
       }),
       new winston.transports.File({
         filename: '/app/logs/error.log',
         level: 'error',
       }),
     ],
   });
   ```

3. Use external logging service:
   ```typescript
   // Send logs to Loki, Papertrail, etc.
   ```

**Prevention:**

- Persist logs to volumes
- Use log rotation
- Send logs to external service
- Set log retention policies

---

### Issue 6.7: HTTPS Certificate Errors

**Symptoms:**

- Browser shows "Not Secure"
- SSL certificate warnings
- Mixed content errors

**Diagnosis:**

```bash
# Check certificate
openssl s_client -connect bwaincell.fly.dev:443

# Check certificate expiry
echo | openssl s_client -connect bwaincell.fly.dev:443 2>/dev/null | openssl x509 -noout -dates
```

**Solution:**

1. For Fly.io (automatic SSL):

   ```bash
   fly certs add bwaincell.fly.dev
   fly certs check
   ```

2. For Vercel (automatic SSL):
   - SSL certificates are automatic for all deployments
   - Custom domains: Add domain in Vercel dashboard

3. For self-hosted (Let's Encrypt):

   ```bash
   # Install Certbot
   sudo apt-get install certbot python3-certbot-nginx

   # Get certificate
   sudo certbot --nginx -d bwaincell.com

   # Auto-renewal
   sudo certbot renew --dry-run
   ```

**Prevention:**

- Use platforms with automatic SSL (Fly.io, Vercel, Netlify)
- Set up certificate auto-renewal
- Monitor certificate expiry
- Test SSL configuration with SSL Labs

---

### Issue 6.8: Health Check Failing

**Symptoms:**

- Container marked as unhealthy
- Load balancer removes instance
- Deployment fails health checks

**Diagnosis:**

```bash
# Check health endpoint
curl http://localhost:3000/health

# Check Docker health status
docker inspect bwaincell-bot | grep -A 10 "Health"

# Check health check logs
docker logs bwaincell-bot | grep "health"
```

**Solution:**

1. Implement health check endpoint:

   ```typescript
   // backend/src/api/server.ts
   app.get('/health', async (req, res) => {
     try {
       // Check database connection
       await sequelize.authenticate();

       res.json({
         status: 'healthy',
         timestamp: new Date().toISOString(),
         uptime: process.uptime(),
         database: 'connected',
       });
     } catch (error) {
       res.status(503).json({
         status: 'unhealthy',
         error: error.message,
       });
     }
   });
   ```

2. Configure Docker health check:

   ```dockerfile
   HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
     CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
   ```

3. Configure docker-compose health check:
   ```yaml
   services:
     bot:
       healthcheck:
         test: ['CMD', 'curl', '-f', 'http://localhost:3000/health']
         interval: 30s
         timeout: 3s
         retries: 3
         start_period: 40s
   ```

**Prevention:**

- Implement comprehensive health checks
- Test dependencies (database, external APIs)
- Set appropriate timeouts
- Monitor health check failures

---

### Issue 6.9: Rolling Update Causes Downtime

**Symptoms:**

- Service unavailable during deployment
- Users see errors during update
- Requests fail during rollout

**Diagnosis:**

```bash
# Check deployment strategy
kubectl describe deployment bwaincell

# Check replica count
kubectl get pods
```

**Solution:**

1. Use rolling updates:

   ```yaml
   # kubernetes deployment
   spec:
     replicas: 2
     strategy:
       type: RollingUpdate
       rollingUpdate:
         maxUnavailable: 0
         maxSurge: 1
   ```

2. Implement graceful shutdown:

   ```typescript
   // backend/src/bot.ts
   process.on('SIGTERM', async () => {
     logger.info('Received SIGTERM, shutting down gracefully...');

     // Stop accepting new requests
     server.close(() => {
       logger.info('HTTP server closed');
     });

     // Close database connections
     await sequelize.close();

     // Destroy Discord client
     await client.destroy();

     process.exit(0);
   });
   ```

3. Use health checks with startup probes:
   ```yaml
   readinessProbe:
     httpGet:
       path: /health
       port: 3000
     initialDelaySeconds: 5
     periodSeconds: 10
   ```

**Prevention:**

- Use multiple replicas
- Implement graceful shutdown
- Configure health checks properly
- Test deployment strategy

---

### Issue 6.10: Frontend Assets Not Loading After Deploy

**Symptoms:**

- CSS not applied
- JavaScript errors
- 404 for static files

**Diagnosis:**

```bash
# Check build output
ls -la frontend/.next/static/

# Check static file serving
curl https://bwaincell.sunny-stack.com/_next/static/chunks/main.js

# Check cache headers
curl -I https://bwaincell.sunny-stack.com/_next/static/css/main.css
```

**Solution:**

1. Ensure build generates static files:

   ```bash
   npm run build:frontend
   ls -la frontend/.next/static/
   ```

2. Configure Next.js static file serving:

   ```javascript
   // next.config.js
   module.exports = {
     output: 'standalone', // For Docker
     assetPrefix: process.env.ASSET_PREFIX || '',
   };
   ```

3. For Vercel (automatic):
   - Static files are automatically CDN-optimized
   - No configuration needed

4. For self-hosted, configure nginx:
   ```nginx
   location /_next/static/ {
     alias /app/.next/static/;
     expires 1y;
     add_header Cache-Control "public, immutable";
   }
   ```

**Prevention:**

- Test production builds locally
- Configure CDN for static assets
- Set proper cache headers
- Monitor asset loading in production

---

## Additional Resources

- [Getting Started Guide](getting-started.md) - Setup and installation
- [API Documentation](../api/) - REST API reference
- [Architecture Overview](../architecture/overview.md) - System design
- [Discord.js Documentation](https://discord.js.org) - Bot framework docs
- [PostgreSQL Manual](https://www.postgresql.org/docs/) - Database reference
- [Next.js Documentation](https://nextjs.org/docs) - Frontend framework

## Support

If you encounter issues not covered in this guide:

1. Check GitHub Issues: [github.com/strawhatluka/bwaincell/issues](https://github.com/strawhatluka/bwaincell/issues)
2. Review backend logs: `docker logs bwaincell-bot`
3. Enable debug logging: `LOG_LEVEL=debug npm run dev`
4. Create a new issue with logs and reproduction steps

---

**Last Updated** 2026-01-12
**Version:** 2.0.0
