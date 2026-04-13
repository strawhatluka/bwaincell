import { Sequelize } from 'sequelize';
import { createLogger } from '../shared/utils/logger';

// Create logger for database module
const logger = createLogger('Database');

// Import all models
import Task from './models/Task';
import Note from './models/Note';
import Reminder from './models/Reminder';
import Budget from './models/Budget';
import Schedule from './models/Schedule';
import List from './models/List';
import { User } from './models/User';
import EventConfig from './models/EventConfig';
import SunsetConfig from './models/SunsetConfig';

// Validate DATABASE_URL environment variable
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required for PostgreSQL connection');
}

logger.info('Initializing database connection', {
  databaseUrl: databaseUrl.replace(/:[^:@]+@/, ':****@'), // Mask password
  nodeEnv: process.env.NODE_ENV,
  deploymentMode: process.env.DEPLOYMENT_MODE,
});

// Create Sequelize instance with PostgreSQL
const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: (sql: string) => logger.info('SQL Query', { query: sql }),
  pool: {
    max: 10, // Maximum connections in pool
    min: 2, // Minimum connections in pool
    acquire: 30000, // Maximum time (ms) to get connection
    idle: 10000, // Maximum time (ms) connection can be idle
  },
  dialectOptions: {
    // Only use SSL for cloud deployments (Fly.io, Heroku, etc.)
    // Local Pi deployment uses Docker network without SSL
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
    underscored: true, // Use snake_case for columns
    freezeTableName: true,
  },
});

// Initialize all models
Task.init(sequelize);
Note.init(sequelize);
Reminder.init(sequelize);
Budget.init(sequelize);
Schedule.init(sequelize);
List.init(sequelize);
User.init(sequelize);
EventConfig.init(sequelize);
SunsetConfig.init(sequelize);

/**
 * Sync all auto-increment sequences to match actual max(id) values.
 * Prevents SequelizeUniqueConstraintError when sequences fall behind
 * (e.g., after database restore, manual inserts, or truncate without RESTART IDENTITY).
 */
export async function syncSequences(): Promise<void> {
  try {
    await sequelize.query(`
      DO $$
      DECLARE
        r RECORD;
        max_id BIGINT;
        seq_val BIGINT;
      BEGIN
        FOR r IN
          SELECT table_name, column_name,
                 pg_get_serial_sequence(table_name, column_name) AS seq_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND column_default LIKE 'nextval%'
        LOOP
          EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I',
                         r.column_name, r.table_name) INTO max_id;
          EXECUTE format('SELECT last_value FROM %s', r.seq_name) INTO seq_val;
          IF seq_val < max_id THEN
            EXECUTE format('SELECT setval(%L, %s)', r.seq_name, max_id);
          END IF;
        END LOOP;
      END $$;
    `);
    logger.info('Auto-increment sequences verified');
  } catch (error) {
    logger.warn('Failed to verify auto-increment sequences (non-fatal)', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Export sequelize instance and models
export { sequelize, Task, Note, Reminder, Budget, Schedule, List, User, EventConfig, SunsetConfig };

export default sequelize;
