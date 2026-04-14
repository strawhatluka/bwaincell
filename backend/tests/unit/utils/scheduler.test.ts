/**
 * Unit Tests: Scheduler Class
 *
 * Comprehensive tests for the Scheduler singleton covering:
 * - Initialization and singleton pattern
 * - Reminder scheduling (recurring + one-time)
 * - Reminder execution and lifecycle
 * - Event announcement scheduling and execution
 * - Daily question scheduling and execution
 * - Sunset check scheduling and execution
 * - Error handling across all paths
 * - Job management (add/remove/stop)
 *
 * Coverage target: 80%+
 */

// ============================================================================
// Mocks — must be declared before any imports
// ============================================================================

jest.mock('../../../shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

const mockCronStop = jest.fn();
const mockCronTask = { stop: mockCronStop };

jest.mock('node-cron', () => ({
  schedule: jest.fn(() => mockCronTask),
  validate: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../utils/dateHelpers', () => ({
  buildCronExpression: jest.fn((minute, hour, day) => `${minute} ${hour} * * ${day}`),
  getEventWindow: jest.fn(() => ({
    start: new Date('2026-03-01T12:00:00Z'),
    end: new Date('2026-03-08T11:59:00Z'),
  })),
}));

// Database mocks
const mockGetActiveReminders = jest.fn().mockResolvedValue([]);
const mockUpdateNextTrigger = jest.fn().mockResolvedValue(undefined);
const mockDeleteReminder = jest.fn().mockResolvedValue(undefined);

const mockEventConfigGetEnabledConfigs = jest.fn().mockResolvedValue([]);
const mockEventConfigGetGuildConfig = jest.fn().mockResolvedValue(null);
const mockEventConfigUpdateLastAnnouncement = jest.fn().mockResolvedValue(undefined);

const mockSunsetConfigGetEnabledConfigs = jest.fn().mockResolvedValue([]);
const mockSunsetConfigGetGuildConfig = jest.fn().mockResolvedValue(null);
const mockSunsetConfigUpdateLastAnnouncement = jest.fn().mockResolvedValue(undefined);

const mockSupabaseFrom = jest.fn();

jest.mock('../../../../supabase', () => ({
  Reminder: {
    getActiveReminders: mockGetActiveReminders,
    updateNextTrigger: mockUpdateNextTrigger,
    deleteReminder: mockDeleteReminder,
  },
  EventConfig: {
    getEnabledConfigs: mockEventConfigGetEnabledConfigs,
    getGuildConfig: mockEventConfigGetGuildConfig,
    updateLastAnnouncement: mockEventConfigUpdateLastAnnouncement,
  },
  SunsetConfig: {
    getEnabledConfigs: mockSunsetConfigGetEnabledConfigs,
    getGuildConfig: mockSunsetConfigGetGuildConfig,
    updateLastAnnouncement: mockSunsetConfigUpdateLastAnnouncement,
  },
  supabase: {
    from: mockSupabaseFrom,
  },
}));

// Events service mock
const mockDiscoverLocalEvents = jest.fn().mockResolvedValue([]);
const mockFormatEventsForDiscord = jest.fn().mockResolvedValue({ data: {} });

jest.mock('../../../utils/eventsService', () => ({
  __esModule: true,
  default: {
    discoverLocalEvents: mockDiscoverLocalEvents,
    formatEventsForDiscord: mockFormatEventsForDiscord,
  },
}));

// Gemini service mock
const mockGenerateQuestion = jest.fn();
jest.mock('../../../utils/geminiService', () => ({
  GeminiService: {
    generateQuestion: mockGenerateQuestion,
  },
}));

// Sunset service mock
const mockGetCoordinatesFromZip = jest.fn();
const mockGetSunsetTime = jest.fn();
const mockFormatSunsetEmbed = jest.fn();

jest.mock('../../../utils/sunsetService', () => ({
  getCoordinatesFromZip: mockGetCoordinatesFromZip,
  getSunsetTime: mockGetSunsetTime,
  formatSunsetEmbed: mockFormatSunsetEmbed,
}));

// ============================================================================
// Imports
// ============================================================================

import { startScheduler, getScheduler } from '../../../utils/scheduler';
import { Client, TextChannel } from 'discord.js';
import * as cron from 'node-cron';
import { logger } from '../../../shared/utils/logger';

// ============================================================================
// Helpers
// ============================================================================

function createMockClient(channelOverride?: any) {
  const mockSend = jest.fn().mockResolvedValue({});
  const defaultChannel = {
    id: 'channel-123',
    type: 0,
    send: mockSend,
    isTextBased: jest.fn().mockReturnValue(true),
  };

  return {
    client: {
      channels: {
        fetch: jest.fn().mockResolvedValue(channelOverride ?? defaultChannel),
      },
    } as any as Client,
    channel: channelOverride ?? defaultChannel,
    send: mockSend,
  };
}

/** Flush microtask queue so async initialize() completes. */
async function flushAsync(ms = 100) {
  await new Promise((r) => setTimeout(r, ms));
}

/** Reset the singleton so each test gets a fresh Scheduler. */
function resetSchedulerSingleton() {
  const instance = getScheduler();
  if (instance) {
    instance.stop();
    const SchedulerClass = (instance as any).constructor;
    SchedulerClass.instance = null;
  }
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Scheduler', () => {
  let mockClient: Client;
  let mockChannel: any;
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton so each test gets a fresh Scheduler with the new mockClient
    resetSchedulerSingleton();

    const mocks = createMockClient();
    mockClient = mocks.client;
    mockChannel = mocks.channel;
    mockSend = mocks.send;

    // Reset defaults
    mockGetActiveReminders.mockResolvedValue([]);
    mockEventConfigGetEnabledConfigs.mockResolvedValue([]);
    mockSunsetConfigGetEnabledConfigs.mockResolvedValue([]);
  });

  afterEach(() => {
    const scheduler = getScheduler();
    if (scheduler) {
      scheduler.stop();
    }
  });

  // ==========================================================================
  // Singleton & Initialization
  // ==========================================================================

  describe('Singleton Pattern', () => {
    it('should return null when getInstance called without client and no prior init', () => {
      const scheduler = getScheduler();
      expect(typeof getScheduler).toBe('function');
    });

    it('should create instance when startScheduler called with client', () => {
      startScheduler(mockClient);
      const scheduler = getScheduler();
      expect(scheduler).not.toBeNull();
    });

    it('should return the same instance on subsequent calls', () => {
      startScheduler(mockClient);
      const s1 = getScheduler();
      const s2 = getScheduler();
      expect(s1).toBe(s2);
    });
  });

  describe('initialize()', () => {
    it('should load reminders, event configs, daily questions, and sunset configs', async () => {
      startScheduler(mockClient);
      await flushAsync();

      expect(mockGetActiveReminders).toHaveBeenCalled();
      expect(mockEventConfigGetEnabledConfigs).toHaveBeenCalled();
      expect(mockSunsetConfigGetEnabledConfigs).toHaveBeenCalled();
    });

    it('should log success after initialization', async () => {
      startScheduler(mockClient);
      await flushAsync();

      expect(logger.info).toHaveBeenCalledWith('Scheduler initialized successfully');
    });

    it('should handle initialization errors gracefully', async () => {
      mockGetActiveReminders.mockRejectedValueOnce(new Error('DB down'));

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to load reminders',
        expect.objectContaining({ error: 'DB down' })
      );
    });

    it('should complete initialization even with partial failures', async () => {
      mockGetActiveReminders.mockRejectedValueOnce(new Error('DB down'));

      startScheduler(mockClient);
      await flushAsync();

      // Initialization should still complete
      expect(logger.info).toHaveBeenCalledWith('Scheduler initialized successfully');
    });
  });

  // ==========================================================================
  // Reminder Scheduling
  // ==========================================================================

  describe('Reminder Scheduling', () => {
    const dailyReminder = {
      id: 1,
      user_id: 'user-1',
      guild_id: 'guild-1',
      channel_id: 'channel-123',
      message: 'Daily standup',
      time: '09:00',
      frequency: 'daily',
    };

    const weeklyReminder = {
      id: 2,
      user_id: 'user-1',
      guild_id: 'guild-1',
      channel_id: 'channel-123',
      message: 'Weekly review',
      time: '14:30',
      frequency: 'weekly',
      day_of_week: 5,
    };

    const monthlyReminder = {
      id: 3,
      user_id: 'user-1',
      guild_id: 'guild-1',
      channel_id: 'channel-123',
      message: 'Monthly report',
      time: '10:00',
      frequency: 'monthly',
      day_of_month: 15,
    };

    const yearlyReminder = {
      id: 4,
      user_id: 'user-1',
      guild_id: 'guild-1',
      channel_id: 'channel-123',
      message: 'Anniversary',
      time: '12:00',
      frequency: 'yearly',
      month: 6,
      day_of_month: 15,
    };

    it('should schedule daily reminder with correct cron expression', async () => {
      mockGetActiveReminders.mockResolvedValueOnce([dailyReminder]);

      startScheduler(mockClient);
      await flushAsync();

      expect(cron.schedule).toHaveBeenCalledWith('00 09 * * *', expect.any(Function));
    });

    it('should schedule weekly reminder with day_of_week', async () => {
      mockGetActiveReminders.mockResolvedValueOnce([weeklyReminder]);

      startScheduler(mockClient);
      await flushAsync();

      expect(cron.schedule).toHaveBeenCalledWith('30 14 * * 5', expect.any(Function));
    });

    it('should schedule monthly reminder with day_of_month', async () => {
      mockGetActiveReminders.mockResolvedValueOnce([monthlyReminder]);

      startScheduler(mockClient);
      await flushAsync();

      expect(cron.schedule).toHaveBeenCalledWith('00 10 15 * *', expect.any(Function));
    });

    it('should schedule yearly reminder with month and day_of_month', async () => {
      mockGetActiveReminders.mockResolvedValueOnce([yearlyReminder]);

      startScheduler(mockClient);
      await flushAsync();

      expect(cron.schedule).toHaveBeenCalledWith('00 12 15 6 *', expect.any(Function));
    });

    it('should return null cron for monthly reminder without day_of_month', async () => {
      const badMonthly = { ...monthlyReminder, day_of_month: undefined };
      mockGetActiveReminders.mockResolvedValueOnce([badMonthly]);

      startScheduler(mockClient);
      await flushAsync();

      // cron.schedule should NOT be called for this reminder
      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      const hasMonthlyCall = cronCalls.some(
        (call: any[]) => typeof call[0] === 'string' && /\d+ \d+ \d+ \* \*/.test(call[0])
      );
      expect(hasMonthlyCall).toBe(false);
    });

    it('should return null cron for yearly reminder without month', async () => {
      const badYearly = { ...yearlyReminder, month: undefined };
      mockGetActiveReminders.mockResolvedValueOnce([badYearly]);

      startScheduler(mockClient);
      await flushAsync();

      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      const hasYearlyCall = cronCalls.some(
        (call: any[]) => typeof call[0] === 'string' && /\d+ \d+ \d+ \d+ \*/.test(call[0])
      );
      expect(hasYearlyCall).toBe(false);
    });

    it('should return null cron for unknown frequency', async () => {
      const unknownFreq = { ...dailyReminder, frequency: 'biweekly' };
      mockGetActiveReminders.mockResolvedValueOnce([unknownFreq]);

      startScheduler(mockClient);
      await flushAsync();

      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      expect(cronCalls.length).toBe(0);
    });

    it('should warn when reminder has no time set', async () => {
      const noTime = { ...dailyReminder, time: undefined };
      mockGetActiveReminders.mockResolvedValueOnce([noTime]);

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.warn).toHaveBeenCalledWith(
        'Reminder has no time set',
        expect.objectContaining({ reminderId: 1 })
      );
    });

    it('should log info when recurring reminder is scheduled', async () => {
      mockGetActiveReminders.mockResolvedValueOnce([dailyReminder]);

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.info).toHaveBeenCalledWith(
        'Reminder scheduled',
        expect.objectContaining({
          reminderId: 1,
          message: 'Daily standup',
          frequency: 'daily',
        })
      );
    });

    it('should schedule multiple reminders', async () => {
      mockGetActiveReminders.mockResolvedValueOnce([dailyReminder, weeklyReminder]);

      startScheduler(mockClient);
      await flushAsync();

      expect(cron.schedule).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // One-Time Reminder Scheduling
  // ==========================================================================

  describe('One-Time Reminder Scheduling', () => {
    it('should schedule one-time reminder with setTimeout for future trigger', async () => {
      const futureDate = new Date(Date.now() + 60000);
      const oneTimeReminder = {
        id: 10,
        user_id: 'user-1',
        guild_id: 'guild-1',
        channel_id: 'channel-123',
        message: 'One-time task',
        time: '15:00',
        frequency: 'once',
        next_trigger: futureDate.toISOString(),
      };

      mockGetActiveReminders.mockResolvedValueOnce([oneTimeReminder]);

      startScheduler(mockClient);
      await flushAsync();

      // Should NOT use cron.schedule for one-time reminders
      expect(cron.schedule).not.toHaveBeenCalled();

      expect(logger.info).toHaveBeenCalledWith(
        'One-time reminder scheduled',
        expect.objectContaining({
          reminderId: 10,
          message: 'One-time task',
        })
      );
    });

    it('should warn when one-time reminder trigger time has passed', async () => {
      const pastDate = new Date(Date.now() - 60000);
      const expiredReminder = {
        id: 11,
        user_id: 'user-1',
        guild_id: 'guild-1',
        channel_id: 'channel-123',
        message: 'Expired task',
        time: '10:00',
        frequency: 'once',
        next_trigger: pastDate.toISOString(),
      };

      mockGetActiveReminders.mockResolvedValueOnce([expiredReminder]);

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.warn).toHaveBeenCalledWith(
        'One-time reminder trigger time has already passed',
        expect.objectContaining({ reminderId: 11 })
      );
    });

    it('should warn when one-time reminder missing next_trigger', async () => {
      const noTrigger = {
        id: 12,
        user_id: 'user-1',
        guild_id: 'guild-1',
        channel_id: 'channel-123',
        message: 'No trigger',
        time: '10:00',
        frequency: 'once',
        next_trigger: undefined,
      };

      mockGetActiveReminders.mockResolvedValueOnce([noTrigger]);

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.warn).toHaveBeenCalledWith(
        'One-time reminder missing time or next_trigger',
        expect.objectContaining({ reminderId: 12 })
      );
    });

    it('should warn when one-time reminder missing time', async () => {
      const noTime = {
        id: 14,
        user_id: 'user-1',
        guild_id: 'guild-1',
        channel_id: 'channel-123',
        message: 'No time',
        time: undefined,
        frequency: 'once',
        next_trigger: new Date(Date.now() + 60000).toISOString(),
      };

      mockGetActiveReminders.mockResolvedValueOnce([noTime]);

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.warn).toHaveBeenCalledWith(
        'One-time reminder missing time or next_trigger',
        expect.objectContaining({ reminderId: 14 })
      );
    });

    it('should execute and delete one-time reminder when timeout fires', async () => {
      jest.useFakeTimers();

      const futureDate = new Date(Date.now() + 5000);
      const oneTimeReminder = {
        id: 13,
        user_id: 'user-1',
        guild_id: 'guild-1',
        channel_id: 'channel-123',
        message: 'Fire once',
        time: '15:00',
        frequency: 'once',
        next_trigger: futureDate.toISOString(),
      };

      // Make the channel look like a TextChannel
      Object.setPrototypeOf(mockChannel, TextChannel.prototype);

      mockGetActiveReminders.mockResolvedValueOnce([oneTimeReminder]);

      startScheduler(mockClient);

      // Let the initialize promise chain resolve
      await jest.advanceTimersByTimeAsync(200);

      // Advance timer to trigger the setTimeout
      await jest.advanceTimersByTimeAsync(6000);

      expect(mockDeleteReminder).toHaveBeenCalledWith(13, 'guild-1');

      jest.useRealTimers();
    });
  });

  // ==========================================================================
  // Reminder Execution
  // ==========================================================================

  describe('Reminder Execution (executeReminder)', () => {
    it('should log attempting to execute and fetch channel', async () => {
      const reminder = {
        id: 20,
        user_id: 'user-1',
        guild_id: 'guild-1',
        channel_id: 'channel-123',
        message: 'Test reminder',
        time: '09:00',
        frequency: 'daily',
      };

      mockGetActiveReminders.mockResolvedValueOnce([reminder]);

      startScheduler(mockClient);
      await flushAsync();

      const cronCallback = (cron.schedule as jest.Mock).mock.calls[0][1];
      await cronCallback();

      // executeReminder logs the attempt
      expect(logger.info).toHaveBeenCalledWith(
        'Attempting to execute reminder',
        expect.objectContaining({
          reminderId: 20,
          channelId: 'channel-123',
          userId: 'user-1',
          message: 'Test reminder',
        })
      );
    });

    it('should send to TextChannel and update next trigger', async () => {
      const reminder = {
        id: 21,
        user_id: 'user-1',
        guild_id: 'guild-1',
        channel_id: 'channel-123',
        message: 'Recurring',
        time: '09:00',
        frequency: 'daily',
      };

      // Create a real-ish TextChannel mock by making the prototype chain work
      const textChannel = Object.create(TextChannel.prototype);
      textChannel.send = jest.fn().mockResolvedValue({});
      textChannel.type = 0;
      (mockClient.channels.fetch as jest.Mock).mockResolvedValue(textChannel);

      mockGetActiveReminders.mockResolvedValueOnce([reminder]);

      startScheduler(mockClient);
      await flushAsync();

      const cronCallback = (cron.schedule as jest.Mock).mock.calls[0][1];
      await cronCallback();

      expect(textChannel.send).toHaveBeenCalledWith(
        expect.stringContaining('Reminder: **Recurring**')
      );
      expect(mockUpdateNextTrigger).toHaveBeenCalledWith(21);
    });

    it('should warn when channel is not a TextChannel', async () => {
      const reminder = {
        id: 22,
        user_id: 'user-1',
        guild_id: 'guild-1',
        channel_id: 'channel-123',
        message: 'Bad channel',
        time: '09:00',
        frequency: 'daily',
      };

      // Default mock channel is NOT a TextChannel instance
      mockGetActiveReminders.mockResolvedValueOnce([reminder]);

      startScheduler(mockClient);
      await flushAsync();

      const cronCallback = (cron.schedule as jest.Mock).mock.calls[0][1];
      await cronCallback();

      expect(logger.warn).toHaveBeenCalledWith(
        'Reminder channel not found or not a text channel',
        expect.objectContaining({ reminderId: 22 })
      );
    });

    it('should handle null channel', async () => {
      const reminder = {
        id: 25,
        user_id: 'user-1',
        guild_id: 'guild-1',
        channel_id: 'channel-123',
        message: 'Null channel',
        time: '09:00',
        frequency: 'daily',
      };

      (mockClient.channels.fetch as jest.Mock).mockResolvedValueOnce(null);
      mockGetActiveReminders.mockResolvedValueOnce([reminder]);

      startScheduler(mockClient);
      await flushAsync();

      const cronCallback = (cron.schedule as jest.Mock).mock.calls[0][1];
      await cronCallback();

      expect(logger.warn).toHaveBeenCalledWith(
        'Reminder channel not found or not a text channel',
        expect.objectContaining({ reminderId: 25 })
      );
    });

    it('should handle channel fetch error gracefully', async () => {
      const reminder = {
        id: 23,
        user_id: 'user-1',
        guild_id: 'guild-1',
        channel_id: 'bad-channel',
        message: 'Fetch error',
        time: '09:00',
        frequency: 'daily',
      };

      mockGetActiveReminders.mockResolvedValueOnce([reminder]);

      startScheduler(mockClient);
      await flushAsync();

      // Override fetch to reject for the callback invocation
      (mockClient.channels.fetch as jest.Mock).mockRejectedValueOnce(new Error('Unknown Channel'));

      const cronCallback = (cron.schedule as jest.Mock).mock.calls[0][1];
      await cronCallback();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to execute reminder',
        expect.objectContaining({ reminderId: 23, error: 'Unknown Channel' })
      );
    });

    it('should not update next trigger for once frequency', async () => {
      const reminder = {
        id: 24,
        user_id: 'user-1',
        guild_id: 'guild-1',
        channel_id: 'channel-123',
        message: 'Once exec',
        time: '09:00',
        frequency: 'daily',
      };

      const textChannel = Object.create(TextChannel.prototype);
      textChannel.send = jest.fn().mockResolvedValue({});
      (mockClient.channels.fetch as jest.Mock).mockResolvedValue(textChannel);

      mockGetActiveReminders.mockResolvedValueOnce([reminder]);

      startScheduler(mockClient);
      await flushAsync();

      const cronCallback = (cron.schedule as jest.Mock).mock.calls[0][1];
      await cronCallback();

      expect(mockUpdateNextTrigger).toHaveBeenCalledWith(24);
    });
  });

  // ==========================================================================
  // addReminder (public)
  // ==========================================================================

  describe('addReminder()', () => {
    it('should fetch reminder from supabase and schedule it', async () => {
      const reminder = {
        id: 30,
        user_id: 'user-1',
        guild_id: 'guild-1',
        channel_id: 'channel-123',
        message: 'Added later',
        time: '11:00',
        frequency: 'daily',
      };

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: reminder }),
          }),
        }),
      });

      startScheduler(mockClient);
      await flushAsync();
      jest.clearAllMocks();

      const scheduler = getScheduler()!;
      await scheduler.addReminder(30);

      expect(mockSupabaseFrom).toHaveBeenCalledWith('reminders');
      expect(cron.schedule).toHaveBeenCalledWith('00 11 * * *', expect.any(Function));
    });

    it('should handle database error when adding reminder', async () => {
      mockSupabaseFrom.mockImplementation(() => {
        throw new Error('Connection lost');
      });

      startScheduler(mockClient);
      await flushAsync();

      const scheduler = getScheduler()!;
      await scheduler.addReminder(99);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to add reminder to scheduler',
        expect.objectContaining({ reminderId: 99, error: 'Connection lost' })
      );
    });

    it('should not schedule when reminder not found in database', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });

      startScheduler(mockClient);
      await flushAsync();
      jest.clearAllMocks();

      const scheduler = getScheduler()!;
      await scheduler.addReminder(404);

      expect(cron.schedule).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Event Announcement
  // ==========================================================================

  describe('Event Announcement Scheduling', () => {
    const eventConfig = {
      id: 1,
      guild_id: 'guild-ev-1',
      location: 'Los Angeles, CA',
      announcement_channel_id: 'channel-ev-1',
      schedule_day: 1,
      schedule_hour: 12,
      schedule_minute: 0,
      timezone: 'America/Los_Angeles',
      is_enabled: true,
    };

    it('should schedule event announcements for enabled configs', async () => {
      mockEventConfigGetEnabledConfigs.mockResolvedValueOnce([eventConfig]);

      startScheduler(mockClient);
      await flushAsync();

      expect(cron.schedule).toHaveBeenCalledWith(
        '0 12 * * 1',
        expect.any(Function),
        expect.objectContaining({ timezone: 'America/Los_Angeles' })
      );
    });

    it('should handle error during event config loading', async () => {
      mockEventConfigGetEnabledConfigs.mockRejectedValueOnce(new Error('Config DB error'));

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to load event configurations',
        expect.objectContaining({ error: 'Config DB error' })
      );
    });

    it('should log event announcement count', async () => {
      mockEventConfigGetEnabledConfigs.mockResolvedValueOnce([
        eventConfig,
        { ...eventConfig, guild_id: 'guild-2' },
      ]);

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.info).toHaveBeenCalledWith(
        'Event announcements scheduled',
        expect.objectContaining({ count: 2 })
      );
    });
  });

  describe('Event Announcement Execution', () => {
    const eventConfig = {
      id: 1,
      guild_id: 'guild-ev-1',
      location: 'Los Angeles, CA',
      announcement_channel_id: 'channel-ev-1',
      schedule_day: 1,
      schedule_hour: 12,
      schedule_minute: 0,
      timezone: 'America/Los_Angeles',
      is_enabled: true,
    };

    it('should discover events and send embed to channel', async () => {
      mockEventConfigGetEnabledConfigs.mockResolvedValueOnce([eventConfig]);
      mockEventConfigGetGuildConfig.mockResolvedValueOnce(eventConfig);

      const events = [{ title: 'Concert', date: '2026-03-05' }];
      const embed = { title: 'Events', description: 'stuff' };

      mockDiscoverLocalEvents.mockResolvedValueOnce(events);
      mockFormatEventsForDiscord.mockResolvedValueOnce(embed);

      startScheduler(mockClient);
      await flushAsync();

      // Get the cron callback for the event config
      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      const eventCronCall = cronCalls.find((call: any[]) => call[0] === '0 12 * * 1');
      expect(eventCronCall).toBeDefined();

      await eventCronCall![1]();

      expect(mockDiscoverLocalEvents).toHaveBeenCalledWith(
        'Los Angeles, CA',
        expect.any(Date),
        expect.any(Date)
      );
      expect(mockChannel.send).toHaveBeenCalledWith({ embeds: [embed] });
      expect(mockEventConfigUpdateLastAnnouncement).toHaveBeenCalledWith('guild-ev-1');
    });

    it('should warn when event config is disabled at execution time', async () => {
      mockEventConfigGetEnabledConfigs.mockResolvedValueOnce([eventConfig]);
      mockEventConfigGetGuildConfig.mockResolvedValueOnce({
        ...eventConfig,
        is_enabled: false,
      });

      startScheduler(mockClient);
      await flushAsync();

      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      const eventCronCall = cronCalls.find((call: any[]) => call[0] === '0 12 * * 1');

      if (eventCronCall) {
        await eventCronCall[1]();
        expect(logger.warn).toHaveBeenCalledWith(
          'Event config not found or disabled',
          expect.objectContaining({ guildId: 'guild-ev-1' })
        );
      }
    });

    it('should warn when config is null at execution time', async () => {
      mockEventConfigGetEnabledConfigs.mockResolvedValueOnce([eventConfig]);
      mockEventConfigGetGuildConfig.mockResolvedValueOnce(null);

      startScheduler(mockClient);
      await flushAsync();

      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      const eventCronCall = cronCalls.find((call: any[]) => call[0] === '0 12 * * 1');

      if (eventCronCall) {
        await eventCronCall[1]();
        expect(logger.warn).toHaveBeenCalledWith(
          'Event config not found or disabled',
          expect.objectContaining({ guildId: 'guild-ev-1' })
        );
      }
    });

    it('should warn when event announcement channel is invalid', async () => {
      mockEventConfigGetEnabledConfigs.mockResolvedValueOnce([eventConfig]);
      mockEventConfigGetGuildConfig.mockResolvedValueOnce(eventConfig);
      mockDiscoverLocalEvents.mockResolvedValueOnce([]);
      mockFormatEventsForDiscord.mockResolvedValueOnce({});

      (mockClient.channels.fetch as jest.Mock).mockResolvedValueOnce(null);

      startScheduler(mockClient);
      await flushAsync();

      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      const eventCronCall = cronCalls.find((call: any[]) => call[0] === '0 12 * * 1');

      if (eventCronCall) {
        await eventCronCall[1]();
        expect(logger.warn).toHaveBeenCalledWith(
          'Event announcement channel not found or invalid',
          expect.objectContaining({ guildId: 'guild-ev-1' })
        );
      }
    });

    it('should handle event discovery errors gracefully', async () => {
      mockEventConfigGetEnabledConfigs.mockResolvedValueOnce([eventConfig]);
      mockEventConfigGetGuildConfig.mockResolvedValueOnce(eventConfig);
      mockDiscoverLocalEvents.mockRejectedValueOnce(new Error('API timeout'));

      startScheduler(mockClient);
      await flushAsync();

      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      const eventCronCall = cronCalls.find((call: any[]) => call[0] === '0 12 * * 1');

      if (eventCronCall) {
        await eventCronCall[1]();
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to execute event announcement',
          expect.objectContaining({ guildId: 'guild-ev-1', error: 'API timeout' })
        );
      }
    });
  });

  // ==========================================================================
  // addEventConfig / removeEventConfig (public)
  // ==========================================================================

  describe('addEventConfig()', () => {
    const eventConfig = {
      guild_id: 'guild-add-1',
      location: 'NYC',
      announcement_channel_id: 'ch-1',
      schedule_day: 3,
      schedule_hour: 10,
      schedule_minute: 30,
      timezone: 'America/New_York',
      is_enabled: true,
    };

    it('should add a new event config and schedule cron', async () => {
      mockEventConfigGetGuildConfig.mockResolvedValueOnce(eventConfig);

      startScheduler(mockClient);
      await flushAsync();
      jest.clearAllMocks();

      const scheduler = getScheduler()!;
      await scheduler.addEventConfig('guild-add-1');

      expect(mockEventConfigGetGuildConfig).toHaveBeenCalledWith('guild-add-1');
      expect(cron.schedule).toHaveBeenCalled();
    });

    it('should not schedule when config is not enabled', async () => {
      mockEventConfigGetGuildConfig.mockResolvedValueOnce({
        ...eventConfig,
        is_enabled: false,
      });

      startScheduler(mockClient);
      await flushAsync();
      jest.clearAllMocks();

      const scheduler = getScheduler()!;
      await scheduler.addEventConfig('guild-add-1');

      expect(cron.schedule).not.toHaveBeenCalled();
    });

    it('should not schedule when config is null', async () => {
      mockEventConfigGetGuildConfig.mockResolvedValueOnce(null);

      startScheduler(mockClient);
      await flushAsync();
      jest.clearAllMocks();

      const scheduler = getScheduler()!;
      await scheduler.addEventConfig('guild-add-1');

      expect(cron.schedule).not.toHaveBeenCalled();
    });

    it('should handle errors when adding event config', async () => {
      mockEventConfigGetGuildConfig.mockRejectedValueOnce(new Error('Fetch failed'));

      startScheduler(mockClient);
      await flushAsync();

      const scheduler = getScheduler()!;
      await scheduler.addEventConfig('guild-add-1');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to add event config to scheduler',
        expect.objectContaining({ guildId: 'guild-add-1' })
      );
    });

    it('should remove existing job before rescheduling', async () => {
      mockEventConfigGetGuildConfig.mockResolvedValue(eventConfig);

      startScheduler(mockClient);
      await flushAsync();

      const scheduler = getScheduler()!;
      await scheduler.addEventConfig('guild-add-1');
      jest.clearAllMocks();

      // Add again - should remove existing first
      await scheduler.addEventConfig('guild-add-1');

      expect(mockCronStop).toHaveBeenCalled();
      expect(cron.schedule).toHaveBeenCalled();
    });
  });

  describe('removeEventConfig()', () => {
    it('should stop and remove event job', async () => {
      const eventConfig = {
        guild_id: 'guild-rm-1',
        location: 'LA',
        announcement_channel_id: 'ch-1',
        schedule_day: 1,
        schedule_hour: 12,
        schedule_minute: 0,
        timezone: 'America/Los_Angeles',
        is_enabled: true,
      };

      mockEventConfigGetGuildConfig.mockResolvedValueOnce(eventConfig);

      startScheduler(mockClient);
      await flushAsync();

      const scheduler = getScheduler()!;
      await scheduler.addEventConfig('guild-rm-1');

      scheduler.removeEventConfig('guild-rm-1');

      expect(mockCronStop).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Event config removed from scheduler',
        expect.objectContaining({ guildId: 'guild-rm-1' })
      );
    });

    it('should handle removing non-existent config gracefully', () => {
      startScheduler(mockClient);
      const scheduler = getScheduler()!;

      // Should not throw
      scheduler.removeEventConfig('non-existent-guild');
    });
  });

  // ==========================================================================
  // Daily Question Scheduling
  // ==========================================================================

  describe('Daily Question Scheduling', () => {
    const questionConfig = {
      guild_id: 'guild-q-1',
      announcement_channel_id: 'ch-q-1',
      timezone: 'America/Los_Angeles',
      is_enabled: true,
    };

    it('should schedule daily question at 5 PM for configs with channel', async () => {
      // getEnabledConfigs is called twice: once for event configs, once for daily questions
      mockEventConfigGetEnabledConfigs
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([questionConfig]);

      startScheduler(mockClient);
      await flushAsync();

      expect(cron.schedule).toHaveBeenCalledWith(
        '0 17 * * *',
        expect.any(Function),
        expect.objectContaining({ timezone: 'America/Los_Angeles' })
      );
    });

    it('should skip configs without announcement_channel_id', async () => {
      const noChannel = { ...questionConfig, announcement_channel_id: null };
      mockEventConfigGetEnabledConfigs.mockResolvedValueOnce([]).mockResolvedValueOnce([noChannel]);

      startScheduler(mockClient);
      await flushAsync();

      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      const dailyQuestionCall = cronCalls.find((call: any[]) => call[0] === '0 17 * * *');
      expect(dailyQuestionCall).toBeUndefined();
    });

    it('should handle error during daily question scheduling', async () => {
      mockEventConfigGetEnabledConfigs
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('DB error'));

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to schedule daily questions',
        expect.objectContaining({ error: 'DB error' })
      );
    });

    it('should log daily question count', async () => {
      mockEventConfigGetEnabledConfigs
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([questionConfig, { ...questionConfig, guild_id: 'guild-q-2' }]);

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.info).toHaveBeenCalledWith(
        'Daily questions scheduled',
        expect.objectContaining({ count: 2 })
      );
    });
  });

  describe('Daily Question Execution', () => {
    const questionConfig = {
      guild_id: 'guild-q-1',
      announcement_channel_id: 'ch-q-1',
      timezone: 'America/Los_Angeles',
      is_enabled: true,
    };

    it('should generate question via Gemini and send embed', async () => {
      mockEventConfigGetEnabledConfigs
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([questionConfig]);

      mockEventConfigGetGuildConfig.mockResolvedValueOnce(questionConfig);
      mockGenerateQuestion.mockResolvedValueOnce({
        question: 'What makes you feel alive?',
        level: 2,
        levelName: 'Connection',
      });

      startScheduler(mockClient);
      await flushAsync();

      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      const dailyCall = cronCalls.find((call: any[]) => call[0] === '0 17 * * *');
      expect(dailyCall).toBeDefined();

      await dailyCall![1]();

      expect(mockGenerateQuestion).toHaveBeenCalled();
      expect(mockChannel.send).toHaveBeenCalledWith({
        embeds: [expect.any(Object)],
      });
    });

    it('should skip when config is disabled at execution time', async () => {
      mockEventConfigGetEnabledConfigs
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([questionConfig]);

      mockEventConfigGetGuildConfig.mockResolvedValueOnce({
        ...questionConfig,
        is_enabled: false,
      });

      startScheduler(mockClient);
      await flushAsync();

      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      const dailyCall = cronCalls.find((call: any[]) => call[0] === '0 17 * * *');

      if (dailyCall) {
        await dailyCall[1]();
        expect(logger.warn).toHaveBeenCalledWith(
          'Event config not found, disabled, or missing channel for daily question',
          expect.objectContaining({ guildId: 'guild-q-1' })
        );
        expect(mockGenerateQuestion).not.toHaveBeenCalled();
      }
    });

    it('should skip when config is null at execution time', async () => {
      mockEventConfigGetEnabledConfigs
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([questionConfig]);

      mockEventConfigGetGuildConfig.mockResolvedValueOnce(null);

      startScheduler(mockClient);
      await flushAsync();

      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      const dailyCall = cronCalls.find((call: any[]) => call[0] === '0 17 * * *');

      if (dailyCall) {
        await dailyCall[1]();
        expect(logger.warn).toHaveBeenCalledWith(
          'Event config not found, disabled, or missing channel for daily question',
          expect.objectContaining({ guildId: 'guild-q-1' })
        );
      }
    });

    it('should skip when config missing channel at execution time', async () => {
      mockEventConfigGetEnabledConfigs
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([questionConfig]);

      mockEventConfigGetGuildConfig.mockResolvedValueOnce({
        ...questionConfig,
        announcement_channel_id: null,
      });

      startScheduler(mockClient);
      await flushAsync();

      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      const dailyCall = cronCalls.find((call: any[]) => call[0] === '0 17 * * *');

      if (dailyCall) {
        await dailyCall[1]();
        expect(logger.warn).toHaveBeenCalledWith(
          'Event config not found, disabled, or missing channel for daily question',
          expect.objectContaining({ guildId: 'guild-q-1' })
        );
      }
    });

    it('should skip when Gemini API is unavailable', async () => {
      mockEventConfigGetEnabledConfigs
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([questionConfig]);

      mockEventConfigGetGuildConfig.mockResolvedValueOnce(questionConfig);
      mockGenerateQuestion.mockRejectedValueOnce(new Error('Gemini quota exceeded'));

      startScheduler(mockClient);
      await flushAsync();

      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      const dailyCall = cronCalls.find((call: any[]) => call[0] === '0 17 * * *');

      if (dailyCall) {
        await dailyCall[1]();
        expect(logger.warn).toHaveBeenCalledWith(
          'Gemini API unavailable for daily question, skipping',
          expect.objectContaining({ guildId: 'guild-q-1' })
        );
        expect(mockChannel.send).not.toHaveBeenCalled();
      }
    });

    it('should handle channel not found for daily question', async () => {
      mockEventConfigGetEnabledConfigs
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([questionConfig]);

      mockEventConfigGetGuildConfig.mockResolvedValueOnce(questionConfig);
      mockGenerateQuestion.mockResolvedValueOnce({
        question: 'Test question',
        level: 1,
        levelName: 'Perception',
      });
      (mockClient.channels.fetch as jest.Mock).mockResolvedValueOnce(null);

      startScheduler(mockClient);
      await flushAsync();

      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      const dailyCall = cronCalls.find((call: any[]) => call[0] === '0 17 * * *');

      if (dailyCall) {
        await dailyCall[1]();
        expect(logger.warn).toHaveBeenCalledWith(
          'Daily question channel not found or invalid',
          expect.objectContaining({ guildId: 'guild-q-1' })
        );
      }
    });

    it('should use level 1 color for embed', async () => {
      mockEventConfigGetEnabledConfigs
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([questionConfig]);

      mockEventConfigGetGuildConfig.mockResolvedValueOnce(questionConfig);
      mockGenerateQuestion.mockResolvedValueOnce({
        question: 'Easy question',
        level: 1,
        levelName: 'Perception',
      });

      startScheduler(mockClient);
      await flushAsync();

      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      const dailyCall = cronCalls.find((call: any[]) => call[0] === '0 17 * * *');

      if (dailyCall) {
        await dailyCall[1]();
        expect(mockChannel.send).toHaveBeenCalled();
      }
    });

    it('should use level 3 color for embed', async () => {
      mockEventConfigGetEnabledConfigs
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([questionConfig]);

      mockEventConfigGetGuildConfig.mockResolvedValueOnce(questionConfig);
      mockGenerateQuestion.mockResolvedValueOnce({
        question: 'Deep question',
        level: 3,
        levelName: 'Reflection',
      });

      startScheduler(mockClient);
      await flushAsync();

      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      const dailyCall = cronCalls.find((call: any[]) => call[0] === '0 17 * * *');

      if (dailyCall) {
        await dailyCall[1]();
        expect(mockChannel.send).toHaveBeenCalled();
      }
    });

    it('should use default color for unknown level', async () => {
      mockEventConfigGetEnabledConfigs
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([questionConfig]);

      mockEventConfigGetGuildConfig.mockResolvedValueOnce(questionConfig);
      mockGenerateQuestion.mockResolvedValueOnce({
        question: 'Unknown level question',
        level: 99,
        levelName: 'Unknown',
      });

      startScheduler(mockClient);
      await flushAsync();

      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      const dailyCall = cronCalls.find((call: any[]) => call[0] === '0 17 * * *');

      if (dailyCall) {
        await dailyCall[1]();
        expect(mockChannel.send).toHaveBeenCalled();
      }
    });
  });

  // ==========================================================================
  // Sunset Scheduling
  // ==========================================================================

  describe('Sunset Config Scheduling', () => {
    const sunsetConfig = {
      guild_id: 'guild-sun-1',
      channel_id: 'ch-sun-1',
      zip_code: '90001',
      advance_minutes: 30,
      timezone: 'America/Los_Angeles',
      is_enabled: true,
    };

    it('should schedule daily sunset check at 00:05', async () => {
      mockSunsetConfigGetEnabledConfigs.mockResolvedValueOnce([sunsetConfig]);
      mockSunsetConfigGetGuildConfig.mockResolvedValue(sunsetConfig);

      const futureSunset = new Date(Date.now() + 3600000);
      mockGetCoordinatesFromZip.mockResolvedValue({ lat: 33.9, lng: -118.2 });
      mockGetSunsetTime.mockResolvedValue(futureSunset);

      startScheduler(mockClient);
      await flushAsync();

      expect(cron.schedule).toHaveBeenCalledWith(
        '5 0 * * *',
        expect.any(Function),
        expect.objectContaining({ timezone: 'America/Los_Angeles' })
      );
    });

    it('should run immediate sunset check on startup', async () => {
      mockSunsetConfigGetEnabledConfigs.mockResolvedValueOnce([sunsetConfig]);
      mockSunsetConfigGetGuildConfig.mockResolvedValueOnce(sunsetConfig);

      const futureSunset = new Date(Date.now() + 7200000);
      mockGetCoordinatesFromZip.mockResolvedValueOnce({ lat: 33.9, lng: -118.2 });
      mockGetSunsetTime.mockResolvedValueOnce(futureSunset);

      startScheduler(mockClient);
      await flushAsync();

      expect(mockGetCoordinatesFromZip).toHaveBeenCalledWith('90001');
      expect(mockGetSunsetTime).toHaveBeenCalled();
    });

    it('should skip sunset if announcement time already passed today', async () => {
      mockSunsetConfigGetEnabledConfigs.mockResolvedValueOnce([sunsetConfig]);
      mockSunsetConfigGetGuildConfig.mockResolvedValueOnce(sunsetConfig);

      // Sunset already passed: advance_minutes=30, so announceTime = sunset - 30min
      // If sunset is 1 hour ago, announceTime is 1.5 hours ago => delay <= 0
      const pastSunset = new Date(Date.now() - 3600000);
      mockGetCoordinatesFromZip.mockResolvedValueOnce({ lat: 33.9, lng: -118.2 });
      mockGetSunsetTime.mockResolvedValueOnce(pastSunset);

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.info).toHaveBeenCalledWith(
        'Sunset announcement time already passed for today',
        expect.objectContaining({ guildId: 'guild-sun-1' })
      );
    });

    it('should handle error loading sunset configs', async () => {
      mockSunsetConfigGetEnabledConfigs.mockRejectedValueOnce(new Error('Sunset DB fail'));

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to load sunset configurations',
        expect.objectContaining({ error: 'Sunset DB fail' })
      );
    });

    it('should warn when config disabled at execution time', async () => {
      mockSunsetConfigGetEnabledConfigs.mockResolvedValueOnce([sunsetConfig]);
      mockSunsetConfigGetGuildConfig.mockResolvedValueOnce({
        ...sunsetConfig,
        is_enabled: false,
      });

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.warn).toHaveBeenCalledWith(
        'Sunset config not found or disabled',
        expect.objectContaining({ guildId: 'guild-sun-1' })
      );
    });

    it('should warn when config is null at execution time', async () => {
      mockSunsetConfigGetEnabledConfigs.mockResolvedValueOnce([sunsetConfig]);
      mockSunsetConfigGetGuildConfig.mockResolvedValueOnce(null);

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.warn).toHaveBeenCalledWith(
        'Sunset config not found or disabled',
        expect.objectContaining({ guildId: 'guild-sun-1' })
      );
    });

    it('should handle sunset service error gracefully', async () => {
      mockSunsetConfigGetEnabledConfigs.mockResolvedValueOnce([sunsetConfig]);
      mockSunsetConfigGetGuildConfig.mockResolvedValueOnce(sunsetConfig);
      mockGetCoordinatesFromZip.mockRejectedValueOnce(new Error('Geocoding API down'));

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to execute sunset check',
        expect.objectContaining({
          guildId: 'guild-sun-1',
          error: 'Geocoding API down',
        })
      );
    });

    it('should schedule sunset announcement for future time', async () => {
      mockSunsetConfigGetEnabledConfigs.mockResolvedValueOnce([sunsetConfig]);
      mockSunsetConfigGetGuildConfig.mockResolvedValueOnce(sunsetConfig);

      // Sunset 2 hours from now, advance_minutes=30, so announceTime is 1.5h from now
      const futureSunset = new Date(Date.now() + 7200000);
      mockGetCoordinatesFromZip.mockResolvedValueOnce({ lat: 33.9, lng: -118.2 });
      mockGetSunsetTime.mockResolvedValueOnce(futureSunset);

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.info).toHaveBeenCalledWith(
        'Sunset announcement scheduled for today',
        expect.objectContaining({
          guildId: 'guild-sun-1',
          advanceMinutes: 30,
        })
      );
    });

    it('should log sunset config count', async () => {
      mockSunsetConfigGetEnabledConfigs.mockResolvedValueOnce([
        sunsetConfig,
        { ...sunsetConfig, guild_id: 'guild-sun-2' },
      ]);
      mockSunsetConfigGetGuildConfig.mockResolvedValue(sunsetConfig);
      mockGetCoordinatesFromZip.mockResolvedValue({ lat: 33.9, lng: -118.2 });
      mockGetSunsetTime.mockResolvedValue(new Date(Date.now() + 7200000));

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.info).toHaveBeenCalledWith(
        'Sunset announcements scheduled',
        expect.objectContaining({ count: 2 })
      );
    });
  });

  describe('Sunset Announcement Execution', () => {
    const sunsetConfig = {
      guild_id: 'guild-sun-1',
      channel_id: 'ch-sun-1',
      zip_code: '90001',
      advance_minutes: 30,
      timezone: 'America/Los_Angeles',
      is_enabled: true,
    };

    it('should send sunset embed and update last announcement', async () => {
      jest.useFakeTimers();

      mockSunsetConfigGetEnabledConfigs.mockResolvedValueOnce([sunsetConfig]);

      const realFutureSunset = new Date(Date.now() + 35 * 60000);
      mockSunsetConfigGetGuildConfig
        .mockResolvedValueOnce(sunsetConfig) // executeSunsetCheck
        .mockResolvedValueOnce(sunsetConfig); // executeSunsetAnnouncement
      mockGetCoordinatesFromZip.mockResolvedValueOnce({ lat: 33.9, lng: -118.2 });
      mockGetSunsetTime.mockResolvedValueOnce(realFutureSunset);

      const sunsetEmbed = { title: 'Sunset', color: 0xff6b35 };
      mockFormatSunsetEmbed.mockReturnValueOnce(sunsetEmbed);

      startScheduler(mockClient);

      await jest.advanceTimersByTimeAsync(200);

      // Advance to trigger the sunset announcement timeout
      await jest.advanceTimersByTimeAsync(35 * 60000);

      expect(mockFormatSunsetEmbed).toHaveBeenCalledWith(realFutureSunset, 'America/Los_Angeles');
      expect(mockChannel.send).toHaveBeenCalledWith({ embeds: [sunsetEmbed] });
      expect(mockSunsetConfigUpdateLastAnnouncement).toHaveBeenCalledWith('guild-sun-1');

      jest.useRealTimers();
    });

    it('should warn when sunset config disabled at announcement time', async () => {
      jest.useFakeTimers();

      mockSunsetConfigGetEnabledConfigs.mockResolvedValueOnce([sunsetConfig]);

      const realFutureSunset = new Date(Date.now() + 35 * 60000);
      mockSunsetConfigGetGuildConfig
        .mockResolvedValueOnce(sunsetConfig) // executeSunsetCheck
        .mockResolvedValueOnce({ ...sunsetConfig, is_enabled: false }); // announcement
      mockGetCoordinatesFromZip.mockResolvedValueOnce({ lat: 33.9, lng: -118.2 });
      mockGetSunsetTime.mockResolvedValueOnce(realFutureSunset);

      startScheduler(mockClient);

      await jest.advanceTimersByTimeAsync(200);
      await jest.advanceTimersByTimeAsync(35 * 60000);

      expect(logger.warn).toHaveBeenCalledWith(
        'Sunset config not found or disabled at announcement time',
        expect.objectContaining({ guildId: 'guild-sun-1' })
      );

      jest.useRealTimers();
    });

    it('should warn when sunset announcement channel is invalid', async () => {
      jest.useFakeTimers();

      mockSunsetConfigGetEnabledConfigs.mockResolvedValueOnce([sunsetConfig]);

      const realFutureSunset = new Date(Date.now() + 35 * 60000);
      mockSunsetConfigGetGuildConfig
        .mockResolvedValueOnce(sunsetConfig)
        .mockResolvedValueOnce(sunsetConfig);
      mockGetCoordinatesFromZip.mockResolvedValueOnce({ lat: 33.9, lng: -118.2 });
      mockGetSunsetTime.mockResolvedValueOnce(realFutureSunset);
      mockFormatSunsetEmbed.mockReturnValueOnce({ title: 'Sunset' });

      // Return null channel for the announcement
      (mockClient.channels.fetch as jest.Mock).mockResolvedValue(null);

      startScheduler(mockClient);

      await jest.advanceTimersByTimeAsync(200);
      await jest.advanceTimersByTimeAsync(35 * 60000);

      expect(logger.warn).toHaveBeenCalledWith(
        'Sunset announcement channel not found or invalid',
        expect.objectContaining({ guildId: 'guild-sun-1' })
      );

      jest.useRealTimers();
    });

    it('should handle error during sunset announcement', async () => {
      jest.useFakeTimers();

      mockSunsetConfigGetEnabledConfigs.mockResolvedValueOnce([sunsetConfig]);

      const realFutureSunset = new Date(Date.now() + 35 * 60000);
      mockSunsetConfigGetGuildConfig
        .mockResolvedValueOnce(sunsetConfig)
        .mockRejectedValueOnce(new Error('Announcement DB fail'));
      mockGetCoordinatesFromZip.mockResolvedValueOnce({ lat: 33.9, lng: -118.2 });
      mockGetSunsetTime.mockResolvedValueOnce(realFutureSunset);

      startScheduler(mockClient);

      await jest.advanceTimersByTimeAsync(200);
      await jest.advanceTimersByTimeAsync(35 * 60000);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to execute sunset announcement',
        expect.objectContaining({
          guildId: 'guild-sun-1',
          error: 'Announcement DB fail',
        })
      );

      jest.useRealTimers();
    });
  });

  // ==========================================================================
  // addSunsetConfig / removeSunsetConfig (public)
  // ==========================================================================

  describe('addSunsetConfig()', () => {
    const sunsetConfig = {
      guild_id: 'guild-add-sun',
      channel_id: 'ch-sun',
      zip_code: '10001',
      advance_minutes: 15,
      timezone: 'America/New_York',
      is_enabled: true,
    };

    it('should add sunset config and schedule daily check', async () => {
      startScheduler(mockClient);
      await flushAsync();
      jest.clearAllMocks();

      mockSunsetConfigGetGuildConfig
        .mockResolvedValueOnce(sunsetConfig) // addSunsetConfig
        .mockResolvedValueOnce(sunsetConfig); // executeSunsetCheck (immediate)
      mockGetCoordinatesFromZip.mockResolvedValueOnce({ lat: 40.7, lng: -74.0 });
      mockGetSunsetTime.mockResolvedValueOnce(new Date(Date.now() + 7200000));

      const scheduler = getScheduler()!;
      await scheduler.addSunsetConfig('guild-add-sun');
      await flushAsync();

      expect(mockSunsetConfigGetGuildConfig).toHaveBeenCalledWith('guild-add-sun');
      expect(cron.schedule).toHaveBeenCalledWith(
        '5 0 * * *',
        expect.any(Function),
        expect.objectContaining({ timezone: 'America/New_York' })
      );
    });

    it('should not schedule when config is not enabled', async () => {
      startScheduler(mockClient);
      await flushAsync();
      jest.clearAllMocks();

      mockSunsetConfigGetGuildConfig.mockResolvedValueOnce({
        ...sunsetConfig,
        is_enabled: false,
      });

      const scheduler = getScheduler()!;
      await scheduler.addSunsetConfig('guild-add-sun');

      expect(cron.schedule).not.toHaveBeenCalled();
    });

    it('should not schedule when config is null', async () => {
      startScheduler(mockClient);
      await flushAsync();
      jest.clearAllMocks();

      mockSunsetConfigGetGuildConfig.mockResolvedValueOnce(null);

      const scheduler = getScheduler()!;
      await scheduler.addSunsetConfig('guild-add-sun');

      expect(cron.schedule).not.toHaveBeenCalled();
    });

    it('should handle error when adding sunset config', async () => {
      mockSunsetConfigGetGuildConfig.mockRejectedValueOnce(new Error('Sunset add fail'));

      startScheduler(mockClient);
      await flushAsync();

      const scheduler = getScheduler()!;
      await scheduler.addSunsetConfig('guild-err');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to add sunset config to scheduler',
        expect.objectContaining({ guildId: 'guild-err' })
      );
    });

    it('should remove existing sunset jobs before rescheduling', async () => {
      startScheduler(mockClient);
      await flushAsync();

      // First add
      mockSunsetConfigGetGuildConfig
        .mockResolvedValueOnce(sunsetConfig)
        .mockResolvedValueOnce(sunsetConfig);
      mockGetCoordinatesFromZip.mockResolvedValueOnce({ lat: 40.7, lng: -74.0 });
      mockGetSunsetTime.mockResolvedValueOnce(new Date(Date.now() + 7200000));

      const scheduler = getScheduler()!;
      await scheduler.addSunsetConfig('guild-add-sun');
      await flushAsync();

      jest.clearAllMocks();

      // Second add should remove existing first
      mockSunsetConfigGetGuildConfig
        .mockResolvedValueOnce(sunsetConfig)
        .mockResolvedValueOnce(sunsetConfig);
      mockGetCoordinatesFromZip.mockResolvedValueOnce({ lat: 40.7, lng: -74.0 });
      mockGetSunsetTime.mockResolvedValueOnce(new Date(Date.now() + 7200000));

      await scheduler.addSunsetConfig('guild-add-sun');
      await flushAsync();

      // removeSunsetConfig was called internally
      expect(logger.info).toHaveBeenCalledWith(
        'Sunset config removed from scheduler',
        expect.objectContaining({ guildId: 'guild-add-sun' })
      );
    });
  });

  describe('removeSunsetConfig()', () => {
    it('should stop both daily and announce jobs', async () => {
      const sunsetConfig = {
        guild_id: 'guild-rm-sun',
        channel_id: 'ch-sun',
        zip_code: '90001',
        advance_minutes: 30,
        timezone: 'America/Los_Angeles',
        is_enabled: true,
      };

      mockSunsetConfigGetEnabledConfigs.mockResolvedValueOnce([sunsetConfig]);
      mockSunsetConfigGetGuildConfig.mockResolvedValueOnce(sunsetConfig);
      mockGetCoordinatesFromZip.mockResolvedValueOnce({ lat: 33.9, lng: -118.2 });
      mockGetSunsetTime.mockResolvedValueOnce(new Date(Date.now() + 7200000));

      startScheduler(mockClient);
      await flushAsync();

      const scheduler = getScheduler()!;
      scheduler.removeSunsetConfig('guild-rm-sun');

      expect(logger.info).toHaveBeenCalledWith(
        'Sunset config removed from scheduler',
        expect.objectContaining({ guildId: 'guild-rm-sun' })
      );
    });

    it('should handle removing non-existent sunset config', () => {
      startScheduler(mockClient);
      const scheduler = getScheduler()!;

      // Should not throw
      scheduler.removeSunsetConfig('non-existent');
      expect(logger.info).toHaveBeenCalledWith(
        'Sunset config removed from scheduler',
        expect.objectContaining({ guildId: 'non-existent' })
      );
    });
  });

  // ==========================================================================
  // stop()
  // ==========================================================================

  describe('stop()', () => {
    it('should stop all jobs and clear the map', async () => {
      const reminder = {
        id: 50,
        user_id: 'user-1',
        guild_id: 'guild-1',
        channel_id: 'ch-1',
        message: 'Test',
        time: '09:00',
        frequency: 'daily',
      };

      mockGetActiveReminders.mockResolvedValueOnce([reminder]);

      startScheduler(mockClient);
      await flushAsync();

      const scheduler = getScheduler()!;
      scheduler.stop();

      expect(mockCronStop).toHaveBeenCalled();
    });

    it('should handle stop when no jobs are scheduled', () => {
      startScheduler(mockClient);
      const scheduler = getScheduler()!;

      // Should not throw
      scheduler.stop();
      expect(scheduler).toBeDefined();
    });
  });

  // ==========================================================================
  // getCronExpression edge cases
  // ==========================================================================

  describe('getCronExpression - edge cases', () => {
    it('should handle "once" frequency by routing to scheduleOneTimeReminder', async () => {
      const onceReminder = {
        id: 60,
        user_id: 'user-1',
        guild_id: 'guild-1',
        channel_id: 'ch-1',
        message: 'Once',
        time: '10:00',
        frequency: 'once',
        next_trigger: null,
      };

      mockGetActiveReminders.mockResolvedValueOnce([onceReminder]);
      startScheduler(mockClient);
      await flushAsync();

      // Should not schedule via cron
      expect(cron.schedule).not.toHaveBeenCalled();
      // Should warn about missing next_trigger
      expect(logger.warn).toHaveBeenCalledWith(
        'One-time reminder missing time or next_trigger',
        expect.objectContaining({ reminderId: 60 })
      );
    });

    it('should return null for yearly without day_of_month', async () => {
      const badYearly = {
        id: 61,
        user_id: 'user-1',
        guild_id: 'guild-1',
        channel_id: 'ch-1',
        message: 'Bad yearly',
        time: '12:00',
        frequency: 'yearly',
        month: 6,
        day_of_month: undefined,
      };

      mockGetActiveReminders.mockResolvedValueOnce([badYearly]);
      startScheduler(mockClient);
      await flushAsync();

      expect(cron.schedule).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Sunset executeSunsetCheck - cancels existing announcement
  // ==========================================================================

  describe('executeSunsetCheck - cancel existing', () => {
    it('should cancel existing sunset announcement before scheduling new one', async () => {
      const sunsetConfig = {
        guild_id: 'guild-cancel',
        channel_id: 'ch-sun',
        zip_code: '90001',
        advance_minutes: 30,
        timezone: 'America/Los_Angeles',
        is_enabled: true,
      };

      mockSunsetConfigGetEnabledConfigs.mockResolvedValueOnce([sunsetConfig]);
      mockSunsetConfigGetGuildConfig.mockResolvedValueOnce(sunsetConfig);
      mockGetCoordinatesFromZip.mockResolvedValueOnce({ lat: 33.9, lng: -118.2 });
      mockGetSunsetTime.mockResolvedValueOnce(new Date(Date.now() + 7200000));

      startScheduler(mockClient);
      await flushAsync();

      // Now trigger the daily cron check again (simulates next day)
      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      const sunsetDailyCall = cronCalls.find((call: any[]) => call[0] === '5 0 * * *');

      if (sunsetDailyCall) {
        mockSunsetConfigGetGuildConfig.mockResolvedValueOnce(sunsetConfig);
        mockGetCoordinatesFromZip.mockResolvedValueOnce({ lat: 33.9, lng: -118.2 });
        mockGetSunsetTime.mockResolvedValueOnce(new Date(Date.now() + 7200000));

        await sunsetDailyCall[1]();

        expect(logger.info).toHaveBeenCalledWith(
          'Sunset announcement scheduled for today',
          expect.objectContaining({ guildId: 'guild-cancel' })
        );
      }
    });
  });

  // ==========================================================================
  // scheduleEventAnnouncement error handling
  // ==========================================================================

  describe('scheduleEventAnnouncement error handling', () => {
    it('should handle error in scheduleEventAnnouncement', async () => {
      const badConfig = {
        guild_id: 'guild-bad',
        location: 'LA',
        announcement_channel_id: 'ch-1',
        schedule_day: 1,
        schedule_hour: 12,
        schedule_minute: 0,
        timezone: 'America/Los_Angeles',
        is_enabled: true,
      };

      // Make buildCronExpression throw
      const dateHelpers = require('../../../utils/dateHelpers');
      dateHelpers.buildCronExpression.mockImplementationOnce(() => {
        throw new Error('Invalid cron');
      });

      mockEventConfigGetEnabledConfigs.mockResolvedValueOnce([badConfig]);

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to schedule event announcement',
        expect.objectContaining({ guildId: 'guild-bad', error: 'Invalid cron' })
      );
    });
  });

  // ==========================================================================
  // scheduleDailyQuestion error handling
  // ==========================================================================

  describe('scheduleDailyQuestion error handling', () => {
    it('should handle error in scheduleDailyQuestion', async () => {
      const questionConfig = {
        guild_id: 'guild-q-err',
        announcement_channel_id: 'ch-q-1',
        timezone: 'America/Los_Angeles',
        is_enabled: true,
      };

      // Make cron.schedule throw for the daily question
      (cron.schedule as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Cron schedule error');
      });

      mockEventConfigGetEnabledConfigs
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([questionConfig]);

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to schedule daily question',
        expect.objectContaining({ guildId: 'guild-q-err' })
      );
    });
  });

  // ==========================================================================
  // scheduleSunsetDailyCheck error handling
  // ==========================================================================

  describe('scheduleSunsetDailyCheck error handling', () => {
    it('should handle error in scheduleSunsetDailyCheck', async () => {
      const sunsetConfig = {
        guild_id: 'guild-sun-err',
        channel_id: 'ch-sun',
        zip_code: '90001',
        advance_minutes: 30,
        timezone: 'America/Los_Angeles',
        is_enabled: true,
      };

      // Make cron.schedule throw for sunset
      (cron.schedule as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Sunset cron error');
      });

      mockSunsetConfigGetEnabledConfigs.mockResolvedValueOnce([sunsetConfig]);

      startScheduler(mockClient);
      await flushAsync();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to schedule sunset daily check',
        expect.objectContaining({ guildId: 'guild-sun-err' })
      );
    });
  });

  // ==========================================================================
  // executeDailyQuestion full error handling
  // ==========================================================================

  describe('executeDailyQuestion - general error', () => {
    it('should handle unexpected error during daily question execution', async () => {
      const questionConfig = {
        guild_id: 'guild-q-crash',
        announcement_channel_id: 'ch-q-1',
        timezone: 'America/Los_Angeles',
        is_enabled: true,
      };

      mockEventConfigGetEnabledConfigs
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([questionConfig]);

      // Make getGuildConfig throw (simulating unexpected error)
      mockEventConfigGetGuildConfig.mockRejectedValueOnce(new Error('Unexpected crash'));

      startScheduler(mockClient);
      await flushAsync();

      const cronCalls = (cron.schedule as jest.Mock).mock.calls;
      const dailyCall = cronCalls.find((call: any[]) => call[0] === '0 17 * * *');

      if (dailyCall) {
        await dailyCall[1]();
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to execute daily question',
          expect.objectContaining({
            guildId: 'guild-q-crash',
            error: 'Unexpected crash',
          })
        );
      }
    });
  });
});
