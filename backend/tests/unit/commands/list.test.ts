/**
 * Unit tests for /list Discord command
 *
 * Tests the Discord slash command that manages lists with items.
 * Covers all 8 subcommands: create, add, show, remove, clear, delete, all, complete
 * Plus autocomplete and error handling.
 */

// Mock dependencies BEFORE imports
jest.mock('../../../shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
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

jest.mock('../../../../supabase/models/List', () => ({
  __esModule: true,
  default: {
    createList: jest.fn(),
    getUserLists: jest.fn(),
    getList: jest.fn(),
    addItem: jest.fn(),
    removeItem: jest.fn(),
    clearCompleted: jest.fn(),
    toggleItem: jest.fn(),
  },
}));

import { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import listCommand from '../../../commands/list';
import List from '../../../../supabase/models/List';
import { logger } from '../../../shared/utils/logger';

describe('/list Discord Command', () => {
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
      commandName: 'list',
      options: {
        getString: jest.fn(),
        getSubcommand: jest.fn(),
      } as any,
      editReply: jest.fn().mockResolvedValue({}),
      followUp: jest.fn().mockResolvedValue({}),
      reply: jest.fn().mockResolvedValue({}),
      deferReply: jest.fn().mockResolvedValue({}),
    };
  });

  // ---------------------------------------------------------------------------
  // Command Configuration
  // ---------------------------------------------------------------------------
  describe('Command Configuration', () => {
    it('should have correct command name', () => {
      expect(listCommand.data.name).toBe('list');
    });

    it('should have correct description', () => {
      expect(listCommand.data.description).toBe('Manage your lists');
    });

    it('should define 8 subcommands', () => {
      const options = (listCommand.data as any).options;
      expect(options).toHaveLength(8);

      const subcommandNames = options.map((opt: any) => opt.name);
      expect(subcommandNames).toEqual(
        expect.arrayContaining([
          'create',
          'add',
          'show',
          'remove',
          'clear',
          'delete',
          'all',
          'complete',
        ])
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Subcommand: create
  // ---------------------------------------------------------------------------
  describe('Subcommand: create', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('create');
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'name') return 'Groceries';
        return null;
      });
    });

    it('should create a list and reply with success embed', async () => {
      (List.createList as jest.Mock).mockResolvedValue({
        name: 'Groceries',
        items: [],
        guild_id: 'guild-123',
        user_id: 'user-456',
      });

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(List.createList).toHaveBeenCalledWith('guild-123', 'Groceries', 'user-456');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'List Created',
                description: 'List "Groceries" has been created successfully.',
              }),
            }),
          ]),
          components: expect.any(Array),
        })
      );
    });

    it('should report duplicate name when createList returns null', async () => {
      (List.createList as jest.Mock).mockResolvedValue(null);

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'A list named "Groceries" already exists.',
      });
    });

    it('should reject when guild is not available', async () => {
      mockInteraction.guild = null;

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'This command can only be used in a server.',
      });
      expect(List.createList).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Subcommand: add
  // ---------------------------------------------------------------------------
  describe('Subcommand: add', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('add');
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'list_name') return 'Groceries';
        if (name === 'item') return 'Milk';
        return null;
      });
    });

    it('should add an item and display total item count', async () => {
      (List.addItem as jest.Mock).mockResolvedValue({
        name: 'Groceries',
        items: [
          { text: 'Bread', completed: false },
          { text: 'Milk', completed: false },
        ],
      });

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(List.addItem).toHaveBeenCalledWith('guild-123', 'Groceries', 'Milk');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Item Added',
                description: 'Added "Milk" to list "Groceries"',
                fields: expect.arrayContaining([
                  expect.objectContaining({ name: 'Total Items', value: '2' }),
                ]),
              }),
            }),
          ]),
        })
      );
    });

    it('should handle list not found', async () => {
      (List.addItem as jest.Mock).mockResolvedValue(null);

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'List "Groceries" not found.',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Subcommand: show
  // ---------------------------------------------------------------------------
  describe('Subcommand: show', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('show');
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'list_name') return 'Groceries';
        return null;
      });
    });

    it('should display a list with items and completion status', async () => {
      (List.getList as jest.Mock).mockResolvedValue({
        name: 'Groceries',
        items: [
          { text: 'Bread', completed: true },
          { text: 'Milk', completed: false },
          { text: 'Eggs', completed: false },
        ],
      });

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(List.getList).toHaveBeenCalledWith('guild-123', 'Groceries');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'List: Groceries',
              }),
            }),
          ]),
          components: expect.any(Array),
        })
      );
    });

    it('should display empty list message when list has no items', async () => {
      (List.getList as jest.Mock).mockResolvedValue({
        name: 'Groceries',
        items: [],
      });

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                description: 'This list is empty.',
              }),
            }),
          ]),
        })
      );
    });

    it('should handle list not found', async () => {
      (List.getList as jest.Mock).mockResolvedValue(null);

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'List "Groceries" not found.',
      });
    });

    it('should show footer with completion count', async () => {
      (List.getList as jest.Mock).mockResolvedValue({
        name: 'Groceries',
        items: [
          { text: 'Bread', completed: true },
          { text: 'Milk', completed: false },
        ],
      });

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      expect(embed.data.footer.text).toBe('1/2 completed');
    });

    it('should disable Mark Complete button when all items are completed', async () => {
      (List.getList as jest.Mock).mockResolvedValue({
        name: 'Groceries',
        items: [
          { text: 'Bread', completed: true },
          { text: 'Milk', completed: true },
        ],
      });

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const row = replyCall.components[0];
      // Mark Complete button is the second button (index 1)
      const markCompleteButton = row.components[1];
      expect(markCompleteButton.data.disabled).toBe(true);
    });

    it('should disable Clear Completed button when no items are completed', async () => {
      (List.getList as jest.Mock).mockResolvedValue({
        name: 'Groceries',
        items: [
          { text: 'Bread', completed: false },
          { text: 'Milk', completed: false },
        ],
      });

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const row = replyCall.components[0];
      // Clear Completed button is the third button (index 2)
      const clearCompletedButton = row.components[2];
      expect(clearCompletedButton.data.disabled).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Subcommand: remove
  // ---------------------------------------------------------------------------
  describe('Subcommand: remove', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('remove');
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'list_name') return 'Groceries';
        if (name === 'item') return 'Milk';
        return null;
      });
    });

    it('should remove an item successfully', async () => {
      (List.removeItem as jest.Mock).mockResolvedValue({
        name: 'Groceries',
        items: [{ text: 'Bread', completed: false }],
      });

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(List.removeItem).toHaveBeenCalledWith('guild-123', 'Groceries', 'Milk');
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Removed "Milk" from list "Groceries".',
      });
    });

    it('should handle list or item not found', async () => {
      (List.removeItem as jest.Mock).mockResolvedValue(null);

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'List "Groceries" not found or item "Milk" doesn\'t exist.',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Subcommand: clear
  // ---------------------------------------------------------------------------
  describe('Subcommand: clear', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('clear');
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'list_name') return 'Groceries';
        return null;
      });
    });

    it('should clear completed items successfully', async () => {
      (List.clearCompleted as jest.Mock).mockResolvedValue({
        name: 'Groceries',
        items: [{ text: 'Milk', completed: false }],
      });

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(List.clearCompleted).toHaveBeenCalledWith('guild-123', 'Groceries');
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Cleared completed items from list "Groceries".',
      });
    });

    it('should handle list not found', async () => {
      (List.clearCompleted as jest.Mock).mockResolvedValue(null);

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'List "Groceries" not found.',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Subcommand: delete
  // ---------------------------------------------------------------------------
  describe('Subcommand: delete', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('delete');
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'list_name') return 'Groceries';
        return null;
      });
    });

    it('should display confirmation dialog with confirm and cancel buttons', async () => {
      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content:
            'Are you sure you want to delete list "Groceries"? This action cannot be undone.',
          components: expect.arrayContaining([
            expect.objectContaining({
              components: expect.arrayContaining([
                expect.objectContaining({
                  data: expect.objectContaining({
                    custom_id: 'list_delete_confirm_Groceries',
                    label: 'Confirm Delete',
                    style: 4, // ButtonStyle.Danger
                  }),
                }),
                expect.objectContaining({
                  data: expect.objectContaining({
                    custom_id: 'list_delete_cancel',
                    label: 'Cancel',
                    style: 2, // ButtonStyle.Secondary
                  }),
                }),
              ]),
            }),
          ]),
        })
      );
    });

    it('should not call any List model delete method directly', async () => {
      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      // Delete subcommand only shows confirmation, doesn't delete
      expect(List.getList).not.toHaveBeenCalled();
      expect(List.getUserLists).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Subcommand: all
  // ---------------------------------------------------------------------------
  describe('Subcommand: all', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('all');
    });

    it('should display summary of all lists with item counts', async () => {
      (List.getUserLists as jest.Mock).mockResolvedValue([
        {
          name: 'Groceries',
          items: [
            { text: 'Bread', completed: true },
            { text: 'Milk', completed: false },
          ],
        },
        {
          name: 'Todo',
          items: [{ text: 'Clean', completed: false }],
        },
      ]);

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(List.getUserLists).toHaveBeenCalledWith('guild-123');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Your Lists',
                footer: expect.objectContaining({ text: 'Total lists: 2' }),
              }),
            }),
          ]),
          components: expect.any(Array),
        })
      );
    });

    it('should display no lists message when user has none', async () => {
      (List.getUserLists as jest.Mock).mockResolvedValue([]);

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'You have no lists.',
      });
    });

    it('should include select menu when lists count is between 1 and 5', async () => {
      (List.getUserLists as jest.Mock).mockResolvedValue([
        { name: 'Groceries', items: [{ text: 'Milk', completed: false }] },
        { name: 'Todo', items: [] },
      ]);

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      expect(replyCall.components).toHaveLength(1);
    });

    it('should not include select menu when lists count exceeds 5', async () => {
      const manyLists = Array.from({ length: 6 }, (_, i) => ({
        name: `List ${i + 1}`,
        items: [],
      }));
      (List.getUserLists as jest.Mock).mockResolvedValue(manyLists);

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      expect(replyCall.components).toBeUndefined();
    });

    it('should handle lists with no items array gracefully', async () => {
      (List.getUserLists as jest.Mock).mockResolvedValue([{ name: 'Empty List', items: null }]);

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      expect(embed.data.description).toContain('0 items');
    });
  });

  // ---------------------------------------------------------------------------
  // Subcommand: complete
  // ---------------------------------------------------------------------------
  describe('Subcommand: complete', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('complete');
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'list_name') return 'Groceries';
        if (name === 'item') return 'Milk';
        return null;
      });
    });

    it('should toggle item to completed', async () => {
      (List.toggleItem as jest.Mock).mockResolvedValue({
        name: 'Groceries',
        items: [{ text: 'Milk', completed: true }],
      });

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(List.toggleItem).toHaveBeenCalledWith('guild-123', 'Groceries', 'Milk');
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Item "Milk" marked as completed.',
      });
    });

    it('should toggle item to uncompleted', async () => {
      (List.toggleItem as jest.Mock).mockResolvedValue({
        name: 'Groceries',
        items: [{ text: 'Milk', completed: false }],
      });

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Item "Milk" marked as uncompleted.',
      });
    });

    it('should handle list or item not found from toggleItem returning null', async () => {
      (List.toggleItem as jest.Mock).mockResolvedValue(null);

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'List "Groceries" not found or item "Milk" doesn\'t exist.',
      });
    });

    it('should handle item not found in returned list items', async () => {
      (List.toggleItem as jest.Mock).mockResolvedValue({
        name: 'Groceries',
        items: [{ text: 'Bread', completed: false }],
      });

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Item "Milk" not found in list "Groceries".',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Autocomplete
  // ---------------------------------------------------------------------------
  describe('Autocomplete', () => {
    let mockAutocomplete: Partial<AutocompleteInteraction>;

    beforeEach(() => {
      mockAutocomplete = {
        user: { id: 'user-456', username: 'testuser' } as any,
        guild: { id: 'guild-123' } as any,
        options: {
          getFocused: jest.fn(),
          getString: jest.fn(),
        } as any,
        respond: jest.fn().mockResolvedValue(undefined),
      };
    });

    it('should return filtered list names for list_name field', async () => {
      (mockAutocomplete.options!.getFocused as jest.Mock).mockReturnValue({
        name: 'list_name',
        value: 'gro',
      });
      (List.getUserLists as jest.Mock).mockResolvedValue([
        { name: 'Groceries' },
        { name: 'Todo' },
        { name: 'Growth Ideas' },
      ]);

      await listCommand.autocomplete(mockAutocomplete as AutocompleteInteraction);

      expect(mockAutocomplete.respond).toHaveBeenCalledWith([
        { name: 'Groceries', value: 'Groceries' },
        { name: 'Growth Ideas', value: 'Growth Ideas' },
      ]);
    });

    it('should return all list names when filter is empty', async () => {
      (mockAutocomplete.options!.getFocused as jest.Mock).mockReturnValue({
        name: 'list_name',
        value: '',
      });
      (List.getUserLists as jest.Mock).mockResolvedValue([{ name: 'Groceries' }, { name: 'Todo' }]);

      await listCommand.autocomplete(mockAutocomplete as AutocompleteInteraction);

      expect(mockAutocomplete.respond).toHaveBeenCalledWith([
        { name: 'Groceries', value: 'Groceries' },
        { name: 'Todo', value: 'Todo' },
      ]);
    });

    it('should return filtered items for item field from selected list', async () => {
      (mockAutocomplete.options!.getFocused as jest.Mock).mockReturnValue({
        name: 'item',
        value: 'mi',
      });
      (mockAutocomplete.options!.getString as jest.Mock).mockReturnValue('Groceries');
      (List.getList as jest.Mock).mockResolvedValue({
        name: 'Groceries',
        items: [
          { text: 'Milk', completed: false },
          { text: 'Bread', completed: false },
          { text: 'Miso Paste', completed: false },
        ],
      });

      await listCommand.autocomplete(mockAutocomplete as AutocompleteInteraction);

      expect(List.getList).toHaveBeenCalledWith('guild-123', 'Groceries');
      expect(mockAutocomplete.respond).toHaveBeenCalledWith([
        { name: 'Milk', value: 'Milk' },
        { name: 'Miso Paste', value: 'Miso Paste' },
      ]);
    });

    it('should respond with empty array when list has no items for item field', async () => {
      (mockAutocomplete.options!.getFocused as jest.Mock).mockReturnValue({
        name: 'item',
        value: '',
      });
      (mockAutocomplete.options!.getString as jest.Mock).mockReturnValue('Groceries');
      (List.getList as jest.Mock).mockResolvedValue(null);

      await listCommand.autocomplete(mockAutocomplete as AutocompleteInteraction);

      expect(mockAutocomplete.respond).toHaveBeenCalledWith([]);
    });

    it('should respond with empty array when no list_name is provided for item field', async () => {
      (mockAutocomplete.options!.getFocused as jest.Mock).mockReturnValue({
        name: 'item',
        value: '',
      });
      (mockAutocomplete.options!.getString as jest.Mock).mockReturnValue(null);

      await listCommand.autocomplete(mockAutocomplete as AutocompleteInteraction);

      expect(mockAutocomplete.respond).toHaveBeenCalledWith([]);
    });

    it('should respond with empty array when guild is not available', async () => {
      mockAutocomplete.guild = null;
      (mockAutocomplete.options!.getFocused as jest.Mock).mockReturnValue({
        name: 'list_name',
        value: '',
      });

      await listCommand.autocomplete(mockAutocomplete as AutocompleteInteraction);

      expect(mockAutocomplete.respond).toHaveBeenCalledWith([]);
    });

    it('should handle autocomplete errors gracefully and respond with empty array', async () => {
      (mockAutocomplete.options!.getFocused as jest.Mock).mockReturnValue({
        name: 'list_name',
        value: '',
      });
      (List.getUserLists as jest.Mock).mockRejectedValue(new Error('Database connection lost'));

      await listCommand.autocomplete(mockAutocomplete as AutocompleteInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in list autocomplete',
        expect.objectContaining({
          error: 'Database connection lost',
        })
      );
      expect(mockAutocomplete.respond).toHaveBeenCalledWith([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Error Handling
  // ---------------------------------------------------------------------------
  describe('Error Handling', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('create');
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'name') return 'Test List';
        return null;
      });
    });

    it('should catch errors and log them', async () => {
      (List.createList as jest.Mock).mockRejectedValue(new Error('Database timeout'));

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in list command',
        expect.objectContaining({
          error: 'Database timeout',
          userId: 'user-456',
          guildId: 'guild-123',
        })
      );
    });

    it('should use followUp when interaction is already deferred', async () => {
      mockInteraction.replied = false;
      mockInteraction.deferred = true;
      (List.createList as jest.Mock).mockRejectedValue(new Error('Test error'));

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content: 'An error occurred while processing your request.',
      });
    });

    it('should use followUp when interaction is already replied', async () => {
      mockInteraction.replied = true;
      mockInteraction.deferred = false;
      (List.createList as jest.Mock).mockRejectedValue(new Error('Test error'));

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content: 'An error occurred while processing your request.',
      });
    });

    it('should use reply when interaction has not been replied or deferred', async () => {
      mockInteraction.replied = false;
      mockInteraction.deferred = false;
      (List.createList as jest.Mock).mockRejectedValue(new Error('Test error'));

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'An error occurred while processing your request.',
      });
    });

    it('should handle non-Error thrown values', async () => {
      (List.createList as jest.Mock).mockRejectedValue('string error');

      await listCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in list command',
        expect.objectContaining({
          error: 'Unknown error',
        })
      );
    });
  });
});
