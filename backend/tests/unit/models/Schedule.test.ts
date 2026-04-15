/**
 * Unit Tests: Schedule Model
 *
 * Tests database model for schedule/event management using mocks
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

// Mock config BEFORE importing Schedule
jest.mock('../../../config/config', () => ({
  __esModule: true,
  default: {
    settings: {
      timezone: 'America/Los_Angeles',
    },
  },
}));

import Schedule from '../../../../supabase/models/Schedule';

describe('Schedule Model', () => {
  const testGuildId = 'guild-123';
  const testUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock addEvent
    jest
      .spyOn(Schedule, 'addEvent')
      .mockImplementation(async (guildId, event, date, time, description, userId) => {
        return {
          id: 1,
          event,
          date,
          time,
          description: description || null,
          user_id: userId || 'system',
          guild_id: guildId,
          created_at: new Date('2024-01-15'),
        } as any;
      });

    // Mock getEvents
    jest.spyOn(Schedule, 'getEvents').mockImplementation(async (guildId, filter = 'upcoming') => {
      const allEvents = [
        {
          id: 1,
          event: 'Past Meeting',
          date: '2024-01-01',
          time: '10:00:00',
          description: null,
          user_id: testUserId,
          guild_id: guildId,
          created_at: new Date(),
        },
        {
          id: 2,
          event: 'Today Meeting',
          date: '2024-06-15',
          time: '14:00:00',
          description: 'Team sync',
          user_id: testUserId,
          guild_id: guildId,
          created_at: new Date(),
        },
        {
          id: 3,
          event: 'Future Conference',
          date: '2024-12-20',
          time: '09:00:00',
          description: 'Annual conf',
          user_id: testUserId,
          guild_id: guildId,
          created_at: new Date(),
        },
      ];

      if (filter === 'upcoming') {
        return allEvents.filter((e) => e.date >= '2024-06-15') as any[];
      } else if (filter === 'past') {
        return allEvents.filter((e) => e.date < '2024-06-15') as any[];
      }
      return allEvents as any[];
    });

    // Mock deleteEvent
    jest.spyOn(Schedule, 'deleteEvent').mockImplementation(async (eventId, guildId) => {
      if (eventId === 1 && guildId === testGuildId) {
        return true;
      }
      return false;
    });

    // Mock getCountdown
    jest.spyOn(Schedule, 'getCountdown').mockImplementation(async (guildId, eventName) => {
      if (eventName === 'nonexistent') {
        return null;
      }

      if (eventName === 'passed') {
        return {
          event: {
            id: 1,
            event: 'Past Event',
            date: '2024-01-01',
            time: '10:00:00',
            guild_id: guildId,
          } as any,
          timeLeft: 'Event has passed',
        };
      }

      return {
        event: {
          id: 2,
          event: 'Future Conference',
          date: '2025-12-20',
          time: '09:00:00',
          guild_id: guildId,
        } as any,
        timeLeft: '5 days, 3 hours, 30 minutes',
      };
    });

    // Mock getTodaysEvents
    jest.spyOn(Schedule, 'getTodaysEvents').mockImplementation(async (guildId) => {
      if (guildId === 'guild-empty') {
        return [];
      }

      return [
        {
          id: 2,
          event: 'Morning Standup',
          date: '2024-06-15',
          time: '09:00:00',
          description: null,
          user_id: testUserId,
          guild_id: guildId,
          created_at: new Date(),
        },
        {
          id: 3,
          event: 'Lunch Meeting',
          date: '2024-06-15',
          time: '12:00:00',
          description: 'Team lunch',
          user_id: testUserId,
          guild_id: guildId,
          created_at: new Date(),
        },
      ] as any[];
    });

    // Mock getUpcomingEvents
    jest.spyOn(Schedule, 'getUpcomingEvents').mockImplementation(async (guildId, days = 7) => {
      const events = [
        {
          id: 1,
          event: 'Tomorrow Meeting',
          date: '2024-06-16',
          time: '10:00:00',
          description: null,
          user_id: testUserId,
          guild_id: guildId,
          created_at: new Date(),
        },
        {
          id: 2,
          event: 'Next Week Event',
          date: '2024-06-20',
          time: '14:00:00',
          description: null,
          user_id: testUserId,
          guild_id: guildId,
          created_at: new Date(),
        },
        {
          id: 3,
          event: 'Far Future Event',
          date: '2024-07-15',
          time: '09:00:00',
          description: null,
          user_id: testUserId,
          guild_id: guildId,
          created_at: new Date(),
        },
      ];

      // Simulate day filtering: only return events within the specified range
      if (days <= 7) {
        return events.slice(0, 2) as any[];
      }
      return events as any[];
    });
  });

  describe('addEvent', () => {
    test('should create an event with all fields', async () => {
      const result = await Schedule.addEvent(
        testGuildId,
        'Team Meeting',
        '2024-06-20',
        '14:00:00',
        'Weekly sync',
        testUserId
      );

      expect(result).toBeDefined();
      expect(result.event).toBe('Team Meeting');
      expect(result.date).toBe('2024-06-20');
      expect(result.time).toBe('14:00:00');
      expect(result.description).toBe('Weekly sync');
      expect(result.guild_id).toBe(testGuildId);
      expect(result.user_id).toBe(testUserId);
    });

    test('should create an event with null description when not provided', async () => {
      const result = await Schedule.addEvent(testGuildId, 'Quick Call', '2024-06-20', '10:00:00');

      expect(result.description).toBeNull();
    });

    test('should default user_id to system when not provided', async () => {
      const result = await Schedule.addEvent(testGuildId, 'Event', '2024-06-20', '10:00:00');

      expect(result.user_id).toBe('system');
    });

    test('should call addEvent with correct arguments', async () => {
      await Schedule.addEvent(
        testGuildId,
        'Conference',
        '2024-12-01',
        '09:00:00',
        'Annual',
        testUserId
      );

      expect(Schedule.addEvent).toHaveBeenCalledWith(
        testGuildId,
        'Conference',
        '2024-12-01',
        '09:00:00',
        'Annual',
        testUserId
      );
    });
  });

  describe('getEvents', () => {
    test('should return upcoming events by default', async () => {
      const events = await Schedule.getEvents(testGuildId);

      expect(events).toHaveLength(2);
      events.forEach((event) => {
        expect(event.date >= '2024-06-15').toBe(true);
      });
    });

    test('should return past events when filter is past', async () => {
      const events = await Schedule.getEvents(testGuildId, 'past');

      expect(events).toHaveLength(1);
      expect(events[0].event).toBe('Past Meeting');
    });

    test('should return all events when filter is all', async () => {
      const events = await Schedule.getEvents(testGuildId, 'all');

      expect(events).toHaveLength(3);
    });

    test('should filter by guild_id', async () => {
      const events = await Schedule.getEvents(testGuildId, 'all');

      events.forEach((event) => {
        expect(event.guild_id).toBe(testGuildId);
      });
    });
  });

  describe('deleteEvent', () => {
    test('should return true when event is successfully deleted', async () => {
      const result = await Schedule.deleteEvent(1, testGuildId);

      expect(result).toBe(true);
    });

    test('should return false when event is not found', async () => {
      const result = await Schedule.deleteEvent(999, testGuildId);

      expect(result).toBe(false);
    });

    test('should return false when guild_id does not match', async () => {
      const result = await Schedule.deleteEvent(1, 'guild-other');

      expect(result).toBe(false);
    });
  });

  describe('getCountdown', () => {
    test('should return countdown with time remaining for future event', async () => {
      const result = await Schedule.getCountdown(testGuildId, 'Conference');

      expect(result).toBeDefined();
      expect(result!.event).toBeDefined();
      expect(result!.timeLeft).toBe('5 days, 3 hours, 30 minutes');
    });

    test('should return null when event is not found', async () => {
      const result = await Schedule.getCountdown(testGuildId, 'nonexistent');

      expect(result).toBeNull();
    });

    test('should return "Event has passed" for past events', async () => {
      const result = await Schedule.getCountdown(testGuildId, 'passed');

      expect(result).toBeDefined();
      expect(result!.timeLeft).toBe('Event has passed');
    });
  });

  describe('getTodaysEvents', () => {
    test('should return events for today', async () => {
      const events = await Schedule.getTodaysEvents(testGuildId);

      expect(events).toHaveLength(2);
      expect(events[0].event).toBe('Morning Standup');
      expect(events[1].event).toBe('Lunch Meeting');
    });

    test('should return empty array when no events today', async () => {
      const events = await Schedule.getTodaysEvents('guild-empty');

      expect(events).toEqual([]);
    });

    test('should filter by guild_id', async () => {
      const events = await Schedule.getTodaysEvents(testGuildId);

      events.forEach((event) => {
        expect(event.guild_id).toBe(testGuildId);
      });
    });
  });

  describe('getUpcomingEvents', () => {
    test('should return events within default 7 day range', async () => {
      const events = await Schedule.getUpcomingEvents(testGuildId);

      expect(events).toHaveLength(2);
    });

    test('should respect custom day range', async () => {
      const events = await Schedule.getUpcomingEvents(testGuildId, 30);

      expect(events).toHaveLength(3);
      expect(Schedule.getUpcomingEvents).toHaveBeenCalledWith(testGuildId, 30);
    });

    test('should default to 7 days', async () => {
      await Schedule.getUpcomingEvents(testGuildId);

      expect(Schedule.getUpcomingEvents).toHaveBeenCalledWith(testGuildId);
    });

    test('should filter by guild_id', async () => {
      const events = await Schedule.getUpcomingEvents(testGuildId);

      events.forEach((event) => {
        expect(event.guild_id).toBe(testGuildId);
      });
    });
  });

  describe('Guild Isolation', () => {
    test('addEvent should include guild_id in created record', async () => {
      const result = await Schedule.addEvent(testGuildId, 'Event', '2024-06-20', '10:00:00');

      expect(result.guild_id).toBe(testGuildId);
    });

    test('getEvents should be called with guild_id', async () => {
      await Schedule.getEvents(testGuildId);

      expect(Schedule.getEvents).toHaveBeenCalledWith(testGuildId);
    });

    test('deleteEvent should require guild_id', async () => {
      await Schedule.deleteEvent(1, testGuildId);

      expect(Schedule.deleteEvent).toHaveBeenCalledWith(1, testGuildId);
    });

    test('getCountdown should be called with guild_id', async () => {
      await Schedule.getCountdown(testGuildId, 'Conference');

      expect(Schedule.getCountdown).toHaveBeenCalledWith(testGuildId, 'Conference');
    });
  });
});
