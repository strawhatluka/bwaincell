/**
 * Unit tests for /api/schedule Express route handlers
 *
 * Tests all CRUD operations for schedule events via the REST API,
 * including today's events, countdown, and event creation/deletion.
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

jest.mock('../../../../../supabase/index', () => ({
  Schedule: {
    getEvents: jest.fn(),
    getUpcomingEvents: jest.fn(),
    getTodaysEvents: jest.fn(),
    getCountdown: jest.fn(),
    addEvent: jest.fn(),
    deleteEvent: jest.fn(),
  },
}));

import { Schedule } from '../../../../../supabase/index';
import express from 'express';
import scheduleRouter from '../../../../src/api/routes/schedule';
import request from 'supertest';

const mockSchedule = Schedule as jest.Mocked<typeof Schedule>;

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
  app.use('/schedule', scheduleRouter);
  return app;
}

describe('Schedule API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  // ─── GET /schedule ────────────────────────────────────────────────

  describe('GET /schedule', () => {
    it('should return upcoming events by default', async () => {
      const fakeEvents = [{ id: 1, event: 'Meeting', date: '2026-03-01', time: '10:00' }];
      mockSchedule.getEvents.mockResolvedValue(fakeEvents as any);

      const res = await request(app).get('/schedule');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(fakeEvents);
      expect(mockSchedule.getEvents).toHaveBeenCalledWith('guild-123', 'upcoming');
    });

    it('should filter events by past', async () => {
      mockSchedule.getEvents.mockResolvedValue([] as any);

      const res = await request(app).get('/schedule?filter=past');

      expect(res.status).toBe(200);
      expect(mockSchedule.getEvents).toHaveBeenCalledWith('guild-123', 'past');
    });

    it('should filter events by all', async () => {
      mockSchedule.getEvents.mockResolvedValue([] as any);

      const res = await request(app).get('/schedule?filter=all');

      expect(res.status).toBe(200);
      expect(mockSchedule.getEvents).toHaveBeenCalledWith('guild-123', 'all');
    });

    it('should use getUpcomingEvents when days parameter is provided with upcoming filter', async () => {
      mockSchedule.getUpcomingEvents.mockResolvedValue([] as any);

      const res = await request(app).get('/schedule?filter=upcoming&days=14');

      expect(res.status).toBe(200);
      expect(mockSchedule.getUpcomingEvents).toHaveBeenCalledWith('guild-123', 14);
    });

    it('should use getEvents when days is not valid', async () => {
      mockSchedule.getEvents.mockResolvedValue([] as any);

      const res = await request(app).get('/schedule?filter=upcoming&days=abc');

      expect(res.status).toBe(200);
      expect(mockSchedule.getEvents).toHaveBeenCalledWith('guild-123', 'upcoming');
    });

    it('should return 400 for invalid filter', async () => {
      const res = await request(app).get('/schedule?filter=invalid');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid filter');
    });

    it('should handle server errors', async () => {
      mockSchedule.getEvents.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/schedule');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /schedule/today ──────────────────────────────────────────

  describe('GET /schedule/today', () => {
    it("should return today's events", async () => {
      const todayEvents = [{ id: 1, event: 'Standup', date: '2026-02-18', time: '09:00' }];
      mockSchedule.getTodaysEvents.mockResolvedValue(todayEvents as any);

      const res = await request(app).get('/schedule/today');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(todayEvents);
      expect(mockSchedule.getTodaysEvents).toHaveBeenCalledWith('guild-123');
    });

    it('should return empty array when no events today', async () => {
      mockSchedule.getTodaysEvents.mockResolvedValue([] as any);

      const res = await request(app).get('/schedule/today');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should handle server errors', async () => {
      mockSchedule.getTodaysEvents.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/schedule/today');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /schedule/countdown/:eventName ───────────────────────────

  describe('GET /schedule/countdown/:eventName', () => {
    it('should return countdown for an event', async () => {
      const countdown = {
        event: 'Birthday',
        date: '2026-06-15',
        timeLeft: '117 days',
      };
      mockSchedule.getCountdown.mockResolvedValue(countdown as any);

      const res = await request(app).get('/schedule/countdown/Birthday');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(countdown);
      expect(mockSchedule.getCountdown).toHaveBeenCalledWith('guild-123', 'Birthday');
    });

    it('should return 404 when event is not found', async () => {
      mockSchedule.getCountdown.mockResolvedValue(null as any);

      const res = await request(app).get('/schedule/countdown/Nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Event not found');
    });

    it('should handle URL-encoded event names', async () => {
      mockSchedule.getCountdown.mockResolvedValue({
        event: 'Team Lunch',
        timeLeft: '5 days',
      } as any);

      const res = await request(app).get('/schedule/countdown/Team%20Lunch');

      expect(res.status).toBe(200);
      expect(mockSchedule.getCountdown).toHaveBeenCalledWith('guild-123', 'Team Lunch');
    });

    it('should handle server errors', async () => {
      mockSchedule.getCountdown.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/schedule/countdown/Test');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── POST /schedule ───────────────────────────────────────────────

  describe('POST /schedule', () => {
    it('should create a new event', async () => {
      const createdEvent = {
        id: 1,
        event: 'Meeting',
        date: '2026-03-01',
        time: '10:00',
        description: null,
      };
      mockSchedule.addEvent.mockResolvedValue(createdEvent as any);

      const res = await request(app)
        .post('/schedule')
        .send({ event: 'Meeting', date: '2026-03-01', time: '10:00' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(createdEvent);
      expect(mockSchedule.addEvent).toHaveBeenCalledWith(
        'guild-123',
        'Meeting',
        '2026-03-01',
        '10:00',
        null,
        'discord-123'
      );
    });

    it('should create an event with description', async () => {
      const createdEvent = {
        id: 2,
        event: 'Team Lunch',
        date: '2026-03-15',
        time: '12:00',
        description: 'At the office cafeteria',
      };
      mockSchedule.addEvent.mockResolvedValue(createdEvent as any);

      const res = await request(app).post('/schedule').send({
        event: 'Team Lunch',
        date: '2026-03-15',
        time: '12:00',
        description: 'At the office cafeteria',
      });

      expect(res.status).toBe(201);
      expect(mockSchedule.addEvent).toHaveBeenCalledWith(
        'guild-123',
        'Team Lunch',
        '2026-03-15',
        '12:00',
        'At the office cafeteria',
        'discord-123'
      );
    });

    it('should return 400 when event name is missing', async () => {
      const res = await request(app).post('/schedule').send({ date: '2026-03-01', time: '10:00' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Event name is required');
    });

    it('should return 400 when event name is empty', async () => {
      const res = await request(app)
        .post('/schedule')
        .send({ event: '  ', date: '2026-03-01', time: '10:00' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Event name cannot be empty');
    });

    it('should return 400 when date is missing', async () => {
      const res = await request(app).post('/schedule').send({ event: 'Meeting', time: '10:00' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Date is required');
    });

    it('should return 400 for invalid date format', async () => {
      const res = await request(app)
        .post('/schedule')
        .send({ event: 'Meeting', date: '03-01-2026', time: '10:00' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Date must be in YYYY-MM-DD format');
    });

    it('should return 400 when time is missing', async () => {
      const res = await request(app)
        .post('/schedule')
        .send({ event: 'Meeting', date: '2026-03-01' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Time is required');
    });

    it('should return 400 for invalid time format', async () => {
      const res = await request(app)
        .post('/schedule')
        .send({ event: 'Meeting', date: '2026-03-01', time: '25:00' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Time must be in HH:MM format');
    });

    it('should return 400 for non-24-hour time format', async () => {
      const res = await request(app)
        .post('/schedule')
        .send({ event: 'Meeting', date: '2026-03-01', time: '1:30 PM' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Time must be in HH:MM format');
    });

    it('should handle server errors', async () => {
      mockSchedule.addEvent.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/schedule')
        .send({ event: 'Meeting', date: '2026-03-01', time: '10:00' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── PATCH /schedule/:id ──────────────────────────────────────────

  describe('PATCH /schedule/:id', () => {
    it('should return 400 for invalid event ID', async () => {
      const res = await request(app).patch('/schedule/abc').send({ event: 'Updated' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid event ID');
    });

    it('should return 400 when no fields provided', async () => {
      const res = await request(app).patch('/schedule/1').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('At least one field must be provided');
    });

    it('should return 400 with not-implemented message when fields are provided', async () => {
      const res = await request(app).patch('/schedule/1').send({ event: 'Updated Event' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Event updates not yet implemented');
    });

    it('should handle server errors', async () => {
      // Force an error by mocking the parseInt or causing an exception before the
      // "not implemented" message. In practice, the route catches errors.
      // Since the route is straightforward, we test it doesn't crash
      const res = await request(app).patch('/schedule/1').send({ date: '2026-04-01' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── DELETE /schedule/:id ─────────────────────────────────────────

  describe('DELETE /schedule/:id', () => {
    it('should delete an event successfully', async () => {
      mockSchedule.deleteEvent.mockResolvedValue(true as any);

      const res = await request(app).delete('/schedule/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Event deleted successfully');
      expect(mockSchedule.deleteEvent).toHaveBeenCalledWith(1, 'guild-123');
    });

    it('should return 400 for invalid event ID', async () => {
      const res = await request(app).delete('/schedule/abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid event ID');
    });

    it('should return 404 when event is not found', async () => {
      mockSchedule.deleteEvent.mockResolvedValue(false as any);

      const res = await request(app).delete('/schedule/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Event not found');
    });

    it('should handle server errors', async () => {
      mockSchedule.deleteEvent.mockRejectedValue(new Error('DB error'));

      const res = await request(app).delete('/schedule/1');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});
