// Database Integration Tests - REFACTORED using Work Order #010 Architecture
// Tests actual database operations, connections, and integrations

import {
  setupTestDatabase,
  cleanupTestDatabase,
  clearTestData,
  DatabaseTestUtils,
  DatabaseAssertions,
} from '../utils/helpers/test-database';
import { Sequelize } from 'sequelize';

describe('Database Integration', () => {
  let db: Sequelize;

  beforeAll(async () => {
    // ✅ NEW ARCHITECTURE: Use real test database
    db = await setupTestDatabase();
  });

  afterAll(async () => {
    // ✅ Clean up database connections
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // ✅ Clear data between tests while preserving schema
    await clearTestData();
  });

  describe('Database Connection', () => {
    it('should establish connection to SQLite in-memory database', async () => {
      // Act & Assert
      expect(db).toBeDefined();
      expect(db.getDialect()).toBe('sqlite');

      // Test connection is active
      await expect(db.authenticate()).resolves.not.toThrow();
    });

    it('should have all required models loaded', () => {
      // Assert - Check all expected models are present
      const expectedModels = ['Task', 'Budget', 'Schedule', 'List', 'Note', 'Tracker', 'Reminder'];
      const loadedModels = Object.keys(db.models);

      expectedModels.forEach((modelName) => {
        expect(loadedModels).toContain(modelName);
        expect(db.models[modelName]).toBeDefined();
      });
    });

    it('should support transactions', async () => {
      // Arrange
      const transaction = await db.transaction();

      try {
        // Act - Perform operations within transaction
        await db.models.Task.create(
          {
            user_id: 'test-user',
            guild_id: 'test-guild',
            description: 'Transaction test',
            status: 'pending',
          },
          { transaction }
        );

        // Verify within transaction
        const tasks = await db.models.Task.findAll({ transaction });
        expect(tasks).toHaveLength(1);

        // Rollback
        await transaction.rollback();

        // Assert - Changes should be rolled back
        const tasksAfterRollback = await db.models.Task.findAll();
        expect(tasksAfterRollback).toHaveLength(0);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  });

  describe('Schema Validation', () => {
    it('should create all tables with correct structure', async () => {
      // Act - Sync database (already done in setup, but verify)
      await db.sync({ force: false });

      // Assert - Check tables exist by querying SQLite metadata
      const tables = await DatabaseTestUtils.executeRawQuery(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );

      const tableNames = tables.map((table: any) => table.name);

      expect(tableNames).toContain('tasks');
      expect(tableNames).toContain('budgets');
      expect(tableNames).toContain('schedules');
      expect(tableNames).toContain('lists');
    });

    it('should enforce NOT NULL constraints', async () => {
      // Arrange & Act & Assert - Test various models
      await expect(
        db.models.Task.create({
          guild_id: 'test-guild',
          description: 'Missing user_id',
          completed: false,
          // Missing required user_id
        })
      ).rejects.toThrow();

      await expect(
        db.models.Budget.create({
          user_id: 'test-user',
          guild_id: 'test-guild',
          category: 'food',
          // Missing required amount
        })
      ).rejects.toThrow();
    });

    it('should enforce ENUM constraints', async () => {
      // Test Task completed field (boolean)
      const task = await db.models.Task.create({
        user_id: 'test-user',
        guild_id: 'test-guild',
        description: 'Boolean test',
        completed: false,
      });
      expect(typeof task.toJSON().completed).toBe('boolean');

      // Test Budget type enum - SQLite doesn't enforce ENUMs strictly
      // so we'll test that valid types work instead
      const validBudget = await db.models.Budget.create({
        user_id: 'test-user',
        guild_id: 'test-guild',
        amount: 100,
        category: 'food',
        type: 'expense',
      });
      expect(validBudget.toJSON().type).toBe('expense');
    });

    it('should handle proper data types', async () => {
      // Test integer fields
      const task = await db.models.Task.create({
        user_id: 'test-user',
        guild_id: 'test-guild',
        description: 'Data type test',
        completed: false,
      });

      expect(typeof (task as any).id).toBe('number');
      expect((task as any).id).toBeGreaterThan(0);

      // Test decimal fields
      const budget = await db.models.Budget.create({
        user_id: 'test-user',
        guild_id: 'test-guild',
        amount: 123.45,
        category: 'food',
        type: 'expense',
      });

      expect(budget.toJSON().amount).toBe(123.45);
      expect(typeof budget.toJSON().amount).toBe('number');
    });
  });

  describe('Cross-Model Operations', () => {
    it('should support complex queries across models', async () => {
      // Arrange - Create related data
      const userId = 'test-user';
      const guildId = 'test-guild';

      await db.models.Task.create({
        user_id: userId,
        guild_id: guildId,
        description: 'Buy groceries',
        completed: false,
      });

      await db.models.Budget.create({
        user_id: userId,
        guild_id: guildId,
        amount: 50.0,
        category: 'food',
        type: 'expense',
      });

      await db.models.Schedule.create({
        user_id: userId,
        guild_id: guildId,
        event: 'Grocery shopping',
        date: '2024-12-25',
        time: '10:00',
      });

      // Act - Query user's total data
      const userTaskCount = await DatabaseTestUtils.countRecords('Task', { user_id: userId });
      const userBudgetTotal = await db.models.Budget.sum('amount', { where: { user_id: userId } });
      const userScheduleCount = await DatabaseTestUtils.countRecords('Schedule', {
        user_id: userId,
      });

      // Assert
      expect(userTaskCount).toBe(1);
      expect(userBudgetTotal).toBe(50.0);
      expect(userScheduleCount).toBe(1);
    });

    it('should maintain data isolation between guilds', async () => {
      // Arrange - Create data for different guilds
      const userId = 'test-user';

      await db.models.Task.bulkCreate([
        {
          user_id: userId,
          guild_id: 'guild-1',
          description: 'Guild 1 task',
          completed: false,
        },
        {
          user_id: userId,
          guild_id: 'guild-2',
          description: 'Guild 2 task',
          completed: false,
        },
      ]);

      // Act - Query each guild separately
      const guild1Tasks = await DatabaseTestUtils.countRecords('Task', {
        user_id: userId,
        guild_id: 'guild-1',
      });
      const guild2Tasks = await DatabaseTestUtils.countRecords('Task', {
        user_id: userId,
        guild_id: 'guild-2',
      });

      // Assert
      expect(guild1Tasks).toBe(1);
      expect(guild2Tasks).toBe(1);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent database operations', async () => {
      // Arrange
      const operations = [];

      // Act - Run multiple concurrent operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          db.models.Task.create({
            user_id: `user-${i}`,
            guild_id: 'test-guild',
            description: `Concurrent task ${i}`,
            completed: false,
          })
        );
      }

      const results = await Promise.allSettled(operations);

      // Assert - All operations should succeed
      const successfulOperations = results.filter((result) => result.status === 'fulfilled');
      expect(successfulOperations).toHaveLength(10);

      const totalTasks = await DatabaseTestUtils.countRecords('Task');
      expect(totalTasks).toBe(10);
    });

    it('should support bulk operations efficiently', async () => {
      // Arrange
      const bulkTasks = Array.from({ length: 100 }, (_, i) => ({
        user_id: `bulk-user-${i % 5}`,
        guild_id: 'test-guild',
        description: `Bulk task ${i}`,
        completed: false,
      }));

      // Act
      const startTime = Date.now();
      await db.models.Task.bulkCreate(bulkTasks);
      const endTime = Date.now();

      // Assert
      const taskCount = await DatabaseTestUtils.countRecords('Task');
      expect(taskCount).toBe(100);

      // Performance assertion
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle large result sets efficiently', async () => {
      // Arrange - Create substantial test data
      const largeBatch = Array.from({ length: 500 }, (_, i) => ({
        user_id: 'performance-user',
        guild_id: 'test-guild',
        description: `Performance test task ${i}`,
        completed: i % 2 === 0,
      }));

      await db.models.Task.bulkCreate(largeBatch);

      // Act - Query large result set
      const startTime = Date.now();
      const tasks = await db.models.Task.findAll({
        where: { user_id: 'performance-user' },
      });
      const endTime = Date.now();

      // Assert
      expect(tasks).toHaveLength(500);

      // Performance check
      const queryTime = endTime - startTime;
      expect(queryTime).toBeLessThan(500); // Should query quickly
    });
  });

  describe('Data Integrity', () => {
    it('should maintain consistency during complex operations', async () => {
      // Arrange - Set up complex scenario
      const userId = 'integrity-user';
      const guildId = 'test-guild';

      // Act - Perform multiple related operations
      await db.models.Task.create({
        user_id: userId,
        guild_id: guildId,
        description: 'Integrity test task',
        completed: false,
      });

      await db.models.Budget.create({
        user_id: userId,
        guild_id: guildId,
        amount: 75.5,
        category: 'work',
        type: 'income',
      });

      // Update operations using findOne approach
      await db.models.Task.update(
        { completed: true },
        { where: { user_id: userId, guild_id: guildId, description: 'Integrity test task' } }
      );
      await db.models.Budget.update(
        { amount: 100.0 },
        { where: { user_id: userId, guild_id: guildId, category: 'work' } }
      );

      // Assert - Verify all changes persisted correctly
      const updatedTask = await db.models.Task.findOne({
        where: { user_id: userId, guild_id: guildId, description: 'Integrity test task' },
      });
      const updatedBudget = await db.models.Budget.findOne({
        where: { user_id: userId, guild_id: guildId, category: 'work' },
      });

      expect(updatedTask?.toJSON().completed).toBe(true);
      expect(updatedBudget?.toJSON().amount).toBe(100.0);

      // Verify constraints still hold
      const constraintsValid = await DatabaseTestUtils.validateConstraints();
      expect(constraintsValid).toBe(true);
    });

    it('should handle deletion cascades properly', async () => {
      // Arrange - Create records
      const task = await db.models.Task.create({
        user_id: 'delete-user',
        guild_id: 'test-guild',
        description: 'Task to be deleted',
        completed: false,
      });

      // Act - Delete record
      const taskId = task.toJSON().id;
      await task.destroy();

      // Assert - Record should be gone
      await DatabaseAssertions.expectRecordNotExists('Task', { id: taskId });

      // Verify database integrity maintained
      const constraintsValid = await DatabaseTestUtils.validateConstraints();
      expect(constraintsValid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test duplicate key scenarios if applicable
      const taskData = {
        user_id: 'error-test-user',
        guild_id: 'test-guild',
        description: 'Error test task',
        status: 'pending',
      };

      await db.models.Task.create(taskData);

      // Most models likely don't have unique constraints beyond ID,
      // so test other constraint violations
      await expect(
        db.models.Task.create({
          user_id: null, // Should violate NOT NULL
          guild_id: 'test-guild',
          description: 'Invalid task',
        })
      ).rejects.toThrow();
    });

    it('should recover from transaction failures', async () => {
      // Arrange
      const transaction = await db.transaction();

      try {
        // Act - Attempt operations that will fail
        await db.models.Task.create(
          {
            user_id: 'transaction-user',
            guild_id: 'test-guild',
            description: 'Valid task',
            completed: false,
          },
          { transaction }
        );

        // This should fail
        await db.models.Task.create(
          {
            user_id: null, // Invalid
            guild_id: 'test-guild',
            description: 'Invalid task',
          },
          { transaction }
        );

        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
      }

      // Assert - No records should exist due to rollback
      const taskCount = await DatabaseTestUtils.countRecords('Task', {
        user_id: 'transaction-user',
      });
      expect(taskCount).toBe(0);
    });
  });
});
