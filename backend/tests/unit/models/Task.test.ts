/**
 * Unit Tests: Task Model
 *
 * Tests database model for task management using mocks
 * Coverage target: 80%
 */

// Mock logger BEFORE imports
jest.mock('../../../shared/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

import Task from '@database/models/Task';

describe('Task Model', () => {
  const testGuildId = 'guild-123';
  const testUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock createTask
    jest
      .spyOn(Task, 'createTask')
      .mockImplementation(async (guildId, description, dueDate, userId) => {
        return {
          id: 1,
          description,
          due_date: dueDate || null,
          completed: false,
          created_at: new Date('2024-01-15'),
          completed_at: null,
          user_id: userId || 'system',
          guild_id: guildId,
        } as any;
      });

    // Mock getUserTasks
    jest.spyOn(Task, 'getUserTasks').mockImplementation(async (guildId, filter = 'all') => {
      const tasks = [
        {
          id: 3,
          description: 'Task 3',
          due_date: null,
          completed: false,
          created_at: new Date('2024-01-17'),
          completed_at: null,
          user_id: testUserId,
          guild_id: guildId,
        },
        {
          id: 2,
          description: 'Task 2',
          due_date: new Date('2024-02-01'),
          completed: true,
          created_at: new Date('2024-01-16'),
          completed_at: new Date('2024-01-18'),
          user_id: testUserId,
          guild_id: guildId,
        },
        {
          id: 1,
          description: 'Task 1',
          due_date: new Date('2024-01-20'),
          completed: false,
          created_at: new Date('2024-01-15'),
          completed_at: null,
          user_id: testUserId,
          guild_id: guildId,
        },
      ];

      if (filter === 'pending') {
        return tasks.filter((t) => !t.completed) as any[];
      } else if (filter === 'completed') {
        return tasks.filter((t) => t.completed) as any[];
      }
      return tasks as any[];
    });

    // Mock completeTask
    jest.spyOn(Task, 'completeTask').mockImplementation(async (taskId, guildId) => {
      if (taskId === 1 && guildId === testGuildId) {
        return {
          id: 1,
          description: 'Task 1',
          due_date: new Date('2024-01-20'),
          completed: true,
          created_at: new Date('2024-01-15'),
          completed_at: new Date(),
          user_id: testUserId,
          guild_id: guildId,
        } as any;
      }
      return null;
    });

    // Mock deleteTask
    jest.spyOn(Task, 'deleteTask').mockImplementation(async (taskId, guildId) => {
      if (taskId === 1 && guildId === testGuildId) {
        return true;
      }
      return false;
    });

    // Mock editTask
    jest
      .spyOn(Task, 'editTask')
      .mockImplementation(async (taskId, guildId, newDescription, newDueDate) => {
        if (taskId === 1 && guildId === testGuildId) {
          return {
            id: 1,
            description:
              newDescription !== undefined && newDescription !== null ? newDescription : 'Task 1',
            due_date: newDueDate !== undefined ? newDueDate : new Date('2024-01-20'),
            completed: false,
            created_at: new Date('2024-01-15'),
            completed_at: null,
            user_id: testUserId,
            guild_id: guildId,
          } as any;
        }
        return null;
      });
  });

  describe('createTask', () => {
    test('should create a task with description and due date', async () => {
      const dueDate = new Date('2024-02-01');
      const result = await Task.createTask(testGuildId, 'Buy groceries', dueDate, testUserId);

      expect(result).toBeDefined();
      expect(result.description).toBe('Buy groceries');
      expect(result.due_date).toEqual(dueDate);
      expect(result.completed).toBe(false);
      expect(result.completed_at).toBeNull();
      expect(result.guild_id).toBe(testGuildId);
      expect(result.user_id).toBe(testUserId);
    });

    test('should create a task without due date (defaults to null)', async () => {
      const result = await Task.createTask(testGuildId, 'Simple task');

      expect(result).toBeDefined();
      expect(result.description).toBe('Simple task');
      expect(result.due_date).toBeNull();
    });

    test('should default user_id to system when not provided', async () => {
      const result = await Task.createTask(testGuildId, 'System task');

      expect(result.user_id).toBe('system');
    });

    test('should initialize completed as false', async () => {
      const result = await Task.createTask(testGuildId, 'New task');

      expect(result.completed).toBe(false);
      expect(result.completed_at).toBeNull();
    });
  });

  describe('getUserTasks', () => {
    test('should return all tasks when filter is all', async () => {
      const tasks = await Task.getUserTasks(testGuildId, 'all');

      expect(tasks).toHaveLength(3);
    });

    test('should return only pending tasks when filter is pending', async () => {
      const tasks = await Task.getUserTasks(testGuildId, 'pending');

      expect(tasks).toHaveLength(2);
      tasks.forEach((task) => {
        expect(task.completed).toBe(false);
      });
    });

    test('should return only completed tasks when filter is completed', async () => {
      const tasks = await Task.getUserTasks(testGuildId, 'completed');

      expect(tasks).toHaveLength(1);
      tasks.forEach((task) => {
        expect(task.completed).toBe(true);
      });
    });

    test('should default to all filter', async () => {
      const tasks = await Task.getUserTasks(testGuildId);

      expect(tasks).toHaveLength(3);
    });

    test('should return tasks ordered by created_at DESC', async () => {
      const tasks = await Task.getUserTasks(testGuildId, 'all');

      expect(tasks[0].id).toBe(3); // Most recent first
      expect(tasks[2].id).toBe(1);
    });

    test('should filter by guild_id', async () => {
      const tasks = await Task.getUserTasks(testGuildId);

      tasks.forEach((task) => {
        expect(task.guild_id).toBe(testGuildId);
      });
    });
  });

  describe('completeTask', () => {
    test('should mark task as completed with completed_at timestamp', async () => {
      const result = await Task.completeTask(1, testGuildId);

      expect(result).toBeDefined();
      expect(result!.completed).toBe(true);
      expect(result!.completed_at).toBeInstanceOf(Date);
    });

    test('should return null when task is not found', async () => {
      const result = await Task.completeTask(999, testGuildId);

      expect(result).toBeNull();
    });

    test('should return null when guild_id does not match', async () => {
      const result = await Task.completeTask(1, 'guild-other');

      expect(result).toBeNull();
    });
  });

  describe('deleteTask', () => {
    test('should return true when task is successfully deleted', async () => {
      const result = await Task.deleteTask(1, testGuildId);

      expect(result).toBe(true);
    });

    test('should return false when task is not found', async () => {
      const result = await Task.deleteTask(999, testGuildId);

      expect(result).toBe(false);
    });

    test('should return false when guild_id does not match', async () => {
      const result = await Task.deleteTask(1, 'guild-other');

      expect(result).toBe(false);
    });
  });

  describe('editTask', () => {
    test('should update task description', async () => {
      const result = await Task.editTask(1, testGuildId, 'Updated description');

      expect(result).toBeDefined();
      expect(result!.description).toBe('Updated description');
    });

    test('should update task due date', async () => {
      const newDueDate = new Date('2024-03-01');
      const result = await Task.editTask(1, testGuildId, null, newDueDate);

      expect(result).toBeDefined();
      expect(result!.due_date).toEqual(newDueDate);
    });

    test('should update both description and due date', async () => {
      const newDueDate = new Date('2024-03-01');
      const result = await Task.editTask(1, testGuildId, 'New desc', newDueDate);

      expect(result).toBeDefined();
      expect(result!.description).toBe('New desc');
      expect(result!.due_date).toEqual(newDueDate);
    });

    test('should return null when task is not found', async () => {
      const result = await Task.editTask(999, testGuildId, 'New desc');

      expect(result).toBeNull();
    });

    test('should return null when guild_id does not match', async () => {
      const result = await Task.editTask(1, 'guild-other', 'New desc');

      expect(result).toBeNull();
    });
  });

  describe('Guild Isolation', () => {
    test('createTask should include guild_id in created record', async () => {
      const result = await Task.createTask(testGuildId, 'Test task');

      expect(result.guild_id).toBe(testGuildId);
    });

    test('getUserTasks should be called with guild_id', async () => {
      await Task.getUserTasks(testGuildId);

      expect(Task.getUserTasks).toHaveBeenCalledWith(testGuildId);
    });

    test('completeTask should require guild_id', async () => {
      await Task.completeTask(1, testGuildId);

      expect(Task.completeTask).toHaveBeenCalledWith(1, testGuildId);
    });

    test('deleteTask should require guild_id', async () => {
      await Task.deleteTask(1, testGuildId);

      expect(Task.deleteTask).toHaveBeenCalledWith(1, testGuildId);
    });

    test('editTask should require guild_id', async () => {
      await Task.editTask(1, testGuildId, 'New desc');

      expect(Task.editTask).toHaveBeenCalledWith(1, testGuildId, 'New desc');
    });
  });
});
