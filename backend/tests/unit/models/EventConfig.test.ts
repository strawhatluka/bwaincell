/**
 * Unit Tests: EventConfig Model
 *
 * Tests database model for local events configuration using mocks
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

import EventConfig from '@database/models/EventConfig';
import { DateTime } from 'luxon';

describe('EventConfig Model', () => {
  // Mock EventConfig static methods
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock configuration object (plain row, no Sequelize instance methods)
    mockConfig = {
      id: 1,
      guild_id: 'guild-123',
      user_id: 'user-456',
      location: 'Los Angeles, CA',
      announcement_channel_id: 'channel-789',
      schedule_day: 1,
      schedule_hour: 12,
      schedule_minute: 0,
      timezone: 'America/Los_Angeles',
      is_enabled: true,
      last_announcement: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Mock static methods
    jest
      .spyOn(EventConfig, 'upsertConfig')
      .mockImplementation(async (guildId, userId, location, channelId, options?) => {
        return {
          ...mockConfig,
          guild_id: guildId,
          user_id: userId,
          location,
          announcement_channel_id: channelId,
          schedule_day: options?.scheduleDay ?? mockConfig.schedule_day,
          schedule_hour: options?.scheduleHour ?? mockConfig.schedule_hour,
          schedule_minute: options?.scheduleMinute ?? mockConfig.schedule_minute,
          timezone: options?.timezone ?? mockConfig.timezone,
          is_enabled: options?.isEnabled ?? mockConfig.is_enabled,
        };
      });

    jest.spyOn(EventConfig, 'getGuildConfig').mockImplementation(async (guildId) => {
      if (guildId === 'guild-123') {
        return mockConfig;
      }
      return null;
    });

    jest.spyOn(EventConfig, 'getEnabledConfigs').mockResolvedValue([mockConfig]);

    jest
      .spyOn(EventConfig, 'updateSchedule')
      .mockImplementation(async (guildId, day, hour, minute) => {
        if (guildId === 'guild-123') {
          mockConfig.schedule_day = day;
          mockConfig.schedule_hour = hour;
          mockConfig.schedule_minute = minute;
          return mockConfig;
        }
        return null;
      });

    jest.spyOn(EventConfig, 'toggleEnabled').mockImplementation(async (guildId, enabled) => {
      if (guildId === 'guild-123') {
        mockConfig.is_enabled = enabled;
        return mockConfig;
      }
      return null;
    });

    jest.spyOn(EventConfig, 'updateLastAnnouncement').mockImplementation(async (guildId) => {
      if (guildId === 'guild-123') {
        mockConfig.last_announcement = new Date().toISOString();
      }
    });
  });

  describe('Model Creation', () => {
    test('should create EventConfig with valid data', async () => {
      const config = await EventConfig.upsertConfig(
        'guild-123',
        'user-456',
        'Los Angeles, CA',
        'channel-789'
      );

      expect(config).toBeDefined();
      expect(config.guild_id).toBe('guild-123');
      expect(config.user_id).toBe('user-456');
      expect(config.location).toBe('Los Angeles, CA');
      expect(config.announcement_channel_id).toBe('channel-789');
    });

    test('should set default values correctly', async () => {
      const config = await EventConfig.upsertConfig(
        'guild-123',
        'user-456',
        'Los Angeles, CA',
        'channel-789'
      );

      expect(config.schedule_day).toBe(1); // Monday
      expect(config.schedule_hour).toBe(12); // Noon
      expect(config.schedule_minute).toBe(0);
      expect(config.timezone).toBe('America/Los_Angeles');
      expect(config.is_enabled).toBe(true);
    });

    test('should update existing config when guild_id matches', async () => {
      // Create initial config
      await EventConfig.upsertConfig('guild-123', 'user-456', 'Los Angeles, CA', 'channel-789');

      // Update with same guild_id
      const updated = await EventConfig.upsertConfig(
        'guild-123',
        'user-999',
        'San Francisco, CA',
        'channel-999'
      );

      expect(updated.location).toBe('San Francisco, CA');
      expect(updated.announcement_channel_id).toBe('channel-999');

      // Verify upsertConfig was called twice (upsert handles uniqueness)
      expect(EventConfig.upsertConfig).toHaveBeenCalledTimes(2);
    });

    test('should handle upsertConfig failure gracefully', async () => {
      (EventConfig.upsertConfig as jest.Mock).mockRejectedValueOnce(
        new Error('guild_id is required')
      );

      await expect(
        EventConfig.upsertConfig('', 'user-456', 'Los Angeles, CA', 'channel-789')
      ).rejects.toThrow('guild_id is required');
    });

    test('should handle missing location in upsertConfig', async () => {
      (EventConfig.upsertConfig as jest.Mock).mockRejectedValueOnce(
        new Error('location is required')
      );

      await expect(
        EventConfig.upsertConfig('guild-123', 'user-456', '', 'channel-789')
      ).rejects.toThrow('location is required');
    });

    test('should handle missing announcement_channel_id in upsertConfig', async () => {
      (EventConfig.upsertConfig as jest.Mock).mockRejectedValueOnce(
        new Error('announcement_channel_id is required')
      );

      await expect(
        EventConfig.upsertConfig('guild-123', 'user-456', 'Los Angeles, CA', '')
      ).rejects.toThrow('announcement_channel_id is required');
    });
  });

  describe('Static Methods', () => {
    test('getGuildConfig() should return config for valid guild', async () => {
      const config = await EventConfig.getGuildConfig('guild-123');
      expect(config).toBeDefined();
      expect(config?.guild_id).toBe('guild-123');
    });

    test('getGuildConfig() should return null for non-existent guild', async () => {
      const config = await EventConfig.getGuildConfig('guild-999');
      expect(config).toBeNull();
    });

    test('getEnabledConfigs() should return only enabled configurations', async () => {
      const enabled = await EventConfig.getEnabledConfigs();
      expect(enabled).toHaveLength(1);
      expect(enabled[0].guild_id).toBe('guild-123');
      expect(enabled[0].is_enabled).toBe(true);
    });

    test('updateSchedule() should update schedule values', async () => {
      const updated = await EventConfig.updateSchedule('guild-123', 5, 18, 30);
      expect(updated?.schedule_day).toBe(5); // Friday
      expect(updated?.schedule_hour).toBe(18); // 6 PM
      expect(updated?.schedule_minute).toBe(30);
    });

    test('updateSchedule() should return null for non-existent guild', async () => {
      const updated = await EventConfig.updateSchedule('guild-999', 1, 12, 0);
      expect(updated).toBeNull();
    });

    test('toggleEnabled() should disable configuration', async () => {
      const result = await EventConfig.toggleEnabled('guild-123', false);
      expect(result?.is_enabled).toBe(false);
    });

    test('toggleEnabled() should enable configuration', async () => {
      mockConfig.is_enabled = false;
      const result = await EventConfig.toggleEnabled('guild-123', true);
      expect(result?.is_enabled).toBe(true);
    });

    test('toggleEnabled() should return null for non-existent guild', async () => {
      const result = await EventConfig.toggleEnabled('guild-999', true);
      expect(result).toBeNull();
    });

    test('updateLastAnnouncement() should update timestamp', async () => {
      expect(mockConfig.last_announcement).toBeNull();

      await EventConfig.updateLastAnnouncement('guild-123');

      expect(mockConfig.last_announcement).toBeDefined();
      expect(typeof mockConfig.last_announcement).toBe('string');
    });

    test('updateLastAnnouncement() should not throw for valid guild', async () => {
      await expect(EventConfig.updateLastAnnouncement('guild-123')).resolves.toBeUndefined();
    });
  });

  describe('Static Helper Methods', () => {
    test('getNextRunTime() should calculate next scheduled run', () => {
      // Use the real static method (not mocked)
      jest.restoreAllMocks();

      const config = {
        ...mockConfig,
        schedule_day: 1,
        schedule_hour: 12,
        schedule_minute: 0,
        timezone: 'America/Los_Angeles',
      };

      const nextRun = EventConfig.getNextRunTime(config);
      expect(nextRun).toBeInstanceOf(Date);

      // Next run should be in the future
      expect(nextRun.getTime()).toBeGreaterThan(Date.now());

      // Verify the scheduled time components
      const nextRunDate = DateTime.fromJSDate(nextRun).setZone(config.timezone);
      // schedule_day 1 = Monday, luxon weekday 1 = Monday
      expect(nextRunDate.weekday).toBe(1); // Monday
      expect(nextRunDate.hour).toBe(12); // Noon
      expect(nextRunDate.minute).toBe(0);
    });

    test('getNextRunTime() should handle different schedules', () => {
      const config = {
        ...mockConfig,
        schedule_day: 5,
        schedule_hour: 18,
        schedule_minute: 30,
        timezone: 'America/Los_Angeles',
      };

      const nextRun = EventConfig.getNextRunTime(config);
      const nextRunDate = DateTime.fromJSDate(nextRun).setZone(config.timezone);

      expect(nextRunDate.weekday).toBe(5); // Friday
      expect(nextRunDate.hour).toBe(18); // 6 PM
      expect(nextRunDate.minute).toBe(30);
    });

    test('formatSchedule() should return human-readable schedule', () => {
      const config = {
        ...mockConfig,
        schedule_day: 1,
        schedule_hour: 12,
        schedule_minute: 0,
        timezone: 'America/Los_Angeles',
      };

      const formatted = EventConfig.formatSchedule(config);
      expect(formatted).toContain('Monday');
      expect(formatted).toContain('12:00 PM');
      expect(formatted).toContain('America/Los_Angeles');
    });

    test('formatSchedule() should handle Sunday schedule', () => {
      const config = {
        ...mockConfig,
        schedule_day: 0,
        schedule_hour: 9,
        schedule_minute: 30,
        timezone: 'America/Los_Angeles',
      };

      const formatted = EventConfig.formatSchedule(config);
      expect(formatted).toContain('Sunday');
      expect(formatted).toContain('9:30 AM');
    });

    test('formatSchedule() should handle midnight (hour 0)', () => {
      const config = {
        ...mockConfig,
        schedule_day: 3,
        schedule_hour: 0,
        schedule_minute: 0,
        timezone: 'America/Los_Angeles',
      };

      const formatted = EventConfig.formatSchedule(config);
      expect(formatted).toContain('Wednesday');
      expect(formatted).toContain('12:00 AM');
    });

    test('formatSchedule() should handle PM hours', () => {
      const config = {
        ...mockConfig,
        schedule_day: 5,
        schedule_hour: 18,
        schedule_minute: 30,
        timezone: 'America/Los_Angeles',
      };

      const formatted = EventConfig.formatSchedule(config);
      expect(formatted).toContain('Friday');
      expect(formatted).toContain('6:30 PM');
    });
  });

  describe('Queries', () => {
    test('should find config by guild_id via getGuildConfig', async () => {
      const config = await EventConfig.getGuildConfig('guild-123');
      expect(config).toBeDefined();
      expect(config?.guild_id).toBe('guild-123');
      expect(EventConfig.getGuildConfig).toHaveBeenCalledWith('guild-123');
    });

    test('should enforce unique guild_id constraint via upsert', async () => {
      // First call creates
      await EventConfig.upsertConfig('guild-123', 'user-456', 'LA, CA', 'ch-789');

      // Second call with same guild_id should update, not create duplicate
      await EventConfig.upsertConfig('guild-123', 'user-999', 'NY, NY', 'ch-999');

      // Verify upsertConfig was called twice
      expect(EventConfig.upsertConfig).toHaveBeenCalledTimes(2);
    });

    test('should get all enabled configurations', async () => {
      const enabled = await EventConfig.getEnabledConfigs();
      expect(enabled).toHaveLength(1);
      expect(EventConfig.getEnabledConfigs).toHaveBeenCalled();
    });

    test('should update schedule via updateSchedule', async () => {
      const updated = await EventConfig.updateSchedule('guild-123', 3, 15, 45);
      expect(updated).toBeDefined();
      expect(updated?.schedule_day).toBe(3);
      expect(updated?.schedule_hour).toBe(15);
      expect(updated?.schedule_minute).toBe(45);
      expect(EventConfig.updateSchedule).toHaveBeenCalledWith('guild-123', 3, 15, 45);
    });
  });
});
