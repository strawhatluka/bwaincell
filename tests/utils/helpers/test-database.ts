// Test database setup and management utilities
import { Sequelize, QueryTypes } from 'sequelize';
import path from 'path';

let testSequelize: Sequelize | null = null;
let isInitialized = false;

/**
 * Configuration for test database
 */
const TEST_DB_CONFIG = {
  dialect: 'sqlite' as const,
  storage: ':memory:', // In-memory database for fast tests
  logging: false, // Disable SQL logging in tests
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: false,
  },
  pool: {
    max: 1,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

/**
 * Sets up the test database with all models
 * @returns Promise<Sequelize> The configured test database instance
 */
export async function setupTestDatabase(): Promise<Sequelize> {
  if (testSequelize && isInitialized) {
    return testSequelize;
  }

  try {
    // Create new Sequelize instance for testing
    testSequelize = new Sequelize(TEST_DB_CONFIG);

    // Test the connection
    await testSequelize.authenticate();

    // Import and initialize all models
    await initializeModels(testSequelize);

    // Sync database schema (create tables)
    await testSequelize.sync({ force: true });

    isInitialized = true;

    return testSequelize;
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

/**
 * Cleans up the test database and closes connections
 */
export async function cleanupTestDatabase(): Promise<void> {
  if (testSequelize) {
    try {
      await testSequelize.close();
      testSequelize = null;
      isInitialized = false;
    } catch (error) {
      console.error('Error cleaning up test database:', error);
      // Don't throw - cleanup should be best effort
    }
  }
}

/**
 * Gets the current test database instance
 * @throws Error if database is not initialized
 */
export function getTestDatabase(): Sequelize {
  if (!testSequelize || !isInitialized) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return testSequelize;
}

/**
 * Clears all data from all tables while preserving schema
 */
export async function clearTestData(): Promise<void> {
  const db = getTestDatabase();

  try {
    // Get all table names
    const tables = (await db.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      { type: QueryTypes.SELECT }
    )) as { name: string }[];

    // Clear each table
    for (const table of tables) {
      await db.query(`DELETE FROM ${table.name}`);
    }

    // Reset auto-increment counters
    await db.query('DELETE FROM sqlite_sequence');
  } catch (error) {
    console.error('Error clearing test data:', error);
    throw error;
  }
}

/**
 * Creates a transaction for isolated test operations
 */
export async function createTestTransaction() {
  const db = getTestDatabase();
  return await db.transaction();
}

/**
 * Initializes all database models for testing
 */
async function initializeModels(sequelize: Sequelize): Promise<void> {
  try {
    // Import all model definitions
    const modelsPath = path.resolve(__dirname, '../../../database/models');

    // Import each model file and initialize with test sequelize
    const modelFiles = ['Task', 'Budget', 'Schedule', 'Reminder', 'List', 'Note', 'Tracker'];

    for (const modelName of modelFiles) {
      try {
        const modelModule = await import(`${modelsPath}/${modelName}`);
        if (modelModule.default && typeof modelModule.default.init === 'function') {
          modelModule.default.init(sequelize);
        }
      } catch (error) {
        console.warn(`Could not initialize model ${modelName}:`, error);
      }
    }

    // Set up associations if they exist
    try {
      const associationsModule = await import('../../../database/associations');
      if (
        (associationsModule as any).default &&
        typeof (associationsModule as any).default === 'function'
      ) {
        (associationsModule as any).default();
      }
    } catch (error) {
      console.warn('Could not set up associations:', error);
    }
  } catch (error) {
    console.error('Error initializing models:', error);
    throw error;
  }
}

/**
 * Database test utilities for common operations
 */
export const DatabaseTestUtils = {
  /**
   * Creates test data fixtures
   */
  async createFixtures(fixtures: Record<string, any[]>): Promise<void> {
    const db = getTestDatabase();

    for (const [modelName, records] of Object.entries(fixtures)) {
      const model = db.models[modelName];
      if (model) {
        await model.bulkCreate(records);
      } else {
        console.warn(`Model ${modelName} not found for fixtures`);
      }
    }
  },

  /**
   * Counts records in a table
   */
  async countRecords(modelName: string, where?: any): Promise<number> {
    const db = getTestDatabase();
    const model = db.models[modelName];

    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    return await model.count({ where });
  },

  /**
   * Finds records with optional conditions
   */
  async findRecords(modelName: string, options?: any): Promise<any[]> {
    const db = getTestDatabase();
    const model = db.models[modelName];

    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    return await model.findAll(options);
  },

  /**
   * Executes raw SQL for advanced test scenarios
   */
  async executeRawQuery(sql: string, replacements?: any): Promise<any> {
    const db = getTestDatabase();
    return await db.query(sql, {
      replacements,
      type: QueryTypes.SELECT,
    });
  },

  /**
   * Validates database schema/constraints
   */
  async validateConstraints(): Promise<boolean> {
    const db = getTestDatabase();

    try {
      // Check foreign key constraints
      await db.query('PRAGMA foreign_key_check');
      return true;
    } catch (error) {
      console.error('Constraint validation failed:', error);
      return false;
    }
  },
};

/**
 * Jest setup/teardown helpers
 */
export const JestDatabaseHelpers = {
  /**
   * Setup hook for test suites that need a database
   */
  async beforeAll(): Promise<void> {
    await setupTestDatabase();
  },

  /**
   * Cleanup hook for test suites
   */
  async afterAll(): Promise<void> {
    await cleanupTestDatabase();
  },

  /**
   * Reset hook between individual tests
   */
  async beforeEach(): Promise<void> {
    await clearTestData();
  },

  /**
   * Optional cleanup between tests
   */
  async afterEach(): Promise<void> {
    // Optional: could clear data here too
    // Currently handled by beforeEach
  },
};

/**
 * Database assertion helpers for testing
 */
export const DatabaseAssertions = {
  /**
   * Assert that a record exists with given conditions
   */
  async expectRecordExists(modelName: string, where: any): Promise<void> {
    const count = await DatabaseTestUtils.countRecords(modelName, where);
    if (count === 0) {
      throw new Error(
        `Expected record in ${modelName} with conditions ${JSON.stringify(where)} but found none`
      );
    }
  },

  /**
   * Assert that no record exists with given conditions
   */
  async expectRecordNotExists(modelName: string, where: any): Promise<void> {
    const count = await DatabaseTestUtils.countRecords(modelName, where);
    if (count > 0) {
      throw new Error(
        `Expected no record in ${modelName} with conditions ${JSON.stringify(where)} but found ${count}`
      );
    }
  },

  /**
   * Assert exact record count
   */
  async expectRecordCount(modelName: string, expectedCount: number, where?: any): Promise<void> {
    const actualCount = await DatabaseTestUtils.countRecords(modelName, where);
    if (actualCount !== expectedCount) {
      throw new Error(`Expected ${expectedCount} records in ${modelName} but found ${actualCount}`);
    }
  },
};
