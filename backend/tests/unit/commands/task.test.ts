/**
 * Unit tests for /task slash command
 *
 * Tests the Discord slash command for task management:
 * add, list, done, delete, edit subcommands + autocomplete.
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
    },
  },
}));

jest.mock('../../../../supabase/models/Task', () => ({
  __esModule: true,
  default: {
    createTask: jest.fn(),
    getUserTasks: jest.fn(),
    completeTask: jest.fn(),
    deleteTask: jest.fn(),
    editTask: jest.fn(),
  },
}));

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from 'discord.js';
import taskCommand from '../../../commands/task';
import Task from '../../../../supabase/models/Task';
import { logger } from '../../../shared/utils/logger';

describe('/task Slash Command', () => {
  let mockInteraction: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInteraction = {
      user: { id: 'user123' },
      guild: { id: 'guild456' },
      guildId: 'guild456',
      replied: false,
      deferred: true,
      commandName: 'task',
      options: {
        getSubcommand: jest.fn(),
        getString: jest.fn(),
        getInteger: jest.fn(),
      },
      deferReply: jest.fn().mockResolvedValue({}),
      reply: jest.fn().mockResolvedValue({}),
      editReply: jest.fn().mockResolvedValue({}),
      followUp: jest.fn().mockResolvedValue({}),
    };
  });

  // ─── Command Configuration ─────────────────────────────────────────
  describe('Command Configuration', () => {
    it('should have correct command name', () => {
      expect(taskCommand.data).toBeInstanceOf(SlashCommandBuilder);
      expect(taskCommand.data.name).toBe('task');
    });

    it('should have a description', () => {
      expect(taskCommand.data.description).toBe('Manage your tasks');
    });

    it('should have exactly 5 subcommands', () => {
      const commandData = taskCommand.data.toJSON();
      expect(commandData.options).toHaveLength(5);
    });

    it('should have all required subcommands', () => {
      const commandData = taskCommand.data.toJSON();
      const subcommandNames = commandData.options?.map((opt: any) => opt.name) || [];

      expect(subcommandNames).toContain('add');
      expect(subcommandNames).toContain('list');
      expect(subcommandNames).toContain('done');
      expect(subcommandNames).toContain('delete');
      expect(subcommandNames).toContain('edit');
    });

    it('should have add subcommand with description, date, and time options', () => {
      const commandData = taskCommand.data.toJSON();
      const addSubcommand = commandData.options?.find((opt: any) => opt.name === 'add');

      expect(addSubcommand).toBeDefined();
      const optionNames = addSubcommand?.options?.map((opt: any) => opt.name) || [];
      expect(optionNames).toContain('description');
      expect(optionNames).toContain('date');
      expect(optionNames).toContain('time');

      const descOption = addSubcommand?.options?.find((opt: any) => opt.name === 'description');
      expect(descOption?.required).toBe(true);

      const dateOption = addSubcommand?.options?.find((opt: any) => opt.name === 'date');
      expect(dateOption?.required).toBe(false);

      const timeOption = addSubcommand?.options?.find((opt: any) => opt.name === 'time');
      expect(timeOption?.required).toBe(false);
    });

    it('should have list subcommand with optional filter option', () => {
      const commandData = taskCommand.data.toJSON();
      const listSubcommand = commandData.options?.find((opt: any) => opt.name === 'list');

      expect(listSubcommand).toBeDefined();
      const filterOption = listSubcommand?.options?.find((opt: any) => opt.name === 'filter');
      expect(filterOption).toBeDefined();
      expect(filterOption?.required).toBe(false);

      const choiceValues = filterOption?.choices?.map((c: any) => c.value) || [];
      expect(choiceValues).toContain('all');
      expect(choiceValues).toContain('pending');
      expect(choiceValues).toContain('completed');
    });

    it('should have done subcommand with required autocomplete task_id', () => {
      const commandData = taskCommand.data.toJSON();
      const doneSubcommand = commandData.options?.find((opt: any) => opt.name === 'done');

      expect(doneSubcommand).toBeDefined();
      const taskIdOption = doneSubcommand?.options?.find((opt: any) => opt.name === 'task_id');
      expect(taskIdOption).toBeDefined();
      expect(taskIdOption?.required).toBe(true);
      expect(taskIdOption?.autocomplete).toBe(true);
    });

    it('should have edit subcommand with task_id, new_text, date, and time options', () => {
      const commandData = taskCommand.data.toJSON();
      const editSubcommand = commandData.options?.find((opt: any) => opt.name === 'edit');

      expect(editSubcommand).toBeDefined();
      const optionNames = editSubcommand?.options?.map((opt: any) => opt.name) || [];
      expect(optionNames).toContain('task_id');
      expect(optionNames).toContain('new_text');
      expect(optionNames).toContain('date');
      expect(optionNames).toContain('time');
    });

    it('should have execute function defined', () => {
      expect(taskCommand.execute).toBeDefined();
      expect(typeof taskCommand.execute).toBe('function');
    });

    it('should have autocomplete function defined', () => {
      expect(taskCommand.autocomplete).toBeDefined();
      expect(typeof taskCommand.autocomplete).toBe('function');
    });
  });

  // ─── Subcommand: add ───────────────────────────────────────────────
  describe('Subcommand: add', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('add');
    });

    it('should create a task without a due date', async () => {
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'description') return 'Buy groceries';
        return null;
      });

      (Task.createTask as jest.Mock).mockResolvedValue({
        id: 1,
        description: 'Buy groceries',
        due_date: null,
      });

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(Task.createTask).toHaveBeenCalledWith(
        'guild456',
        'Buy groceries',
        undefined,
        'user123'
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining('Task Created'),
                description: expect.stringContaining('Buy groceries'),
                color: 0x00ff00,
              }),
            }),
          ],
        })
      );
    });

    it('should create a task with date and time', async () => {
      mockInteraction.options.getString.mockImplementation((name: string, _required?: boolean) => {
        if (name === 'description') return 'Doctor appointment';
        if (name === 'date') return '03-15-2026';
        if (name === 'time') return '2:30 PM';
        return null;
      });

      (Task.createTask as jest.Mock).mockResolvedValue({
        id: 2,
        description: 'Doctor appointment',
        due_date: new Date(2026, 2, 15, 14, 30),
      });

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(Task.createTask).toHaveBeenCalledWith(
        'guild456',
        'Doctor appointment',
        expect.any(Date),
        'user123'
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Task date parsed successfully',
        expect.objectContaining({
          input: '03-15-2026 2:30 PM',
          parsed: expect.any(String),
        })
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining('Task Created'),
                color: 0x00ff00,
              }),
            }),
          ],
        })
      );
    });

    it('should reject invalid date format', async () => {
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'description') return 'Some task';
        if (name === 'date') return 'not-a-date';
        if (name === 'time') return 'bad-time';
        return null;
      });

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(Task.createTask).not.toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Invalid date/time format'),
        })
      );
    });

    it('should reject when only date is provided without time', async () => {
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'description') return 'Some task';
        if (name === 'date') return '03-15-2026';
        return null;
      });

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(Task.createTask).not.toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Please provide both date and time'),
        })
      );
    });

    it('should reject when only time is provided without date', async () => {
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'description') return 'Some task';
        if (name === 'time') return '2:30 PM';
        return null;
      });

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(Task.createTask).not.toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Please provide both date and time'),
        })
      );
    });

    it('should reject when guild is missing', async () => {
      mockInteraction.guild = null;

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(Task.createTask).not.toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'This command can only be used in a server.',
        })
      );
    });

    it('should include due date field in embed when date is provided', async () => {
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'description') return 'Meeting';
        if (name === 'date') return '06-01-2026';
        if (name === 'time') return '9:00 AM';
        return null;
      });

      (Task.createTask as jest.Mock).mockResolvedValue({
        id: 3,
        description: 'Meeting',
        due_date: new Date(2026, 5, 1, 9, 0),
      });

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = mockInteraction.editReply.mock.calls[0][0];
      const embedData = call.embeds[0].data;
      expect(embedData.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('Due Date'),
          }),
        ])
      );
    });

    it('should include interactive button components', async () => {
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'description') return 'Test task';
        return null;
      });

      (Task.createTask as jest.Mock).mockResolvedValue({
        id: 10,
        description: 'Test task',
        due_date: null,
      });

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = mockInteraction.editReply.mock.calls[0][0];
      expect(call.components).toBeDefined();
      expect(call.components.length).toBeGreaterThan(0);
    });
  });

  // ─── Subcommand: list ──────────────────────────────────────────────
  describe('Subcommand: list', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('list');
    });

    it('should list all tasks with default filter', async () => {
      mockInteraction.options.getString.mockReturnValue(null);

      (Task.getUserTasks as jest.Mock).mockResolvedValue([
        { id: 1, description: 'Task one', completed: false, due_date: null },
        { id: 2, description: 'Task two', completed: true, due_date: null },
      ]);

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(Task.getUserTasks).toHaveBeenCalledWith('guild456', 'all');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining('Tasks'),
                color: 0x0099ff,
              }),
            }),
          ],
        })
      );
    });

    it('should list pending tasks when filter is pending', async () => {
      mockInteraction.options.getString.mockReturnValue('pending');

      (Task.getUserTasks as jest.Mock).mockResolvedValue([
        { id: 1, description: 'Pending task', completed: false, due_date: null },
      ]);

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(Task.getUserTasks).toHaveBeenCalledWith('guild456', 'pending');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining('Pending'),
              }),
            }),
          ],
        })
      );
    });

    it('should list completed tasks when filter is completed', async () => {
      mockInteraction.options.getString.mockReturnValue('completed');

      (Task.getUserTasks as jest.Mock).mockResolvedValue([
        { id: 2, description: 'Done task', completed: true, due_date: null },
      ]);

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(Task.getUserTasks).toHaveBeenCalledWith('guild456', 'completed');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining('Completed'),
              }),
            }),
          ],
        })
      );
    });

    it('should show empty state embed when no tasks found', async () => {
      mockInteraction.options.getString.mockReturnValue(null);

      (Task.getUserTasks as jest.Mock).mockResolvedValue([]);

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining('No Tasks Found'),
                color: 0xffff00,
              }),
            }),
          ],
        })
      );
    });

    it('should display due date and time for tasks that have them', async () => {
      mockInteraction.options.getString.mockReturnValue(null);

      (Task.getUserTasks as jest.Mock).mockResolvedValue([
        {
          id: 1,
          description: 'Task with date',
          completed: false,
          due_date: new Date(2026, 5, 15, 14, 30),
        },
      ]);

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = mockInteraction.editReply.mock.calls[0][0];
      const embedDescription = call.embeds[0].data.description;
      expect(embedDescription).toContain('Task with date');
    });

    it('should show note when more than 25 tasks exist', async () => {
      mockInteraction.options.getString.mockReturnValue(null);

      const manyTasks = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        description: `Task ${i + 1}`,
        completed: false,
        due_date: null,
      }));

      (Task.getUserTasks as jest.Mock).mockResolvedValue(manyTasks);

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = mockInteraction.editReply.mock.calls[0][0];
      const embedData = call.embeds[0].data;
      expect(embedData.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('Note'),
            value: expect.stringContaining('Showing 25 of 30'),
          }),
        ])
      );
    });

    it('should include Quick Complete button when pending tasks exist', async () => {
      mockInteraction.options.getString.mockReturnValue(null);

      (Task.getUserTasks as jest.Mock).mockResolvedValue([
        { id: 1, description: 'Incomplete task', completed: false, due_date: null },
      ]);

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = mockInteraction.editReply.mock.calls[0][0];
      expect(call.components).toBeDefined();
      expect(call.components.length).toBeGreaterThanOrEqual(1);
    });

    it('should include select menu when tasks are 25 or fewer', async () => {
      mockInteraction.options.getString.mockReturnValue(null);

      (Task.getUserTasks as jest.Mock).mockResolvedValue([
        { id: 1, description: 'Task one', completed: false, due_date: null },
        { id: 2, description: 'Task two', completed: true, due_date: null },
      ]);

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = mockInteraction.editReply.mock.calls[0][0];
      // Should have button row + select menu row
      expect(call.components.length).toBe(2);
    });

    it('should show footer with total task count', async () => {
      mockInteraction.options.getString.mockReturnValue(null);

      (Task.getUserTasks as jest.Mock).mockResolvedValue([
        { id: 1, description: 'Task one', completed: false, due_date: null },
        { id: 2, description: 'Task two', completed: false, due_date: null },
        { id: 3, description: 'Task three', completed: true, due_date: null },
      ]);

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = mockInteraction.editReply.mock.calls[0][0];
      const embedData = call.embeds[0].data;
      expect(embedData.footer.text).toContain('Total: 3 tasks');
    });
  });

  // ─── Subcommand: done ──────────────────────────────────────────────
  describe('Subcommand: done', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('done');
    });

    it('should mark a task as complete', async () => {
      mockInteraction.options.getInteger.mockReturnValue(5);

      (Task.completeTask as jest.Mock).mockResolvedValue({
        id: 5,
        description: 'Finished task',
        completed: true,
      });

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(Task.completeTask).toHaveBeenCalledWith(5, 'guild456');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining('Task Completed'),
                color: 0x00ff00,
              }),
            }),
          ],
        })
      );
    });

    it('should show error when task is not found', async () => {
      mockInteraction.options.getInteger.mockReturnValue(999);

      (Task.completeTask as jest.Mock).mockResolvedValue(null);

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Task #999 not found'),
        })
      );
    });

    it('should include status field in success embed', async () => {
      mockInteraction.options.getInteger.mockReturnValue(5);

      (Task.completeTask as jest.Mock).mockResolvedValue({
        id: 5,
        description: 'Done task',
        completed: true,
      });

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = mockInteraction.editReply.mock.calls[0][0];
      const embedData = call.embeds[0].data;
      expect(embedData.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('Status'),
            value: expect.stringContaining('complete'),
          }),
        ])
      );
    });
  });

  // ─── Subcommand: delete ────────────────────────────────────────────
  describe('Subcommand: delete', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('delete');
    });

    it('should delete a task successfully', async () => {
      mockInteraction.options.getInteger.mockReturnValue(7);

      (Task.deleteTask as jest.Mock).mockResolvedValue(true);

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(Task.deleteTask).toHaveBeenCalledWith(7, 'guild456');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining('Task Deleted'),
                color: 0xff0000,
              }),
            }),
          ],
        })
      );
    });

    it('should show error when task is not found', async () => {
      mockInteraction.options.getInteger.mockReturnValue(999);

      (Task.deleteTask as jest.Mock).mockResolvedValue(false);

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Task #999 not found'),
        })
      );
    });

    it('should include interactive buttons after deletion', async () => {
      mockInteraction.options.getInteger.mockReturnValue(7);

      (Task.deleteTask as jest.Mock).mockResolvedValue(true);

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = mockInteraction.editReply.mock.calls[0][0];
      expect(call.components).toBeDefined();
      expect(call.components.length).toBeGreaterThan(0);
    });
  });

  // ─── Subcommand: edit ──────────────────────────────────────────────
  describe('Subcommand: edit', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('edit');
    });

    it('should edit task description successfully', async () => {
      mockInteraction.options.getInteger.mockReturnValue(3);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'new_text') return 'Updated description';
        return null;
      });

      (Task.editTask as jest.Mock).mockResolvedValue({
        id: 3,
        description: 'Updated description',
        due_date: null,
      });

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(Task.editTask).toHaveBeenCalledWith(3, 'guild456', 'Updated description', undefined);
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining('Task Updated'),
                color: 0x0099ff,
              }),
            }),
          ],
        })
      );
    });

    it('should edit task date and time successfully', async () => {
      mockInteraction.options.getInteger.mockReturnValue(3);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'date') return '12-25-2026';
        if (name === 'time') return '10:00 AM';
        return null;
      });

      (Task.editTask as jest.Mock).mockResolvedValue({
        id: 3,
        description: 'Original task',
        due_date: new Date(2026, 11, 25, 10, 0),
      });

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(Task.editTask).toHaveBeenCalledWith(3, 'guild456', null, expect.any(Date));
      expect(logger.info).toHaveBeenCalledWith(
        'Task date parsed successfully',
        expect.objectContaining({
          input: '12-25-2026 10:00 AM',
        })
      );
    });

    it('should edit both description and date simultaneously', async () => {
      mockInteraction.options.getInteger.mockReturnValue(3);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'new_text') return 'New text';
        if (name === 'date') return '01-01-2027';
        if (name === 'time') return '12:00 PM';
        return null;
      });

      (Task.editTask as jest.Mock).mockResolvedValue({
        id: 3,
        description: 'New text',
        due_date: new Date(2027, 0, 1, 12, 0),
      });

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(Task.editTask).toHaveBeenCalledWith(3, 'guild456', 'New text', expect.any(Date));
    });

    it('should reject when no changes are provided', async () => {
      mockInteraction.options.getInteger.mockReturnValue(3);
      mockInteraction.options.getString.mockReturnValue(null);

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(Task.editTask).not.toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Please provide at least one field to update'),
        })
      );
    });

    it('should reject when only date is provided without time', async () => {
      mockInteraction.options.getInteger.mockReturnValue(3);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'date') return '12-25-2026';
        return null;
      });

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(Task.editTask).not.toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Please provide both date and time'),
        })
      );
    });

    it('should reject when only time is provided without date', async () => {
      mockInteraction.options.getInteger.mockReturnValue(3);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'time') return '3:00 PM';
        return null;
      });

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(Task.editTask).not.toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Please provide both date and time'),
        })
      );
    });

    it('should reject invalid date/time format on edit', async () => {
      mockInteraction.options.getInteger.mockReturnValue(3);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'date') return 'bad-date';
        if (name === 'time') return 'bad-time';
        return null;
      });

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(Task.editTask).not.toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Invalid date/time format'),
        })
      );
    });

    it('should show error when task to edit is not found', async () => {
      mockInteraction.options.getInteger.mockReturnValue(999);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'new_text') return 'New description';
        return null;
      });

      (Task.editTask as jest.Mock).mockResolvedValue(null);

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Task #999 not found'),
        })
      );
    });

    it('should include due date field in embed when edited task has a due date', async () => {
      mockInteraction.options.getInteger.mockReturnValue(3);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'new_text') return 'Updated';
        return null;
      });

      (Task.editTask as jest.Mock).mockResolvedValue({
        id: 3,
        description: 'Updated',
        due_date: new Date(2026, 7, 20, 15, 0),
      });

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = mockInteraction.editReply.mock.calls[0][0];
      const embedData = call.embeds[0].data;
      expect(embedData.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('Due Date'),
          }),
        ])
      );
    });

    it('should include interactive button components after edit', async () => {
      mockInteraction.options.getInteger.mockReturnValue(3);
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'new_text') return 'Edited task';
        return null;
      });

      (Task.editTask as jest.Mock).mockResolvedValue({
        id: 3,
        description: 'Edited task',
        due_date: null,
      });

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = mockInteraction.editReply.mock.calls[0][0];
      expect(call.components).toBeDefined();
      expect(call.components.length).toBeGreaterThan(0);
    });
  });

  // ─── Autocomplete ──────────────────────────────────────────────────
  describe('Autocomplete', () => {
    let mockAutocompleteInteraction: any;

    beforeEach(() => {
      mockAutocompleteInteraction = {
        user: { id: 'user123' },
        guild: { id: 'guild456' },
        options: {
          getFocused: jest.fn(),
          getSubcommand: jest.fn(),
        },
        respond: jest.fn().mockResolvedValue({}),
      };
    });

    it('should filter pending tasks for done subcommand', async () => {
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'task_id',
        value: '',
      });
      mockAutocompleteInteraction.options.getSubcommand.mockReturnValue('done');

      (Task.getUserTasks as jest.Mock).mockResolvedValue([
        { id: 1, description: 'Pending task', completed: false, due_date: null },
      ]);

      await taskCommand.autocomplete(mockAutocompleteInteraction as AutocompleteInteraction);

      expect(Task.getUserTasks).toHaveBeenCalledWith('guild456', 'pending');
      expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ value: 1 })])
      );
    });

    it('should filter all tasks for edit subcommand', async () => {
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'task_id',
        value: '',
      });
      mockAutocompleteInteraction.options.getSubcommand.mockReturnValue('edit');

      (Task.getUserTasks as jest.Mock).mockResolvedValue([
        { id: 1, description: 'Task one', completed: false, due_date: null },
        { id: 2, description: 'Task two', completed: true, due_date: null },
      ]);

      await taskCommand.autocomplete(mockAutocompleteInteraction as AutocompleteInteraction);

      expect(Task.getUserTasks).toHaveBeenCalledWith('guild456', 'all');
    });

    it('should filter all tasks for delete subcommand', async () => {
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'task_id',
        value: '',
      });
      mockAutocompleteInteraction.options.getSubcommand.mockReturnValue('delete');

      (Task.getUserTasks as jest.Mock).mockResolvedValue([]);

      await taskCommand.autocomplete(mockAutocompleteInteraction as AutocompleteInteraction);

      expect(Task.getUserTasks).toHaveBeenCalledWith('guild456', 'all');
    });

    it('should limit results to maximum 25 choices', async () => {
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'task_id',
        value: '',
      });
      mockAutocompleteInteraction.options.getSubcommand.mockReturnValue('edit');

      const manyTasks = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        description: `Task ${i + 1}`,
        completed: false,
        due_date: null,
      }));

      (Task.getUserTasks as jest.Mock).mockResolvedValue(manyTasks);

      await taskCommand.autocomplete(mockAutocompleteInteraction as AutocompleteInteraction);

      const respondCall = mockAutocompleteInteraction.respond.mock.calls[0][0];
      expect(respondCall.length).toBeLessThanOrEqual(25);
    });

    it('should filter choices based on user typed value', async () => {
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'task_id',
        value: 'groceries',
      });
      mockAutocompleteInteraction.options.getSubcommand.mockReturnValue('edit');

      (Task.getUserTasks as jest.Mock).mockResolvedValue([
        { id: 1, description: 'Buy groceries', completed: false, due_date: null },
        { id: 2, description: 'Clean house', completed: false, due_date: null },
      ]);

      await taskCommand.autocomplete(mockAutocompleteInteraction as AutocompleteInteraction);

      const respondCall = mockAutocompleteInteraction.respond.mock.calls[0][0];
      expect(respondCall.length).toBe(1);
      expect(respondCall[0].value).toBe(1);
    });

    it('should respond with empty array when guild is missing', async () => {
      mockAutocompleteInteraction.guild = null;
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'task_id',
        value: '',
      });

      await taskCommand.autocomplete(mockAutocompleteInteraction as AutocompleteInteraction);

      expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([]);
      expect(Task.getUserTasks).not.toHaveBeenCalled();
    });

    it('should respond with empty array on error', async () => {
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'task_id',
        value: '',
      });
      mockAutocompleteInteraction.options.getSubcommand.mockReturnValue('done');

      (Task.getUserTasks as jest.Mock).mockRejectedValue(new Error('DB error'));

      await taskCommand.autocomplete(mockAutocompleteInteraction as AutocompleteInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in task autocomplete',
        expect.objectContaining({
          error: 'DB error',
        })
      );
      expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([]);
    });

    it('should truncate long task descriptions to 50 characters', async () => {
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'task_id',
        value: '',
      });
      mockAutocompleteInteraction.options.getSubcommand.mockReturnValue('edit');

      const longDescription = 'A'.repeat(60);
      (Task.getUserTasks as jest.Mock).mockResolvedValue([
        { id: 1, description: longDescription, completed: false, due_date: null },
      ]);

      await taskCommand.autocomplete(mockAutocompleteInteraction as AutocompleteInteraction);

      const respondCall = mockAutocompleteInteraction.respond.mock.calls[0][0];
      // The name should contain the truncated description (47 chars + '...')
      expect(respondCall[0].name).toContain('...');
      expect(respondCall[0].name.length).toBeLessThan(longDescription.length + 20);
    });

    it('should include due date info in autocomplete choice names', async () => {
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'task_id',
        value: '',
      });
      mockAutocompleteInteraction.options.getSubcommand.mockReturnValue('edit');

      (Task.getUserTasks as jest.Mock).mockResolvedValue([
        {
          id: 1,
          description: 'Task with date',
          completed: false,
          due_date: new Date(2026, 5, 15, 14, 30),
        },
      ]);

      await taskCommand.autocomplete(mockAutocompleteInteraction as AutocompleteInteraction);

      const respondCall = mockAutocompleteInteraction.respond.mock.calls[0][0];
      expect(respondCall[0].name).toContain('Due:');
    });

    it('should not respond when focused field is not task_id', async () => {
      mockAutocompleteInteraction.options.getFocused.mockReturnValue({
        name: 'other_field',
        value: '',
      });

      await taskCommand.autocomplete(mockAutocompleteInteraction as AutocompleteInteraction);

      expect(Task.getUserTasks).not.toHaveBeenCalled();
      expect(mockAutocompleteInteraction.respond).not.toHaveBeenCalled();
    });
  });

  // ─── Error Handling ────────────────────────────────────────────────
  describe('Error Handling', () => {
    it('should catch errors and use followUp when already replied/deferred', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('add');
      mockInteraction.options.getString.mockImplementation((name: string) => {
        if (name === 'description') return 'Test task';
        return null; // date and time are null so createTask is called directly
      });
      mockInteraction.deferred = true;
      mockInteraction.replied = false;

      (Task.createTask as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in task command',
        expect.objectContaining({
          command: 'task',
          subcommand: 'add',
          error: 'Database connection failed',
          userId: 'user123',
        })
      );
      expect(mockInteraction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('error occurred'),
        })
      );
    });

    it('should use reply when not yet replied or deferred', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('list');
      mockInteraction.options.getString.mockReturnValue(null);
      mockInteraction.deferred = false;
      mockInteraction.replied = false;

      (Task.getUserTasks as jest.Mock).mockRejectedValue(new Error('Unexpected error'));

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('error occurred'),
        })
      );
      expect(mockInteraction.followUp).not.toHaveBeenCalled();
    });

    it('should use followUp when interaction is already replied', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('done');
      mockInteraction.options.getInteger.mockReturnValue(1);
      mockInteraction.deferred = false;
      mockInteraction.replied = true;

      (Task.completeTask as jest.Mock).mockRejectedValue(new Error('Some error'));

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('error occurred'),
        })
      );
    });

    it('should log stack trace when error has one', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('delete');
      mockInteraction.options.getInteger.mockReturnValue(1);

      const errorWithStack = new Error('Stack trace test');
      (Task.deleteTask as jest.Mock).mockRejectedValue(errorWithStack);

      await taskCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in task command',
        expect.objectContaining({
          error: 'Stack trace test',
          stack: expect.stringContaining('Stack trace test'),
        })
      );
    });
  });
});
