/**
 * Unit Tests: SunsetConfig Model
 *
 * Tests database model for sunset announcement configuration using mocks.
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

import SunsetConfig from '../../../../supabase/models/SunsetConfig';

describe('SunsetConfig Model', () => {
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock configuration object matching SunsetConfig attributes
    mockConfig = {
      id: 1,
      guild_id: 'guild-123',
      user_id: 'user-456',
      advance_minutes: 60,
      channel_id: 'channel-789',
      zip_code: '90210',
      timezone: 'America/Los_Angeles',
      is_enabled: true,
      last_announcement: null,
      created_at: new Date(),
      updated_at: new Date(),
      update: jest.fn().mockImplementation(function (this: any, values: any) {
        Object.assign(this, values);
        return Promise.resolve(this);
      }),
      save: jest.fn().mockResolvedValue(undefined),
    };
  });

  describe('upsertConfig', () => {
    test('should create new config when no existing config found', async () => {
      const newConfig = { ...mockConfig, guild_id: 'guild-new', user_id: 'user-new' };
      jest.spyOn(SunsetConfig as any, 'findOne').mockResolvedValue(null);
      jest.spyOn(SunsetConfig as any, 'create').mockResolvedValue(newConfig);

      const result = await SunsetConfig.upsertConfig(
        'guild-new',
        'user-new',
        'channel-789',
        '90210'
      );

      expect(result).toBeDefined();
      expect((SunsetConfig as any).findOne).toHaveBeenCalledWith({
        where: { guild_id: 'guild-new' },
      });
      expect((SunsetConfig as any).create).toHaveBeenCalledWith({
        guild_id: 'guild-new',
        user_id: 'user-new',
        channel_id: 'channel-789',
        zip_code: '90210',
        advance_minutes: 60,
        timezone: 'America/Los_Angeles',
        is_enabled: true,
      });
    });

    test('should create new config with custom options', async () => {
      const newConfig = {
        ...mockConfig,
        advance_minutes: 30,
        timezone: 'America/New_York',
        is_enabled: false,
      };
      jest.spyOn(SunsetConfig as any, 'findOne').mockResolvedValue(null);
      jest.spyOn(SunsetConfig as any, 'create').mockResolvedValue(newConfig);

      const result = await SunsetConfig.upsertConfig(
        'guild-123',
        'user-456',
        'channel-789',
        '10001',
        { advanceMinutes: 30, timezone: 'America/New_York', isEnabled: false }
      );

      expect(result).toBeDefined();
      expect((SunsetConfig as any).create).toHaveBeenCalledWith({
        guild_id: 'guild-123',
        user_id: 'user-456',
        channel_id: 'channel-789',
        zip_code: '10001',
        advance_minutes: 30,
        timezone: 'America/New_York',
        is_enabled: false,
      });
    });

    test('should update existing config when guild_id matches', async () => {
      jest.spyOn(SunsetConfig as any, 'findOne').mockResolvedValue(mockConfig);

      const result = await SunsetConfig.upsertConfig(
        'guild-123',
        'user-999',
        'channel-999',
        '30301'
      );

      expect(result).toBeDefined();
      expect(mockConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-999',
          channel_id: 'channel-999',
          zip_code: '30301',
          advance_minutes: 60,
          timezone: 'America/Los_Angeles',
          is_enabled: true,
        })
      );
    });

    test('should update existing config with custom options', async () => {
      jest.spyOn(SunsetConfig as any, 'findOne').mockResolvedValue(mockConfig);

      await SunsetConfig.upsertConfig('guild-123', 'user-456', 'channel-789', '90210', {
        advanceMinutes: 15,
        timezone: 'America/Chicago',
        isEnabled: false,
      });

      expect(mockConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          advance_minutes: 15,
          timezone: 'America/Chicago',
          is_enabled: false,
        })
      );
    });

    test('should preserve existing values when options are not provided on update', async () => {
      mockConfig.advance_minutes = 45;
      mockConfig.timezone = 'Europe/London';
      mockConfig.is_enabled = false;
      jest.spyOn(SunsetConfig as any, 'findOne').mockResolvedValue(mockConfig);

      await SunsetConfig.upsertConfig('guild-123', 'user-456', 'channel-789', '90210');

      expect(mockConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          advance_minutes: 45,
          timezone: 'Europe/London',
          is_enabled: false,
        })
      );
    });

    test('should set updated_at when updating existing config', async () => {
      jest.spyOn(SunsetConfig as any, 'findOne').mockResolvedValue(mockConfig);

      await SunsetConfig.upsertConfig('guild-123', 'user-456', 'channel-789', '90210');

      expect(mockConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(Date),
        })
      );
    });
  });

  describe('getGuildConfig', () => {
    test('should return config for valid guild', async () => {
      jest.spyOn(SunsetConfig as any, 'findOne').mockResolvedValue(mockConfig);

      const config = await SunsetConfig.getGuildConfig('guild-123');

      expect(config).toBeDefined();
      expect(config?.guild_id).toBe('guild-123');
      expect((SunsetConfig as any).findOne).toHaveBeenCalledWith({
        where: { guild_id: 'guild-123' },
      });
    });

    test('should return null for non-existent guild', async () => {
      jest.spyOn(SunsetConfig as any, 'findOne').mockResolvedValue(null);

      const config = await SunsetConfig.getGuildConfig('guild-999');

      expect(config).toBeNull();
    });
  });

  describe('getEnabledConfigs', () => {
    test('should return only enabled configurations', async () => {
      const enabledConfigs = [
        { ...mockConfig, guild_id: 'guild-1', is_enabled: true },
        { ...mockConfig, guild_id: 'guild-2', is_enabled: true },
      ];
      jest.spyOn(SunsetConfig as any, 'findAll').mockResolvedValue(enabledConfigs);

      const configs = await SunsetConfig.getEnabledConfigs();

      expect(configs).toHaveLength(2);
      expect((SunsetConfig as any).findAll).toHaveBeenCalledWith({
        where: { is_enabled: true },
      });
    });

    test('should return empty array when no configs are enabled', async () => {
      jest.spyOn(SunsetConfig as any, 'findAll').mockResolvedValue([]);

      const configs = await SunsetConfig.getEnabledConfigs();

      expect(configs).toHaveLength(0);
    });
  });

  describe('toggleEnabled', () => {
    test('should enable a disabled configuration', async () => {
      mockConfig.is_enabled = false;
      jest.spyOn(SunsetConfig as any, 'findOne').mockResolvedValue(mockConfig);

      const result = await SunsetConfig.toggleEnabled('guild-123', true);

      expect(result).toBeDefined();
      expect(mockConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_enabled: true,
          updated_at: expect.any(Date),
        })
      );
    });

    test('should disable an enabled configuration', async () => {
      mockConfig.is_enabled = true;
      jest.spyOn(SunsetConfig as any, 'findOne').mockResolvedValue(mockConfig);

      const result = await SunsetConfig.toggleEnabled('guild-123', false);

      expect(result).toBeDefined();
      expect(mockConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_enabled: false,
          updated_at: expect.any(Date),
        })
      );
    });

    test('should return null for non-existent guild', async () => {
      jest.spyOn(SunsetConfig as any, 'findOne').mockResolvedValue(null);

      const result = await SunsetConfig.toggleEnabled('guild-999', true);

      expect(result).toBeNull();
    });
  });

  describe('updateAdvanceMinutes', () => {
    test('should update advance minutes for existing config', async () => {
      jest.spyOn(SunsetConfig as any, 'findOne').mockResolvedValue(mockConfig);

      const result = await SunsetConfig.updateAdvanceMinutes('guild-123', 30);

      expect(result).toBeDefined();
      expect(mockConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          advance_minutes: 30,
          updated_at: expect.any(Date),
        })
      );
    });

    test('should return null for non-existent guild', async () => {
      jest.spyOn(SunsetConfig as any, 'findOne').mockResolvedValue(null);

      const result = await SunsetConfig.updateAdvanceMinutes('guild-999', 30);

      expect(result).toBeNull();
    });
  });

  describe('updateLastAnnouncement', () => {
    test('should update last_announcement timestamp when config exists', async () => {
      jest.spyOn(SunsetConfig as any, 'findOne').mockResolvedValue(mockConfig);

      await SunsetConfig.updateLastAnnouncement('guild-123');

      expect(mockConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          last_announcement: expect.any(Date),
          updated_at: expect.any(Date),
        })
      );
    });

    test('should do nothing when config does not exist', async () => {
      jest.spyOn(SunsetConfig as any, 'findOne').mockResolvedValue(null);

      await SunsetConfig.updateLastAnnouncement('guild-999');

      // No update should be called since config is null
      expect(mockConfig.update).not.toHaveBeenCalled();
    });
  });

  describe('Queries', () => {
    test('should find by guild_id', async () => {
      jest.spyOn(SunsetConfig as any, 'findOne').mockResolvedValue(mockConfig);

      const config = await (SunsetConfig as any).findOne({
        where: { guild_id: 'guild-123' },
      });

      expect(config).toBeDefined();
      expect(config.guild_id).toBe('guild-123');
    });

    test('should find all configurations', async () => {
      jest.spyOn(SunsetConfig as any, 'findAll').mockResolvedValue([
        { ...mockConfig, guild_id: 'guild-1' },
        { ...mockConfig, guild_id: 'guild-2' },
        { ...mockConfig, guild_id: 'guild-3' },
      ]);

      const all = await (SunsetConfig as any).findAll();

      expect(all).toHaveLength(3);
    });

    test('should update configuration via instance update', async () => {
      jest.spyOn(SunsetConfig as any, 'findOne').mockResolvedValue(mockConfig);

      const config = await SunsetConfig.getGuildConfig('guild-123');
      await config?.update({ zip_code: '10001' });

      expect(config?.zip_code).toBe('10001');
      expect(config?.update).toHaveBeenCalledWith({ zip_code: '10001' });
    });
  });
});
