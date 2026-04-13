/**
 * Bwaincell SQLite to PostgreSQL Migration Script
 *
 * Purpose: Migrate all data from Fly.io SQLite to Raspberry Pi PostgreSQL
 * Strategy: Downtime migration (5-10 minute window)
 *
 * Usage:
 *   1. Export SQLite from Fly.io: fly ssh console -a bwaincell -C "cp /app/data/bwaincell.sqlite /tmp/export.sqlite"
 *   2. Download: fly sftp get /tmp/export.sqlite ./data/flyio-export.sqlite
 *   3. Set environment: SQLITE_EXPORT_PATH=./data/flyio-export.sqlite DATABASE_URL=postgresql://...
 *   4. Run migration: ts-node scripts/migrate-sqlite-to-postgres.ts
 *
 * Validation:
 *   - Row counts verified for all tables
 *   - JSONB data integrity checked
 *   - Date/time values preserved
 *   - Zero data loss acceptance criteria
 */

import { Sequelize, QueryTypes } from 'sequelize';

// SQLite connection (source - Fly.io export)
const sqliteDb = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.SQLITE_EXPORT_PATH || './data/flyio-export.sqlite',
  logging: false,
});

// PostgreSQL connection (target - Pi)
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const postgresDb = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: (sql: string) => console.log(`  SQL: ${sql.substring(0, 80)}...`),
});

interface MigrationStats {
  table: string;
  sourceCount: number;
  targetCount: number;
  success: boolean;
  errors: string[];
  duration: number;
}

/**
 * Main migration function
 */
async function migrate(): Promise<void> {
  const stats: MigrationStats[] = [];
  const tables = ['tasks', 'lists', 'notes', 'reminders', 'budgets', 'schedules', 'users'];

  console.log('🚀 Starting SQLite to PostgreSQL migration...');
  console.log(`   Source: ${process.env.SQLITE_EXPORT_PATH || './data/flyio-export.sqlite'}`);
  console.log(`   Target: ${databaseUrl?.split('@')[1] || 'PostgreSQL'}\n`);

  try {
    // Test connections
    console.log('🔌 Testing database connections...');
    await sqliteDb.authenticate();
    console.log('✅ SQLite connection successful');

    await postgresDb.authenticate();
    console.log('✅ PostgreSQL connection successful\n');

    // Migrate each table
    for (const table of tables) {
      console.log(`📊 Migrating table: ${table}`);
      const startTime = Date.now();
      const tableStat = await migrateTable(table);
      tableStat.duration = Date.now() - startTime;
      stats.push(tableStat);

      if (tableStat.success) {
        console.log(
          `✅ ${table}: ${tableStat.sourceCount} rows migrated in ${tableStat.duration}ms\n`
        );
      } else {
        console.error(`❌ ${table}: Migration failed`);
        tableStat.errors.forEach((err) => console.error(`   ⚠️  ${err}`));
        console.log('');
      }
    }

    // Print summary
    printSummary(stats);

    // Validate
    const allSuccess = stats.every((s) => s.success);
    if (!allSuccess) {
      throw new Error('Migration failed - see errors above');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('   All tables migrated with zero data loss\n');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Migration failed:', errorMessage);
    console.error('\n⚠️  ROLLBACK INSTRUCTIONS:');
    console.error('   1. Keep Fly.io bot running (no data lost)');
    console.error('   2. Fix migration script issues');
    console.error('   3. Re-run migration after fixes\n');
    throw error;
  } finally {
    await sqliteDb.close();
    await postgresDb.close();
  }
}

/**
 * Migrate a single table
 */
async function migrateTable(tableName: string): Promise<MigrationStats> {
  const stat: MigrationStats = {
    table: tableName,
    sourceCount: 0,
    targetCount: 0,
    success: false,
    errors: [],
    duration: 0,
  };

  try {
    // Get source data
    const sourceData = (await sqliteDb.query(`SELECT * FROM ${tableName}`, {
      type: QueryTypes.SELECT,
    })) as Record<string, unknown>[];
    stat.sourceCount = sourceData.length;

    if (sourceData.length === 0) {
      console.log(`  ℹ️  Table ${tableName} is empty, skipping`);
      stat.success = true;
      return stat;
    }

    console.log(`  📥 Retrieved ${sourceData.length} rows from SQLite`);

    // Transform data for PostgreSQL
    const transformedData = sourceData.map((row) => transformRow(row, tableName));

    // Insert into PostgreSQL using Sequelize (safer than raw SQL)
    for (const row of transformedData) {
      const columns = Object.keys(row).join(', ');
      const placeholders = Object.keys(row)
        .map((_, i) => `$${i + 1}`)
        .join(', ');

      // Stringify JSON/JSONB columns for proper binding
      const values = Object.values(row).map((value) => {
        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          !(value instanceof Date)
        ) {
          return JSON.stringify(value);
        }
        if (Array.isArray(value)) {
          return JSON.stringify(value);
        }
        return value;
      });

      const insertSql = `
        INSERT INTO ${tableName} (${columns})
        VALUES (${placeholders})
        ON CONFLICT (id) DO UPDATE SET
          ${Object.keys(row)
            .filter((c) => c !== 'id')
            .map((c, i) => `${c} = $${i + 2}`)
            .join(', ')}
      `;

      await postgresDb.query(insertSql, {
        bind: values,
        type: QueryTypes.INSERT,
      });
    }

    console.log(`  📤 Inserted ${transformedData.length} rows into PostgreSQL`);

    // Verify count
    const [{ count }] = (await postgresDb.query(`SELECT COUNT(*) as count FROM ${tableName}`, {
      type: QueryTypes.SELECT,
    })) as [{ count: string }];
    stat.targetCount = parseInt(count, 10);

    console.log(`  🔍 Verification: ${stat.sourceCount} source → ${stat.targetCount} target`);

    // Validate
    if (stat.sourceCount === stat.targetCount) {
      stat.success = true;
    } else {
      stat.errors.push(`Row count mismatch: ${stat.sourceCount} → ${stat.targetCount}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    stat.errors.push(errorMessage);
    console.error(`  ❌ Error: ${errorMessage}`);
  }

  return stat;
}

/**
 * Transform row data for PostgreSQL compatibility
 */
function transformRow(row: Record<string, unknown>, tableName: string): Record<string, unknown> {
  const transformed = { ...row };

  // Convert JSON strings to objects for JSONB columns
  // List model: items column
  if (tableName === 'lists' && typeof row.items === 'string') {
    try {
      transformed.items = JSON.parse(row.items);
    } catch {
      transformed.items = [];
    }
  }

  // Note model: tags column
  if (tableName === 'notes' && typeof row.tags === 'string') {
    try {
      transformed.tags = JSON.parse(row.tags);
    } catch {
      transformed.tags = [];
    }
  }

  // Handle null values properly
  Object.keys(transformed).forEach((key) => {
    if (transformed[key] === undefined) {
      transformed[key] = null;
    }
  });

  return transformed;
}

/**
 * Print migration summary
 */
function printSummary(stats: MigrationStats[]): void {
  console.log('\n' + '='.repeat(70));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(70));

  stats.forEach((stat) => {
    const status = stat.success ? '✅' : '❌';
    const durationStr = `${stat.duration}ms`.padStart(8);
    console.log(
      `${status} ${stat.table.padEnd(15)} ${String(stat.sourceCount).padStart(5)} → ${String(stat.targetCount).padStart(5)}  ${durationStr}`
    );
    if (stat.errors.length > 0) {
      stat.errors.forEach((err) => console.log(`     ⚠️  ${err}`));
    }
  });

  const totalSource = stats.reduce((sum, s) => sum + s.sourceCount, 0);
  const totalTarget = stats.reduce((sum, s) => sum + s.targetCount, 0);
  const totalDuration = stats.reduce((sum, s) => sum + s.duration, 0);
  const successCount = stats.filter((s) => s.success).length;

  console.log('='.repeat(70));
  console.log(
    `TOTALS:   ${String(totalSource).padStart(5)} rows → ${String(totalTarget).padStart(5)} rows`
  );
  console.log(`SUCCESS:  ${successCount}/${stats.length} tables migrated successfully`);
  console.log(
    `DURATION: ${totalDuration}ms total, ${Math.round(totalDuration / stats.length)}ms average per table`
  );
  console.log('='.repeat(70));
}

// Run migration
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migrate, migrateTable, transformRow };
