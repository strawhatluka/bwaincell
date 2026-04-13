// Tests for Discord commands
// Remove unused import - mockInteraction doesn't exist in our mocks
import { mockTask, mockList, mockNote, mockReminder, mockBudget } from '../mocks/database.mock';

// Create a mock interaction object for testing
const mockInteraction = {
    user: { id: 'user-1', username: 'TestUser' },
    guild: { id: 'guild-1' },
    guildId: 'guild-1',
    options: {
        getSubcommand: jest.fn(),
        getString: jest.fn(),
        getInteger: jest.fn(),
        getBoolean: jest.fn(),
        getNumber: jest.fn()
    },
    reply: jest.fn(),
    deferReply: jest.fn(),
    editReply: jest.fn(),
    followUp: jest.fn(),
    replied: false,
    deferred: false
};

// Mock database models - using relative paths from commands directory
jest.mock('../../supabase/models/Task', () => ({ default: mockTask }));
jest.mock('../../supabase/models/List', () => ({ default: mockList }));
jest.mock('../../supabase/models/Note', () => ({ default: mockNote }));
jest.mock('../../supabase/models/Reminder', () => ({ default: mockReminder }));
jest.mock('../../supabase/models/Budget', () => ({ default: mockBudget }));

// Mock logger
jest.mock('@shared/utils/logger', () => ({
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

describe('Discord Commands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Commands assume interactions are already deferred by bot.ts
    mockInteraction.replied = false;
    mockInteraction.deferred = true; // Pre-deferred by bot
  });

  describe('Task Command', () => {
    let taskCommand: any;

    beforeEach(() => {
      jest.isolateModules(() => {
        taskCommand = require('../../commands/task').default;
      });
    });

    it('should have correct command structure', () => {
      expect(taskCommand.data).toBeDefined();
      expect(taskCommand.data.name).toBe('task');
      expect(taskCommand.data.description).toBeDefined();
      expect(taskCommand.execute).toBeDefined();
    });

    it('should add a new task', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('add');
      mockInteraction.options.getString.mockReturnValue('Test task description');
      mockInteraction.guild = { id: 'guild-1' };

      await taskCommand.execute(mockInteraction);

      expect(mockTask.createTask).toHaveBeenCalledWith(
        'user-1',
        'guild-1',
        'Test task description',
        null
      );

      expect(mockInteraction.editReply).toHaveBeenCalledWith(expect.objectContaining({
        embeds: expect.any(Array),
      }));
    });

    it('should list all tasks', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('list');
      mockInteraction.options.getString.mockReturnValue('all');
      mockInteraction.guild = { id: 'guild-1' };

      await taskCommand.execute(mockInteraction);

      expect(mockTask.getUserTasks).toHaveBeenCalledWith(
        'user-1',
        'guild-1',
        'all'
      );

      expect(mockInteraction.editReply).toHaveBeenCalled();
    });

    it('should mark task as done', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('done');
      mockInteraction.options.getInteger.mockReturnValue(1);
      mockInteraction.guild = { id: 'guild-1' };

      await taskCommand.execute(mockInteraction);

      expect(mockTask.completeTask).toHaveBeenCalledWith(
        1,
        'user-1',
        'guild-1'
      );

      expect(mockInteraction.editReply).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('add');
      mockInteraction.options.getString.mockReturnValue('Test task');
      mockInteraction.guild = { id: 'guild-1' };
      mockTask.createTask.mockRejectedValue(new Error('Database error'));

      await taskCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(expect.objectContaining({
        content: expect.stringContaining('error'),
      }));
    });
  });

  describe('List Command', () => {
    let listCommand: any;

    beforeEach(() => {
      jest.isolateModules(() => {
        listCommand = require('../../commands/list').default;
      });
    });

    it('should have correct command structure', () => {
      expect(listCommand.data).toBeDefined();
      expect(listCommand.data.name).toBe('list');
      expect(listCommand.execute).toBeDefined();
    });

    it('should create a new list', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('create');
      mockInteraction.options.getString.mockReturnValue('Shopping List');
      mockInteraction.guild = { id: 'guild-1' };

      await listCommand.execute(mockInteraction);

      expect(mockList.createList).toHaveBeenCalledWith(
        'user-1',
        'guild-1',
        'Shopping List'
      );

      expect(mockInteraction.editReply).toHaveBeenCalled();
    });

    it('should show all lists', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('all');
      mockInteraction.guild = { id: 'guild-1' };

      await listCommand.execute(mockInteraction);

      expect(mockList.getUserLists).toHaveBeenCalledWith(
        'user-1',
        'guild-1'
      );

      expect(mockInteraction.editReply).toHaveBeenCalled();
    });

    it('should delete a list', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('delete');
      mockInteraction.options.getString.mockReturnValue('Shopping List');
      mockInteraction.guild = { id: 'guild-1' };

      await listCommand.execute(mockInteraction);

      expect(mockList.deleteList).toHaveBeenCalledWith(
        'user-1',
        'guild-1',
        'Shopping List'
      );

      expect(mockInteraction.editReply).toHaveBeenCalled();
    });
  });

  describe('Note Command', () => {
    let noteCommand: any;

    beforeEach(() => {
      jest.isolateModules(() => {
        noteCommand = require('../../commands/note').default;
      });
    });

    it('should have correct command structure', () => {
      expect(noteCommand.data).toBeDefined();
      expect(noteCommand.data.name).toBe('note');
      expect(noteCommand.execute).toBeDefined();
    });

    it('should add a new note', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('add');
      mockInteraction.options.getString.mockImplementation((name: any) => {
        if (name === 'title') return 'Test Note';
        if (name === 'content') return 'Note content';
        if (name === 'tags') return null;
        return null;
      });
      mockInteraction.guild = { id: 'guild-1' };

      await noteCommand.execute(mockInteraction);

      expect(mockNote.createNote).toHaveBeenCalledWith(
        'user-1',
        'guild-1',
        'Test Note',
        'Note content',
        []
      );

      expect(mockInteraction.editReply).toHaveBeenCalled();
    });

    it('should list all notes', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('list');
      mockInteraction.guild = { id: 'guild-1' };

      await noteCommand.execute(mockInteraction);

      expect(mockNote.getNotes).toHaveBeenCalledWith(
        'user-1',
        'guild-1'
      );

      expect(mockInteraction.editReply).toHaveBeenCalled();
    });

    it('should get a specific note', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('get');
      mockInteraction.options.getInteger.mockReturnValue(1);
      mockInteraction.guild = { id: 'guild-1' };

      mockNote.getNote.mockResolvedValue({
        id: 1,
        title: 'Test Note',
        content: 'Note content',
      });

      await noteCommand.execute(mockInteraction);

      expect(mockNote.getNote).toHaveBeenCalledWith(
        1,
        'user-1',
        'guild-1'
      );

      expect(mockInteraction.editReply).toHaveBeenCalled();
    });
  });

  describe('Reminder Command', () => {
    let reminderCommand: any;

    beforeEach(() => {
      jest.isolateModules(() => {
        reminderCommand = require('../../commands/remind').default;
      });
    });

    it('should have correct command structure', () => {
      expect(reminderCommand.data).toBeDefined();
      expect(reminderCommand.data.name).toBe('remind');
      expect(reminderCommand.execute).toBeDefined();
    });

    it('should set a reminder', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('set');
      mockInteraction.options.getString.mockImplementation((name: any) => {
        if (name === 'message') return 'Test reminder';
        if (name === 'time') return '10:00';
        if (name === 'type') return 'once';
        if (name === 'days') return null;
        return null;
      });
      mockInteraction.guild = { id: 'guild-1' };

      await reminderCommand.execute(mockInteraction);

      expect(mockReminder.createReminder).toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalled();
    });

    it('should list reminders', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('list');
      mockInteraction.guild = { id: 'guild-1' };

      await reminderCommand.execute(mockInteraction);

      expect(mockReminder.getUserReminders).toHaveBeenCalledWith(
        'user-1',
        'guild-1'
      );

      expect(mockInteraction.editReply).toHaveBeenCalled();
    });
  });

  describe('Budget Command', () => {
    let budgetCommand: any;

    beforeEach(() => {
      jest.isolateModules(() => {
        budgetCommand = require('../../commands/budget').default;
      });
    });

    it('should have correct command structure', () => {
      expect(budgetCommand.data).toBeDefined();
      expect(budgetCommand.data.name).toBe('budget');
      expect(budgetCommand.execute).toBeDefined();
    });

    it('should add an expense', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('expense');
      (mockInteraction.options as any).getNumber = jest.fn().mockReturnValue(50.00);
      mockInteraction.options.getString.mockImplementation((name: any) => {
        if (name === 'category') return 'food';
        if (name === 'description') return 'Groceries';
        return null;
      });
      mockInteraction.guild = { id: 'guild-1' };

      await budgetCommand.execute(mockInteraction);

      expect(mockBudget.addExpense).toHaveBeenCalledWith(
        'user-1',
        'guild-1',
        'food',
        50.00,
        'Groceries'
      );

      expect(mockInteraction.editReply).toHaveBeenCalled();
    });

    it('should show budget summary', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('summary');
      mockInteraction.options.getInteger = jest.fn().mockReturnValue(null);
      mockInteraction.guild = { id: 'guild-1' };

      await budgetCommand.execute(mockInteraction);

      expect(mockBudget.getSummary).toHaveBeenCalledWith(
        'user-1',
        'guild-1',
        null
      );

      expect(mockInteraction.editReply).toHaveBeenCalled();
    });

    it('should calculate total expenses', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('summary');
      mockInteraction.options.getInteger = jest.fn().mockReturnValue(null);
      mockInteraction.guild = { id: 'guild-1' };

      await budgetCommand.execute(mockInteraction);

      expect(mockBudget.getSummary).toHaveBeenCalledWith(
        'user-1',
        'guild-1',
        null
      );

      expect(mockInteraction.editReply).toHaveBeenCalled();
    });
  });

  describe('Command Error Handling', () => {
    it('should handle missing subcommands gracefully', async () => {
      const taskCommand = require('../../commands/task').default;
      mockInteraction.options.getSubcommand.mockReturnValue('add');
      mockInteraction.options.getString.mockReturnValue(null); // Invalid input
      mockInteraction.guild = null; // Missing guild

      await taskCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(expect.objectContaining({
        content: expect.stringContaining('This command can only be used in a server'),
      }));
    });

    it('should handle database connection errors', async () => {
      const listCommand = require('../../commands/list').default;
      mockInteraction.options.getSubcommand.mockReturnValue('all');
      mockInteraction.guild = { id: 'guild-1' };
      mockList.getUserLists.mockRejectedValue(new Error('Database connection failed'));

      await listCommand.execute(mockInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(expect.objectContaining({
        content: expect.stringContaining('error'),
      }));
    });
  });
});
