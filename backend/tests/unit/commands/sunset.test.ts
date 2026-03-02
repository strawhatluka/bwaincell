/**
 * Unit Tests: /sunset Command
 *
 * Tests Discord slash command for daily sunset announcement management.
 * Subcommands: enable, disable, set, status
 * Coverage target: 80%
 */

// 1. Mock logger FIRST (before any imports)
jest.mock('../../../shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// 2. Mock config
jest.mock('../../../config/config', () => ({
  __esModule: true,
  default: {
    settings: {
      timezone: 'America/Los_Angeles',
      defaultReminderChannel: 'channel-123',
    },
  },
}));

// 3. Mock database model
jest.mock('../../../database/models/SunsetConfig', () => ({
  __esModule: true,
  default: {
    upsertConfig: jest.fn(),
    getGuildConfig: jest.fn(),
    getEnabledConfigs: jest.fn(),
    toggleEnabled: jest.fn(),
    updateAdvanceMinutes: jest.fn(),
    updateLastAnnouncement: jest.fn(),
  },
}));

// 4. Mock scheduler
jest.mock('../../../utils/scheduler', () => ({
  getScheduler: jest.fn(),
}));

// 5. Mock sunsetService
jest.mock('../../../utils/sunsetService', () => ({
  getCoordinatesFromZip: jest.fn(),
  getSunsetTime: jest.fn(),
  formatSunsetEmbed: jest.fn(),
}));

// 6. Mock discord.js EmbedBuilder
jest.mock('discord.js', () => {
  const actual = jest.requireActual('discord.js');
  const mockEmbed = {
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    addFields: jest.fn().mockReturnThis(),
    setColor: jest.fn().mockReturnThis(),
    setTimestamp: jest.fn().mockReturnThis(),
    setFooter: jest.fn().mockReturnThis(),
  };
  return {
    ...actual,
    EmbedBuilder: jest.fn().mockImplementation(() => mockEmbed),
  };
});

// 7. Import AFTER all mocks
import sunsetCommand from '../../../commands/sunset';
import SunsetConfig from '../../../database/models/SunsetConfig';
import { getScheduler } from '../../../utils/scheduler';
import { getCoordinatesFromZip, getSunsetTime } from '../../../utils/sunsetService';
import { SlashCommandBuilder } from 'discord.js';

describe('Sunset Command', () => {
  let mockInteraction: any;
  const mockScheduler = {
    addSunsetConfig: jest.fn(),
    removeSunsetConfig: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockInteraction = {
      options: {
        getSubcommand: jest.fn(),
        getInteger: jest.fn(),
        getString: jest.fn(),
      },
      user: { id: 'user-456' },
      guild: { id: 'guild-123' },
      channel: { id: 'channel-789' },
      editReply: jest.fn(),
      followUp: jest.fn(),
      replied: false,
      deferred: true,
      commandName: 'sunset',
    };

    // Re-setup mock defaults after clearAllMocks
    (getScheduler as jest.Mock).mockReturnValue(mockScheduler);

    // Set env vars
    process.env.DEFAULT_REMINDER_CHANNEL = 'channel-123';
    process.env.LOCATION_ZIP_CODE = '90210';
  });

  afterEach(() => {
    delete process.env.DEFAULT_REMINDER_CHANNEL;
    delete process.env.LOCATION_ZIP_CODE;
  });

  // ---------------------------------------------------------------------------
  // Command Structure
  // ---------------------------------------------------------------------------
  describe('Command Structure', () => {
    it('should have correct command name', () => {
      expect(sunsetCommand.data).toBeInstanceOf(SlashCommandBuilder);
      expect(sunsetCommand.data.name).toBe('sunset');
    });

    it('should have 4 subcommands (enable, disable, set, status)', () => {
      const commandData = sunsetCommand.data.toJSON();
      const subcommandNames = commandData.options?.map((opt: any) => opt.name) || [];

      expect(subcommandNames).toHaveLength(4);
      expect(subcommandNames).toContain('enable');
      expect(subcommandNames).toContain('disable');
      expect(subcommandNames).toContain('set');
      expect(subcommandNames).toContain('status');
    });
  });

  // ---------------------------------------------------------------------------
  // /sunset enable
  // ---------------------------------------------------------------------------
  describe('/sunset enable', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('enable');
    });

    it('should successfully enable sunset announcements', async () => {
      (getCoordinatesFromZip as jest.Mock).mockResolvedValue({ lat: 34.0901, lng: -118.4065 });
      (SunsetConfig.upsertConfig as jest.Mock).mockResolvedValue({});

      await sunsetCommand.execute(mockInteraction);

      expect(getCoordinatesFromZip).toHaveBeenCalledWith('90210');
      expect(SunsetConfig.upsertConfig).toHaveBeenCalledWith(
        'guild-123',
        'user-456',
        'channel-123',
        '90210',
        { timezone: 'America/Los_Angeles', isEnabled: true }
      );
      expect(mockScheduler.addSunsetConfig).toHaveBeenCalledWith('guild-123');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) })
      );
    });

    it('should return error if no guild', async () => {
      mockInteraction.guild = null;

      await sunsetCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('This command can only be used in a server'),
      });
      expect(SunsetConfig.upsertConfig).not.toHaveBeenCalled();
    });

    it('should return error if LOCATION_ZIP_CODE is not set', async () => {
      delete process.env.LOCATION_ZIP_CODE;

      await sunsetCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('LOCATION_ZIP_CODE'),
      });
      expect(SunsetConfig.upsertConfig).not.toHaveBeenCalled();
    });

    it('should return error if DEFAULT_REMINDER_CHANNEL is not set', async () => {
      delete process.env.DEFAULT_REMINDER_CHANNEL;

      await sunsetCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('DEFAULT_REMINDER_CHANNEL'),
      });
      expect(SunsetConfig.upsertConfig).not.toHaveBeenCalled();
    });

    it('should return error if ZIP code validation fails', async () => {
      (getCoordinatesFromZip as jest.Mock).mockRejectedValue(
        new Error('Unable to find coordinates for ZIP code: 90210')
      );

      await sunsetCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Invalid ZIP code'),
      });
      expect(SunsetConfig.upsertConfig).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // /sunset disable
  // ---------------------------------------------------------------------------
  describe('/sunset disable', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('disable');
    });

    it('should successfully disable sunset announcements', async () => {
      (SunsetConfig.toggleEnabled as jest.Mock).mockResolvedValue({ is_enabled: false });

      await sunsetCommand.execute(mockInteraction);

      expect(SunsetConfig.toggleEnabled).toHaveBeenCalledWith('guild-123', false);
      expect(mockScheduler.removeSunsetConfig).toHaveBeenCalledWith('guild-123');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) })
      );
    });

    it('should return error if no config exists', async () => {
      (SunsetConfig.toggleEnabled as jest.Mock).mockResolvedValue(null);

      await sunsetCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('No sunset configuration found'),
      });
      expect(mockScheduler.removeSunsetConfig).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // /sunset set
  // ---------------------------------------------------------------------------
  describe('/sunset set', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('set');
      mockInteraction.options.getInteger.mockReturnValue(30);
    });

    it('should successfully update advance minutes', async () => {
      (SunsetConfig.updateAdvanceMinutes as jest.Mock).mockResolvedValue({
        advance_minutes: 30,
      });

      await sunsetCommand.execute(mockInteraction);

      expect(SunsetConfig.updateAdvanceMinutes).toHaveBeenCalledWith('guild-123', 30);
      expect(mockScheduler.addSunsetConfig).toHaveBeenCalledWith('guild-123');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) })
      );
    });

    it('should return error if no config exists', async () => {
      (SunsetConfig.updateAdvanceMinutes as jest.Mock).mockResolvedValue(null);

      await sunsetCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('No sunset configuration found'),
      });
    });
  });

  // ---------------------------------------------------------------------------
  // /sunset status
  // ---------------------------------------------------------------------------
  describe('/sunset status', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('status');
    });

    it('should show status embed with sunset time', async () => {
      (SunsetConfig.getGuildConfig as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({
          guild_id: 'guild-123',
          is_enabled: true,
          zip_code: '90210',
          advance_minutes: 60,
          channel_id: 'channel-123',
          timezone: 'America/Los_Angeles',
          last_announcement: null,
        }),
      });
      (getCoordinatesFromZip as jest.Mock).mockResolvedValue({ lat: 34.0901, lng: -118.4065 });
      (getSunsetTime as jest.Mock).mockResolvedValue(new Date('2026-03-02T01:30:00Z'));

      await sunsetCommand.execute(mockInteraction);

      expect(SunsetConfig.getGuildConfig).toHaveBeenCalledWith('guild-123');
      expect(getCoordinatesFromZip).toHaveBeenCalledWith('90210');
      expect(getSunsetTime).toHaveBeenCalledWith(34.0901, -118.4065);
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) })
      );
    });

    it('should return error if no config exists', async () => {
      (SunsetConfig.getGuildConfig as jest.Mock).mockResolvedValue(null);

      await sunsetCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('No sunset configuration found'),
      });
    });

    it('should handle sunset API failure gracefully', async () => {
      (SunsetConfig.getGuildConfig as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({
          guild_id: 'guild-123',
          is_enabled: true,
          zip_code: '90210',
          advance_minutes: 60,
          channel_id: 'channel-123',
          timezone: 'America/Los_Angeles',
          last_announcement: null,
        }),
      });
      (getCoordinatesFromZip as jest.Mock).mockRejectedValue(new Error('API unavailable'));

      await sunsetCommand.execute(mockInteraction);

      // Should still render the embed despite sunset time fetch failure
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Error Handling
  // ---------------------------------------------------------------------------
  describe('Error Handling', () => {
    it('should catch errors and call followUp when deferred', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('enable');
      mockInteraction.deferred = true;
      mockInteraction.replied = false;

      // Force getCoordinatesFromZip to resolve so we pass the ZIP validation,
      // then make upsertConfig throw to hit the outer catch block
      (getCoordinatesFromZip as jest.Mock).mockResolvedValue({ lat: 34.0901, lng: -118.4065 });
      (SunsetConfig.upsertConfig as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await sunsetCommand.execute(mockInteraction);

      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content: expect.stringContaining('An error occurred'),
      });
    });
  });
});
