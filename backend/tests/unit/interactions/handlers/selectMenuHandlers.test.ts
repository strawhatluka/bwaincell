/**
 * Unit Tests: Select Menu Handlers
 *
 * Tests all select menu interaction routing including task quick action,
 * task complete select, reminder quick delete, list complete select,
 * list select view, and list quick select.
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

// Mock database models
const mockTask = {
  completeTask: jest.fn(),
};

const mockList = {
  getList: jest.fn(),
  toggleItem: jest.fn(),
};

const mockReminder = {
  deleteReminder: jest.fn(),
};

jest.mock('../../../../utils/interactions/helpers/databaseHelper', () => ({
  __esModule: true,
  getModels: jest.fn().mockResolvedValue({
    Task: mockTask,
    List: mockList,
    Reminder: mockReminder,
  }),
}));

// Mock supabase for direct queries (task_quick_action, list_quick_select)
const mockSupabaseSingle = jest.fn();
const mockSupabaseEq = jest.fn().mockReturnValue({ single: mockSupabaseSingle });
const mockSupabaseEqFirst = jest.fn().mockReturnValue({ eq: mockSupabaseEq });
const mockSupabaseSelect = jest.fn().mockReturnValue({ eq: mockSupabaseEqFirst });
const mockSupabaseFrom = jest.fn().mockReturnValue({ select: mockSupabaseSelect });

jest.mock('../../../../../supabase/supabase', () => ({
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

import { handleSelectMenuInteraction } from '../../../../utils/interactions/handlers/selectMenuHandlers';
import { handleInteractionError } from '../../../../utils/interactions/responses/errorResponses';

describe('Select Menu Handlers', () => {
  function createMockSelectInteraction(overrides: Record<string, unknown> = {}) {
    return {
      customId: 'task_quick_action',
      values: ['1'],
      user: { id: 'user-456' },
      guild: { id: 'guild-123' },
      replied: false,
      deferred: false,
      update: jest.fn().mockResolvedValue(undefined),
      reply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
      deferUpdate: jest.fn().mockResolvedValue(undefined),
      followUp: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    } as any;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Guild Validation', () => {
    it('should reply with error when guild is not present (not deferred)', async () => {
      const interaction = createMockSelectInteraction({ guild: null, deferred: false });

      await handleSelectMenuInteraction(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('This command can only be used in a server'),
        })
      );
    });

    it('should editReply when deferred and no guild', async () => {
      const interaction = createMockSelectInteraction({ guild: null, deferred: true });

      await handleSelectMenuInteraction(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('This command can only be used in a server'),
        })
      );
    });
  });

  describe('task_quick_action', () => {
    it('should display task details with action buttons', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: 1,
          description: 'Test task',
          completed: false,
          due_date: new Date('2026-03-01'),
          guild_id: 'guild-123',
        },
      });

      const interaction = createMockSelectInteraction({
        customId: 'task_quick_action',
        values: ['1'],
      });

      await handleSelectMenuInteraction(interaction);

      expect(mockSupabaseFrom).toHaveBeenCalledWith('tasks');
      expect(mockSupabaseSelect).toHaveBeenCalledWith('*');
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
        })
      );
    });

    it('should display completed task with disabled done button', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: 1,
          description: 'Completed task',
          completed: true,
          due_date: null,
          guild_id: 'guild-123',
        },
      });

      const interaction = createMockSelectInteraction({
        customId: 'task_quick_action',
        values: ['1'],
      });

      await handleSelectMenuInteraction(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
        })
      );
    });

    it('should reply with not found when task does not exist', async () => {
      mockSupabaseSingle.mockResolvedValue({ data: null });

      const interaction = createMockSelectInteraction({
        customId: 'task_quick_action',
        values: ['999'],
      });

      await handleSelectMenuInteraction(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Task not found'),
        })
      );
    });
  });

  describe('task_complete_select', () => {
    it('should complete task successfully', async () => {
      mockTask.completeTask.mockResolvedValue({
        id: 5,
        description: 'Complete this',
        completed: true,
      });

      const interaction = createMockSelectInteraction({
        customId: 'task_complete_select',
        values: ['5'],
      });

      await handleSelectMenuInteraction(interaction);

      expect(mockTask.completeTask).toHaveBeenCalledWith(5, 'guild-123');
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Task #5'),
        })
      );
    });

    it('should reply with not found when task to complete does not exist', async () => {
      mockTask.completeTask.mockResolvedValue(null);

      const interaction = createMockSelectInteraction({
        customId: 'task_complete_select',
        values: ['999'],
      });

      await handleSelectMenuInteraction(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Task #999 not found'),
        })
      );
    });
  });

  describe('reminder_quick_delete', () => {
    it('should delete reminder successfully', async () => {
      mockReminder.deleteReminder.mockResolvedValue(true);

      const interaction = createMockSelectInteraction({
        customId: 'reminder_quick_delete',
        values: ['10'],
      });

      await handleSelectMenuInteraction(interaction);

      expect(mockReminder.deleteReminder).toHaveBeenCalledWith(10, 'guild-123');
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Reminder #10 has been cancelled'),
        })
      );
    });

    it('should reply with not found when reminder does not exist', async () => {
      mockReminder.deleteReminder.mockResolvedValue(false);

      const interaction = createMockSelectInteraction({
        customId: 'reminder_quick_delete',
        values: ['999'],
      });

      await handleSelectMenuInteraction(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Reminder #999 not found'),
        })
      );
    });
  });

  describe('list_complete_select_{name}', () => {
    it('should mark list item as complete', async () => {
      mockList.getList
        .mockResolvedValueOnce({
          name: 'Groceries',
          items: [
            { text: 'Milk', completed: false },
            { text: 'Bread', completed: true },
            { text: 'Eggs', completed: false },
          ],
          guild_id: 'guild-123',
        })
        .mockResolvedValueOnce({
          name: 'Groceries',
          items: [
            { text: 'Milk', completed: true },
            { text: 'Bread', completed: true },
            { text: 'Eggs', completed: false },
          ],
          guild_id: 'guild-123',
        });

      mockList.toggleItem.mockResolvedValue(true);

      const interaction = createMockSelectInteraction({
        customId: 'list_complete_select_Groceries',
        values: ['0'],
      });

      await handleSelectMenuInteraction(interaction);

      expect(mockList.getList).toHaveBeenCalledWith('guild-123', 'Groceries');
      expect(mockList.toggleItem).toHaveBeenCalledWith('guild-123', 'Groceries', 'Milk');
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Marked "Milk" as complete'),
          embeds: expect.any(Array),
          components: expect.any(Array),
        })
      );
    });

    it('should reply with not found when list does not exist', async () => {
      mockList.getList.mockResolvedValue(null);

      const interaction = createMockSelectInteraction({
        customId: 'list_complete_select_nonexistent',
        values: ['0'],
      });

      await handleSelectMenuInteraction(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not found'),
          components: [],
        })
      );
    });

    it('should reply with not found when selected index exceeds items', async () => {
      mockList.getList.mockResolvedValue({
        name: 'Groceries',
        items: [{ text: 'Milk', completed: false }],
        guild_id: 'guild-123',
      });

      const interaction = createMockSelectInteraction({
        customId: 'list_complete_select_Groceries',
        values: ['5'],
      });

      await handleSelectMenuInteraction(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Selected item not found'),
          components: [],
        })
      );
    });

    it('should reply with failure when toggleItem returns falsy', async () => {
      mockList.getList.mockResolvedValue({
        name: 'Groceries',
        items: [{ text: 'Milk', completed: false }],
        guild_id: 'guild-123',
      });

      mockList.toggleItem.mockResolvedValue(null);

      const interaction = createMockSelectInteraction({
        customId: 'list_complete_select_Groceries',
        values: ['0'],
      });

      await handleSelectMenuInteraction(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Failed to mark item as complete'),
          components: [],
        })
      );
    });

    it('should handle case where updated list is null after toggle', async () => {
      mockList.getList
        .mockResolvedValueOnce({
          name: 'Groceries',
          items: [{ text: 'Milk', completed: false }],
          guild_id: 'guild-123',
        })
        .mockResolvedValueOnce(null);

      mockList.toggleItem.mockResolvedValue(true);

      const interaction = createMockSelectInteraction({
        customId: 'list_complete_select_Groceries',
        values: ['0'],
      });

      await handleSelectMenuInteraction(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Marked "Milk" as complete'),
          components: [],
        })
      );
    });
  });

  describe('list_select_view', () => {
    it('should display selected list with items', async () => {
      mockList.getList.mockResolvedValue({
        name: 'Groceries',
        items: [
          { text: 'Milk', completed: false },
          { text: 'Bread', completed: true },
        ],
        guild_id: 'guild-123',
      });

      const interaction = createMockSelectInteraction({
        customId: 'list_select_view',
        values: ['Groceries_0'],
      });

      await handleSelectMenuInteraction(interaction);

      expect(mockList.getList).toHaveBeenCalledWith('guild-123', 'Groceries');
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
        })
      );
    });

    it('should show empty list message', async () => {
      mockList.getList.mockResolvedValue({
        name: 'Groceries',
        items: [],
        guild_id: 'guild-123',
      });

      const interaction = createMockSelectInteraction({
        customId: 'list_select_view',
        values: ['Groceries_0'],
      });

      await handleSelectMenuInteraction(interaction);

      expect(interaction.editReply).toHaveBeenCalledTimes(1);
    });

    it('should reply with not found when list does not exist', async () => {
      mockList.getList.mockResolvedValue(null);

      const interaction = createMockSelectInteraction({
        customId: 'list_select_view',
        values: ['nonexistent_0'],
      });

      await handleSelectMenuInteraction(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('List not found'),
        })
      );
    });
  });

  describe('list_quick_select', () => {
    it('should display selected list by id', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: 5,
          name: 'Groceries',
          items: [{ text: 'Milk', completed: false }],
          guild_id: 'guild-123',
        },
      });

      const interaction = createMockSelectInteraction({
        customId: 'list_quick_select',
        values: ['5'],
      });

      await handleSelectMenuInteraction(interaction);

      expect(mockSupabaseFrom).toHaveBeenCalledWith('lists');
      expect(mockSupabaseSelect).toHaveBeenCalledWith('*');
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
        })
      );
    });

    it('should reply with not found when list id does not exist', async () => {
      mockSupabaseSingle.mockResolvedValue({ data: null });

      const interaction = createMockSelectInteraction({
        customId: 'list_quick_select',
        values: ['999'],
      });

      await handleSelectMenuInteraction(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('List not found'),
        })
      );
    });

    it('should handle empty list items with null', async () => {
      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: 5,
          name: 'Groceries',
          items: null,
          guild_id: 'guild-123',
        },
      });

      const interaction = createMockSelectInteraction({
        customId: 'list_quick_select',
        values: ['5'],
      });

      await handleSelectMenuInteraction(interaction);

      expect(interaction.editReply).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should call handleInteractionError on database error', async () => {
      const dbError = new Error('Connection failed');
      mockSupabaseSingle.mockRejectedValue(dbError);

      const interaction = createMockSelectInteraction({
        customId: 'task_quick_action',
        values: ['1'],
      });

      await handleSelectMenuInteraction(interaction);

      expect(handleInteractionError).toHaveBeenCalledWith(
        interaction,
        dbError,
        'select menu handler'
      );
    });
  });
});
