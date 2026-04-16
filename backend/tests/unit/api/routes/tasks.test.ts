/**
 * Unit tests for /api/tasks Express route handlers
 *
 * Tests all CRUD operations for tasks via the REST API.
 * Uses mock req/res pattern to test route handlers directly.
 */

// Mock dependencies BEFORE imports
jest.mock('../../../../shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Create a chainable supabase query builder mock
const mockSupabaseSingle = jest.fn();
const mockSupabaseSelect = jest.fn(() => ({ single: mockSupabaseSingle }));
const mockSupabaseEq2 = jest.fn(() => ({ select: mockSupabaseSelect }));
const mockSupabaseEq1 = jest.fn(() => ({ eq: mockSupabaseEq2 }));
const mockSupabaseUpdate = jest.fn(() => ({ eq: mockSupabaseEq1 }));
const mockSupabaseFrom = jest.fn(() => ({ update: mockSupabaseUpdate }));

// Mock database - prevent actual DB connection
jest.mock('@database/index', () => ({
  Task: {
    getUserTasks: jest.fn(),
    createTask: jest.fn(),
    completeTask: jest.fn(),
    editTask: jest.fn(),
    deleteTask: jest.fn(),
  },
  supabase: {
    from: (...args: any[]) => mockSupabaseFrom(...args),
  },
}));

import { Task } from '@database/index';

// We need to extract the route handlers from the router.
// Since Express Router encapsulates handlers, we import the module and
// use supertest-like approach by building a mini Express app.
import express from 'express';
import tasksRouter from '../../../../src/api/routes/tasks';

const mockTask = Task as jest.Mocked<typeof Task>;

// Helper to build an Express app with the router and fake auth user
function createApp() {
  const app = express();
  app.use(express.json());
  // Inject a mock authenticated user on every request
  app.use((req: any, _res: any, next: any) => {
    req.user = {
      discordId: 'discord-123',
      guildId: 'guild-123',
      email: 'test@test.com',
      googleId: 'google-123',
      name: 'Test User',
    };
    next();
  });
  app.use('/tasks', tasksRouter);
  return app;
}

// Use supertest for clean HTTP testing
import request from 'supertest';

describe('Tasks API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  // ─── GET /tasks ────────────────────────────────────────────────────

  describe('GET /tasks', () => {
    it('should return all tasks with default filter', async () => {
      const fakeTasks = [
        { id: 1, description: 'Task 1', completed: false },
        { id: 2, description: 'Task 2', completed: true },
      ];
      mockTask.getUserTasks.mockResolvedValue(fakeTasks as any);

      const res = await request(app).get('/tasks');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(fakeTasks);
      expect(mockTask.getUserTasks).toHaveBeenCalledWith('guild-123', 'all');
    });

    it('should filter tasks by pending', async () => {
      mockTask.getUserTasks.mockResolvedValue([] as any);

      const res = await request(app).get('/tasks?filter=pending');

      expect(res.status).toBe(200);
      expect(mockTask.getUserTasks).toHaveBeenCalledWith('guild-123', 'pending');
    });

    it('should filter tasks by completed', async () => {
      mockTask.getUserTasks.mockResolvedValue([] as any);

      const res = await request(app).get('/tasks?filter=completed');

      expect(res.status).toBe(200);
      expect(mockTask.getUserTasks).toHaveBeenCalledWith('guild-123', 'completed');
    });

    it('should return 400 for invalid filter', async () => {
      const res = await request(app).get('/tasks?filter=invalid');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid filter');
    });

    it('should handle server errors', async () => {
      mockTask.getUserTasks.mockRejectedValue(new Error('DB connection failed'));

      const res = await request(app).get('/tasks');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /tasks/:id ───────────────────────────────────────────────

  describe('GET /tasks/:id', () => {
    it('should return a single task by ID', async () => {
      const fakeTasks = [
        { id: 1, description: 'Task 1', completed: false },
        { id: 2, description: 'Task 2', completed: true },
      ];
      mockTask.getUserTasks.mockResolvedValue(fakeTasks as any);

      const res = await request(app).get('/tasks/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(fakeTasks[0]);
    });

    it('should return 400 for invalid task ID', async () => {
      const res = await request(app).get('/tasks/abc');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid task ID');
    });

    it('should return 404 when task is not found', async () => {
      mockTask.getUserTasks.mockResolvedValue([] as any);

      const res = await request(app).get('/tasks/999');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Task not found');
    });

    it('should handle server errors', async () => {
      mockTask.getUserTasks.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/tasks/1');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── POST /tasks ──────────────────────────────────────────────────

  describe('POST /tasks', () => {
    it('should create a task with description only', async () => {
      const createdTask = { id: 1, description: 'New task', completed: false };
      mockTask.createTask.mockResolvedValue(createdTask as any);

      const res = await request(app).post('/tasks').send({ description: 'New task' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(createdTask);
      expect(mockTask.createTask).toHaveBeenCalledWith(
        'guild-123',
        'New task',
        null,
        'discord-123'
      );
    });

    it('should create a task with description and dueDate', async () => {
      const createdTask = {
        id: 2,
        description: 'Task with due date',
        completed: false,
        due_date: '2026-03-01T00:00:00.000Z',
      };
      mockTask.createTask.mockResolvedValue(createdTask as any);

      const res = await request(app)
        .post('/tasks')
        .send({ description: 'Task with due date', dueDate: '2026-03-01' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockTask.createTask).toHaveBeenCalledWith(
        'guild-123',
        'Task with due date',
        expect.any(Date),
        'discord-123'
      );
    });

    it('should return 400 when description is missing', async () => {
      const res = await request(app).post('/tasks').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Description is required');
    });

    it('should return 400 when description is not a string', async () => {
      const res = await request(app).post('/tasks').send({ description: 123 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Description is required');
    });

    it('should return 400 when description is empty', async () => {
      const res = await request(app).post('/tasks').send({ description: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Description cannot be empty');
    });

    it('should return 400 for invalid due date format', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ description: 'Test', dueDate: 'not-a-date' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid due date format');
    });

    it('should handle server errors', async () => {
      mockTask.createTask.mockRejectedValue(new Error('DB error'));

      const res = await request(app).post('/tasks').send({ description: 'Test' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── PATCH /tasks/:id ─────────────────────────────────────────────

  describe('PATCH /tasks/:id', () => {
    it('should return 400 for invalid task ID', async () => {
      const res = await request(app).patch('/tasks/abc').send({ description: 'Updated' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid task ID');
    });

    it('should mark a task as completed', async () => {
      const completedTask = { id: 1, description: 'Task', completed: true };
      mockTask.completeTask.mockResolvedValue(completedTask as any);

      const res = await request(app).patch('/tasks/1').send({ completed: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(completedTask);
      expect(mockTask.completeTask).toHaveBeenCalledWith(1, 'guild-123');
    });

    it('should return 404 when completing a nonexistent task', async () => {
      mockTask.completeTask.mockResolvedValue(null as any);

      const res = await request(app).patch('/tasks/999').send({ completed: true });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Task not found');
    });

    it('should mark a task as incomplete', async () => {
      const uncompletedTask = {
        id: 1,
        description: 'Task',
        completed: false,
        completed_at: null,
      };
      mockSupabaseSingle.mockResolvedValue({ data: uncompletedTask, error: null });

      const res = await request(app).patch('/tasks/1').send({ completed: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(uncompletedTask);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('tasks');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({ completed: false, completed_at: null });
    });

    it('should return 404 when uncompleting a nonexistent task', async () => {
      mockSupabaseSingle.mockResolvedValue({ data: null, error: { message: 'No rows found' } });

      const res = await request(app).patch('/tasks/1').send({ completed: false });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Task not found');
    });

    it('should return 400 when completed is not a boolean', async () => {
      const res = await request(app).patch('/tasks/1').send({ completed: 'yes' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Completed must be a boolean');
    });

    it('should update task description', async () => {
      const updatedTask = { id: 1, description: 'Updated', completed: false };
      mockTask.editTask.mockResolvedValue(updatedTask as any);

      const res = await request(app).patch('/tasks/1').send({ description: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockTask.editTask).toHaveBeenCalledWith(1, 'guild-123', 'Updated', undefined);
    });

    it('should update task dueDate', async () => {
      const updatedTask = { id: 1, description: 'Task', due_date: '2026-06-01' };
      mockTask.editTask.mockResolvedValue(updatedTask as any);

      const res = await request(app).patch('/tasks/1').send({ dueDate: '2026-06-01' });

      expect(res.status).toBe(200);
      expect(mockTask.editTask).toHaveBeenCalledWith(1, 'guild-123', undefined, expect.any(Date));
    });

    it('should clear dueDate when set to null', async () => {
      const updatedTask = { id: 1, description: 'Task', due_date: null };
      mockTask.editTask.mockResolvedValue(updatedTask as any);

      const res = await request(app).patch('/tasks/1').send({ dueDate: null });

      expect(res.status).toBe(200);
      expect(mockTask.editTask).toHaveBeenCalledWith(1, 'guild-123', undefined, null);
    });

    it('should return 400 for invalid dueDate format', async () => {
      const res = await request(app).patch('/tasks/1').send({ dueDate: 'not-a-date' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid due date format');
    });

    it('should return 404 when editing a nonexistent task', async () => {
      mockTask.editTask.mockResolvedValue(null as any);

      const res = await request(app).patch('/tasks/1').send({ description: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Task not found');
    });

    it('should return 400 when no valid updates provided', async () => {
      const res = await request(app).patch('/tasks/1').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('No valid updates provided');
    });

    it('should handle server errors', async () => {
      mockTask.editTask.mockRejectedValue(new Error('DB error'));

      const res = await request(app).patch('/tasks/1').send({ description: 'Updated' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── DELETE /tasks/:id ────────────────────────────────────────────

  describe('DELETE /tasks/:id', () => {
    it('should delete a task successfully', async () => {
      mockTask.deleteTask.mockResolvedValue(true as any);

      const res = await request(app).delete('/tasks/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Task deleted successfully');
      expect(mockTask.deleteTask).toHaveBeenCalledWith(1, 'guild-123');
    });

    it('should return 400 for invalid task ID', async () => {
      const res = await request(app).delete('/tasks/abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid task ID');
    });

    it('should return 404 when task is not found', async () => {
      mockTask.deleteTask.mockResolvedValue(false as any);

      const res = await request(app).delete('/tasks/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Task not found');
    });

    it('should handle server errors', async () => {
      mockTask.deleteTask.mockRejectedValue(new Error('DB error'));

      const res = await request(app).delete('/tasks/1');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});
