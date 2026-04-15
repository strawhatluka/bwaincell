/**
 * Unit tests for /remind slash command
 *
 * Tests the Discord slash command for reminder management:
 * me, daily, weekly, monthly, yearly, list, delete subcommands + autocomplete.
 */

// Mock dependencies BEFORE imports
jest.mock('../../../shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../../config/config', () => ({
  __esModule: true,
  default: {
    settings: {
      timezone: 'America/Los_Angeles',
      defaultReminderChannel: 'test-channel-id',
    },
  },
}));

jest.mock('../../../../supabase/models/Reminder', () => ({
  __esModule: true,
  default: {
    createReminder: jest.fn(),
    getUserReminders: jest.fn(),
    deleteReminder: jest.fn(),
    calculateNextTrigger: jest.fn(),
  },
}));

jest.mock('../../../utils/scheduler', () => ({
  getScheduler: jest.fn().mockReturnValue({
    addReminder: jest.fn(),
  }),
}));

import { SlashCommandBuilder } from 'discord.js';
import remindCommand from '../../../commands/remind';
import Reminder from '../../../../supabase/models/Reminder';
import { logger } from '../../../shared/utils/logger';
import { getScheduler } from '../../../utils/scheduler';

// Helper to create a mock reminder result
function createMockReminder(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    guild_id: 'guild456',
    channel_id: 'test-channel-id',
    user_id: 'user123',
    message: 'Test reminder',
    time: '14:30',
    frequency: 'once',
    day_of_week: null,
    day_of_month: null,
    month: null,
    next_trigger: '2026-04-14T21:30:00.000Z',
    active: true,
    ...overrides,
  };
}

describe('/remind Slash Command', () => {
  let mockInteraction: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInteraction = {
      user: { id: 'user123' },
      guild: { id: 'guild456' },
      channel: { id: 'channel789' },
      replied: false,
      deferred: true,
      commandName: 'remind',
      options: {
        getSubcommand: jest.fn(),
        getString: jest.fn(),
        getInteger: jest.fn(),
        getChannel: jest.fn(),
        getFocused: jest.fn(),
      },
      deferReply: jest.fn().mockResolvedValue({}),
      reply: jest.fn().mockResolvedValue({}),
      editReply: jest.fn().mockResolvedValue({}),
      followUp: jest.fn().mockResolvedValue({}),
      respond: jest.fn().mockResolvedValue({}),
    };
  });

  // ─── Command Configuration ─────────────────────────────────────────
  describe('Command Configuration', () => {
    it('should have correct command name and description', () => {
      expect(remindCommand.data).toBeInstanceOf(SlashCommandBuilder);
      expect(remindCommand.data.name).toBe('remind');
      expect(remindCommand.data.description).toBe('Manage reminders');
    });

    it('should have all required subcommands', () => {
      const commandData = remindCommand.data.toJSON();
      const subcommandNames = commandData.options?.map((opt: any) => opt.name) || [];

      expect(subcommandNames).toContain('me');
      expect(subcommandNames).toContain('daily');
      expect(subcommandNames).toContain('weekly');
      expect(subcommandNames).toContain('monthly');
      expect(subcommandNames).toContain('yearly');
      expect(subcommandNames).toContain('list');
      expect(subcommandNames).toContain('delete');
    });

    it('should have exactly 7 subcommands', () => {
      const commandData = remindCommand.data.toJSON();
      expect(commandData.options).toHaveLength(7);
    });

    it('should have monthly subcommand with correct options', () => {
      const commandData = remindCommand.data.toJSON();
      const monthlySubcommand = commandData.options?.find((opt: any) => opt.name === 'monthly');

      expect(monthlySubcommand).toBeDefined();
      expect(monthlySubcommand?.description).toBe('Set a monthly recurring reminder');

      const optionNames = monthlySubcommand?.options?.map((opt: any) => opt.name) || [];
      expect(optionNames).toContain('message');
      expect(optionNames).toContain('day');
      expect(optionNames).toContain('time');

      const dayOption = monthlySubcommand?.options?.find((opt: any) => opt.name === 'day');
      expect(dayOption?.min_value).toBe(1);
      expect(dayOption?.max_value).toBe(31);
    });

    it('should have yearly subcommand with correct options', () => {
      const commandData = remindCommand.data.toJSON();
      const yearlySubcommand = commandData.options?.find((opt: any) => opt.name === 'yearly');

      expect(yearlySubcommand).toBeDefined();
      expect(yearlySubcommand?.description).toBe('Set a yearly recurring reminder');

      const optionNames = yearlySubcommand?.options?.map((opt: any) => opt.name) || [];
      expect(optionNames).toContain('message');
      expect(optionNames).toContain('month');
      expect(optionNames).toContain('day');
      expect(optionNames).toContain('time');

      const monthOption = yearlySubcommand?.options?.find((opt: any) => opt.name === 'month');
      expect(monthOption?.choices).toHaveLength(12);
      expect(monthOption?.choices[0].name).toBe('January');
      expect(monthOption?.choices[0].value).toBe(1);
    });

    it('should have weekly subcommand with day choices', () => {
      const commandData = remindCommand.data.toJSON();
      const weeklySubcommand = commandData.options?.find((opt: any) => opt.name === 'weekly');

      expect(weeklySubcommand).toBeDefined();
      const dayOption = weeklySubcommand?.options?.find((opt: any) => opt.name === 'day');
      expect(dayOption?.choices).toHaveLength(7);
      expect(dayOption?.choices[0].name).toBe('Sunday');
      expect(dayOption?.choices[0].value).toBe('0');
      expect(dayOption?.choices[6].name).toBe('Saturday');
      expect(dayOption?.choices[6].value).toBe('6');
    });

    it('should have delete subcommand with autocomplete reminder_id option', () => {
      const commandData = remindCommand.data.toJSON();
      const deleteSubcommand = commandData.options?.find((opt: any) => opt.name === 'delete');

      expect(deleteSubcommand).toBeDefined();
      const idOption = deleteSubcommand?.options?.find((opt: any) => opt.name === 'reminder_id');
      expect(idOption).toBeDefined();
      expect(idOption?.required).toBe(true);
      expect(idOption?.autocomplete).toBe(true);
    });
  });

  // ─── Command Options Validation ────────────────────────────────────
  describe('Command Options Validation', () => {
    it('monthly subcommand should require all options', () => {
      const commandData = remindCommand.data.toJSON();
      const monthlySubcommand = commandData.options?.find((opt: any) => opt.name === 'monthly');

      const allRequired = monthlySubcommand?.options?.every((opt: any) => opt.required);
      expect(allRequired).toBe(true);
    });

    it('yearly subcommand should require all options', () => {
      const commandData = remindCommand.data.toJSON();
      const yearlySubcommand = commandData.options?.find((opt: any) => opt.name === 'yearly');

      const allRequired = yearlySubcommand?.options?.every((opt: any) => opt.required);
      expect(allRequired).toBe(true);
    });

    it('monthly day option should accept 1-31', () => {
      const commandData = remindCommand.data.toJSON();
      const monthlySubcommand = commandData.options?.find((opt: any) => opt.name === 'monthly');
      const dayOption = monthlySubcommand?.options?.find((opt: any) => opt.name === 'day');

      expect(dayOption?.min_value).toBe(1);
      expect(dayOption?.max_value).toBe(31);
      expect(dayOption?.type).toBe(4); // INTEGER type
    });

    it('yearly month option should have all 12 months', () => {
      const commandData = remindCommand.data.toJSON();
      const yearlySubcommand = commandData.options?.find((opt: any) => opt.name === 'yearly');
      const monthOption = yearlySubcommand?.options?.find((opt: any) => opt.name === 'month');

      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];

      monthNames.forEach((monthName, index) => {
        const choice = monthOption?.choices?.find((c: any) => c.name === monthName);
        expect(choice).toBeDefined();
        expect(choice?.value).toBe(index + 1);
      });
    });
  });

  // ─── Guild/Channel Validation ──────────────────────────────────────
  describe('Guild and Channel Validation', () => {
    it('should reject command used outside a server (no guild)', async () => {
      mockInteraction.guild = null;
      mockInteraction.options.getSubcommand.mockReturnValue('me');

      await remindCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'This command can only be used in a server.',
      });
    });

    it('should reject when channel ID cannot be determined', async () => {
      // Remove default reminder channel from config and no channel on interaction
      const config = require('../../../config/config').default;
      const originalChannel = config.settings.defaultReminderChannel;
      config.settings.defaultReminderChannel = '';
      mockInteraction.channel = null;
      mockInteraction.options.getSubcommand.mockReturnValue('me');

      await remindCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Unable to determine channel ID.',
      });

      // Restore
      config.settings.defaultReminderChannel = originalChannel;
    });
  });

  // ─── "me" Subcommand (One-time) ────────────────────────────────────
  describe('Subcommand: me (one-time reminder)', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('me');
    });

    it('should create a one-time reminder successfully', async () => {
      const mockReminder = createMockReminder({ frequency: 'once' });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Take out trash';
        if (name === 'time') return '2:30 PM';
        if (name === 'date') return null;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      expect(Reminder.createReminder).toHaveBeenCalledWith(
        'guild456',
        'test-channel-id',
        'Take out trash',
        '14:30',
        'once',
        null,
        'user123',
        null
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([expect.any(Object)]),
          components: expect.arrayContaining([expect.any(Object)]),
        })
      );
    });

    it('should create a one-time reminder with "tomorrow" date', async () => {
      const mockReminder = createMockReminder({ frequency: 'once' });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Morning routine';
        if (name === 'time') return '8:00 AM';
        if (name === 'date') return 'tomorrow';
        return null;
      });

      await remindCommand.execute(mockInteraction);

      expect(Reminder.createReminder).toHaveBeenCalledWith(
        'guild456',
        'test-channel-id',
        'Morning routine',
        '08:00',
        'once',
        null,
        'user123',
        expect.any(Date)
      );
    });

    it('should create a one-time reminder with MM-DD-YYYY date', async () => {
      const mockReminder = createMockReminder({ frequency: 'once' });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Birthday party';
        if (name === 'time') return '6:00 PM';
        if (name === 'date') return '12-25-2026';
        return null;
      });

      await remindCommand.execute(mockInteraction);

      expect(Reminder.createReminder).toHaveBeenCalledWith(
        'guild456',
        'test-channel-id',
        'Birthday party',
        '18:00',
        'once',
        null,
        'user123',
        expect.any(Date)
      );
    });

    it('should reject invalid time format', async () => {
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Test';
        if (name === 'time') return 'not-a-time';
        if (name === 'date') return null;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Invalid time format'),
      });
      expect(Reminder.createReminder).not.toHaveBeenCalled();
    });

    it('should reject invalid date format', async () => {
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Test';
        if (name === 'time') return '2:30 PM';
        if (name === 'date') return 'invalid-date';
        return null;
      });

      await remindCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Invalid date format'),
      });
      expect(Reminder.createReminder).not.toHaveBeenCalled();
    });

    it('should add reminder to scheduler after creation', async () => {
      const mockReminder = createMockReminder({ id: 42 });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Scheduled task';
        if (name === 'time') return '3:00 PM';
        if (name === 'date') return null;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      const scheduler = getScheduler();
      expect(scheduler!.addReminder).toHaveBeenCalledWith(42);
    });

    it('should handle null scheduler gracefully', async () => {
      (getScheduler as jest.Mock).mockReturnValueOnce(null);
      const mockReminder = createMockReminder();
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'No scheduler';
        if (name === 'time') return '1:00 PM';
        if (name === 'date') return null;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      // Should not throw, should still reply
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) })
      );
    });

    it('should display N/A when next_trigger is null', async () => {
      const mockReminder = createMockReminder({ next_trigger: null });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Test';
        if (name === 'time') return '2:30 PM';
        if (name === 'date') return null;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embed = replyCall.embeds[0];
      const embedJson = embed.toJSON();
      const nextTriggerField = embedJson.fields.find((f: any) => f.name.includes('Next Trigger'));
      expect(nextTriggerField.value).toBe('N/A');
    });

    it('should handle 12:00 AM correctly', async () => {
      const mockReminder = createMockReminder({ time: '00:00' });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Midnight';
        if (name === 'time') return '12:00 AM';
        if (name === 'date') return null;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      expect(Reminder.createReminder).toHaveBeenCalledWith(
        'guild456',
        'test-channel-id',
        'Midnight',
        '00:00',
        'once',
        null,
        'user123',
        null
      );
    });

    it('should handle 12:00 PM correctly', async () => {
      const mockReminder = createMockReminder({ time: '12:00' });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Noon';
        if (name === 'time') return '12:00 PM';
        if (name === 'date') return null;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      expect(Reminder.createReminder).toHaveBeenCalledWith(
        'guild456',
        'test-channel-id',
        'Noon',
        '12:00',
        'once',
        null,
        'user123',
        null
      );
    });
  });

  // ─── "daily" Subcommand ────────────────────────────────────────────
  describe('Subcommand: daily', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('daily');
    });

    it('should create a daily reminder successfully', async () => {
      const mockReminder = createMockReminder({ frequency: 'daily' });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Take vitamins';
        if (name === 'time') return '9:00 AM';
        return null;
      });

      await remindCommand.execute(mockInteraction);

      expect(Reminder.createReminder).toHaveBeenCalledWith(
        'guild456',
        'test-channel-id',
        'Take vitamins',
        '09:00',
        'daily',
        null,
        'user123'
      );

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embed = replyCall.embeds[0];
      const embedJson = embed.toJSON();
      expect(embedJson.title).toContain('Daily Reminder Set');
    });

    it('should reject invalid time format for daily', async () => {
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Test';
        if (name === 'time') return 'bad-time';
        return null;
      });

      await remindCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Invalid time format'),
      });
      expect(Reminder.createReminder).not.toHaveBeenCalled();
    });

    it('should add daily reminder to scheduler', async () => {
      const mockReminder = createMockReminder({ id: 10, frequency: 'daily' });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Daily task';
        if (name === 'time') return '7:00 AM';
        return null;
      });

      await remindCommand.execute(mockInteraction);

      const scheduler = getScheduler();
      expect(scheduler!.addReminder).toHaveBeenCalledWith(10);
    });

    it('should display next trigger in embed for daily reminder', async () => {
      const mockReminder = createMockReminder({
        frequency: 'daily',
        next_trigger: '2026-04-14T16:00:00.000Z',
      });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Check in';
        if (name === 'time') return '9:00 AM';
        return null;
      });

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embed = replyCall.embeds[0];
      const embedJson = embed.toJSON();
      const nextTriggerField = embedJson.fields.find((f: any) => f.name.includes('Next Trigger'));
      expect(nextTriggerField.value).not.toBe('N/A');
    });

    it('should handle null scheduler for daily', async () => {
      (getScheduler as jest.Mock).mockReturnValueOnce(null);
      const mockReminder = createMockReminder({ frequency: 'daily' });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Test';
        if (name === 'time') return '9:00 AM';
        return null;
      });

      await remindCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ embeds: expect.any(Array) })
      );
    });
  });

  // ─── "weekly" Subcommand ───────────────────────────────────────────
  describe('Subcommand: weekly', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('weekly');
    });

    it('should create a weekly reminder successfully', async () => {
      const mockReminder = createMockReminder({
        frequency: 'weekly',
        day_of_week: 1,
      });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Team standup';
        if (name === 'day') return '1'; // Monday
        if (name === 'time') return '10:00 AM';
        return null;
      });

      await remindCommand.execute(mockInteraction);

      expect(Reminder.createReminder).toHaveBeenCalledWith(
        'guild456',
        'test-channel-id',
        'Team standup',
        '10:00',
        'weekly',
        1,
        'user123'
      );

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embed = replyCall.embeds[0];
      const embedJson = embed.toJSON();
      expect(embedJson.title).toContain('Weekly Reminder Set');
      const dayField = embedJson.fields.find((f: any) => f.name.includes('Day'));
      expect(dayField.value).toBe('Monday');
    });

    it('should handle Sunday (day 0) correctly', async () => {
      const mockReminder = createMockReminder({
        frequency: 'weekly',
        day_of_week: 0,
      });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Church';
        if (name === 'day') return '0';
        if (name === 'time') return '9:00 AM';
        return null;
      });

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embedJson = replyCall.embeds[0].toJSON();
      const dayField = embedJson.fields.find((f: any) => f.name.includes('Day'));
      expect(dayField.value).toBe('Sunday');
    });

    it('should handle Saturday (day 6) correctly', async () => {
      const mockReminder = createMockReminder({
        frequency: 'weekly',
        day_of_week: 6,
      });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Weekend fun';
        if (name === 'day') return '6';
        if (name === 'time') return '11:00 AM';
        return null;
      });

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embedJson = replyCall.embeds[0].toJSON();
      const dayField = embedJson.fields.find((f: any) => f.name.includes('Day'));
      expect(dayField.value).toBe('Saturday');
    });

    it('should reject invalid time format for weekly', async () => {
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Test';
        if (name === 'day') return '1';
        if (name === 'time') return '25:00';
        return null;
      });

      await remindCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Invalid time format'),
      });
    });

    it('should add weekly reminder to scheduler', async () => {
      const mockReminder = createMockReminder({ id: 20, frequency: 'weekly', day_of_week: 3 });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Midweek check';
        if (name === 'day') return '3';
        if (name === 'time') return '2:00 PM';
        return null;
      });

      await remindCommand.execute(mockInteraction);

      const scheduler = getScheduler();
      expect(scheduler!.addReminder).toHaveBeenCalledWith(20);
    });
  });

  // ─── "monthly" Subcommand ──────────────────────────────────────────
  describe('Subcommand: monthly', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('monthly');
    });

    it('should create a monthly reminder successfully', async () => {
      const mockReminder = createMockReminder({
        frequency: 'monthly',
        day_of_month: 15,
      });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Pay rent';
        if (name === 'time') return '9:00 AM';
        return null;
      });
      mockInteraction.options.getInteger.mockImplementation((name: string) => {
        if (name === 'day') return 15;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      expect(Reminder.createReminder).toHaveBeenCalledWith(
        'guild456',
        'test-channel-id',
        'Pay rent',
        '09:00',
        'monthly',
        null,
        'user123',
        null,
        15
      );

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embed = replyCall.embeds[0];
      const embedJson = embed.toJSON();
      expect(embedJson.title).toContain('Monthly Reminder Set');
      const scheduleField = embedJson.fields.find((f: any) => f.name.includes('Schedule'));
      expect(scheduleField.value).toContain('15th');
    });

    it('should display correct ordinal suffix for 1st', async () => {
      const mockReminder = createMockReminder({ frequency: 'monthly', day_of_month: 1 });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'First of month';
        if (name === 'time') return '8:00 AM';
        return null;
      });
      mockInteraction.options.getInteger.mockImplementation((name: string) => {
        if (name === 'day') return 1;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embedJson = replyCall.embeds[0].toJSON();
      const scheduleField = embedJson.fields.find((f: any) => f.name.includes('Schedule'));
      expect(scheduleField.value).toContain('1st');
    });

    it('should display correct ordinal suffix for 2nd', async () => {
      const mockReminder = createMockReminder({ frequency: 'monthly', day_of_month: 2 });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Second';
        if (name === 'time') return '8:00 AM';
        return null;
      });
      mockInteraction.options.getInteger.mockImplementation((name: string) => {
        if (name === 'day') return 2;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embedJson = replyCall.embeds[0].toJSON();
      const scheduleField = embedJson.fields.find((f: any) => f.name.includes('Schedule'));
      expect(scheduleField.value).toContain('2nd');
    });

    it('should display correct ordinal suffix for 3rd', async () => {
      const mockReminder = createMockReminder({ frequency: 'monthly', day_of_month: 3 });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Third';
        if (name === 'time') return '8:00 AM';
        return null;
      });
      mockInteraction.options.getInteger.mockImplementation((name: string) => {
        if (name === 'day') return 3;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embedJson = replyCall.embeds[0].toJSON();
      const scheduleField = embedJson.fields.find((f: any) => f.name.includes('Schedule'));
      expect(scheduleField.value).toContain('3rd');
    });

    it('should display correct ordinal suffix for 11th, 12th, 13th', async () => {
      for (const day of [11, 12, 13]) {
        jest.clearAllMocks();
        const mockReminder = createMockReminder({ frequency: 'monthly', day_of_month: day });
        (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
        mockInteraction.options.getString.mockImplementation((name: string) => {
          if (name === 'message') return `Day ${day}`;
          if (name === 'time') return '8:00 AM';
          return null;
        });
        mockInteraction.options.getInteger.mockImplementation((name: string) => {
          if (name === 'day') return day;
          return null;
        });

        await remindCommand.execute(mockInteraction);

        const replyCall = mockInteraction.editReply.mock.calls[0][0];
        const embedJson = replyCall.embeds[0].toJSON();
        const scheduleField = embedJson.fields.find((f: any) => f.name.includes('Schedule'));
        expect(scheduleField.value).toContain(`${day}th`);
      }
    });

    it('should display correct ordinal suffix for 21st, 22nd, 23rd', async () => {
      const expected: Record<number, string> = { 21: '21st', 22: '22nd', 23: '23rd' };
      for (const [day, suffix] of Object.entries(expected)) {
        jest.clearAllMocks();
        const dayNum = parseInt(day);
        const mockReminder = createMockReminder({ frequency: 'monthly', day_of_month: dayNum });
        (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
        mockInteraction.options.getString.mockImplementation((name: string) => {
          if (name === 'message') return `Day ${day}`;
          if (name === 'time') return '8:00 AM';
          return null;
        });
        mockInteraction.options.getInteger.mockImplementation((name: string) => {
          if (name === 'day') return dayNum;
          return null;
        });

        await remindCommand.execute(mockInteraction);

        const replyCall = mockInteraction.editReply.mock.calls[0][0];
        const embedJson = replyCall.embeds[0].toJSON();
        const scheduleField = embedJson.fields.find((f: any) => f.name.includes('Schedule'));
        expect(scheduleField.value).toContain(suffix);
      }
    });

    it('should reject invalid time format for monthly', async () => {
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Test';
        if (name === 'time') return 'noon';
        return null;
      });
      mockInteraction.options.getInteger.mockImplementation((name: string) => {
        if (name === 'day') return 15;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Invalid time format'),
      });
    });

    it('should add monthly reminder to scheduler', async () => {
      const mockReminder = createMockReminder({ id: 30, frequency: 'monthly', day_of_month: 1 });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Monthly check';
        if (name === 'time') return '10:00 AM';
        return null;
      });
      mockInteraction.options.getInteger.mockImplementation((name: string) => {
        if (name === 'day') return 1;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      const scheduler = getScheduler();
      expect(scheduler!.addReminder).toHaveBeenCalledWith(30);
    });
  });

  // ─── "yearly" Subcommand ───────────────────────────────────────────
  describe('Subcommand: yearly', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('yearly');
    });

    it('should create a yearly reminder successfully', async () => {
      const mockReminder = createMockReminder({
        frequency: 'yearly',
        month: 12,
        day_of_month: 25,
      });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Christmas!';
        if (name === 'time') return '8:00 AM';
        return null;
      });
      mockInteraction.options.getInteger.mockImplementation((name: string) => {
        if (name === 'month') return 12;
        if (name === 'day') return 25;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      expect(Reminder.createReminder).toHaveBeenCalledWith(
        'guild456',
        'test-channel-id',
        'Christmas!',
        '08:00',
        'yearly',
        null,
        'user123',
        null,
        25,
        12
      );

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embed = replyCall.embeds[0];
      const embedJson = embed.toJSON();
      expect(embedJson.title).toContain('Yearly Reminder Set');
      const dateField = embedJson.fields.find((f: any) => f.name.includes('Date'));
      expect(dateField.value).toContain('December');
      expect(dateField.value).toContain('25');
    });

    it('should display January 1st correctly', async () => {
      const mockReminder = createMockReminder({
        frequency: 'yearly',
        month: 1,
        day_of_month: 1,
      });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'New Year!';
        if (name === 'time') return '12:00 AM';
        return null;
      });
      mockInteraction.options.getInteger.mockImplementation((name: string) => {
        if (name === 'month') return 1;
        if (name === 'day') return 1;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embedJson = replyCall.embeds[0].toJSON();
      const dateField = embedJson.fields.find((f: any) => f.name.includes('Date'));
      expect(dateField.value).toContain('January');
      expect(dateField.value).toContain('1st');
    });

    it('should reject invalid time format for yearly', async () => {
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Test';
        if (name === 'time') return '13pm';
        return null;
      });
      mockInteraction.options.getInteger.mockImplementation((name: string) => {
        if (name === 'month') return 6;
        if (name === 'day') return 15;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Invalid time format'),
      });
      expect(Reminder.createReminder).not.toHaveBeenCalled();
    });

    it('should add yearly reminder to scheduler', async () => {
      const mockReminder = createMockReminder({
        id: 50,
        frequency: 'yearly',
        month: 7,
        day_of_month: 4,
      });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return '4th of July';
        if (name === 'time') return '10:00 AM';
        return null;
      });
      mockInteraction.options.getInteger.mockImplementation((name: string) => {
        if (name === 'month') return 7;
        if (name === 'day') return 4;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      const scheduler = getScheduler();
      expect(scheduler!.addReminder).toHaveBeenCalledWith(50);
    });

    it('should handle N/A next_trigger for yearly', async () => {
      const mockReminder = createMockReminder({
        frequency: 'yearly',
        month: 3,
        day_of_month: 14,
        next_trigger: null,
      });
      (Reminder.createReminder as jest.Mock).mockResolvedValue(mockReminder);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Pi Day';
        if (name === 'time') return '3:14 PM';
        return null;
      });
      mockInteraction.options.getInteger.mockImplementation((name: string) => {
        if (name === 'month') return 3;
        if (name === 'day') return 14;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embedJson = replyCall.embeds[0].toJSON();
      const nextTriggerField = embedJson.fields.find((f: any) => f.name.includes('Next Trigger'));
      expect(nextTriggerField.value).toBe('N/A');
    });
  });

  // ─── "list" Subcommand ─────────────────────────────────────────────
  describe('Subcommand: list', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('list');
    });

    it('should display empty state when no reminders exist', async () => {
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue([]);

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embedJson = replyCall.embeds[0].toJSON();
      expect(embedJson.title).toContain('No Reminders');
      expect(embedJson.description).toContain("don't have any active reminders");
      // Should have creation buttons
      expect(replyCall.components).toHaveLength(1);
    });

    it('should list all reminders with correct formatting', async () => {
      const reminders = [
        createMockReminder({ id: 1, message: 'Daily standup', frequency: 'daily', time: '09:00' }),
        createMockReminder({
          id: 2,
          message: 'Weekly review',
          frequency: 'weekly',
          day_of_week: 5,
          time: '14:00',
        }),
        createMockReminder({
          id: 3,
          message: 'Monthly report',
          frequency: 'monthly',
          day_of_month: 1,
          time: '10:00',
        }),
      ];
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue(reminders);

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embedJson = replyCall.embeds[0].toJSON();
      expect(embedJson.title).toContain('Your Reminders');
      expect(embedJson.description).toContain('Daily standup');
      expect(embedJson.description).toContain('Weekly review');
      expect(embedJson.description).toContain('Monthly report');
      expect(embedJson.footer.text).toContain('Total: 3 reminders');
    });

    it('should display daily reminders with correct emoji and format', async () => {
      const reminders = [
        createMockReminder({ id: 1, message: 'Daily task', frequency: 'daily', time: '08:00' }),
      ];
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue(reminders);

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embedJson = replyCall.embeds[0].toJSON();
      expect(embedJson.description).toContain('Daily');
    });

    it('should display weekly reminders with day name', async () => {
      const reminders = [
        createMockReminder({
          id: 2,
          message: 'Friday meeting',
          frequency: 'weekly',
          day_of_week: 5,
          time: '15:00',
        }),
      ];
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue(reminders);

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embedJson = replyCall.embeds[0].toJSON();
      expect(embedJson.description).toContain('Weekly (Fri)');
    });

    it('should display monthly reminders with day ordinal', async () => {
      const reminders = [
        createMockReminder({
          id: 3,
          message: 'Rent',
          frequency: 'monthly',
          day_of_month: 1,
          time: '09:00',
        }),
      ];
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue(reminders);

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embedJson = replyCall.embeds[0].toJSON();
      expect(embedJson.description).toContain('Monthly (1st)');
    });

    it('should display yearly reminders with month and day', async () => {
      const reminders = [
        createMockReminder({
          id: 4,
          message: 'Birthday',
          frequency: 'yearly',
          month: 6,
          day_of_month: 15,
          time: '10:00',
        }),
      ];
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue(reminders);

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embedJson = replyCall.embeds[0].toJSON();
      expect(embedJson.description).toContain('Yearly (Jun 15)');
    });

    it('should display one-time reminders correctly', async () => {
      const reminders = [
        createMockReminder({
          id: 5,
          message: 'One time thing',
          frequency: 'once',
          time: '17:00',
        }),
      ];
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue(reminders);

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embedJson = replyCall.embeds[0].toJSON();
      expect(embedJson.description).toContain('One-time');
    });

    it('should handle unknown frequency as raw value', async () => {
      const reminders = [
        createMockReminder({
          id: 6,
          message: 'Unknown type',
          frequency: 'custom' as any,
          time: '12:00',
        }),
      ];
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue(reminders);

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embedJson = replyCall.embeds[0].toJSON();
      expect(embedJson.description).toContain('custom');
    });

    it('should show note when more than 25 reminders exist', async () => {
      const reminders = Array.from({ length: 30 }, (_, i) =>
        createMockReminder({
          id: i + 1,
          message: `Reminder ${i + 1}`,
          frequency: 'daily',
          time: '09:00',
        })
      );
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue(reminders);

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embedJson = replyCall.embeds[0].toJSON();
      const noteField = embedJson.fields?.find((f: any) => f.name.includes('Note'));
      expect(noteField).toBeDefined();
      expect(noteField.value).toContain('Showing 25 of 30');
    });

    it('should include select menu for deletion when reminders <= 25', async () => {
      const reminders = [
        createMockReminder({ id: 1, message: 'Test', frequency: 'daily', time: '09:00' }),
      ];
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue(reminders);

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      // Should have button row + select menu row
      expect(replyCall.components).toHaveLength(2);
    });

    it('should handle N/A next_trigger in list view', async () => {
      const reminders = [
        createMockReminder({
          id: 1,
          message: 'No trigger',
          frequency: 'once',
          time: '09:00',
          next_trigger: null,
        }),
      ];
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue(reminders);

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embedJson = replyCall.embeds[0].toJSON();
      expect(embedJson.description).toContain('N/A');
    });

    it('should truncate long messages in select menu options', async () => {
      const longMessage = 'A'.repeat(50);
      const reminders = [
        createMockReminder({
          id: 1,
          message: longMessage,
          frequency: 'daily',
          time: '09:00',
        }),
      ];
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue(reminders);

      await remindCommand.execute(mockInteraction);

      // The select menu should have been created without error
      expect(mockInteraction.editReply).toHaveBeenCalled();
    });
  });

  // ─── "delete" Subcommand ───────────────────────────────────────────
  describe('Subcommand: delete', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('delete');
    });

    it('should delete a reminder successfully', async () => {
      (Reminder.deleteReminder as jest.Mock).mockResolvedValue(true);
      mockInteraction.options.getInteger.mockImplementation((name: string) => {
        if (name === 'reminder_id') return 5;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      expect(Reminder.deleteReminder).toHaveBeenCalledWith(5, 'guild456');

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      const embedJson = replyCall.embeds[0].toJSON();
      expect(embedJson.title).toContain('Reminder Deleted');
      expect(embedJson.description).toContain('5');
      expect(embedJson.color).toBe(0xff0000);
    });

    it('should report when reminder not found', async () => {
      (Reminder.deleteReminder as jest.Mock).mockResolvedValue(false);
      mockInteraction.options.getInteger.mockImplementation((name: string) => {
        if (name === 'reminder_id') return 999;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('999'),
      });
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('not found'),
      });
    });

    it('should include action buttons after successful deletion', async () => {
      (Reminder.deleteReminder as jest.Mock).mockResolvedValue(true);
      mockInteraction.options.getInteger.mockImplementation((name: string) => {
        if (name === 'reminder_id') return 1;
        return null;
      });

      await remindCommand.execute(mockInteraction);

      const replyCall = mockInteraction.editReply.mock.calls[0][0];
      expect(replyCall.components).toHaveLength(1);
    });
  });

  // ─── Error Handling ────────────────────────────────────────────────
  describe('Error Handling', () => {
    it('should handle errors in me subcommand and use followUp when deferred', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('me');
      mockInteraction.deferred = true;
      mockInteraction.replied = false;
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Test';
        if (name === 'time') return '2:30 PM';
        if (name === 'date') return null;
        return null;
      });
      (Reminder.createReminder as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

      await remindCommand.execute(mockInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in remind command',
        expect.objectContaining({
          error: 'DB connection failed',
          subcommand: 'me',
        })
      );
      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content: expect.stringContaining('error occurred'),
      });
    });

    it('should handle errors when interaction is not deferred/replied (use editReply)', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('daily');
      mockInteraction.deferred = false;
      mockInteraction.replied = false;
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Test';
        if (name === 'time') return '9:00 AM';
        return null;
      });
      (Reminder.createReminder as jest.Mock).mockRejectedValue(new Error('Something broke'));

      await remindCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('error occurred'),
      });
    });

    it('should handle errors when interaction is already replied', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('weekly');
      mockInteraction.replied = true;
      mockInteraction.deferred = false;
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Test';
        if (name === 'day') return '1';
        if (name === 'time') return '10:00 AM';
        return null;
      });
      (Reminder.createReminder as jest.Mock).mockRejectedValue(new Error('Oops'));

      await remindCommand.execute(mockInteraction);

      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content: expect.stringContaining('error occurred'),
      });
    });

    it('should handle non-Error thrown objects', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('me');
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Test';
        if (name === 'time') return '2:30 PM';
        if (name === 'date') return null;
        return null;
      });
      (Reminder.createReminder as jest.Mock).mockRejectedValue('string error');

      await remindCommand.execute(mockInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in remind command',
        expect.objectContaining({
          error: 'Unknown error',
        })
      );
    });

    it('should handle errors in list subcommand', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('list');
      (Reminder.getUserReminders as jest.Mock).mockRejectedValue(new Error('DB error'));

      await remindCommand.execute(mockInteraction);

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle errors in delete subcommand', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('delete');
      mockInteraction.options.getInteger.mockReturnValue(1);
      (Reminder.deleteReminder as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      await remindCommand.execute(mockInteraction);

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle errors in monthly subcommand', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('monthly');
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Test';
        if (name === 'time') return '9:00 AM';
        return null;
      });
      mockInteraction.options.getInteger.mockImplementation((name: string) => {
        if (name === 'day') return 15;
        return null;
      });
      (Reminder.createReminder as jest.Mock).mockRejectedValue(new Error('Monthly error'));

      await remindCommand.execute(mockInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in remind command',
        expect.objectContaining({ subcommand: 'monthly' })
      );
    });

    it('should handle errors in yearly subcommand', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('yearly');
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'message') return 'Test';
        if (name === 'time') return '9:00 AM';
        return null;
      });
      mockInteraction.options.getInteger.mockImplementation((name: string) => {
        if (name === 'month') return 12;
        if (name === 'day') return 25;
        return null;
      });
      (Reminder.createReminder as jest.Mock).mockRejectedValue(new Error('Yearly error'));

      await remindCommand.execute(mockInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in remind command',
        expect.objectContaining({ subcommand: 'yearly' })
      );
    });
  });

  // ─── Autocomplete ──────────────────────────────────────────────────
  describe('Autocomplete Function', () => {
    let mockAutocompleteInteraction: any;

    beforeEach(() => {
      mockAutocompleteInteraction = {
        user: { id: 'user123' },
        guild: { id: 'guild456' },
        options: {
          getFocused: jest.fn().mockReturnValue({ name: 'reminder_id', value: '' }),
        },
        respond: jest.fn().mockResolvedValue({}),
      };
    });

    it('should have autocomplete function defined', () => {
      expect(remindCommand.autocomplete).toBeDefined();
      expect(typeof remindCommand.autocomplete).toBe('function');
    });

    it('should return empty array when no guild', async () => {
      mockAutocompleteInteraction.guild = null;

      await remindCommand.autocomplete(mockAutocompleteInteraction);

      expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([]);
    });

    it('should return filtered reminders for autocomplete', async () => {
      const reminders = [
        createMockReminder({ id: 1, message: 'Daily standup', frequency: 'daily', time: '09:00' }),
        createMockReminder({
          id: 2,
          message: 'Weekly review',
          frequency: 'weekly',
          day_of_week: 5,
          time: '14:00',
        }),
      ];
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue(reminders);
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'reminder_id',
        value: '',
      });

      await remindCommand.autocomplete(mockAutocompleteInteraction);

      expect(Reminder.getUserReminders).toHaveBeenCalledWith('guild456');
      expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ value: 1 }),
          expect.objectContaining({ value: 2 }),
        ])
      );
    });

    it('should filter choices based on user input', async () => {
      const reminders = [
        createMockReminder({ id: 1, message: 'Daily standup', frequency: 'daily', time: '09:00' }),
        createMockReminder({
          id: 2,
          message: 'Weekly review',
          frequency: 'weekly',
          day_of_week: 5,
          time: '14:00',
        }),
      ];
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue(reminders);
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'reminder_id',
        value: 'standup',
      });

      await remindCommand.autocomplete(mockAutocompleteInteraction);

      const respondCall = mockAutocompleteInteraction.respond.mock.calls[0][0];
      expect(respondCall).toHaveLength(1);
      expect(respondCall[0].value).toBe(1);
    });

    it('should filter by reminder ID as well', async () => {
      const reminders = [
        createMockReminder({ id: 1, message: 'First', frequency: 'daily', time: '09:00' }),
        createMockReminder({ id: 2, message: 'Second', frequency: 'daily', time: '10:00' }),
      ];
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue(reminders);
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'reminder_id',
        value: '2',
      });

      await remindCommand.autocomplete(mockAutocompleteInteraction);

      const respondCall = mockAutocompleteInteraction.respond.mock.calls[0][0];
      // Should match #2 by ID
      expect(respondCall.some((c: any) => c.value === 2)).toBe(true);
    });

    it('should truncate long messages in autocomplete', async () => {
      const reminders = [
        createMockReminder({
          id: 1,
          message: 'A'.repeat(50),
          frequency: 'daily',
          time: '09:00',
        }),
      ];
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue(reminders);
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'reminder_id',
        value: '',
      });

      await remindCommand.autocomplete(mockAutocompleteInteraction);

      const respondCall = mockAutocompleteInteraction.respond.mock.calls[0][0];
      expect(respondCall[0].name).toContain('...');
      expect(respondCall[0].name.length).toBeLessThanOrEqual(100);
    });

    it('should display weekly frequency with day name in autocomplete', async () => {
      const reminders = [
        createMockReminder({
          id: 1,
          message: 'Monday meeting',
          frequency: 'weekly',
          day_of_week: 1,
          time: '09:00',
        }),
      ];
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue(reminders);
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'reminder_id',
        value: '',
      });

      await remindCommand.autocomplete(mockAutocompleteInteraction);

      const respondCall = mockAutocompleteInteraction.respond.mock.calls[0][0];
      expect(respondCall[0].name).toContain('Weekly (Mon)');
    });

    it('should display monthly frequency in autocomplete', async () => {
      const reminders = [
        createMockReminder({
          id: 1,
          message: 'Monthly bill',
          frequency: 'monthly',
          day_of_month: 15,
          time: '09:00',
        }),
      ];
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue(reminders);
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'reminder_id',
        value: '',
      });

      await remindCommand.autocomplete(mockAutocompleteInteraction);

      const respondCall = mockAutocompleteInteraction.respond.mock.calls[0][0];
      expect(respondCall[0].name).toContain('Monthly (15)');
    });

    it('should display yearly frequency in autocomplete', async () => {
      const reminders = [
        createMockReminder({
          id: 1,
          message: 'Anniversary',
          frequency: 'yearly',
          month: 6,
          day_of_month: 20,
          time: '09:00',
        }),
      ];
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue(reminders);
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'reminder_id',
        value: '',
      });

      await remindCommand.autocomplete(mockAutocompleteInteraction);

      const respondCall = mockAutocompleteInteraction.respond.mock.calls[0][0];
      expect(respondCall[0].name).toContain('Yearly (Jun 20)');
    });

    it('should handle errors in autocomplete gracefully', async () => {
      (Reminder.getUserReminders as jest.Mock).mockRejectedValue(
        new Error('Autocomplete DB error')
      );
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'reminder_id',
        value: '',
      });

      await remindCommand.autocomplete(mockAutocompleteInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in remind autocomplete',
        expect.objectContaining({ error: 'Autocomplete DB error' })
      );
      expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([]);
    });

    it('should handle non-Error objects in autocomplete error', async () => {
      (Reminder.getUserReminders as jest.Mock).mockRejectedValue('string error');
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'reminder_id',
        value: '',
      });

      await remindCommand.autocomplete(mockAutocompleteInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in remind autocomplete',
        expect.objectContaining({ error: 'Unknown error' })
      );
      expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([]);
    });

    it('should not respond when focused field is not reminder_id', async () => {
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'other_field',
        value: '',
      });

      await remindCommand.autocomplete(mockAutocompleteInteraction);

      expect(Reminder.getUserReminders).not.toHaveBeenCalled();
    });

    it('should limit autocomplete results to 25', async () => {
      const reminders = Array.from({ length: 30 }, (_, i) =>
        createMockReminder({
          id: i + 1,
          message: `Reminder ${i + 1}`,
          frequency: 'daily',
          time: '09:00',
        })
      );
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue(reminders);
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'reminder_id',
        value: '',
      });

      await remindCommand.autocomplete(mockAutocompleteInteraction);

      const respondCall = mockAutocompleteInteraction.respond.mock.calls[0][0];
      expect(respondCall.length).toBeLessThanOrEqual(25);
    });
  });

  // ─── Execute Function ──────────────────────────────────────────────
  describe('Execute Function', () => {
    it('should have execute function defined', () => {
      expect(remindCommand.execute).toBeDefined();
      expect(typeof remindCommand.execute).toBe('function');
    });
  });
});
