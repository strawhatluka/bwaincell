# Database Migrations Guide

**Last Updated** 2026-01-12
**Target:** Contributors migrating from SQLite to PostgreSQL 15

---

## Table of Contents

1. [Overview](#overview)
2. [Why PostgreSQL Over SQLite](#why-postgresql-over-sqlite)
3. [PostgreSQL 15 Installation](#postgresql-15-installation)
4. [Data Export from SQLite](#data-export-from-sqlite)
5. [Schema Conversion](#schema-conversion)
6. [Data Import to PostgreSQL](#data-import-to-postgresql)
7. [Configuration Changes](#configuration-changes)
8. [Testing Migration Success](#testing-migration-success)
9. [Rollback Strategy](#rollback-strategy)
10. [Common Migration Issues](#common-migration-issues)

---

## Overview

Bwaincell is transitioning from **SQLite** to **PostgreSQL 15** for production deployments. This guide covers the complete migration process, from installation to validation.

### Migration Timeline

```
┌──────────────┐
│ 1. Backup    │  Export SQLite data
│    SQLite    │  Save schema
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 2. Install   │  PostgreSQL 15
│    PostgreSQL│  Configure database
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 3. Convert   │  Adapt schema
│    Schema    │  Handle data types
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 4. Import    │  Load data
│    Data      │  Verify integrity
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 5. Configure │  Update .env
│    App       │  Test connections
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ 6. Validate  │  Run tests
│    & Deploy  │  Monitor logs
└──────────────┘
```

---

## Why PostgreSQL Over SQLite

### SQLite Limitations

| Issue                | SQLite                              | PostgreSQL                                    |
| -------------------- | ----------------------------------- | --------------------------------------------- |
| **Concurrency**      | Single writer at a time             | Multiple concurrent writers                   |
| **Scalability**      | Limited to ~1GB practical size      | Scales to terabytes                           |
| **Data Types**       | Limited (TEXT, INTEGER, REAL, BLOB) | Rich type system (JSON, Arrays, etc.)         |
| **Performance**      | Degrades with concurrent access     | Optimized for concurrent workloads            |
| **Production**       | Not recommended for web apps        | Industry standard                             |
| **Backup**           | File-based, risky                   | Point-in-time recovery, streaming replication |
| **Full-Text Search** | Basic FTS5                          | Advanced full-text search with ranking        |
| **Transactions**     | Database-level locks                | Row-level locks                               |

### When to Use Each

**Use SQLite for:**

- Local development
- Testing
- Single-user applications
- Embedded systems

**Use PostgreSQL for:**

- Production deployments
- Multi-user web applications
- Applications requiring high concurrency
- Data-intensive applications
- Applications requiring advanced features (JSON, full-text search)

### Bwaincell's Needs

Bwaincell requires PostgreSQL for:

1. **Concurrent Access:** Discord bot + Web API + Scheduled jobs
2. **Production Reliability:** Robust crash recovery and data integrity
3. **Scalability:** Growing user base and data volume
4. **Advanced Features:** JSON data types for flexible schemas
5. **Backup/Recovery:** Automated backups and point-in-time recovery

---

## PostgreSQL 15 Installation

### Local Development (macOS)

```bash
# Install PostgreSQL via Homebrew
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Verify installation
psql --version
# Expected: psql (PostgreSQL) 15.x

# Connect to default database
psql postgres
```

### Local Development (Ubuntu/Debian)

```bash
# Add PostgreSQL APT repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Update package list
sudo apt-get update

# Install PostgreSQL 15
sudo apt-get install -y postgresql-15

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
```

### Local Development (Windows)

1. Download PostgreSQL 15 installer from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run installer (use default port 5432)
3. Set superuser password during installation
4. Add PostgreSQL to PATH: `C:\Program Files\PostgreSQL\15\bin`
5. Verify: Open Command Prompt and run `psql --version`

### Docker Setup (Recommended for Development)

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: bwaincell-postgres
    environment:
      POSTGRES_USER: bwaincell
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: bwaincell
    ports:
      - '5433:5432' # Expose on port 5433 to avoid conflicts
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

**Start PostgreSQL container:**

```bash
# Start container
docker compose up -d postgres

# View logs
docker compose logs -f postgres

# Connect to database
docker exec -it bwaincell-postgres psql -U bwaincell -d bwaincell
```

### Production Deployment (Raspberry Pi)

```bash
# Install PostgreSQL 15
sudo apt-get update
sudo apt-get install -y postgresql-15

# Create database and user
sudo -u postgres psql
```

```sql
CREATE USER bwaincell WITH PASSWORD 'your_secure_password';
CREATE DATABASE bwaincell OWNER bwaincell;
GRANT ALL PRIVILEGES ON DATABASE bwaincell TO bwaincell;
\q
```

### Cloud PostgreSQL (Fly.io, Heroku, AWS RDS)

See provider-specific documentation for managed PostgreSQL setup.

---

## Data Export from SQLite

### Method 1: Using `.dump` Command

```bash
# Export entire database to SQL file
sqlite3 data/bwaincell.sqlite .dump > backup/sqlite_dump.sql

# Export specific tables
sqlite3 data/bwaincell.sqlite <<EOF
.mode insert
.output backup/tasks_export.sql
SELECT * FROM tasks;
.output backup/notes_export.sql
SELECT * FROM notes;
.output stdout
.quit
EOF
```

### Method 2: Using Sequelize Export Script

**File:** `backend/scripts/export-sqlite-data.ts`

```typescript
import { sequelize, Task, Note, Reminder, Budget, Schedule, List } from '@database';
import fs from 'fs/promises';
import path from 'path';

async function exportData() {
  try {
    console.log('Connecting to SQLite database...');
    await sequelize.authenticate();

    const exportDir = path.join(__dirname, '../../backup');
    await fs.mkdir(exportDir, { recursive: true });

    // Export each table
    const models = { Task, Note, Reminder, Budget, Schedule, List };

    for (const [modelName, Model] of Object.entries(models)) {
      console.log(`Exporting ${modelName}...`);

      const data = await Model.findAll({ raw: true });
      const filename = path.join(exportDir, `${modelName.toLowerCase()}_data.json`);

      await fs.writeFile(filename, JSON.stringify(data, null, 2));
      console.log(`✓ Exported ${data.length} ${modelName} records to ${filename}`);
    }

    console.log('Export complete!');
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

exportData();
```

**Run export:**

```bash
cd backend
ts-node scripts/export-sqlite-data.ts
```

### Method 3: Manual CSV Export

```bash
# Export to CSV
sqlite3 -header -csv data/bwaincell.sqlite "SELECT * FROM tasks;" > backup/tasks.csv
sqlite3 -header -csv data/bwaincell.sqlite "SELECT * FROM notes;" > backup/notes.csv
sqlite3 -header -csv data/bwaincell.sqlite "SELECT * FROM reminders;" > backup/reminders.csv
```

---

## Schema Conversion

### Sequelize Models (Already PostgreSQL-Compatible)

Bwaincell uses Sequelize ORM, which abstracts database differences. The models are already compatible with PostgreSQL.

**File:** `backend/database/models/Task.ts`

```typescript
import { Model, DataTypes, Sequelize } from 'sequelize';

export default class Task extends Model {
  public id!: string;
  public userId!: string;
  public title!: string;
  public description!: string | null;
  public completed!: boolean;
  public dueDate!: Date | null;
  public listId!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static init(sequelize: Sequelize) {
    return super.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.STRING,
          allowNull: false,
          field: 'user_id', // PostgreSQL uses snake_case
        },
        title: {
          type: DataTypes.STRING(200),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        completed: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        dueDate: {
          type: DataTypes.DATE,
          allowNull: true,
          field: 'due_date',
        },
        listId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: 'list_id',
        },
      },
      {
        sequelize,
        tableName: 'tasks',
        timestamps: true,
        underscored: true, // Use snake_case for columns
      }
    );
  }
}
```

### Data Type Mapping

| SQLite  | PostgreSQL                 | Sequelize                  |
| ------- | -------------------------- | -------------------------- |
| TEXT    | VARCHAR(n) / TEXT          | DataTypes.STRING(n) / TEXT |
| INTEGER | INTEGER / BIGINT           | DataTypes.INTEGER          |
| REAL    | NUMERIC / DOUBLE PRECISION | DataTypes.DECIMAL / FLOAT  |
| BLOB    | BYTEA                      | DataTypes.BLOB             |
| (none)  | UUID                       | DataTypes.UUID             |
| (none)  | JSON / JSONB               | DataTypes.JSON / JSONB     |
| (none)  | ARRAY                      | DataTypes.ARRAY(type)      |

### Creating Tables in PostgreSQL

Sequelize will automatically create tables when you run `sequelize.sync()`:

```typescript
import { sequelize } from '@database';

// Sync all models (create tables)
await sequelize.sync();

// Force recreate tables (WARNING: destroys data)
await sequelize.sync({ force: true });

// Alter tables to match models (safer)
await sequelize.sync({ alter: true });
```

---

## Data Import to PostgreSQL

### Method 1: Using Import Script

**File:** `backend/scripts/import-to-postgres.ts`

```typescript
import { sequelize, Task, Note, Reminder, Budget, Schedule, List } from '@database';
import fs from 'fs/promises';
import path from 'path';

async function importData() {
  try {
    console.log('Connecting to PostgreSQL database...');
    await sequelize.authenticate();

    // Sync tables (create if they don't exist)
    console.log('Syncing database schema...');
    await sequelize.sync();

    const backupDir = path.join(__dirname, '../../backup');
    const models = { Task, Note, Reminder, Budget, Schedule, List };

    for (const [modelName, Model] of Object.entries(models)) {
      const filename = path.join(backupDir, `${modelName.toLowerCase()}_data.json`);

      try {
        const data = JSON.parse(await fs.readFile(filename, 'utf-8'));
        console.log(`Importing ${data.length} ${modelName} records...`);

        // Bulk create records
        await Model.bulkCreate(data, {
          validate: true,
          ignoreDuplicates: true, // Skip if ID already exists
        });

        console.log(`✓ Imported ${modelName} data`);
      } catch (error) {
        console.error(`✗ Failed to import ${modelName}:`, error.message);
      }
    }

    console.log('Import complete!');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

importData();
```

**Run import:**

```bash
# Ensure DATABASE_URL points to PostgreSQL
export DATABASE_URL="postgresql://bwaincell:password@localhost:5433/bwaincell"

cd backend
ts-node scripts/import-to-postgres.ts
```

### Method 2: Using SQL Import

```bash
# Import from SQLite dump (requires manual adjustments)
psql -U bwaincell -d bwaincell < backup/sqlite_dump.sql
```

**Note:** SQLite dumps require manual SQL editing to work with PostgreSQL:

- Remove SQLite-specific pragmas
- Convert `INTEGER PRIMARY KEY` to `SERIAL PRIMARY KEY` or `UUID`
- Convert `AUTOINCREMENT` to `GENERATED BY DEFAULT AS IDENTITY`
- Update data type names

### Method 3: Manual CSV Import

```bash
# Import CSV files
psql -U bwaincell -d bwaincell <<EOF
\copy tasks FROM 'backup/tasks.csv' WITH (FORMAT csv, HEADER true);
\copy notes FROM 'backup/notes.csv' WITH (FORMAT csv, HEADER true);
\copy reminders FROM 'backup/reminders.csv' WITH (FORMAT csv, HEADER true);
EOF
```

---

## Configuration Changes

### Update `.env` File

**Before (SQLite):**

```env
# SQLite database path
DATABASE_PATH=./data/bwaincell.sqlite
```

**After (PostgreSQL):**

```env
# PostgreSQL connection string
DATABASE_URL=postgresql://bwaincell:your_password@localhost:5433/bwaincell

# For Docker deployment
# DATABASE_URL=postgresql://bwaincell:your_password@postgres:5432/bwaincell

# PostgreSQL credentials (used by Docker)
POSTGRES_USER=bwaincell
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=bwaincell
```

### Update Database Configuration

**File:** `backend/database/config.js`

```javascript
require('dotenv').config({ path: '../.env' });

module.exports = {
  development: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: console.log,
  },
  test: {
    url: 'postgresql://test:test@localhost:5433/bwaincell_test',
    dialect: 'postgres',
    logging: false,
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
```

### Update Sequelize Instance

**File:** `backend/database/index.ts`

```typescript
import { Sequelize } from 'sequelize';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create Sequelize instance with PostgreSQL
const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: (sql: string) => logger.info('SQL Query', { query: sql }),
  pool: {
    max: 10, // Maximum connections
    min: 2, // Minimum connections
    acquire: 30000, // Max time to get connection (ms)
    idle: 10000, // Max idle time (ms)
  },
  dialectOptions: {
    ssl:
      process.env.NODE_ENV === 'production' && process.env.DEPLOYMENT_MODE !== 'pi'
        ? {
            require: true,
            rejectUnauthorized: false,
          }
        : false,
  },
});

export { sequelize };
```

---

## Testing Migration Success

### 1. Test Database Connection

```bash
# Using psql
psql -U bwaincell -d bwaincell -c "SELECT version();"

# Using Sequelize
cd backend
node -e "
const { sequelize } = require('./database');
sequelize.authenticate()
  .then(() => console.log('✓ Connection successful'))
  .catch(err => console.error('✗ Connection failed:', err));
"
```

### 2. Verify Table Creation

```bash
psql -U bwaincell -d bwaincell -c "\dt"
```

**Expected output:**

```
              List of relations
 Schema |      Name       | Type  |   Owner
--------+-----------------+-------+-----------
 public | budget          | table | bwaincell
 public | lists           | table | bwaincell
 public | notes           | table | bwaincell
 public | reminders       | table | bwaincell
 public | schedules       | table | bwaincell
 public | tasks           | table | bwaincell
 public | users           | table | bwaincell
```

### 3. Verify Data Import

```bash
psql -U bwaincell -d bwaincell <<EOF
SELECT 'tasks' AS table_name, COUNT(*) AS count FROM tasks
UNION ALL
SELECT 'notes', COUNT(*) FROM notes
UNION ALL
SELECT 'reminders', COUNT(*) FROM reminders
UNION ALL
SELECT 'budget', COUNT(*) FROM budget
UNION ALL
SELECT 'schedules', COUNT(*) FROM schedules
UNION ALL
SELECT 'lists', COUNT(*) FROM lists;
EOF
```

### 4. Run Application Tests

```bash
# Set DATABASE_URL to PostgreSQL
export DATABASE_URL="postgresql://bwaincell:password@localhost:5433/bwaincell"

# Run backend tests
npm run test:backend

# Run integration tests
npm run test:coverage:backend
```

### 5. Test Bot Functionality

```bash
# Start the bot
npm run dev:backend

# Test Discord commands:
# /tasks list
# /reminders list
# /notes list
```

### 6. Test API Endpoints

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test authenticated endpoint (requires valid JWT)
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/tasks
```

---

## Rollback Strategy

### Pre-Migration Backup

```bash
# Create SQLite backup
cp data/bwaincell.sqlite backup/bwaincell_$(date +%Y%m%d_%H%M%S).sqlite

# Create PostgreSQL dump (if switching back from PostgreSQL)
pg_dump -U bwaincell -d bwaincell > backup/postgres_dump_$(date +%Y%m%d_%H%M%S).sql
```

### Rollback to SQLite

1. **Stop application**

```bash
docker compose down
```

2. **Restore .env to SQLite configuration**

```env
DATABASE_PATH=./data/bwaincell.sqlite
```

3. **Comment out PostgreSQL configuration**

```typescript
// File: backend/database/index.ts
// Revert to SQLite configuration
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DATABASE_PATH || './data/bwaincell.sqlite',
  logging: false,
});
```

4. **Restore SQLite database from backup**

```bash
cp backup/bwaincell_20260111_120000.sqlite data/bwaincell.sqlite
```

5. **Restart application**

```bash
npm run dev:backend
```

---

## Common Migration Issues

### Issue 1: Connection Refused

**Error:**

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**

```bash
# Check if PostgreSQL is running
docker compose ps  # For Docker
brew services list  # For Homebrew (macOS)
sudo systemctl status postgresql  # For Linux

# Start PostgreSQL
docker compose up -d postgres  # Docker
brew services start postgresql@15  # macOS
sudo systemctl start postgresql  # Linux

# Verify port in DATABASE_URL matches PostgreSQL port
# Docker: port 5433 (mapped from 5432)
# Native: port 5432 (default)
```

### Issue 2: Authentication Failed

**Error:**

```
Error: password authentication failed for user "bwaincell"
```

**Solution:**

```bash
# Verify credentials in .env
echo $DATABASE_URL

# Reset PostgreSQL password
psql -U postgres
ALTER USER bwaincell WITH PASSWORD 'new_password';
\q

# Update .env with new password
```

### Issue 3: Database Does Not Exist

**Error:**

```
Error: database "bwaincell" does not exist
```

**Solution:**

```bash
# Create database
psql -U postgres
CREATE DATABASE bwaincell OWNER bwaincell;
\q

# Or using createdb command
createdb -U postgres -O bwaincell bwaincell
```

### Issue 4: SSL Connection Error

**Error:**

```
Error: self signed certificate
```

**Solution:**

```typescript
// File: backend/database/index.ts
dialectOptions: {
  ssl: {
    require: true,
    rejectUnauthorized: false,  // Allow self-signed certificates
  },
}
```

### Issue 5: Data Type Mismatch

**Error:**

```
Error: column "id" is of type uuid but expression is of type character varying
```

**Solution:**

```typescript
// Ensure model uses correct data type
id: {
  type: DataTypes.UUID,  // Not DataTypes.STRING
  defaultValue: DataTypes.UUIDV4,
  primaryKey: true,
}
```

### Issue 6: Foreign Key Constraint Violation

**Error:**

```
Error: insert or update on table "tasks" violates foreign key constraint
```

**Solution:**

```bash
# Import data in correct order (parent tables first)
# 1. users
# 2. lists
# 3. tasks (references lists)
# 4. notes (references tasks)

# Or temporarily disable foreign key checks
psql -U bwaincell -d bwaincell
SET session_replication_role = 'replica';
-- Import data
SET session_replication_role = 'origin';
```

### Issue 7: Slow Query Performance

**Solution:**

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_reminders_due_date ON reminders(due_date);

-- Analyze tables for query optimization
ANALYZE tasks;
ANALYZE reminders;
ANALYZE notes;
```

---

## References

- [PostgreSQL 15 Documentation](https://www.postgresql.org/docs/15/)
- [Sequelize PostgreSQL Guide](https://sequelize.org/docs/v6/other-topics/dialect-specific-things/#postgresql)
- [Database Config](c:\Users\lukaf\Desktop\Dev Work\Bwaincell\backend\database\config.js)
- [Database Index](c:\Users\lukaf\Desktop\Dev Work\Bwaincell\backend\database\index.ts)
- [ADR: PostgreSQL Migration](../architecture/adr/0002-postgresql-migration.md)

---

**Next Steps:**

- [Testing Guide](testing.md) - Write comprehensive tests
- [API Development Guide](api-development.md) - Create REST endpoints
- [Discord Bot Development Guide](discord-bot-development.md) - Create Discord commands
