/**
 * Unit Tests: /events Command
 *
 * Tests Discord slash command for local events preview and schedule management
 * Coverage target: 80%
 */

// Mock logger BEFORE imports
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

// Mock EventConfig model
const mockUpsertConfig = jest.fn();
jest.mock('../../../../supabase/models/EventConfig', () => ({
  __esModule: true,
  default: {
    upsertConfig: (...args: any[]) => mockUpsertConfig(...args),
  },
}));

// Mock scheduler
const mockAddEventConfig = jest.fn();
jest.mock('../../../utils/scheduler', () => ({
  getScheduler: jest.fn(() => ({
    addEventConfig: mockAddEventConfig,
  })),
}));

// Mock eventsService
jest.mock('../../../utils/eventsService');

// Mock dateHelpers
jest.mock('../../../utils/dateHelpers', () => ({
  getEventWindow: jest.fn(() => ({
    start: new Date('2026-02-17T12:00:00Z'),
    end: new Date('2026-02-24T11:59:00Z'),
  })),
  parseDayName: jest.fn((day: string) => {
    const days: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    const result = days[day.toLowerCase()];
    if (result === undefined) throw new Error('Invalid day');
    return result;
  }),
}));

// Mock config
jest.mock('../../../config/config', () => ({
  __esModule: true,
  default: {
    settings: {
      timezone: 'America/Los_Angeles',
    },
  },
}));

import eventsCommand from '../../../commands/events';
import eventsService from '../../../utils/eventsService';
import { ChatInputCommandInteraction } from 'discord.js';

const mockDiscoverLocalEvents = eventsService.discoverLocalEvents as jest.Mock;
const mockFormatEventsForDiscord = eventsService.formatEventsForDiscord as jest.Mock;

const mockEvents = [
  {
    title: 'Weekend Farmers Market',
    description: 'Fresh produce and artisan goods',
    startDate: new Date('2026-02-21T17:00:00Z'),
    location: 'Downtown Plaza',
    url: 'https://example.com/market',
    source: 'City Events',
  },
];

const mockEmbed = {
  data: {
    title: '📅 Upcoming Events in 95501',
    description: 'Here are the local events for the next week:',
    fields: [
      {
        name: '🎉 Weekend Farmers Market',
        value:
          '**When:** Saturday, February 21 at 9:00 AM\n**Where:** Downtown Plaza\n[More Info](https://example.com/market)',
      },
    ],
  },
  setFooter: jest.fn().mockReturnThis(),
};

describe('/events Command', () => {
  let mockInteraction: Partial<ChatInputCommandInteraction>;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set env vars
    process.env = {
      ...originalEnv,
      LOCATION_ZIP_CODE: '95501',
      DEFAULT_REMINDER_CHANNEL: 'channel-789',
    };

    // Restore eventsService mocks
    mockDiscoverLocalEvents.mockResolvedValue(mockEvents);
    mockFormatEventsForDiscord.mockResolvedValue(mockEmbed);

    // Restore EventConfig mock - returns plain row object (Supabase, not Sequelize)
    mockUpsertConfig.mockResolvedValue({
      schedule_day: 1,
      schedule_hour: 12,
      schedule_minute: 0,
    });

    mockInteraction = {
      guild: {
        id: 'guild-123',
        name: 'Test Server',
      } as any,
      guildId: 'guild-123',
      user: {
        id: 'user-456',
        username: 'testuser',
      } as any,
      options: {
        getString: jest.fn().mockReturnValue(null),
      } as any,
      editReply: jest.fn().mockResolvedValue({}),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Command Structure', () => {
    test('should have correct command name', () => {
      expect(eventsCommand.data.name).toBe('events');
    });

    test('should have description', () => {
      expect(eventsCommand.data.description).toBeTruthy();
    });

    test('should have execute function', () => {
      expect(typeof eventsCommand.execute).toBe('function');
    });

    test('should not have subcommands', () => {
      const json = eventsCommand.data.toJSON();
      expect(json.options?.some((opt: any) => opt.type === 1)).toBeFalsy();
    });

    test('should have optional day and time options', () => {
      const json = eventsCommand.data.toJSON();
      const dayOpt = json.options?.find((opt: any) => opt.name === 'day');
      const timeOpt = json.options?.find((opt: any) => opt.name === 'time');
      expect(dayOpt).toBeDefined();
      expect(dayOpt?.required).toBeFalsy();
      expect(timeOpt).toBeDefined();
      expect(timeOpt?.required).toBeFalsy();
    });
  });

  describe('Preview (no options)', () => {
    test('should fetch events using env location', async () => {
      await eventsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockDiscoverLocalEvents).toHaveBeenCalledWith(
        '95501',
        expect.any(Date),
        expect.any(Date)
      );
    });

    test('should format events as embed', async () => {
      await eventsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockFormatEventsForDiscord).toHaveBeenCalledWith(mockEvents, '95501');
    });

    test('should show loading message then events embed', async () => {
      await eventsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Searching'),
        })
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [mockEmbed],
        })
      );
    });

    test('should handle AI service errors', async () => {
      mockDiscoverLocalEvents.mockRejectedValueOnce(new Error('AI API error'));

      await eventsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Failed to fetch events'),
        })
      );
    });
  });

  describe('Schedule Update (day/time options)', () => {
    test('should persist day update to database', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'day') return 'Monday';
        return null;
      });

      await eventsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockUpsertConfig).toHaveBeenCalledWith(
        'guild-123',
        'user-456',
        '95501',
        'channel-789',
        expect.objectContaining({ scheduleDay: 1 })
      );
    });

    test('should persist time update to database', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'time') return '2:30 PM';
        return null;
      });

      await eventsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockUpsertConfig).toHaveBeenCalledWith(
        'guild-123',
        'user-456',
        '95501',
        'channel-789',
        expect.objectContaining({ scheduleHour: 14, scheduleMinute: 30 })
      );
    });

    test('should persist both day and time to database', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'day') return 'Friday';
        if (name === 'time') return '9:00 AM';
        return null;
      });

      await eventsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockUpsertConfig).toHaveBeenCalledWith(
        'guild-123',
        'user-456',
        '95501',
        'channel-789',
        expect.objectContaining({ scheduleDay: 5, scheduleHour: 9, scheduleMinute: 0 })
      );
    });

    test('should update scheduler after DB persist', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'day') return 'Monday';
        return null;
      });

      await eventsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockAddEventConfig).toHaveBeenCalledWith('guild-123');
    });

    test('should show confirmation with formatted schedule', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'day') return 'Tuesday';
        return null;
      });

      await eventsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Schedule updated'),
        })
      );
    });

    test('should reject invalid day name', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'day') return 'NotADay';
        return null;
      });

      await eventsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Invalid day'),
        })
      );
      expect(mockUpsertConfig).not.toHaveBeenCalled();
    });

    test('should reject invalid time format', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'time') return 'not-a-time';
        return null;
      });

      await eventsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Invalid time format'),
        })
      );
      expect(mockUpsertConfig).not.toHaveBeenCalled();
    });

    test('should not fetch events when updating schedule', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'day') return 'Monday';
        return null;
      });

      await eventsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockDiscoverLocalEvents).not.toHaveBeenCalled();
    });
  });

  describe('Environment Variable Validation', () => {
    test('should error when LOCATION_ZIP_CODE is not set', async () => {
      delete process.env.LOCATION_ZIP_CODE;

      await eventsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('No location configured'),
        })
      );
    });

    test('should error when DEFAULT_REMINDER_CHANNEL is not set', async () => {
      delete process.env.DEFAULT_REMINDER_CHANNEL;

      await eventsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('No announcement channel configured'),
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle missing guild ID', async () => {
      mockInteraction.guild = undefined;
      mockInteraction.guildId = undefined;

      await eventsCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('server'),
        })
      );
    });
  });
});
