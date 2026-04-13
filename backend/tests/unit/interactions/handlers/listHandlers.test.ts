/**
 * Unit Tests: List Button Handlers
 *
 * Tests all list-related button interactions including add item, view,
 * mark complete, toggle item, clear completed, delete, and cancel operations.
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
const mockList = {
  findOne: jest.fn(),
  findAll: jest.fn(),
  createList: jest.fn(),
  addItem: jest.fn(),
  removeItem: jest.fn(),
  getList: jest.fn(),
  getUserLists: jest.fn(),
  clearCompleted: jest.fn(),
  deleteList: jest.fn(),
  toggleItem: jest.fn(),
};

jest.mock('../../../../utils/interactions/helpers/databaseHelper', () => ({
  __esModule: true,
  getModels: jest.fn().mockResolvedValue({ List: mockList }),
}));

// Mock error responses
jest.mock('../../../../utils/interactions/responses/errorResponses', () => ({
  __esModule: true,
  handleInteractionError: jest.fn(),
}));

import { handleListButton } from '../../../../utils/interactions/handlers/listHandlers';
import { handleInteractionError } from '../../../../utils/interactions/responses/errorResponses';

describe('List Button Handlers', () => {
  function createMockInteraction(overrides: Record<string, unknown> = {}) {
    return {
      customId: 'list_view_groceries',
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

      await handleListButton(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('This command can only be used in a server'),
        })
      );
    });

    it('should use followUp when already deferred and no guild', async () => {
      const interaction = createMockInteraction({ guild: null, deferred: true });

      await handleListButton(interaction);

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('This command can only be used in a server'),
        })
      );
    });
  });

  describe('list_add_{name} - Show Modal', () => {
    it('should show add item modal', async () => {
      const interaction = createMockInteraction({ customId: 'list_add_groceries' });

      await handleListButton(interaction);

      expect(interaction.showModal).toHaveBeenCalledTimes(1);
      const modal = interaction.showModal.mock.calls[0][0];
      expect(modal.data.custom_id).toContain('list_add_item_modal_');
      expect(modal.data.title).toContain('Add Item to groceries');
    });

    it('should encode list name in modal custom ID', async () => {
      const interaction = createMockInteraction({ customId: 'list_add_my list' });

      await handleListButton(interaction);

      expect(interaction.showModal).toHaveBeenCalledTimes(1);
      const modal = interaction.showModal.mock.calls[0][0];
      expect(modal.data.custom_id).toContain('list_add_item_modal_');
    });
  });

  describe('list_view_{name}', () => {
    it('should display list with items', async () => {
      mockList.getList.mockResolvedValue({
        name: 'Groceries',
        items: [
          { text: 'Milk', completed: false },
          { text: 'Bread', completed: true },
        ],
        guild_id: 'guild-123',
      });

      const interaction = createMockInteraction({ customId: 'list_view_groceries' });

      await handleListButton(interaction);

      expect(mockList.getList).toHaveBeenCalledWith('guild-123', 'groceries');
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
        })
      );
    });

    it('should display empty list message', async () => {
      mockList.getList.mockResolvedValue({
        name: 'Groceries',
        items: [],
        guild_id: 'guild-123',
      });

      const interaction = createMockInteraction({ customId: 'list_view_groceries' });

      await handleListButton(interaction);

      expect(interaction.reply).toHaveBeenCalledTimes(1);
    });

    it('should display empty list message when items is null', async () => {
      mockList.getList.mockResolvedValue({
        name: 'Groceries',
        items: null,
        guild_id: 'guild-123',
      });

      const interaction = createMockInteraction({ customId: 'list_view_groceries' });

      await handleListButton(interaction);

      expect(interaction.reply).toHaveBeenCalledTimes(1);
    });

    it('should reply with not found when list does not exist', async () => {
      mockList.getList.mockResolvedValue(null);

      const interaction = createMockInteraction({ customId: 'list_view_nonexistent' });

      await handleListButton(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not found'),
        })
      );
    });

    it('should use followUp when deferred and list not found', async () => {
      mockList.getList.mockResolvedValue(null);

      const interaction = createMockInteraction({
        customId: 'list_view_nonexistent',
        deferred: true,
      });

      await handleListButton(interaction);

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not found'),
        })
      );
    });

    it('should match list name case-insensitively', async () => {
      mockList.getList.mockResolvedValue({
        name: 'Groceries',
        items: [{ text: 'Milk', completed: false }],
        guild_id: 'guild-123',
      });

      const interaction = createMockInteraction({ customId: 'list_view_groceries' });

      await handleListButton(interaction);

      expect(interaction.reply).toHaveBeenCalledTimes(1);
    });
  });

  describe('list_mark_complete_{name}', () => {
    it('should show select menu with incomplete items', async () => {
      mockList.getList.mockResolvedValue({
        name: 'Groceries',
        items: [
          { text: 'Milk', completed: false },
          { text: 'Bread', completed: true },
          { text: 'Eggs', completed: false },
        ],
        guild_id: 'guild-123',
      });

      const interaction = createMockInteraction({ customId: 'list_mark_complete_Groceries' });

      await handleListButton(interaction);

      expect(mockList.getList).toHaveBeenCalledWith('guild-123', 'Groceries');
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Select an item'),
          components: expect.any(Array),
        })
      );
    });

    it('should reply with not found when list does not exist', async () => {
      mockList.getList.mockResolvedValue(null);

      const interaction = createMockInteraction({ customId: 'list_mark_complete_nonexistent' });

      await handleListButton(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not found'),
        })
      );
    });

    it('should indicate all items already completed', async () => {
      mockList.getList.mockResolvedValue({
        name: 'Groceries',
        items: [
          { text: 'Milk', completed: true },
          { text: 'Bread', completed: true },
        ],
        guild_id: 'guild-123',
      });

      const interaction = createMockInteraction({ customId: 'list_mark_complete_Groceries' });

      await handleListButton(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('All items are already completed'),
        })
      );
    });

    it('should use editReply when deferred and all items completed', async () => {
      mockList.getList.mockResolvedValue({
        name: 'Groceries',
        items: [{ text: 'Milk', completed: true }],
        guild_id: 'guild-123',
      });

      const interaction = createMockInteraction({
        customId: 'list_mark_complete_Groceries',
        deferred: true,
      });

      await handleListButton(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('All items are already completed'),
        })
      );
    });
  });

  describe('list_toggle_item_{name}_{index}', () => {
    it('should toggle item completion status', async () => {
      const mockListData = {
        name: 'Groceries',
        items: [
          { text: 'Milk', completed: false },
          { text: 'Bread', completed: true },
        ],
        guild_id: 'guild-123',
      };

      mockList.getList.mockResolvedValueOnce(mockListData).mockResolvedValueOnce({
        ...mockListData,
        items: [
          { text: 'Milk', completed: true },
          { text: 'Bread', completed: true },
        ],
      });

      mockList.toggleItem.mockResolvedValue(true);

      const interaction = createMockInteraction({ customId: 'list_toggle_item_Groceries_0' });

      await handleListButton(interaction);

      expect(mockList.toggleItem).toHaveBeenCalledWith('guild-123', 'Groceries', 'Milk');
      expect(interaction.update).toHaveBeenCalledTimes(1);
    });

    it('should reply with not found when list or item does not exist', async () => {
      mockList.getList.mockResolvedValue(null);

      const interaction = createMockInteraction({ customId: 'list_toggle_item_Groceries_0' });

      await handleListButton(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not found'),
        })
      );
    });

    it('should handle item index out of range', async () => {
      mockList.getList.mockResolvedValue({
        name: 'Groceries',
        items: [{ text: 'Milk', completed: false }],
        guild_id: 'guild-123',
      });

      const interaction = createMockInteraction({ customId: 'list_toggle_item_Groceries_5' });

      await handleListButton(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not found'),
        })
      );
    });

    it('should handle error when updated list cannot be fetched', async () => {
      mockList.getList
        .mockResolvedValueOnce({
          name: 'Groceries',
          items: [{ text: 'Milk', completed: false }],
          guild_id: 'guild-123',
        })
        .mockResolvedValueOnce(null);

      mockList.toggleItem.mockResolvedValue(true);

      const interaction = createMockInteraction({ customId: 'list_toggle_item_Groceries_0' });

      await handleListButton(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Error refreshing list'),
        })
      );
    });

    it('should use editReply when deferred', async () => {
      mockList.getList.mockResolvedValue(null);

      const interaction = createMockInteraction({
        customId: 'list_toggle_item_Groceries_0',
        deferred: true,
      });

      await handleListButton(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not found'),
        })
      );
    });

    it('should parse list names with underscores correctly', async () => {
      const mockListData = {
        name: 'my_shopping_list',
        items: [{ text: 'Apples', completed: false }],
        guild_id: 'guild-123',
      };

      mockList.getList.mockResolvedValueOnce(mockListData).mockResolvedValueOnce({
        ...mockListData,
        items: [{ text: 'Apples', completed: true }],
      });

      mockList.toggleItem.mockResolvedValue(true);

      const interaction = createMockInteraction({
        customId: 'list_toggle_item_my_shopping_list_0',
      });

      await handleListButton(interaction);

      expect(mockList.getList).toHaveBeenCalledWith('guild-123', 'my_shopping_list');
    });
  });

  describe('list_clear_completed_{name}', () => {
    it('should clear completed items', async () => {
      mockList.clearCompleted.mockResolvedValue({
        name: 'Groceries',
        items: [{ text: 'Milk', completed: false }],
      });

      const interaction = createMockInteraction({ customId: 'list_clear_completed_Groceries' });

      await handleListButton(interaction);

      expect(mockList.clearCompleted).toHaveBeenCalledWith('guild-123', 'Groceries');
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Cleared all completed items'),
        })
      );
    });

    it('should reply with not found when list does not exist', async () => {
      mockList.clearCompleted.mockResolvedValue(null);

      const interaction = createMockInteraction({ customId: 'list_clear_completed_nonexistent' });

      await handleListButton(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not found'),
        })
      );
    });

    it('should use editReply when deferred', async () => {
      mockList.clearCompleted.mockResolvedValue({
        name: 'Groceries',
        items: [],
      });

      const interaction = createMockInteraction({
        customId: 'list_clear_completed_Groceries',
        deferred: true,
      });

      await handleListButton(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Cleared all completed items'),
        })
      );
    });
  });

  describe('list_delete_confirm_{name}', () => {
    it('should delete list successfully', async () => {
      mockList.deleteList.mockResolvedValue(true);

      const interaction = createMockInteraction({ customId: 'list_delete_confirm_Groceries' });

      await handleListButton(interaction);

      expect(mockList.deleteList).toHaveBeenCalledWith('guild-123', 'Groceries');
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('has been deleted'),
          components: [],
        })
      );
    });

    it('should reply with not found when list to delete does not exist', async () => {
      mockList.deleteList.mockResolvedValue(false);

      const interaction = createMockInteraction({ customId: 'list_delete_confirm_nonexistent' });

      await handleListButton(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not found'),
          components: [],
        })
      );
    });

    it('should use editReply when deferred (deleted)', async () => {
      mockList.deleteList.mockResolvedValue(true);

      const interaction = createMockInteraction({
        customId: 'list_delete_confirm_Groceries',
        deferred: true,
      });

      await handleListButton(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('has been deleted'),
          components: [],
        })
      );
    });

    it('should use editReply when deferred (not found)', async () => {
      mockList.deleteList.mockResolvedValue(false);

      const interaction = createMockInteraction({
        customId: 'list_delete_confirm_nonexistent',
        deferred: true,
      });

      await handleListButton(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not found'),
          components: [],
        })
      );
    });
  });

  describe('list_delete_cancel', () => {
    it('should cancel delete and clear components', async () => {
      const interaction = createMockInteraction({ customId: 'list_delete_cancel' });

      await handleListButton(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Delete cancelled'),
          components: [],
        })
      );
    });

    it('should use editReply when deferred', async () => {
      const interaction = createMockInteraction({
        customId: 'list_delete_cancel',
        deferred: true,
      });

      await handleListButton(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Delete cancelled'),
          components: [],
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should call handleInteractionError on error', async () => {
      const dbError = new Error('Database connection lost');
      mockList.getList.mockRejectedValue(dbError);

      const interaction = createMockInteraction({ customId: 'list_view_groceries' });

      await handleListButton(interaction);

      expect(handleInteractionError).toHaveBeenCalledWith(
        interaction,
        dbError,
        'list button handler'
      );
    });
  });
});
