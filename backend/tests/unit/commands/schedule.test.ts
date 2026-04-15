/**
 * Unit Tests: /schedule Command
 *
 * Tests Discord slash command for schedule management (add, list, delete, countdown, today, week)
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

// Mock Schedule model
jest.mock('../../../../supabase/models/Schedule', () => ({
  __esModule: true,
  default: {
    addEvent: jest.fn(),
    getEvents: jest.fn(),
    deleteEvent: jest.fn(),
    getCountdown: jest.fn(),
    getTodaysEvents: jest.fn(),
    getUpcomingEvents: jest.fn(),
  },
}));

import scheduleCommand from '../../../commands/schedule';
import Schedule from '../../../../supabase/models/Schedule';
import { logger } from '../../../shared/utils/logger';
import { ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';

const mockSchedule = Schedule as jest.Mocked<typeof Schedule>;

describe('/schedule Command', () => {
  let mockInteraction: Partial<ChatInputCommandInteraction>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInteraction = {
      user: {
        id: 'user-456',
        username: 'testuser',
      } as any,
      guild: {
        id: 'guild-123',
      } as any,
      guildId: 'guild-123',
      replied: false,
      deferred: true,
      commandName: 'schedule',
      options: {
        getSubcommand: jest.fn(),
        getString: jest.fn(),
        getInteger: jest.fn(),
      } as any,
      editReply: jest.fn().mockResolvedValue({}),
      followUp: jest.fn().mockResolvedValue({}),
      reply: jest.fn().mockResolvedValue({}),
      deferReply: jest.fn().mockResolvedValue({}),
    };
  });

  // ─── Command Configuration ────────────────────────────────────────────────

  describe('Command Configuration', () => {
    test('should have correct command name', () => {
      expect(scheduleCommand.data.name).toBe('schedule');
    });

    test('should have a description', () => {
      expect(scheduleCommand.data.description).toBeTruthy();
      expect(scheduleCommand.data.description).toBe('Manage your schedule');
    });

    test('should have execute function', () => {
      expect(typeof scheduleCommand.execute).toBe('function');
    });

    test('should have autocomplete function', () => {
      expect(typeof scheduleCommand.autocomplete).toBe('function');
    });

    test('should have exactly 6 subcommands', () => {
      const json = scheduleCommand.data.toJSON();
      const subcommands = json.options?.filter((opt: any) => opt.type === 1) || [];
      expect(subcommands).toHaveLength(6);
    });

    test('should have all required subcommands', () => {
      const json = scheduleCommand.data.toJSON();
      const subcommandNames = json.options?.map((opt: any) => opt.name) || [];

      expect(subcommandNames).toContain('add');
      expect(subcommandNames).toContain('list');
      expect(subcommandNames).toContain('delete');
      expect(subcommandNames).toContain('countdown');
      expect(subcommandNames).toContain('today');
      expect(subcommandNames).toContain('week');
    });
  });

  // ─── Guild Validation ─────────────────────────────────────────────────────

  describe('Guild Validation', () => {
    test('should reject command used outside a server', async () => {
      mockInteraction.guild = undefined;
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('list');

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'This command can only be used in a server.',
      });
    });
  });

  // ─── Subcommand: add ──────────────────────────────────────────────────────

  describe('Subcommand: add', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('add');
      mockSchedule.addEvent.mockResolvedValue({} as any);
    });

    test('should add event with description successfully', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'event':
            return 'Team Meeting';
          case 'date':
            return '03-15-2026';
          case 'time':
            return '2:30 PM';
          case 'description':
            return 'Weekly sync';
          default:
            return null;
        }
      });

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockSchedule.addEvent).toHaveBeenCalledWith(
        'guild-123',
        'Team Meeting',
        '2026-03-15',
        '14:30',
        'Weekly sync',
        'user-456'
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Event Scheduled',
              }),
            }),
          ]),
        })
      );
    });

    test('should add event without description successfully', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'event':
            return 'Lunch Break';
          case 'date':
            return '06-01-2026';
          case 'time':
            return '12:00 PM';
          case 'description':
            return null;
          default:
            return null;
        }
      });

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockSchedule.addEvent).toHaveBeenCalledWith(
        'guild-123',
        'Lunch Break',
        '2026-06-01',
        '12:00',
        null,
        'user-456'
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([expect.any(Object)]),
        })
      );
    });

    test('should reject invalid date format (not MM-DD-YYYY)', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'event':
            return 'Event';
          case 'date':
            return '2026-03-15';
          case 'time':
            return '2:30 PM';
          case 'description':
            return null;
          default:
            return null;
        }
      });

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Invalid date format'),
      });
      expect(mockSchedule.addEvent).not.toHaveBeenCalled();
    });

    test('should reject invalid month (>12)', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'event':
            return 'Event';
          case 'date':
            return '13-15-2026';
          case 'time':
            return '2:30 PM';
          case 'description':
            return null;
          default:
            return null;
        }
      });

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Invalid month'),
      });
      expect(mockSchedule.addEvent).not.toHaveBeenCalled();
    });

    test('should reject invalid month (0)', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'event':
            return 'Event';
          case 'date':
            return '00-15-2026';
          case 'time':
            return '2:30 PM';
          case 'description':
            return null;
          default:
            return null;
        }
      });

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Invalid month'),
      });
    });

    test('should reject invalid day (>31)', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'event':
            return 'Event';
          case 'date':
            return '03-32-2026';
          case 'time':
            return '2:30 PM';
          case 'description':
            return null;
          default:
            return null;
        }
      });

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Invalid day'),
      });
      expect(mockSchedule.addEvent).not.toHaveBeenCalled();
    });

    test('should reject invalid day (0)', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'event':
            return 'Event';
          case 'date':
            return '03-00-2026';
          case 'time':
            return '2:30 PM';
          case 'description':
            return null;
          default:
            return null;
        }
      });

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Invalid day'),
      });
    });

    test('should reject invalid time format', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'event':
            return 'Event';
          case 'date':
            return '03-15-2026';
          case 'time':
            return '14:30';
          case 'description':
            return null;
          default:
            return null;
        }
      });

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Invalid time format'),
      });
      expect(mockSchedule.addEvent).not.toHaveBeenCalled();
    });

    test('should handle AM time correctly', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'event':
            return 'Morning Run';
          case 'date':
            return '03-15-2026';
          case 'time':
            return '7:00 AM';
          case 'description':
            return null;
          default:
            return null;
        }
      });

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockSchedule.addEvent).toHaveBeenCalledWith(
        'guild-123',
        'Morning Run',
        '2026-03-15',
        '07:00',
        null,
        'user-456'
      );
    });

    test('should handle 12:00 PM (noon) correctly', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'event':
            return 'Noon Event';
          case 'date':
            return '03-15-2026';
          case 'time':
            return '12:00 PM';
          case 'description':
            return null;
          default:
            return null;
        }
      });

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockSchedule.addEvent).toHaveBeenCalledWith(
        'guild-123',
        'Noon Event',
        '2026-03-15',
        '12:00',
        null,
        'user-456'
      );
    });

    test('should handle 12:00 AM (midnight) correctly', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'event':
            return 'Midnight Event';
          case 'date':
            return '03-15-2026';
          case 'time':
            return '12:00 AM';
          case 'description':
            return null;
          default:
            return null;
        }
      });

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockSchedule.addEvent).toHaveBeenCalledWith(
        'guild-123',
        'Midnight Event',
        '2026-03-15',
        '00:00',
        null,
        'user-456'
      );
    });

    test('should pad single-digit month and day for storage', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        switch (name) {
          case 'event':
            return 'Early Year';
          case 'date':
            return '1-5-2026';
          case 'time':
            return '3:00 PM';
          case 'description':
            return null;
          default:
            return null;
        }
      });

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockSchedule.addEvent).toHaveBeenCalledWith(
        'guild-123',
        'Early Year',
        '2026-01-05',
        '15:00',
        null,
        'user-456'
      );
    });
  });

  // ─── Subcommand: list ─────────────────────────────────────────────────────

  describe('Subcommand: list', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('list');
    });

    test('should list upcoming events by default', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockReturnValue(null);
      mockSchedule.getEvents.mockResolvedValue([
        { id: 1, event: 'Meeting', date: '2026-03-15', time: '14:30', description: null } as any,
      ]);

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockSchedule.getEvents).toHaveBeenCalledWith('guild-123', 'upcoming');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Your Upcoming Events',
              }),
            }),
          ]),
        })
      );
    });

    test('should list past events when filter is past', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockReturnValue('past');
      mockSchedule.getEvents.mockResolvedValue([
        {
          id: 2,
          event: 'Old Meeting',
          date: '2025-01-10',
          time: '09:00',
          description: null,
        } as any,
      ]);

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockSchedule.getEvents).toHaveBeenCalledWith('guild-123', 'past');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Your Past Events',
              }),
            }),
          ]),
        })
      );
    });

    test('should list all events when filter is all', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockReturnValue('all');
      mockSchedule.getEvents.mockResolvedValue([
        { id: 1, event: 'Event A', date: '2026-03-15', time: '14:30', description: null } as any,
      ]);

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockSchedule.getEvents).toHaveBeenCalledWith('guild-123', 'all');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Your All Events',
              }),
            }),
          ]),
        })
      );
    });

    test('should show empty message when no events found', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockReturnValue('upcoming');
      mockSchedule.getEvents.mockResolvedValue([]);

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'No upcoming events found.',
      });
    });

    test('should show footer when more than 10 events', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockReturnValue(null);
      const manyEvents = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        event: `Event ${i + 1}`,
        date: '2026-03-15',
        time: '14:30',
        description: null,
      }));
      mockSchedule.getEvents.mockResolvedValue(manyEvents as any);

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                footer: expect.objectContaining({
                  text: 'Showing 10 of 15 events',
                }),
              }),
            }),
          ]),
        })
      );
    });

    test('should include description in event listing when present', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockReturnValue(null);
      mockSchedule.getEvents.mockResolvedValue([
        {
          id: 1,
          event: 'Meeting',
          date: '2026-03-15',
          time: '14:30',
          description: 'Important sync',
        } as any,
      ]);

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                description: expect.stringContaining('Important sync'),
              }),
            }),
          ]),
        })
      );
    });
  });

  // ─── Subcommand: delete ───────────────────────────────────────────────────

  describe('Subcommand: delete', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('delete');
    });

    test('should delete event successfully', async () => {
      (mockInteraction.options!.getInteger as jest.Mock).mockReturnValue(42);
      mockSchedule.deleteEvent.mockResolvedValue(true as any);

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockSchedule.deleteEvent).toHaveBeenCalledWith(42, 'guild-123');
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Event #42 has been deleted.',
      });
    });

    test('should handle event not found', async () => {
      (mockInteraction.options!.getInteger as jest.Mock).mockReturnValue(999);
      mockSchedule.deleteEvent.mockResolvedValue(false as any);

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Event #999 not found'),
      });
    });
  });

  // ─── Subcommand: countdown ────────────────────────────────────────────────

  describe('Subcommand: countdown', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('countdown');
    });

    test('should display countdown for found event', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockReturnValue('Birthday');
      mockSchedule.getCountdown.mockResolvedValue({
        event: {
          event: 'Birthday Party',
          date: '2026-12-25',
          time: '18:00',
          description: 'Celebration',
        },
        timeLeft: '5 days, 3 hours, 20 minutes',
      } as any);

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockSchedule.getCountdown).toHaveBeenCalledWith('guild-123', 'Birthday');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining('Countdown'),
                description: expect.stringContaining('Birthday Party'),
              }),
            }),
          ]),
        })
      );
    });

    test('should show countdown embed with description when event has description', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockReturnValue('Meeting');
      mockSchedule.getCountdown.mockResolvedValue({
        event: {
          event: 'Team Meeting',
          date: '2026-04-01',
          time: '10:00',
          description: 'Quarterly review',
        },
        timeLeft: '2 days, 1 hour',
      } as any);

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      // The embed should contain description field
      const editReplyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = editReplyCall.embeds[0];
      const fields = embed.data.fields;
      const descField = fields.find((f: any) => f.name === 'Description');
      expect(descField).toBeDefined();
      expect(descField.value).toBe('Quarterly review');
    });

    test('should not include description field when event has no description', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockReturnValue('Meeting');
      mockSchedule.getCountdown.mockResolvedValue({
        event: {
          event: 'Team Meeting',
          date: '2026-04-01',
          time: '10:00',
          description: null,
        },
        timeLeft: '2 days',
      } as any);

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const editReplyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = editReplyCall.embeds[0];
      const fields = embed.data.fields;
      const descField = fields.find((f: any) => f.name === 'Description');
      expect(descField).toBeUndefined();
    });

    test('should handle event not found in countdown', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockReturnValue('Nonexistent');
      mockSchedule.getCountdown.mockResolvedValue(null);

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'No event found matching "Nonexistent".',
      });
    });
  });

  // ─── Subcommand: today ────────────────────────────────────────────────────

  describe('Subcommand: today', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('today');
    });

    test("should display today's events", async () => {
      mockSchedule.getTodaysEvents.mockResolvedValue([
        { event: 'Standup', time: '09:00', description: null } as any,
        { event: 'Lunch', time: '12:00', description: 'Team lunch' } as any,
      ]);

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockSchedule.getTodaysEvents).toHaveBeenCalledWith('guild-123');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: "Today's Events",
                footer: expect.objectContaining({
                  text: '2 event(s) today',
                }),
              }),
            }),
          ]),
        })
      );
    });

    test('should show no events message when today is empty', async () => {
      mockSchedule.getTodaysEvents.mockResolvedValue([]);

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'No events scheduled for today.',
      });
    });

    test("should include description in today's event listing", async () => {
      mockSchedule.getTodaysEvents.mockResolvedValue([
        { event: 'Meeting', time: '10:00', description: 'Design review' } as any,
      ]);

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const editReplyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = editReplyCall.embeds[0];
      expect(embed.data.description).toContain('Design review');
    });
  });

  // ─── Subcommand: week ─────────────────────────────────────────────────────

  describe('Subcommand: week', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('week');
    });

    test('should display events grouped by day', async () => {
      mockSchedule.getUpcomingEvents.mockResolvedValue([
        { event: 'Monday Standup', date: '2026-03-16', time: '09:00', description: null } as any,
        { event: 'Monday Lunch', date: '2026-03-16', time: '12:00', description: null } as any,
        { event: 'Wednesday Review', date: '2026-03-18', time: '14:00', description: null } as any,
      ]);

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockSchedule.getUpcomingEvents).toHaveBeenCalledWith('guild-123', 7);
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: "This Week's Events",
                footer: expect.objectContaining({
                  text: '3 event(s) this week',
                }),
              }),
            }),
          ]),
        })
      );
    });

    test('should show no events message when week is empty', async () => {
      mockSchedule.getUpcomingEvents.mockResolvedValue([]);

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'No events scheduled for the next 7 days.',
      });
    });

    test('should group multiple events under the same date', async () => {
      mockSchedule.getUpcomingEvents.mockResolvedValue([
        { event: 'Event A', date: '2026-03-16', time: '09:00', description: null } as any,
        { event: 'Event B', date: '2026-03-16', time: '15:00', description: null } as any,
      ]);

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const editReplyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = editReplyCall.embeds[0];
      // Both events should be in the description under the same day header
      expect(embed.data.description).toContain('Event A');
      expect(embed.data.description).toContain('Event B');
    });
  });

  // ─── Helper Functions ─────────────────────────────────────────────────────

  describe('Helper Functions', () => {
    // We test helper functions indirectly through the command execution since
    // they are not exported. We verify behavior through command output.

    describe('parseTimeToMilitaryFormat (via add subcommand)', () => {
      beforeEach(() => {
        (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('add');
        mockSchedule.addEvent.mockResolvedValue({} as any);
      });

      test('should parse "2:30 PM" to 14:30', async () => {
        (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
          switch (name) {
            case 'event':
              return 'Test';
            case 'date':
              return '03-15-2026';
            case 'time':
              return '2:30 PM';
            case 'description':
              return null;
            default:
              return null;
          }
        });

        await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);
        expect(mockSchedule.addEvent).toHaveBeenCalledWith(
          'guild-123',
          'Test',
          '2026-03-15',
          '14:30',
          null,
          'user-456'
        );
      });

      test('should parse "12:00 AM" to 00:00', async () => {
        (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
          switch (name) {
            case 'event':
              return 'Test';
            case 'date':
              return '03-15-2026';
            case 'time':
              return '12:00 AM';
            case 'description':
              return null;
            default:
              return null;
          }
        });

        await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);
        expect(mockSchedule.addEvent).toHaveBeenCalledWith(
          'guild-123',
          'Test',
          '2026-03-15',
          '00:00',
          null,
          'user-456'
        );
      });

      test('should parse "12:00 PM" to 12:00', async () => {
        (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
          switch (name) {
            case 'event':
              return 'Test';
            case 'date':
              return '03-15-2026';
            case 'time':
              return '12:00 PM';
            case 'description':
              return null;
            default:
              return null;
          }
        });

        await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);
        expect(mockSchedule.addEvent).toHaveBeenCalledWith(
          'guild-123',
          'Test',
          '2026-03-15',
          '12:00',
          null,
          'user-456'
        );
      });

      test('should reject 24-hour format as invalid', async () => {
        (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
          switch (name) {
            case 'event':
              return 'Test';
            case 'date':
              return '03-15-2026';
            case 'time':
              return '14:30';
            case 'description':
              return null;
            default:
              return null;
          }
        });

        await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);
        expect(mockSchedule.addEvent).not.toHaveBeenCalled();
        expect(mockInteraction.editReply).toHaveBeenCalledWith({
          content: expect.stringContaining('Invalid time format'),
        });
      });

      test('should reject time without AM/PM', async () => {
        (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
          switch (name) {
            case 'event':
              return 'Test';
            case 'date':
              return '03-15-2026';
            case 'time':
              return '2:30';
            case 'description':
              return null;
            default:
              return null;
          }
        });

        await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);
        expect(mockSchedule.addEvent).not.toHaveBeenCalled();
      });

      test('should parse lowercase am/pm', async () => {
        (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
          switch (name) {
            case 'event':
              return 'Test';
            case 'date':
              return '03-15-2026';
            case 'time':
              return '9:15 am';
            case 'description':
              return null;
            default:
              return null;
          }
        });

        await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);
        expect(mockSchedule.addEvent).toHaveBeenCalledWith(
          'guild-123',
          'Test',
          '2026-03-15',
          '09:15',
          null,
          'user-456'
        );
      });
    });

    describe('formatTimeTo12Hour (via list subcommand)', () => {
      beforeEach(() => {
        (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('list');
        (mockInteraction.options!.getString as jest.Mock).mockReturnValue(null);
      });

      test('should format 14:30 as 2:30 PM in event list', async () => {
        mockSchedule.getEvents.mockResolvedValue([
          { id: 1, event: 'Test', date: '2026-03-15', time: '14:30', description: null } as any,
        ]);

        await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

        const editReplyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
        const embed = editReplyCall.embeds[0];
        expect(embed.data.description).toContain('2:30 PM');
      });

      test('should format 00:00 as 12:00 AM in event list', async () => {
        mockSchedule.getEvents.mockResolvedValue([
          { id: 1, event: 'Midnight', date: '2026-03-15', time: '00:00', description: null } as any,
        ]);

        await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

        const editReplyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
        const embed = editReplyCall.embeds[0];
        expect(embed.data.description).toContain('12:00 AM');
      });

      test('should format 12:00 as 12:00 PM in event list', async () => {
        mockSchedule.getEvents.mockResolvedValue([
          { id: 1, event: 'Noon', date: '2026-03-15', time: '12:00', description: null } as any,
        ]);

        await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

        const editReplyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
        const embed = editReplyCall.embeds[0];
        expect(embed.data.description).toContain('12:00 PM');
      });
    });

    describe('formatDateForDisplay (via list subcommand)', () => {
      beforeEach(() => {
        (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('list');
        (mockInteraction.options!.getString as jest.Mock).mockReturnValue(null);
      });

      test('should format YYYY-MM-DD as MM-DD-YYYY in event list', async () => {
        mockSchedule.getEvents.mockResolvedValue([
          { id: 1, event: 'Test', date: '2026-03-15', time: '10:00', description: null } as any,
        ]);

        await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

        const editReplyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
        const embed = editReplyCall.embeds[0];
        expect(embed.data.description).toContain('03-15-2026');
      });

      test('should pad single-digit month and day', async () => {
        mockSchedule.getEvents.mockResolvedValue([
          { id: 1, event: 'Test', date: '2026-1-5', time: '10:00', description: null } as any,
        ]);

        await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

        const editReplyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
        const embed = editReplyCall.embeds[0];
        expect(embed.data.description).toContain('01-05-2026');
      });
    });
  });

  // ─── Autocomplete ─────────────────────────────────────────────────────────

  describe('Autocomplete', () => {
    let mockAutoInteraction: Partial<AutocompleteInteraction>;

    beforeEach(() => {
      mockAutoInteraction = {
        guild: {
          id: 'guild-123',
        } as any,
        options: {
          getFocused: jest.fn().mockReturnValue({ name: 'event', value: '' }),
        } as any,
        respond: jest.fn().mockResolvedValue(undefined),
      };
    });

    test('should return upcoming events for autocomplete', async () => {
      mockSchedule.getEvents.mockResolvedValue([
        { event: 'Team Meeting', date: '2026-03-15', time: '14:30' } as any,
        { event: 'Birthday Party', date: '2026-04-01', time: '18:00' } as any,
      ]);

      await scheduleCommand.autocomplete(mockAutoInteraction as AutocompleteInteraction);

      expect(mockSchedule.getEvents).toHaveBeenCalledWith('guild-123', 'upcoming');
      expect(mockAutoInteraction.respond).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ value: 'Team Meeting' }),
          expect.objectContaining({ value: 'Birthday Party' }),
        ])
      );
    });

    test('should filter autocomplete choices based on user input', async () => {
      (mockAutoInteraction.options!.getFocused as jest.Mock).mockReturnValue({
        name: 'event',
        value: 'meet',
      });
      mockSchedule.getEvents.mockResolvedValue([
        { event: 'Team Meeting', date: '2026-03-15', time: '14:30' } as any,
        { event: 'Birthday Party', date: '2026-04-01', time: '18:00' } as any,
      ]);

      await scheduleCommand.autocomplete(mockAutoInteraction as AutocompleteInteraction);

      const respondCall = (mockAutoInteraction.respond as jest.Mock).mock.calls[0][0];
      expect(respondCall).toHaveLength(1);
      expect(respondCall[0].value).toBe('Team Meeting');
    });

    test('should limit autocomplete to 25 choices', async () => {
      const manyEvents = Array.from({ length: 30 }, (_, i) => ({
        event: `Event ${i + 1}`,
        date: '2026-03-15',
        time: '10:00',
      }));
      mockSchedule.getEvents.mockResolvedValue(manyEvents as any);

      await scheduleCommand.autocomplete(mockAutoInteraction as AutocompleteInteraction);

      const respondCall = (mockAutoInteraction.respond as jest.Mock).mock.calls[0][0];
      expect(respondCall.length).toBeLessThanOrEqual(25);
    });

    test('should respond with empty array when no guild', async () => {
      mockAutoInteraction.guild = undefined;

      await scheduleCommand.autocomplete(mockAutoInteraction as AutocompleteInteraction);

      expect(mockAutoInteraction.respond).toHaveBeenCalledWith([]);
      expect(mockSchedule.getEvents).not.toHaveBeenCalled();
    });

    test('should respond with empty array on error', async () => {
      mockSchedule.getEvents.mockRejectedValue(new Error('DB error'));

      await scheduleCommand.autocomplete(mockAutoInteraction as AutocompleteInteraction);

      expect(mockAutoInteraction.respond).toHaveBeenCalledWith([]);
      expect(logger.error).toHaveBeenCalled();
    });

    test('should include formatted date and time in choice name', async () => {
      mockSchedule.getEvents.mockResolvedValue([
        { event: 'Dentist', date: '2026-03-15', time: '14:30' } as any,
      ]);

      await scheduleCommand.autocomplete(mockAutoInteraction as AutocompleteInteraction);

      const respondCall = (mockAutoInteraction.respond as jest.Mock).mock.calls[0][0];
      expect(respondCall[0].name).toContain('Dentist');
      expect(respondCall[0].name).toContain('03-15-2026');
      expect(respondCall[0].name).toContain('2:30 PM');
    });
  });

  // ─── Error Handling ───────────────────────────────────────────────────────

  describe('Error Handling', () => {
    test('should catch errors and log them', async () => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('list');
      (mockInteraction.options!.getString as jest.Mock).mockReturnValue(null);
      mockSchedule.getEvents.mockRejectedValue(new Error('Database connection failed'));

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in schedule command',
        expect.objectContaining({
          command: 'schedule',
          subcommand: 'list',
          error: 'Database connection failed',
          userId: 'user-456',
          guildId: 'guild-123',
        })
      );
    });

    test('should use followUp when interaction is already replied or deferred', async () => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('today');
      mockInteraction.replied = false;
      mockInteraction.deferred = true;
      mockSchedule.getTodaysEvents.mockRejectedValue(new Error('Oops'));

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content: 'An error occurred while processing your request.',
      });
    });

    test('should use editReply when interaction is not replied/deferred', async () => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('today');
      mockInteraction.replied = false;
      mockInteraction.deferred = false;
      mockSchedule.getTodaysEvents.mockRejectedValue(new Error('Oops'));

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'An error occurred while processing your request.',
      });
    });

    test('should handle non-Error thrown objects', async () => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('list');
      (mockInteraction.options!.getString as jest.Mock).mockReturnValue(null);
      mockSchedule.getEvents.mockRejectedValue('string error');

      await scheduleCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in schedule command',
        expect.objectContaining({
          error: 'Unknown error',
        })
      );
    });
  });
});
