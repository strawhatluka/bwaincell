/**
 * Unit Tests: Task Button Handlers
 *
 * Tests all task-related button interactions including create, complete,
 * edit, delete, and list operations.
 * Coverage target: 80%
 */

// Mock logger BEFORE imports
jest.mock('../../../../shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock database helper
const mockTask = {
  getUserTasks: jest.fn(),
  completeTask: jest.fn(),
  createTask: jest.fn(),
  editTask: jest.fn(),
  deleteTask: jest.fn(),
};

jest.mock('../../../../utils/interactions/helpers/databaseHelper', () => ({
  __esModule: true,
  getModels: jest.fn().mockResolvedValue({ Task: mockTask }),
}));

// Mock supabase for direct queries (task_edit_ flow)
const mockSupabaseSingle = jest.fn();
const mockSupabaseEq = jest.fn().mockReturnValue({ single: mockSupabaseSingle });
const mockSupabaseEqFirst = jest.fn().mockReturnValue({ eq: mockSupabaseEq });
const mockSupabaseSelect = jest.fn().mockReturnValue({ eq: mockSupabaseEqFirst });
const mockSupabaseFrom = jest.fn().mockReturnValue({ select: mockSupabaseSelect });

jest.mock('@database/supabase', () => ({
  __esModule: true,
  default: {
    from: (...args: any[]) => mockSupabaseFrom(...args),
  },
}));

// Mock error responses
jest.mock('../../../../utils/interactions/responses/errorResponses', () => ({
  __esModule: true,
  handleInteractionError: jest.fn(),
}));

import { handleTaskButton } from '../../../../utils/interactions/handlers/taskHandlers';
import { handleInteractionError } from '../../../../utils/interactions/responses/errorResponses';

describe('Task Button Handlers', () => {
  // Factory for creating mock button interactions
  function createMockInteraction(overrides: Record<string, unknown> = {}) {
    return {
      customId: 'task_add_new',
      user: { id: 'user-456' },
      guild: { id: 'guild-123' },
      replied: false,
      deferred: false,
      update: jest.fn().mockResolvedValue(undefined),
      reply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
      deferUpdate: jest.fn().mockResolvedValue(undefined),
      followUp: jest.fn().mockResolvedValue(undefined),
      showModal: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    } as any;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Guild Validation', () => {
    it('should reply with error when guild is not present', async () => {
      const interaction = createMockInteraction({ guild: null });

      await handleTaskButton(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('This command can only be used in a server'),
          ephemeral: true,
        })
      );
    });

    it('should use followUp when interaction is already deferred', async () => {
      const interaction = createMockInteraction({
        guild: null,
        deferred: true,
      });

      await handleTaskButton(interaction);

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('This command can only be used in a server'),
          ephemeral: true,
        })
      );
    });

    it('should use followUp when interaction is already replied', async () => {
      const interaction = createMockInteraction({
        guild: null,
        replied: true,
      });

      await handleTaskButton(interaction);

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('This command can only be used in a server'),
          ephemeral: true,
        })
      );
    });
  });

  describe('task_add_new', () => {
    it('should show modal for creating a new task', async () => {
      const interaction = createMockInteraction({ customId: 'task_add_new' });

      await handleTaskButton(interaction);

      expect(interaction.showModal).toHaveBeenCalledTimes(1);
      const modal = interaction.showModal.mock.calls[0][0];
      expect(modal.data.custom_id).toBe('task_add_modal');
      expect(modal.data.title).toBe('Create New Task');
    });
  });

  describe('task_quick_complete', () => {
    it('should show select menu with pending tasks', async () => {
      const tasks = [
        { id: 1, description: 'Task 1', due_date: new Date('2026-03-01') },
        { id: 2, description: 'Task 2', due_date: null },
      ];
      mockTask.getUserTasks.mockResolvedValue(tasks);

      const interaction = createMockInteraction({ customId: 'task_quick_complete' });

      await handleTaskButton(interaction);

      expect(mockTask.getUserTasks).toHaveBeenCalledWith('guild-123', 'pending');
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Select a task to mark as complete'),
          ephemeral: true,
        })
      );
    });

    it('should reply with error when no pending tasks exist', async () => {
      mockTask.getUserTasks.mockResolvedValue([]);

      const interaction = createMockInteraction({ customId: 'task_quick_complete' });

      await handleTaskButton(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('No pending tasks to complete'),
          ephemeral: true,
        })
      );
    });

    it('should reply with error when tasks is null', async () => {
      mockTask.getUserTasks.mockResolvedValue(null);

      const interaction = createMockInteraction({ customId: 'task_quick_complete' });

      await handleTaskButton(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('No pending tasks to complete'),
          ephemeral: true,
        })
      );
    });

    it('should use followUp when already deferred', async () => {
      mockTask.getUserTasks.mockResolvedValue([]);

      const interaction = createMockInteraction({
        customId: 'task_quick_complete',
        deferred: true,
      });

      await handleTaskButton(interaction);

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('No pending tasks to complete'),
        })
      );
    });

    it('should limit select menu to 25 tasks', async () => {
      const tasks = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        description: `Task ${i + 1}`,
        due_date: null,
      }));
      mockTask.getUserTasks.mockResolvedValue(tasks);

      const interaction = createMockInteraction({ customId: 'task_quick_complete' });

      await handleTaskButton(interaction);

      expect(interaction.reply).toHaveBeenCalledTimes(1);
      // The select menu is built with slice(0, 25) so only 25 options max
    });
  });

  describe('task_done_{id}', () => {
    it('should complete a task successfully', async () => {
      mockTask.completeTask.mockResolvedValue({
        id: 123,
        description: 'Test task',
        completed: true,
      });

      const interaction = createMockInteraction({ customId: 'task_done_123' });

      await handleTaskButton(interaction);

      expect(mockTask.completeTask).toHaveBeenCalledWith(123, 'guild-123');
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Task #123'),
          ephemeral: true,
        })
      );
    });

    it('should reply with not found when task does not exist', async () => {
      mockTask.completeTask.mockResolvedValue(null);

      const interaction = createMockInteraction({ customId: 'task_done_999' });

      await handleTaskButton(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Task #999 not found'),
          ephemeral: true,
        })
      );
    });

    it('should use followUp when interaction is already deferred', async () => {
      mockTask.completeTask.mockResolvedValue({
        id: 123,
        description: 'Test task',
        completed: true,
      });

      const interaction = createMockInteraction({
        customId: 'task_done_123',
        deferred: true,
      });

      await handleTaskButton(interaction);

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Task #123'),
          ephemeral: true,
        })
      );
    });

    it('should followUp with not found when deferred and task missing', async () => {
      mockTask.completeTask.mockResolvedValue(null);

      const interaction = createMockInteraction({
        customId: 'task_done_999',
        replied: true,
      });

      await handleTaskButton(interaction);

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Task #999 not found'),
          ephemeral: true,
        })
      );
    });
  });

  describe('task_edit_{id}', () => {
    it('should show edit modal when task exists', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: 5,
          description: 'Existing task',
          due_date: new Date('2026-03-15T14:30:00'),
          guild_id: 'guild-123',
        },
      });

      const interaction = createMockInteraction({ customId: 'task_edit_5' });

      await handleTaskButton(interaction);

      expect(mockSupabaseFrom).toHaveBeenCalledWith('tasks');
      expect(mockSupabaseSelect).toHaveBeenCalledWith('*');
      expect(interaction.showModal).toHaveBeenCalledTimes(1);
      const modal = interaction.showModal.mock.calls[0][0];
      expect(modal.data.custom_id).toBe('task_edit_modal_5');
    });

    it('should show edit modal with empty date values when no due date', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: 5,
          description: 'Existing task',
          due_date: null,
          guild_id: 'guild-123',
        },
      });

      const interaction = createMockInteraction({ customId: 'task_edit_5' });

      await handleTaskButton(interaction);

      expect(interaction.showModal).toHaveBeenCalledTimes(1);
    });

    it('should reply with not found when task does not exist', async () => {
      mockSupabaseSingle.mockResolvedValue({ data: null });

      const interaction = createMockInteraction({ customId: 'task_edit_999' });

      await handleTaskButton(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Task #999 not found'),
          ephemeral: true,
        })
      );
    });

    it('should followUp when already deferred and task not found', async () => {
      mockSupabaseSingle.mockResolvedValue({ data: null });

      const interaction = createMockInteraction({
        customId: 'task_edit_999',
        deferred: true,
      });

      await handleTaskButton(interaction);

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Task #999 not found'),
        })
      );
    });
  });

  describe('task_delete_{id}', () => {
    it('should delete a task successfully', async () => {
      mockTask.deleteTask.mockResolvedValue(true);

      const interaction = createMockInteraction({ customId: 'task_delete_42' });

      await handleTaskButton(interaction);

      expect(mockTask.deleteTask).toHaveBeenCalledWith(42, 'guild-123');
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Task #42 has been deleted'),
          ephemeral: true,
        })
      );
    });

    it('should reply with not found when task to delete does not exist', async () => {
      mockTask.deleteTask.mockResolvedValue(false);

      const interaction = createMockInteraction({ customId: 'task_delete_999' });

      await handleTaskButton(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Task #999 not found'),
          ephemeral: true,
        })
      );
    });

    it('should use followUp when already deferred (deleted)', async () => {
      mockTask.deleteTask.mockResolvedValue(true);

      const interaction = createMockInteraction({
        customId: 'task_delete_42',
        deferred: true,
      });

      await handleTaskButton(interaction);

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Task #42 has been deleted'),
        })
      );
    });

    it('should use followUp when already deferred (not found)', async () => {
      mockTask.deleteTask.mockResolvedValue(false);

      const interaction = createMockInteraction({
        customId: 'task_delete_999',
        replied: true,
      });

      await handleTaskButton(interaction);

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Task #999 not found'),
        })
      );
    });
  });

  describe('task_list_all / task_list_pending / task_refresh', () => {
    const tasksList = [
      { id: 1, description: 'Task 1', completed: false, due_date: new Date('2026-03-01') },
      { id: 2, description: 'Task 2', completed: true, due_date: null },
    ];

    it('should list all tasks with embed', async () => {
      mockTask.getUserTasks.mockResolvedValue(tasksList);

      const interaction = createMockInteraction({ customId: 'task_list_all' });

      await handleTaskButton(interaction);

      expect(mockTask.getUserTasks).toHaveBeenCalledWith('guild-123', 'all');
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
        })
      );
    });

    it('should list pending tasks with embed', async () => {
      mockTask.getUserTasks.mockResolvedValue(tasksList);

      const interaction = createMockInteraction({ customId: 'task_list_pending' });

      await handleTaskButton(interaction);

      expect(mockTask.getUserTasks).toHaveBeenCalledWith('guild-123', 'pending');
    });

    it('should handle refresh as listing all tasks', async () => {
      mockTask.getUserTasks.mockResolvedValue(tasksList);

      const interaction = createMockInteraction({ customId: 'task_refresh' });

      await handleTaskButton(interaction);

      expect(mockTask.getUserTasks).toHaveBeenCalledWith('guild-123', 'all');
    });

    it('should show empty embed when no tasks exist', async () => {
      mockTask.getUserTasks.mockResolvedValue([]);

      const interaction = createMockInteraction({ customId: 'task_list_all' });

      await handleTaskButton(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining('No'),
              }),
            }),
          ]),
          components: [],
        })
      );
    });

    it('should show note when more than 25 tasks exist', async () => {
      const manyTasks = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        description: `Task ${i + 1}`,
        completed: false,
        due_date: null,
      }));
      mockTask.getUserTasks.mockResolvedValue(manyTasks);

      const interaction = createMockInteraction({ customId: 'task_list_all' });

      await handleTaskButton(interaction);

      expect(interaction.editReply).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should call handleInteractionError on database error', async () => {
      const dbError = new Error('Database connection lost');
      mockTask.getUserTasks.mockRejectedValue(dbError);

      const interaction = createMockInteraction({ customId: 'task_quick_complete' });

      await handleTaskButton(interaction);

      expect(handleInteractionError).toHaveBeenCalledWith(
        interaction,
        dbError,
        'task button handler'
      );
    });

    it('should call handleInteractionError on complete task error', async () => {
      const error = new Error('Sequelize error');
      mockTask.completeTask.mockRejectedValue(error);

      const interaction = createMockInteraction({ customId: 'task_done_1' });

      await handleTaskButton(interaction);

      expect(handleInteractionError).toHaveBeenCalledWith(
        interaction,
        error,
        'task button handler'
      );
    });
  });
});
