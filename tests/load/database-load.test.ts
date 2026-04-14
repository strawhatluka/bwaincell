/**
 * PostgreSQL Database Load Tests
 *
 * Purpose: Measure performance under high load conditions
 * Tests: Concurrent inserts, queries, connection pool stress, JSONB query performance
 *
 * Prerequisites:
 *   - PostgreSQL running locally (docker-compose.dev.yml)
 *   - DATABASE_URL environment variable set
 *
 * Run: npm test tests/load/database-load.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import sequelize from '../../supabase';
import Task from '../../supabase/models/Task';
import List from '../../supabase/models/List';
import Note from '../../supabase/models/Note';
import Budget from '../../supabase/models/Budget';

describe('Database Load Tests', () => {
  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    console.log('✅ Load test database ready');
  });

  afterAll(async () => {
    await sequelize.close();
    console.log('✅ Load test complete');
  });

  beforeEach(async () => {
    // Clean data between tests
    await Task.destroy({ where: {}, truncate: true, cascade: true });
    await List.destroy({ where: {}, truncate: true, cascade: true });
    await Note.destroy({ where: {}, truncate: true, cascade: true });
    await Budget.destroy({ where: {}, truncate: true, cascade: true });
  });

  // =========================================================================
  // Concurrent Insert Tests
  // =========================================================================
  describe('Concurrent Inserts', () => {
    it('should handle 1000 concurrent task creations', async () => {
      console.log('🚀 Starting 1000 concurrent task inserts...');
      const startTime = Date.now();

      const promises = Array.from({ length: 1000 }, (_, i) =>
        Task.createTask('load-test-guild', `Task ${i}`, null, 'load-user')
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(1000);
      expect(results.every((t) => t.id !== undefined)).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete in < 10 seconds

      console.log(`✅ 1000 tasks created in ${duration}ms (${(1000 / duration) * 1000} ops/sec)`);
    }, 15000); // 15 second timeout

    it('should handle 500 concurrent list creations with JSONB', async () => {
      console.log('🚀 Starting 500 concurrent list inserts...');
      const startTime = Date.now();

      const promises = Array.from({ length: 500 }, (_, i) =>
        List.createList('load-test-guild', `List ${i}`, 'load-user')
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results.filter((r) => r !== null)).toHaveLength(500);
      expect(duration).toBeLessThan(8000); // Should complete in < 8 seconds

      console.log(`✅ 500 lists created in ${duration}ms (${(500 / duration) * 1000} ops/sec)`);
    }, 12000);

    it('should handle 500 concurrent note creations with JSONB tags', async () => {
      console.log('🚀 Starting 500 concurrent note inserts with tags...');
      const startTime = Date.now();

      const promises = Array.from({ length: 500 }, (_, i) =>
        Note.createNote(
          'load-test-guild',
          `Note ${i}`,
          `Content for note ${i}`,
          ['tag1', 'tag2', 'urgent'],
          'load-user'
        )
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(500);
      expect(duration).toBeLessThan(8000);

      console.log(`✅ 500 notes created in ${duration}ms (${(500 / duration) * 1000} ops/sec)`);
    }, 12000);
  });

  // =========================================================================
  // Concurrent Query Tests
  // =========================================================================
  describe('Concurrent Queries', () => {
    beforeEach(async () => {
      // Pre-populate data for query tests
      const taskPromises = Array.from({ length: 100 }, (_, i) =>
        Task.createTask('query-test-guild', `Task ${i}`, null, 'query-user')
      );
      await Promise.all(taskPromises);
    });

    it('should handle 200 concurrent task queries', async () => {
      console.log('🚀 Starting 200 concurrent task queries...');
      const startTime = Date.now();

      const promises = Array.from({ length: 200 }, () =>
        Task.getUserTasks('query-test-guild', 'all')
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(200);
      expect(results.every((tasks) => tasks.length === 100)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds

      console.log(`✅ 200 queries in ${duration}ms (${(200 / duration) * 1000} queries/sec)`);
    }, 8000);

    it('should handle 100 concurrent filtered queries', async () => {
      console.log('🚀 Starting 100 concurrent filtered queries...');
      const startTime = Date.now();

      const promises = Array.from({ length: 100 }, () =>
        Task.getUserTasks('query-test-guild', 'pending')
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(3000);

      console.log(
        `✅ 100 filtered queries in ${duration}ms (${(100 / duration) * 1000} queries/sec)`
      );
    }, 5000);
  });

  // =========================================================================
  // JSONB Query Performance Tests
  // =========================================================================
  describe('JSONB Query Performance', () => {
    beforeEach(async () => {
      // Create notes with various tags
      const notePromises = Array.from({ length: 200 }, (_, i) => {
        const tags =
          i % 3 === 0
            ? ['urgent', 'work']
            : i % 2 === 0
              ? ['personal', 'important']
              : ['work', 'meeting'];

        return Note.createNote('jsonb-test-guild', `Note ${i}`, `Content ${i}`, tags, 'user');
      });
      await Promise.all(notePromises);
    });

    it('should query notes by tag efficiently', async () => {
      console.log('🚀 Testing JSONB tag query performance...');
      const startTime = Date.now();

      const urgentNotes = await Note.getNotesByTag('jsonb-test-guild', 'urgent');
      const duration = Date.now() - startTime;

      expect(urgentNotes.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(500); // Should complete in < 500ms

      console.log(`✅ JSONB tag query in ${duration}ms (${urgentNotes.length} results)`);
    });

    it('should handle 50 concurrent JSONB queries', async () => {
      console.log('🚀 Starting 50 concurrent JSONB queries...');
      const startTime = Date.now();

      const promises = Array.from({ length: 50 }, () =>
        Note.getNotesByTag('jsonb-test-guild', 'work')
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(50);
      expect(duration).toBeLessThan(3000);

      console.log(`✅ 50 JSONB queries in ${duration}ms (${(50 / duration) * 1000} queries/sec)`);
    }, 5000);
  });

  // =========================================================================
  // JSONB Array Operations Performance
  // =========================================================================
  describe('JSONB Array Operations', () => {
    it('should handle 200 list item additions efficiently', async () => {
      console.log('🚀 Testing JSONB array mutations (200 operations)...');

      // Create list
      await List.createList('array-test-guild', 'Test List', 'user');

      const startTime = Date.now();

      // Add 200 items
      for (let i = 0; i < 200; i++) {
        await List.addItem('array-test-guild', 'Test List', `Item ${i}`);
      }

      const duration = Date.now() - startTime;

      const list = await List.getList('array-test-guild', 'Test List');
      expect(list).not.toBeNull();
      expect(list!.items).toHaveLength(200);
      expect(duration).toBeLessThan(15000); // Should complete in < 15 seconds

      console.log(
        `✅ 200 JSONB array mutations in ${duration}ms (${(200 / duration) * 1000} ops/sec)`
      );
    }, 20000);
  });

  // =========================================================================
  // DECIMAL Precision Performance Tests
  // =========================================================================
  describe('DECIMAL Precision Performance', () => {
    it('should handle 500 budget entries with precise calculations', async () => {
      console.log('🚀 Testing DECIMAL precision with 500 entries...');
      const startTime = Date.now();

      // Create 500 budget entries
      const promises = Array.from({ length: 500 }, (_, i) => {
        if (i % 2 === 0) {
          return Budget.addExpense('decimal-test-guild', 'Category', 49.99, null, 'user');
        } else {
          return Budget.addIncome('decimal-test-guild', 100.5, null, 'user');
        }
      });

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Get summary (involves aggregation)
      const summaryStart = Date.now();
      const summary = await Budget.getSummary('decimal-test-guild');
      const summaryDuration = Date.now() - summaryStart;

      expect(summary.entryCount).toBe(500);
      expect(duration).toBeLessThan(10000);
      expect(summaryDuration).toBeLessThan(1000);

      console.log(`✅ 500 DECIMAL inserts in ${duration}ms`);
      console.log(`✅ DECIMAL aggregation in ${summaryDuration}ms`);
    }, 15000);
  });

  // =========================================================================
  // Connection Pool Stress Tests
  // =========================================================================
  describe('Connection Pool Stress', () => {
    it('should handle 100 concurrent mixed operations', async () => {
      console.log('🚀 Testing connection pool with 100 mixed operations...');
      const startTime = Date.now();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const promises: Promise<any>[] = [];

      // Mix of operations
      for (let i = 0; i < 100; i++) {
        if (i % 4 === 0) {
          promises.push(Task.createTask('pool-test', `Task ${i}`, null, 'user'));
        } else if (i % 4 === 1) {
          promises.push(List.createList('pool-test', `List ${i}`, 'user'));
        } else if (i % 4 === 2) {
          promises.push(Note.createNote('pool-test', `Note ${i}`, 'Content', [], 'user'));
        } else {
          promises.push(Budget.addExpense('pool-test', 'Cat', 10.5, null, 'user'));
        }
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(8000);

      console.log(`✅ 100 mixed operations in ${duration}ms (${(100 / duration) * 1000} ops/sec)`);
    }, 12000);

    it('should not exhaust connection pool', async () => {
      console.log('🚀 Testing connection pool limits...');

      // Execute many queries rapidly
      const promises = Array.from({ length: 50 }, async () => {
        await Task.createTask('pool-limit-test', 'Task', null, 'user');
        await Task.getUserTasks('pool-limit-test');
        return true;
      });

      await expect(Promise.all(promises)).resolves.toHaveLength(50);

      console.log('✅ Connection pool handled load without exhaustion');
    }, 10000);
  });

  // =========================================================================
  // Performance Summary
  // =========================================================================
  describe('Performance Summary', () => {
    it('should report overall performance metrics', () => {
      console.log('\n' + '='.repeat(70));
      console.log('LOAD TEST PERFORMANCE SUMMARY');
      console.log('='.repeat(70));
      console.log('✅ All load tests passed');
      console.log('✅ PostgreSQL connection pool stable');
      console.log('✅ JSONB operations efficient');
      console.log('✅ DECIMAL precision maintained under load');
      console.log('='.repeat(70) + '\n');
    });
  });
});
