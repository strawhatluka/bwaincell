/**
 * PostgreSQL Database Integration Tests
 *
 * Purpose: Validate PostgreSQL integration with all 7 models
 * Tests: CRUD operations, JSONB columns, DECIMAL precision, timezone handling
 *
 * Prerequisites:
 *   - PostgreSQL running locally (docker-compose.dev.yml)
 *   - DATABASE_URL environment variable set
 *
 * Run: npm test tests/integration/database-postgres.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import sequelize from '../../supabase';
import Task from '../../supabase/models/Task';
import List from '../../supabase/models/List';
import Note from '../../supabase/models/Note';
import Reminder from '../../supabase/models/Reminder';
import Budget from '../../supabase/models/Budget';
import Schedule from '../../supabase/models/Schedule';
import { User } from '../../supabase/models/User';

describe('PostgreSQL Database Integration Tests', () => {
  beforeAll(async () => {
    // Connect to PostgreSQL
    await sequelize.authenticate();
    console.log('✅ Connected to PostgreSQL');

    // Sync schema (create tables if they don't exist)
    await sequelize.sync({ force: true });
    console.log('✅ Schema synced');
  });

  afterAll(async () => {
    await sequelize.close();
    console.log('✅ Disconnected from PostgreSQL');
  });

  beforeEach(async () => {
    // Clean up data between tests
    await Task.destroy({ where: {}, truncate: true, cascade: true });
    await List.destroy({ where: {}, truncate: true, cascade: true });
    await Note.destroy({ where: {}, truncate: true, cascade: true });
    await Reminder.destroy({ where: {}, truncate: true, cascade: true });
    await Budget.destroy({ where: {}, truncate: true, cascade: true });
    await Schedule.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  // =========================================================================
  // Task Model Tests
  // =========================================================================
  describe('Task Model', () => {
    it('should create task with all fields', async () => {
      const task = await Task.createTask(
        'test-guild',
        'Buy groceries',
        new Date('2026-12-31'),
        'test-user'
      );

      expect(task.id).toBeDefined();
      expect(task.description).toBe('Buy groceries');
      expect(task.guild_id).toBe('test-guild');
      expect(task.user_id).toBe('test-user');
      expect(task.completed).toBe(false);
      expect(task.due_date).toBeInstanceOf(Date);
    });

    it('should retrieve user tasks', async () => {
      await Task.createTask('test-guild', 'Task 1', null, 'user1');
      await Task.createTask('test-guild', 'Task 2', null, 'user1');
      await Task.createTask('other-guild', 'Task 3', null, 'user1');

      const tasks = await Task.getUserTasks('test-guild');
      expect(tasks).toHaveLength(2);
    });

    it('should complete task and set completed_at timestamp', async () => {
      const task = await Task.createTask('test-guild', 'Test', null, 'user1');
      const completed = await Task.completeTask(task.id, 'test-guild');

      expect(completed).not.toBeNull();
      expect(completed!.completed).toBe(true);
      expect(completed!.completed_at).toBeInstanceOf(Date);
    });
  });

  // =========================================================================
  // List Model Tests - JSONB Column
  // =========================================================================
  describe('List Model - JSONB Items', () => {
    it('should create list with JSONB items array', async () => {
      const list = await List.createList('test-guild', 'Groceries', 'user1');

      expect(list).not.toBeNull();
      expect(list!.name).toBe('Groceries');
      expect(list!.items).toEqual([]);
    });

    it('should add item to JSONB array', async () => {
      await List.createList('test-guild', 'Groceries', 'user1');
      const updated = await List.addItem('test-guild', 'Groceries', 'Milk');

      expect(updated).not.toBeNull();
      expect(updated!.items).toHaveLength(1);
      expect(updated!.items[0].text).toBe('Milk');
      expect(updated!.items[0].completed).toBe(false);
    });

    it('should toggle item completion in JSONB', async () => {
      await List.createList('test-guild', 'Groceries', 'user1');
      await List.addItem('test-guild', 'Groceries', 'Milk');
      const toggled = await List.toggleItem('test-guild', 'Groceries', 'Milk');

      expect(toggled).not.toBeNull();
      expect(toggled!.items[0].completed).toBe(true);
    });

    it('should remove item from JSONB array', async () => {
      await List.createList('test-guild', 'Groceries', 'user1');
      await List.addItem('test-guild', 'Groceries', 'Milk');
      await List.addItem('test-guild', 'Groceries', 'Bread');
      const removed = await List.removeItem('test-guild', 'Groceries', 'Milk');

      expect(removed).not.toBeNull();
      expect(removed!.items).toHaveLength(1);
      expect(removed!.items[0].text).toBe('Bread');
    });
  });

  // =========================================================================
  // Note Model Tests - JSONB Tags
  // =========================================================================
  describe('Note Model - JSONB Tags', () => {
    it('should create note with JSONB tags array', async () => {
      const note = await Note.createNote(
        'test-guild',
        'Meeting Notes',
        'Discuss Q4 goals',
        ['work', 'important'],
        'user1'
      );

      expect(note.id).toBeDefined();
      expect(note.tags).toEqual(['work', 'important']);
    });

    it('should update note tags', async () => {
      const note = await Note.createNote('test-guild', 'Test', 'Content', ['tag1'], 'user1');
      const updated = await Note.updateNote(note.id, 'test-guild', {
        tags: ['tag1', 'tag2', 'tag3'],
      });

      expect(updated).not.toBeNull();
      expect(updated!.tags).toHaveLength(3);
      expect(updated!.tags).toContain('tag2');
    });

    it('should get notes by tag', async () => {
      await Note.createNote('test-guild', 'Note 1', 'Content', ['urgent'], 'user1');
      await Note.createNote('test-guild', 'Note 2', 'Content', ['work'], 'user1');
      await Note.createNote('test-guild', 'Note 3', 'Content', ['urgent', 'work'], 'user1');

      const urgentNotes = await Note.getNotesByTag('test-guild', 'urgent');
      expect(urgentNotes).toHaveLength(2);
    });
  });

  // =========================================================================
  // Reminder Model Tests - Timezone Handling
  // =========================================================================
  describe('Reminder Model - Timezone', () => {
    it('should create reminder with next_trigger timestamp', async () => {
      const reminder = await Reminder.createReminder(
        'test-guild',
        'test-channel',
        'Take medicine',
        '14:00',
        'daily',
        null,
        'user1'
      );

      expect(reminder.id).toBeDefined();
      expect(reminder.next_trigger).toBeInstanceOf(Date);
      expect(reminder.active).toBe(true);
    });

    it('should get active reminders', async () => {
      await Reminder.createReminder('test-guild', 'channel1', 'Reminder 1', '10:00', 'daily');
      await Reminder.createReminder('test-guild', 'channel1', 'Reminder 2', '15:00', 'daily');

      const active = await Reminder.getActiveReminders();
      expect(active.length).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // Budget Model Tests - DECIMAL Precision
  // =========================================================================
  describe('Budget Model - DECIMAL Precision', () => {
    it('should store currency with exact precision (DECIMAL)', async () => {
      const expense = await Budget.addExpense(
        'test-guild',
        'Groceries',
        49.99,
        'Whole Foods',
        'user1'
      );

      expect(expense.amount).toBe(49.99);
      expect(expense.type).toBe('expense');
      expect(expense.category).toBe('Groceries');
    });

    it('should calculate budget summary with precise arithmetic', async () => {
      await Budget.addIncome('test-guild', 1000.0, 'Salary', 'user1');
      await Budget.addExpense('test-guild', 'Groceries', 49.99, null, 'user1');
      await Budget.addExpense('test-guild', 'Gas', 35.5, null, 'user1');

      const summary = await Budget.getSummary('test-guild');

      expect(summary.income).toBe('1000.00');
      expect(summary.expenses).toBe('85.49');
      expect(summary.balance).toBe('914.51');
    });

    it('should aggregate category totals with DECIMAL precision', async () => {
      await Budget.addExpense('test-guild', 'Groceries', 49.99, null, 'user1');
      await Budget.addExpense('test-guild', 'Groceries', 35.5, null, 'user1');
      await Budget.addExpense('test-guild', 'Gas', 60.0, null, 'user1');

      const categories = await Budget.getCategories('test-guild');
      const groceries = categories.find((c) => c.category === 'Groceries');

      expect(groceries).toBeDefined();
      expect(groceries!.total).toBe('85.49');
    });
  });

  // =========================================================================
  // Schedule Model Tests
  // =========================================================================
  describe('Schedule Model', () => {
    it('should create event with date and time', async () => {
      const event = await Schedule.addEvent(
        'test-guild',
        'Doctor Appointment',
        '2026-12-15',
        '14:30',
        'Annual checkup',
        'user1'
      );

      expect(event.id).toBeDefined();
      expect(event.event).toBe('Doctor Appointment');
      expect(event.date).toBe('2026-12-15');
      expect(event.time).toBe('14:30');
    });

    it('should get upcoming events', async () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      await Schedule.addEvent('test-guild', 'Event 1', today, '10:00', null, 'user1');
      await Schedule.addEvent('test-guild', 'Event 2', tomorrow, '15:00', null, 'user1');

      const upcoming = await Schedule.getUpcomingEvents('test-guild', 7);
      expect(upcoming.length).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // User Model Tests
  // =========================================================================
  describe('User Model', () => {
    it('should create user with all fields', async () => {
      const user = await User.create({
        googleId: 'google-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/photo.jpg',
        discordId: 'discord-456',
        guildId: 'test-guild',
        refreshToken: 'refresh-token-abc',
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should enforce unique email constraint', async () => {
      await User.create({
        googleId: 'google-123',
        email: 'duplicate@example.com',
        name: 'User 1',
        discordId: 'discord-1',
        guildId: 'guild-1',
        picture: null,
        refreshToken: null,
      });

      await expect(
        User.create({
          googleId: 'google-456',
          email: 'duplicate@example.com',
          name: 'User 2',
          discordId: 'discord-2',
          guildId: 'guild-2',
          picture: null,
          refreshToken: null,
        })
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // Connection Pool Tests
  // =========================================================================
  describe('Connection Pool', () => {
    it('should handle multiple concurrent queries', async () => {
      const promises = Array.from({ length: 50 }, (_, i) =>
        Task.createTask('test-guild', `Concurrent Task ${i}`, null, 'user1')
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(50);
      expect(results.every((t) => t.id !== undefined)).toBe(true);
    });

    it('should reuse connections from pool', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const poolInfo = (sequelize.connectionManager as any).pool;

      // Execute multiple queries
      await Task.createTask('test-guild', 'Task 1', null, 'user1');
      await Task.createTask('test-guild', 'Task 2', null, 'user1');
      await Task.createTask('test-guild', 'Task 3', null, 'user1');

      const finalConnections = poolInfo ? poolInfo.size : 0;

      // Connection count should be within pool limits (2-10)
      expect(finalConnections).toBeGreaterThanOrEqual(2);
      expect(finalConnections).toBeLessThanOrEqual(10);
    });
  });
});
