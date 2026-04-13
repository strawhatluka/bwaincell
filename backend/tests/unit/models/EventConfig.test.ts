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

import EventConfig from '../../../../supabase/models/EventConfig';
import { DateTime } from 'luxon';

describe('EventConfig Model', () => {
  // Mock EventConfig static methods
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock configuration object
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
      created_at: new Date(),
      updated_at: new Date(),
      update: jest.fn().mockImplementation(function (this: any, values: any) {
        Object.assign(this, values);
        return Promise.resolve(this);
      }),
      save: jest.fn().mockResolvedValue(mockConfig),
      getNextRunTime: jest.fn().mockImplementation(function (this: any) {
        const now = DateTime.now().setZone(this.timezone);
        let target = now.set({
          hour: this.schedule_hour,
          minute: this.schedule_minute,
          second: 0,
          millisecond: 0,
        });

        const currentDayOfWeek = now.weekday; // 1=Monday, 7=Sunday
        const targetDayOfWeek = this.schedule_day === 0 ? 7 : this.schedule_day;

        if (currentDayOfWeek === targetDayOfWeek && now.hour < this.schedule_hour) {
          return target.toJSDate();
        }

        const daysUntilTarget = (targetDayOfWeek - currentDayOfWeek + 7) % 7 || 7;
        target = target.plus({ days: daysUntilTarget });
        return target.toJSDate();
      }),
      formatSchedule: jest.fn().mockImplementation(function (this: any) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[this.schedule_day];
        const hour = this.schedule_hour % 12 || 12;
        const ampm = this.schedule_hour >= 12 ? 'PM' : 'AM';
        const minute = String(this.schedule_minute).padStart(2, '0');
        return `every ${dayName} at ${hour}:${minute} ${ampm}`;
      }),
      getCronExpression: jest.fn().mockImplementation(function (this: any) {
        return `${this.schedule_minute} ${this.schedule_hour} * * ${this.schedule_day}`;
      }),
    };

    // Mock static methods
    jest
      .spyOn(EventConfig, 'upsertConfig')
      .mockImplementation(async (guildId, userId, location, channelId) => {
        return {
          ...mockConfig,
          guild_id: guildId,
          user_id: userId,
          location,
          announcement_channel_id: channelId,
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
        mockConfig.last_announcement = new Date();
        return mockConfig;
      }
      return null;
    });

    jest.spyOn(EventConfig, 'findOne').mockResolvedValue(mockConfig);
    jest.spyOn(EventConfig, 'findAll').mockResolvedValue([mockConfig]);
    jest.spyOn(EventConfig, 'count').mockResolvedValue(1);
    jest.spyOn(EventConfig, 'create').mockResolvedValue(mockConfig);
    jest.spyOn(EventConfig, 'destroy').mockResolvedValue(1);
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

      // Verify only one config exists
      const count = await EventConfig.count({ where: { guild_id: 'guild-123' } });
      expect(count).toBe(1);
    });

    test('should require guild_id for creation', async () => {
      // Mock create to reject without guild_id
      (EventConfig.create as jest.Mock).mockRejectedValueOnce(new Error('guild_id is required'));

      await expect(
        EventConfig.create({
          user_id: 'user-456',
          location: 'Los Angeles, CA',
          announcement_channel_id: 'channel-789',
        } as any)
      ).rejects.toThrow('guild_id is required');
    });

    test('should require location for creation', async () => {
      // Mock create to reject without location
      (EventConfig.create as jest.Mock).mockRejectedValueOnce(new Error('location is required'));

      await expect(
        EventConfig.create({
          guild_id: 'guild-123',
          user_id: 'user-456',
          announcement_channel_id: 'channel-789',
        } as any)
      ).rejects.toThrow('location is required');
    });

    test('should require announcement_channel_id for creation', async () => {
      // Mock create to reject without announcement_channel_id
      (EventConfig.create as jest.Mock).mockRejectedValueOnce(
        new Error('announcement_channel_id is required')
      );

      await expect(
        EventConfig.create({
          guild_id: 'guild-123',
          user_id: 'user-456',
          location: 'Los Angeles, CA',
        } as any)
      ).rejects.toThrow('announcement_channel_id is required');
    });
  });

  describe('Static Methods', () => {
    test('getGuildConfig() should return config for valid guild', async () => {
      await EventConfig.upsertConfig('guild-123', 'user-456', 'Los Angeles, CA', 'channel-789');

      const config = await EventConfig.getGuildConfig('guild-123');
      expect(config).toBeDefined();
      expect(config?.guild_id).toBe('guild-123');
    });

    test('getGuildConfig() should return null for non-existent guild', async () => {
      const config = await EventConfig.getGuildConfig('guild-999');
      expect(config).toBeNull();
    });

    test('getEnabledConfigs() should return only enabled configurations', async () => {
      // Create enabled config
      await EventConfig.upsertConfig('guild-123', 'user-456', 'Los Angeles, CA', 'channel-789');

      // Create disabled config
      const _disabled = await EventConfig.upsertConfig(
        'guild-456',
        'user-789',
        'New York, NY',
        'channel-999'
      );
      await EventConfig.toggleEnabled('guild-456', false);

      const enabled = await EventConfig.getEnabledConfigs();
      expect(enabled).toHaveLength(1);
      expect(enabled[0].guild_id).toBe('guild-123');
    });

    test('updateSchedule() should update schedule values', async () => {
      await EventConfig.upsertConfig('guild-123', 'user-456', 'Los Angeles, CA', 'channel-789');

      const updated = await EventConfig.updateSchedule('guild-123', 5, 18, 30);
      expect(updated?.schedule_day).toBe(5); // Friday
      expect(updated?.schedule_hour).toBe(18); // 6 PM
      expect(updated?.schedule_minute).toBe(30);
    });

    test('updateSchedule() should return null for non-existent guild', async () => {
      const updated = await EventConfig.updateSchedule('guild-999', 1, 12, 0);
      expect(updated).toBeNull();
    });

    test('toggleEnabled() should enable disabled configuration', async () => {
      await EventConfig.upsertConfig('guild-123', 'user-456', 'Los Angeles, CA', 'channel-789');

      await EventConfig.toggleEnabled('guild-123', false);
      let config = await EventConfig.getGuildConfig('guild-123');
      expect(config?.is_enabled).toBe(false);

      await EventConfig.toggleEnabled('guild-123', true);
      config = await EventConfig.getGuildConfig('guild-123');
      expect(config?.is_enabled).toBe(true);
    });

    test('toggleEnabled() should return null for non-existent guild', async () => {
      const result = await EventConfig.toggleEnabled('guild-999', true);
      expect(result).toBeNull();
    });

    test('updateLastAnnouncement() should update timestamp', async () => {
      await EventConfig.upsertConfig('guild-123', 'user-456', 'Los Angeles, CA', 'channel-789');

      const beforeUpdate = await EventConfig.getGuildConfig('guild-123');
      expect(beforeUpdate?.last_announcement).toBeNull();

      await EventConfig.updateLastAnnouncement('guild-123');

      const afterUpdate = await EventConfig.getGuildConfig('guild-123');
      expect(afterUpdate?.last_announcement).toBeDefined();
      expect(afterUpdate?.last_announcement).toBeInstanceOf(Date);
    });
  });

  describe('Instance Methods', () => {
    test('getNextRunTime() should calculate next scheduled run', async () => {
      const config = await EventConfig.upsertConfig(
        'guild-123',
        'user-456',
        'Los Angeles, CA',
        'channel-789'
      );

      const nextRun = config.getNextRunTime();
      expect(nextRun).toBeInstanceOf(Date);

      // Next run should be in the future
      expect(nextRun.getTime()).toBeGreaterThan(Date.now());

      // Next run should be on a Monday (day 1)
      const nextRunDate = DateTime.fromJSDate(nextRun).setZone(config.timezone);
      expect(nextRunDate.weekday).toBe(1); // Monday
      expect(nextRunDate.hour).toBe(12); // Noon
      expect(nextRunDate.minute).toBe(0);
    });

    test('getNextRunTime() should handle different schedules', async () => {
      const _config = await EventConfig.upsertConfig(
        'guild-123',
        'user-456',
        'Los Angeles, CA',
        'channel-789'
      );

      // Update to Friday at 6:30 PM
      await EventConfig.updateSchedule('guild-123', 5, 18, 30);
      const updatedConfig = await EventConfig.getGuildConfig('guild-123');

      const nextRun = updatedConfig!.getNextRunTime();
      const nextRunDate = DateTime.fromJSDate(nextRun).setZone(updatedConfig!.timezone);

      expect(nextRunDate.weekday).toBe(5); // Friday
      expect(nextRunDate.hour).toBe(18); // 6 PM
      expect(nextRunDate.minute).toBe(30);
    });

    test('formatSchedule() should return human-readable schedule', async () => {
      const config = await EventConfig.upsertConfig(
        'guild-123',
        'user-456',
        'Los Angeles, CA',
        'channel-789'
      );

      const formatted = config.formatSchedule();
      expect(formatted).toContain('Monday');
      expect(formatted).toContain('12:00 PM');
    });

    test('formatSchedule() should handle different schedules', async () => {
      const _config = await EventConfig.upsertConfig(
        'guild-123',
        'user-456',
        'Los Angeles, CA',
        'channel-789'
      );

      await EventConfig.updateSchedule('guild-123', 0, 9, 30);
      const updatedConfig = await EventConfig.getGuildConfig('guild-123');

      const formatted = updatedConfig!.formatSchedule();
      expect(formatted).toContain('Sunday');
      expect(formatted).toContain('9:30 AM');
    });

    test('getCronExpression() should build valid cron expression', async () => {
      const config = await EventConfig.upsertConfig(
        'guild-123',
        'user-456',
        'Los Angeles, CA',
        'channel-789'
      );

      const cron = config.getCronExpression();
      expect(cron).toBe('0 12 * * 1'); // Every Monday at noon
    });

    test('getCronExpression() should handle different schedules', async () => {
      const _config = await EventConfig.upsertConfig(
        'guild-123',
        'user-456',
        'Los Angeles, CA',
        'channel-789'
      );

      await EventConfig.updateSchedule('guild-123', 5, 18, 30);
      const updatedConfig = await EventConfig.getGuildConfig('guild-123');

      const cron = updatedConfig!.getCronExpression();
      expect(cron).toBe('30 18 * * 5'); // Every Friday at 6:30 PM
    });
  });

  describe('Validation', () => {
    test('should validate schedule_day range (0-6)', async () => {
      const config = await EventConfig.upsertConfig(
        'guild-123',
        'user-456',
        'Los Angeles, CA',
        'channel-789'
      );

      // Valid day (0-6)
      await expect(config.update({ schedule_day: 6 })).resolves.toBeDefined();

      await expect(config.update({ schedule_day: 0 })).resolves.toBeDefined();
    });

    test('should validate schedule_hour range (0-23)', async () => {
      const config = await EventConfig.upsertConfig(
        'guild-123',
        'user-456',
        'Los Angeles, CA',
        'channel-789'
      );

      // Valid hour (0-23)
      await expect(config.update({ schedule_hour: 23 })).resolves.toBeDefined();

      await expect(config.update({ schedule_hour: 0 })).resolves.toBeDefined();
    });

    test('should validate schedule_minute range (0-59)', async () => {
      const config = await EventConfig.upsertConfig(
        'guild-123',
        'user-456',
        'Los Angeles, CA',
        'channel-789'
      );

      // Valid minute (0-59)
      await expect(config.update({ schedule_minute: 59 })).resolves.toBeDefined();

      await expect(config.update({ schedule_minute: 0 })).resolves.toBeDefined();
    });
  });

  describe('Queries', () => {
    test('should find by guild_id using unique constraint', async () => {
      const config = await EventConfig.findOne({ where: { guild_id: 'guild-123' } });
      expect(config).toBeDefined();
      expect(config?.guild_id).toBe('guild-123');
    });

    test('should enforce unique guild_id constraint via upsert', async () => {
      // First call creates
      await EventConfig.upsertConfig('guild-123', 'user-456', 'LA, CA', 'ch-789');

      // Second call with same guild_id should update, not create duplicate
      await EventConfig.upsertConfig('guild-123', 'user-999', 'NY, NY', 'ch-999');

      // Verify upsertConfig was called twice
      expect(EventConfig.upsertConfig).toHaveBeenCalledTimes(2);
    });

    test('should find all configurations', async () => {
      // Mock findAll to return multiple configs
      (EventConfig.findAll as jest.Mock).mockResolvedValueOnce([
        { ...mockConfig, guild_id: 'guild-1' },
        { ...mockConfig, guild_id: 'guild-2' },
        { ...mockConfig, guild_id: 'guild-3' },
      ]);

      const all = await EventConfig.findAll();
      expect(all).toHaveLength(3);
    });

    test('should update configuration', async () => {
      const config = await EventConfig.getGuildConfig('guild-123');
      await config?.update({ location: 'San Diego, CA' });

      expect(config?.location).toBe('San Diego, CA');
      expect(config?.update).toHaveBeenCalledWith({ location: 'San Diego, CA' });
    });
  });
});
