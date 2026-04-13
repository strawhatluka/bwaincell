# ADR 0002: Migration from SQLite to PostgreSQL 15

**Status:** Accepted
**Date:** 2026-01-11
**Decision Makers:** Development Team

---

## Context

Bwaincell initially used **SQLite** for local development and early prototyping due to its simplicity and zero-configuration setup. As the project evolved toward production deployment, we encountered limitations:

### SQLite Limitations Encountered

1. **Concurrency Issues**
   - Discord bot, REST API, and scheduled jobs compete for database access
   - "Database is locked" errors during concurrent writes
   - Single writer limitation causes request queuing

2. **Scalability Concerns**
   - Performance degrades with database size > 1GB
   - No support for horizontal scaling
   - Limited to single-file database

3. **Production Deployment**
   - Not recommended for production web applications
   - No built-in replication or high availability
   - Limited backup strategies (file-based only)

4. **Advanced Features**
   - Limited full-text search capabilities
   - No native JSON data type
   - No array data types
   - Limited geospatial support

5. **Transaction Management**
   - Database-level locks (coarse-grained)
   - No row-level locking
   - Deadlocks are difficult to debug

### Production Requirements

- Support 10+ concurrent users (Discord + web access)
- Handle 1000+ tasks, notes, reminders per user
- Enable real-time data access from multiple clients
- Provide robust backup and recovery
- Scale horizontally if user base grows

---

## Decision

We will migrate from **SQLite** to **PostgreSQL 15** for all production deployments while maintaining SQLite support for local development and testing.

### Migration Strategy

```
┌─────────────────┐
│ Development     │  SQLite (local, fast, zero-config)
│ Environment     │  DATABASE_URL=sqlite::memory:
└─────────────────┘

┌─────────────────┐
│ Testing         │  SQLite (in-memory, fast tests)
│ Environment     │  DATABASE_URL=sqlite::memory:
└─────────────────┘

┌─────────────────┐
│ Production      │  PostgreSQL 15 (robust, scalable)
│ Environment     │  DATABASE_URL=postgresql://...
└─────────────────┘
```

### Database Configuration

**File:** `backend/database/index.ts`

```typescript
import { Sequelize } from 'sequelize';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Auto-detect dialect from DATABASE_URL
const sequelize = new Sequelize(databaseUrl, {
  dialect: databaseUrl.startsWith('postgresql') ? 'postgres' : 'sqlite',
  logging: (sql: string) => logger.info('SQL Query', { query: sql }),
  pool: {
    max: 10, // Maximum connections
    min: 2, // Minimum connections
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    // SSL for cloud PostgreSQL deployments
    ssl:
      process.env.NODE_ENV === 'production' && process.env.DEPLOYMENT_MODE !== 'pi'
        ? {
            require: true,
            rejectUnauthorized: false,
          }
        : false,
  },
  define: {
    timestamps: true,
    underscored: true, // Use snake_case for columns (PostgreSQL convention)
    freezeTableName: true,
  },
});
```

### Environment-Specific Configuration

**Development (.env):**

```env
# SQLite for local development
DATABASE_PATH=./data/bwaincell.sqlite
```

**Production (.env):**

```env
# PostgreSQL for production
DATABASE_URL=postgresql://bwaincell:password@localhost:5433/bwaincell
POSTGRES_USER=bwaincell
POSTGRES_PASSWORD=secure_password_here
POSTGRES_DB=bwaincell
```

**Docker Compose (docker-compose.yml):**

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - '5433:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
    depends_on:
      - postgres

volumes:
  postgres_data:
```

---

## Consequences

### Positive

1. **Improved Concurrency**
   - Multiple simultaneous read/write operations
   - Row-level locking prevents contention
   - No more "database is locked" errors
   - Discord bot, API, and scheduled jobs run concurrently

2. **Better Scalability**
   - Handles databases > 10GB without performance degradation
   - Connection pooling for efficient resource usage
   - Can scale to millions of rows per table
   - Horizontal scaling via read replicas (if needed)

3. **Production-Ready Features**
   - ACID compliance with robust transaction support
   - Point-in-time recovery (PITR) for backups
   - Streaming replication for high availability
   - Monitoring and performance tuning tools (pg_stat_statements)

4. **Advanced Data Types**
   - JSON/JSONB for flexible schemas
   - Array types for multi-value columns
   - Full-text search with ranking
   - UUID primary keys (better for distributed systems)

5. **Better Performance**
   - Query optimizer handles complex queries efficiently
   - Partial indexes for targeted optimization
   - Materialized views for expensive queries
   - Parallel query execution

6. **Ecosystem and Tooling**
   - pgAdmin for database management
   - Mature ORMs and libraries
   - Extensive documentation and community support
   - Cloud-hosted options (AWS RDS, Heroku Postgres, Fly.io Postgres)

7. **Operational Benefits**
   - Automated backups (pg_dump, pg_basebackup)
   - Incremental backups with WAL archiving
   - Database monitoring dashboards
   - Professional support available if needed

### Negative

1. **Increased Complexity**
   - Requires PostgreSQL installation and configuration
   - Must manage database server (vs. single file)
   - Connection pooling configuration needed
   - More moving parts in deployment
   - **Mitigation:** Use Docker for local development, managed PostgreSQL for production

2. **Resource Requirements**
   - PostgreSQL uses more memory than SQLite (typically 50-100MB base)
   - Requires dedicated database server or container
   - Connection overhead for each client
   - **Mitigation:** Modern servers easily handle PostgreSQL memory requirements

3. **Local Development Setup**
   - Developers must install PostgreSQL or use Docker
   - Additional step in onboarding process
   - Requires DATABASE_URL configuration
   - **Mitigation:** Provide Docker Compose setup for one-command PostgreSQL

4. **Testing Speed**
   - PostgreSQL tests slower than in-memory SQLite
   - Each test suite run requires database setup/teardown
   - **Mitigation:** Use SQLite for unit tests, PostgreSQL for integration tests

5. **Cost**
   - Cloud PostgreSQL costs ~$7-15/month (vs. $0 for SQLite)
   - Self-hosted requires server resources
   - **Mitigation:** Acceptable cost for production-ready database

6. **Migration Effort**
   - One-time effort to migrate existing data
   - Must update deployment scripts
   - Documentation updates required
   - **Mitigation:** Sequelize ORM abstracts database differences, minimal code changes

---

## Alternatives Considered

### Alternative 1: Keep SQLite

**Pros:**

- Zero configuration
- Single file database
- Fast for small datasets
- No additional dependencies

**Cons:**

- Single writer limitation (blocking writes)
- Not production-ready for multi-user web apps
- Limited scalability
- No replication or high availability

**Why we didn't choose this:** Concurrency issues are a dealbreaker for production. Discord bot and REST API cannot compete for write access.

---

### Alternative 2: MySQL 8.0

**Pros:**

- Mature, widely used database
- Good performance
- Cloud-hosted options available
- Large community

**Cons:**

- Less advanced features than PostgreSQL (JSON, arrays)
- Weaker full-text search
- Case-insensitive table names (cross-platform issues)
- Less strict ACID compliance by default

**Why we didn't choose this:** PostgreSQL offers better JSON support, full-text search, and stricter standards compliance. PostgreSQL is more aligned with modern web app requirements.

---

### Alternative 3: MongoDB

**Pros:**

- Schema-less (flexible data model)
- Excellent JSON support
- Horizontal scaling built-in
- Fast for read-heavy workloads

**Cons:**

- No SQL (different query language)
- No relational data model (no JOIN support)
- Weak transaction support (until v4.0)
- Sequelize ORM doesn't support MongoDB well
- Overkill for Bwaincell's structured data

**Why we didn't choose this:** Bwaincell's data is relational (tasks belong to lists, reminders reference users). SQL and relational model are better fit.

---

### Alternative 4: MariaDB

**Pros:**

- MySQL-compatible
- Open-source (no Oracle ownership)
- Good performance

**Cons:**

- Similar limitations to MySQL
- Less advanced than PostgreSQL
- Smaller community than PostgreSQL

**Why we didn't choose this:** PostgreSQL offers more features and better JSON support.

---

## Implementation Notes

### Data Migration Steps

1. **Export SQLite data**

```bash
sqlite3 data/bwaincell.sqlite .dump > backup/sqlite_dump.sql
```

2. **Install PostgreSQL 15**

```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt-get install postgresql-15

# Docker
docker compose up -d postgres
```

3. **Create PostgreSQL database**

```bash
psql -U postgres
CREATE USER bwaincell WITH PASSWORD 'secure_password';
CREATE DATABASE bwaincell OWNER bwaincell;
GRANT ALL PRIVILEGES ON DATABASE bwaincell TO bwaincell;
\q
```

4. **Update .env configuration**

```env
DATABASE_URL=postgresql://bwaincell:password@localhost:5433/bwaincell
```

5. **Run Sequelize sync to create tables**

```bash
npm run dev:backend  # Sequelize will auto-create tables
```

6. **Import data using migration script**

```bash
cd backend
ts-node scripts/import-to-postgres.ts
```

7. **Verify data integrity**

```bash
psql -U bwaincell -d bwaincell
SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'notes', COUNT(*) FROM notes;
\q
```

### Sequelize Model Updates

Models work with both SQLite and PostgreSQL due to Sequelize abstraction:

```typescript
// No changes needed - Sequelize handles dialect differences
export default class Task extends Model {
  public static init(sequelize: Sequelize) {
    return super.init(
      {
        id: {
          type: DataTypes.UUID, // PostgreSQL: UUID, SQLite: TEXT
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.STRING, // Works with both databases
          allowNull: false,
        },
        title: {
          type: DataTypes.STRING(200),
          allowNull: false,
        },
        completed: {
          type: DataTypes.BOOLEAN, // PostgreSQL: BOOLEAN, SQLite: INTEGER
          defaultValue: false,
        },
      },
      {
        sequelize,
        tableName: 'tasks',
        timestamps: true,
        underscored: true, // snake_case columns for PostgreSQL
      }
    );
  }
}
```

### Performance Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_reminders_due_date ON reminders(due_date);
CREATE INDEX idx_notes_user_id ON notes(user_id);

-- Full-text search index for task titles
CREATE INDEX idx_tasks_title_fts ON tasks USING gin(to_tsvector('english', title));
```

### Monitoring Queries

```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## References

- [PostgreSQL 15 Documentation](https://www.postgresql.org/docs/15/)
- [Sequelize PostgreSQL Guide](https://sequelize.org/docs/v6/other-topics/dialect-specific-things/#postgresql)
- [Database Migrations Guide](../../guides/database-migrations.md)
- [Database Config](c:\Users\lukaf\Desktop\Dev Work\Bwaincell\backend\database\config.js)
- [Database Index](c:\Users\lukaf\Desktop\Dev Work\Bwaincell\backend\database\index.ts)

---

## Revision History

| Date       | Version | Changes                                    |
| ---------- | ------- | ------------------------------------------ |
| 2026-01-11 | 1.0     | Initial decision: Migrate to PostgreSQL 15 |

---

**Outcome:** Migration to PostgreSQL 15 successfully addresses concurrency and scalability concerns while maintaining SQLite for local development and testing.

**Next Review:** 2027-01-11 (evaluate PostgreSQL performance and consider additional optimizations)
