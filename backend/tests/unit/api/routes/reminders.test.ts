/**
 * Unit tests for /api/reminders Express route handlers
 *
 * Tests all CRUD operations for reminders via the REST API,
 * including creation with frequency options and validation.
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

jest.mock('@database/index', () => ({
  Reminder: {
    getUserReminders: jest.fn(),
    createReminder: jest.fn(),
    deleteReminder: jest.fn(),
  },
}));

import { Reminder } from '@database/index';
import express from 'express';
import remindersRouter from '../../../../src/api/routes/reminders';
import request from 'supertest';

const mockReminder = Reminder as jest.Mocked<typeof Reminder>;

function createApp() {
  const app = express();
  app.use(express.json());
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
  app.use('/reminders', remindersRouter);
  return app;
}

describe('Reminders API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  // ─── GET /reminders ───────────────────────────────────────────────

  describe('GET /reminders', () => {
    it('should return all active reminders', async () => {
      const fakeReminders = [
        { id: 1, message: 'Take medicine', time: '08:00', frequency: 'daily' },
        { id: 2, message: 'Team meeting', time: '10:00', frequency: 'weekly' },
      ];
      mockReminder.getUserReminders.mockResolvedValue(fakeReminders as any);

      const res = await request(app).get('/reminders');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(fakeReminders);
      expect(mockReminder.getUserReminders).toHaveBeenCalledWith('guild-123');
    });

    it('should return empty array when no reminders exist', async () => {
      mockReminder.getUserReminders.mockResolvedValue([] as any);

      const res = await request(app).get('/reminders');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should handle server errors', async () => {
      mockReminder.getUserReminders.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/reminders');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── POST /reminders ──────────────────────────────────────────────

  describe('POST /reminders', () => {
    it('should create a one-time reminder', async () => {
      const createdReminder = {
        id: 1,
        message: 'Buy groceries',
        time: '14:00',
        frequency: 'once',
        next_trigger: '2026-02-18T14:00:00Z',
      };
      mockReminder.createReminder.mockResolvedValue(createdReminder as any);

      const res = await request(app)
        .post('/reminders')
        .send({ message: 'Buy groceries', time: '14:00' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(createdReminder);
      expect(mockReminder.createReminder).toHaveBeenCalledWith(
        'guild-123',
        'guild-123', // channelId defaults to guildId
        'Buy groceries',
        '14:00',
        'once',
        null,
        'discord-123'
      );
    });

    it('should create a daily reminder', async () => {
      const createdReminder = {
        id: 2,
        message: 'Take medicine',
        time: '08:00',
        frequency: 'daily',
      };
      mockReminder.createReminder.mockResolvedValue(createdReminder as any);

      const res = await request(app)
        .post('/reminders')
        .send({ message: 'Take medicine', time: '08:00', frequency: 'daily' });

      expect(res.status).toBe(201);
      expect(mockReminder.createReminder).toHaveBeenCalledWith(
        'guild-123',
        'guild-123',
        'Take medicine',
        '08:00',
        'daily',
        null,
        'discord-123'
      );
    });

    it('should create a weekly reminder with dayOfWeek', async () => {
      const createdReminder = {
        id: 3,
        message: 'Team standup',
        time: '09:00',
        frequency: 'weekly',
        day_of_week: 1,
      };
      mockReminder.createReminder.mockResolvedValue(createdReminder as any);

      const res = await request(app)
        .post('/reminders')
        .send({ message: 'Team standup', time: '09:00', frequency: 'weekly', dayOfWeek: 1 });

      expect(res.status).toBe(201);
      expect(mockReminder.createReminder).toHaveBeenCalledWith(
        'guild-123',
        'guild-123',
        'Team standup',
        '09:00',
        'weekly',
        1,
        'discord-123'
      );
    });

    it('should accept a custom channelId', async () => {
      const createdReminder = { id: 4, message: 'Test', time: '10:00', frequency: 'once' };
      mockReminder.createReminder.mockResolvedValue(createdReminder as any);

      const res = await request(app).post('/reminders').send({
        message: 'Test',
        time: '10:00',
        channelId: 'channel-456',
      });

      expect(res.status).toBe(201);
      expect(mockReminder.createReminder).toHaveBeenCalledWith(
        'guild-123',
        'channel-456',
        'Test',
        '10:00',
        'once',
        null,
        'discord-123'
      );
    });

    it('should return 400 when message is missing', async () => {
      const res = await request(app).post('/reminders').send({ time: '14:00' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Message is required');
    });

    it('should return 400 when message is not a string', async () => {
      const res = await request(app).post('/reminders').send({ message: 123, time: '14:00' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Message is required');
    });

    it('should return 400 when message is empty', async () => {
      const res = await request(app).post('/reminders').send({ message: '   ', time: '14:00' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Message cannot be empty');
    });

    it('should return 400 when time is missing', async () => {
      const res = await request(app).post('/reminders').send({ message: 'Test reminder' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Time is required');
    });

    it('should return 400 for invalid time format', async () => {
      const res = await request(app).post('/reminders').send({ message: 'Test', time: '25:00' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Time must be in HH:MM format');
    });

    it('should return 400 for non-24-hour time', async () => {
      const res = await request(app).post('/reminders').send({ message: 'Test', time: '2:30 PM' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Time must be in HH:MM format');
    });

    it('should return 400 when weekly reminder has no dayOfWeek', async () => {
      const res = await request(app)
        .post('/reminders')
        .send({ message: 'Weekly task', time: '09:00', frequency: 'weekly' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Day of week (0-6) is required for weekly reminders');
    });

    it('should return 400 when dayOfWeek is out of range', async () => {
      const res = await request(app)
        .post('/reminders')
        .send({ message: 'Weekly task', time: '09:00', frequency: 'weekly', dayOfWeek: 7 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Day of week must be a number between 0');
    });

    it('should return 400 when dayOfWeek is negative', async () => {
      const res = await request(app)
        .post('/reminders')
        .send({ message: 'Weekly task', time: '09:00', frequency: 'weekly', dayOfWeek: -1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Day of week must be a number between 0');
    });

    it('should default to once for invalid frequency', async () => {
      const createdReminder = { id: 5, message: 'Test', time: '10:00', frequency: 'once' };
      mockReminder.createReminder.mockResolvedValue(createdReminder as any);

      const res = await request(app)
        .post('/reminders')
        .send({ message: 'Test', time: '10:00', frequency: 'invalid' });

      expect(res.status).toBe(201);
      expect(mockReminder.createReminder).toHaveBeenCalledWith(
        'guild-123',
        'guild-123',
        'Test',
        '10:00',
        'once',
        null,
        'discord-123'
      );
    });

    it('should handle server errors', async () => {
      mockReminder.createReminder.mockRejectedValue(new Error('DB error'));

      const res = await request(app).post('/reminders').send({ message: 'Test', time: '14:00' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── PATCH /reminders/:id ─────────────────────────────────────────

  describe('PATCH /reminders/:id', () => {
    it('should return 400 for invalid reminder ID', async () => {
      const res = await request(app).patch('/reminders/abc').send({ message: 'Updated' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid reminder ID');
    });

    it('should return 400 when no fields provided', async () => {
      const res = await request(app).patch('/reminders/1').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('At least one field must be provided');
    });

    it('should return 400 with not-implemented message when fields are provided', async () => {
      const res = await request(app).patch('/reminders/1').send({ message: 'Updated message' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Reminder updates not yet implemented');
    });
  });

  // ─── DELETE /reminders/:id ────────────────────────────────────────

  describe('DELETE /reminders/:id', () => {
    it('should delete a reminder successfully', async () => {
      mockReminder.deleteReminder.mockResolvedValue(true as any);

      const res = await request(app).delete('/reminders/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Reminder deleted successfully');
      expect(mockReminder.deleteReminder).toHaveBeenCalledWith(1, 'guild-123');
    });

    it('should return 400 for invalid reminder ID', async () => {
      const res = await request(app).delete('/reminders/abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid reminder ID');
    });

    it('should return 404 when reminder is not found', async () => {
      mockReminder.deleteReminder.mockResolvedValue(false as any);

      const res = await request(app).delete('/reminders/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Reminder not found');
    });

    it('should handle server errors', async () => {
      mockReminder.deleteReminder.mockRejectedValue(new Error('DB error'));

      const res = await request(app).delete('/reminders/1');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});
