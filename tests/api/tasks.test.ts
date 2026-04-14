import request from 'supertest';
import { createApiServer } from '../../src/api/server';
import { sequelize } from '../../supabase';
import Task from '../../supabase/models/Task';

const app = createApiServer();

// Mock environment variables for testing
process.env.LUKE_PASSWORD = 'test_luke_password';
process.env.LUKE_DISCORD_ID = '123456789';
process.env.DANDELION_PASSWORD = 'test_DANDELION_PASSWORD';
process.env.DANDELION_DISCORD_ID = '987654321';
process.env.GUILD_ID = '111222333';

// Basic Auth credentials for testing
const lukeAuth = {
  Authorization: `Basic ${Buffer.from('luke:test_luke_password').toString('base64')}`,
};

const _wifeAuth = {
  Authorization: `Basic ${Buffer.from('wife:test_DANDELION_PASSWORD').toString('base64')}`,
};

const invalidAuth = {
  Authorization: `Basic ${Buffer.from('invalid:wrongpassword').toString('base64')}`,
};

describe('Tasks API', () => {
  beforeAll(async () => {
    // Initialize database for testing
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    // Clean up database connection
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear tasks table before each test
    await Task.destroy({ where: {} });
  });

  describe('Authentication', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/tasks').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should return 401 with invalid credentials', async () => {
      const response = await request(app).get('/api/tasks').set(invalidAuth).expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should return 200 with valid credentials', async () => {
      const response = await request(app).get('/api/tasks').set(lukeAuth).expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/tasks', () => {
    it('should return empty array when no tasks exist', async () => {
      const response = await request(app).get('/api/tasks').set(lukeAuth).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return user tasks', async () => {
      // Create test tasks
      await Task.createTask('123456789', '111222333', 'Test task 1', null);
      await Task.createTask('123456789', '111222333', 'Test task 2', null);

      const response = await request(app).get('/api/tasks').set(lukeAuth).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].description).toBe('Test task 2'); // Most recent first
    });

    it('should filter pending tasks', async () => {
      await Task.createTask('123456789', '111222333', 'Pending task', null);
      const task2 = await Task.createTask('123456789', '111222333', 'Completed task', null);
      await Task.completeTask(task2.id, '123456789', '111222333');

      const response = await request(app)
        .get('/api/tasks?filter=pending')
        .set(lukeAuth)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].description).toBe('Pending task');
    });

    it('should filter completed tasks', async () => {
      await Task.createTask('123456789', '111222333', 'Pending task', null);
      const task2 = await Task.createTask('123456789', '111222333', 'Completed task', null);
      await Task.completeTask(task2.id, '123456789', '111222333');

      const response = await request(app)
        .get('/api/tasks?filter=completed')
        .set(lukeAuth)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].description).toBe('Completed task');
    });

    it('should only return tasks for authenticated user', async () => {
      await Task.createTask('123456789', '111222333', 'Luke task', null);
      await Task.createTask('987654321', '111222333', 'Wife task', null);

      const response = await request(app).get('/api/tasks').set(lukeAuth).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].description).toBe('Luke task');
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return task by ID', async () => {
      const task = await Task.createTask('123456789', '111222333', 'Test task', null);

      const response = await request(app).get(`/api/tasks/${task.id}`).set(lukeAuth).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe('Test task');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app).get('/api/tasks/99999').set(lukeAuth).expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should return 400 for invalid task ID', async () => {
      const response = await request(app).get('/api/tasks/invalid').set(lukeAuth).expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a task', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set(lukeAuth)
        .send({
          description: 'New test task',
          dueDate: '2025-12-31',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe('New test task');
      expect(response.body.data.completed).toBe(false);
    });

    it('should create task without due date', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set(lukeAuth)
        .send({
          description: 'Task without due date',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe('Task without due date');
      expect(response.body.data.due_date).toBeNull();
    });

    it('should return 400 without description', async () => {
      const response = await request(app).post('/api/tasks').set(lukeAuth).send({}).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });

    it('should return 400 with empty description', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set(lukeAuth)
        .send({ description: '   ' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 with invalid due date', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set(lukeAuth)
        .send({
          description: 'Task with invalid date',
          dueDate: 'invalid-date',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('should mark task as completed', async () => {
      const task = await Task.createTask('123456789', '111222333', 'Test task', null);

      const response = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .set(lukeAuth)
        .send({ completed: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.completed).toBe(true);
      expect(response.body.data.completed_at).not.toBeNull();
    });

    it('should update task description', async () => {
      const task = await Task.createTask('123456789', '111222333', 'Old description', null);

      const response = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .set(lukeAuth)
        .send({ description: 'New description' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe('New description');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .patch('/api/tasks/99999')
        .set(lukeAuth)
        .send({ completed: true })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 without updates', async () => {
      const task = await Task.createTask('123456789', '111222333', 'Test task', null);

      const response = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .set(lukeAuth)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete task', async () => {
      const task = await Task.createTask('123456789', '111222333', 'Task to delete', null);

      const response = await request(app).delete(`/api/tasks/${task.id}`).set(lukeAuth).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify deletion
      const tasks = await Task.getUserTasks('123456789', '111222333');
      expect(tasks).toHaveLength(0);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app).delete('/api/tasks/99999').set(lukeAuth).expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('User Isolation', () => {
    it('should not allow users to access other users tasks', async () => {
      const wifeTask = await Task.createTask('987654321', '111222333', 'Wife task', null);

      // Luke trying to access wife's task
      const response = await request(app)
        .get(`/api/tasks/${wifeTask.id}`)
        .set(lukeAuth)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should not allow users to delete other users tasks', async () => {
      const wifeTask = await Task.createTask('987654321', '111222333', 'Wife task', null);

      // Luke trying to delete wife's task
      const response = await request(app)
        .delete(`/api/tasks/${wifeTask.id}`)
        .set(lukeAuth)
        .expect(404);

      expect(response.body.success).toBe(false);

      // Verify task still exists
      const tasks = await Task.getUserTasks('987654321', '111222333');
      expect(tasks).toHaveLength(1);
    });
  });
});
