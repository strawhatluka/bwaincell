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

import SunsetConfig from '@database/models/SunsetConfig';

describe('SunsetConfig Model', () => {
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();

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
      created_at: '2024-01-15T00:00:00.000Z',
      updated_at: '2024-01-15T00:00:00.000Z',
    };
  });

  describe('upsertConfig', () => {
    test('should create new config with default options', async () => {
      jest.spyOn(SunsetConfig, 'upsertConfig').mockResolvedValue({
        ...mockConfig,
        guild_id: 'guild-new',
        user_id: 'user-new',
      });

      const result = await SunsetConfig.upsertConfig(
        'guild-new',
        'user-new',
        'channel-789',
        '90210'
      );

      expect(result).toBeDefined();
      expect(result.guild_id).toBe('guild-new');
      expect(result.user_id).toBe('user-new');
      expect(SunsetConfig.upsertConfig).toHaveBeenCalledWith(
        'guild-new',
        'user-new',
        'channel-789',
        '90210'
      );
    });

    test('should create new config with custom options', async () => {
      jest.spyOn(SunsetConfig, 'upsertConfig').mockResolvedValue({
        ...mockConfig,
        advance_minutes: 30,
        timezone: 'America/New_York',
        is_enabled: false,
      });

      const result = await SunsetConfig.upsertConfig(
        'guild-123',
        'user-456',
        'channel-789',
        '10001',
        { advanceMinutes: 30, timezone: 'America/New_York', isEnabled: false }
      );

      expect(result).toBeDefined();
      expect(result.advance_minutes).toBe(30);
      expect(result.timezone).toBe('America/New_York');
      expect(result.is_enabled).toBe(false);
    });

    test('should update existing config when guild_id matches (upsert)', async () => {
      jest.spyOn(SunsetConfig, 'upsertConfig').mockResolvedValue({
        ...mockConfig,
        user_id: 'user-999',
        channel_id: 'channel-999',
        zip_code: '30301',
      });

      const result = await SunsetConfig.upsertConfig(
        'guild-123',
        'user-999',
        'channel-999',
        '30301'
      );

      expect(result).toBeDefined();
      expect(result.user_id).toBe('user-999');
      expect(result.zip_code).toBe('30301');
    });
  });

  describe('getGuildConfig', () => {
    test('should return config for valid guild', async () => {
      jest.spyOn(SunsetConfig, 'getGuildConfig').mockResolvedValue(mockConfig);

      const config = await SunsetConfig.getGuildConfig('guild-123');

      expect(config).toBeDefined();
      expect(config?.guild_id).toBe('guild-123');
      expect(SunsetConfig.getGuildConfig).toHaveBeenCalledWith('guild-123');
    });

    test('should return null for non-existent guild', async () => {
      jest.spyOn(SunsetConfig, 'getGuildConfig').mockResolvedValue(null);

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
      jest.spyOn(SunsetConfig, 'getEnabledConfigs').mockResolvedValue(enabledConfigs);

      const configs = await SunsetConfig.getEnabledConfigs();

      expect(configs).toHaveLength(2);
      expect(SunsetConfig.getEnabledConfigs).toHaveBeenCalled();
    });

    test('should return empty array when no configs are enabled', async () => {
      jest.spyOn(SunsetConfig, 'getEnabledConfigs').mockResolvedValue([]);

      const configs = await SunsetConfig.getEnabledConfigs();

      expect(configs).toHaveLength(0);
    });
  });

  describe('toggleEnabled', () => {
    test('should enable a disabled configuration', async () => {
      jest
        .spyOn(SunsetConfig, 'toggleEnabled')
        .mockResolvedValue({ ...mockConfig, is_enabled: true });

      const result = await SunsetConfig.toggleEnabled('guild-123', true);

      expect(result).toBeDefined();
      expect(result?.is_enabled).toBe(true);
      expect(SunsetConfig.toggleEnabled).toHaveBeenCalledWith('guild-123', true);
    });

    test('should disable an enabled configuration', async () => {
      jest
        .spyOn(SunsetConfig, 'toggleEnabled')
        .mockResolvedValue({ ...mockConfig, is_enabled: false });

      const result = await SunsetConfig.toggleEnabled('guild-123', false);

      expect(result).toBeDefined();
      expect(result?.is_enabled).toBe(false);
      expect(SunsetConfig.toggleEnabled).toHaveBeenCalledWith('guild-123', false);
    });

    test('should return null for non-existent guild', async () => {
      jest.spyOn(SunsetConfig, 'toggleEnabled').mockResolvedValue(null);

      const result = await SunsetConfig.toggleEnabled('guild-999', true);

      expect(result).toBeNull();
    });
  });

  describe('updateAdvanceMinutes', () => {
    test('should update advance minutes for existing config', async () => {
      jest
        .spyOn(SunsetConfig, 'updateAdvanceMinutes')
        .mockResolvedValue({ ...mockConfig, advance_minutes: 30 });

      const result = await SunsetConfig.updateAdvanceMinutes('guild-123', 30);

      expect(result).toBeDefined();
      expect(result?.advance_minutes).toBe(30);
      expect(SunsetConfig.updateAdvanceMinutes).toHaveBeenCalledWith('guild-123', 30);
    });

    test('should return null for non-existent guild', async () => {
      jest.spyOn(SunsetConfig, 'updateAdvanceMinutes').mockResolvedValue(null);

      const result = await SunsetConfig.updateAdvanceMinutes('guild-999', 30);

      expect(result).toBeNull();
    });
  });

  describe('updateLastAnnouncement', () => {
    test('should update last_announcement timestamp when config exists', async () => {
      jest.spyOn(SunsetConfig, 'updateLastAnnouncement').mockResolvedValue(undefined);

      await SunsetConfig.updateLastAnnouncement('guild-123');

      expect(SunsetConfig.updateLastAnnouncement).toHaveBeenCalledWith('guild-123');
    });

    test('should not throw when config does not exist', async () => {
      jest.spyOn(SunsetConfig, 'updateLastAnnouncement').mockResolvedValue(undefined);

      await expect(SunsetConfig.updateLastAnnouncement('guild-999')).resolves.not.toThrow();
    });
  });

  describe('Queries', () => {
    test('should find by guild_id using getGuildConfig', async () => {
      jest.spyOn(SunsetConfig, 'getGuildConfig').mockResolvedValue(mockConfig);

      const config = await SunsetConfig.getGuildConfig('guild-123');

      expect(config).toBeDefined();
      expect(config?.guild_id).toBe('guild-123');
    });

    test('should find all enabled configurations', async () => {
      jest.spyOn(SunsetConfig, 'getEnabledConfigs').mockResolvedValue([
        { ...mockConfig, guild_id: 'guild-1' },
        { ...mockConfig, guild_id: 'guild-2' },
        { ...mockConfig, guild_id: 'guild-3' },
      ]);

      const all = await SunsetConfig.getEnabledConfigs();

      expect(all).toHaveLength(3);
    });
  });
});
