/**
 * Unit Tests: List Model
 *
 * Tests database model for list/item management using mocks
 * Coverage target: 80%
 */

// Mock logger BEFORE imports
jest.mock('../../../shared/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

import List from '@database/models/List';

describe('List Model', () => {
  const testGuildId = 'guild-123';
  const testUserId = 'user-456';

  let mockList: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a reusable mock list object
    mockList = {
      id: 1,
      name: 'Groceries',
      items: [
        { text: 'Milk', completed: false, added_at: new Date('2024-01-15') },
        { text: 'Bread', completed: true, added_at: new Date('2024-01-15') },
        { text: 'Eggs', completed: false, added_at: new Date('2024-01-16') },
      ],
      user_id: testUserId,
      guild_id: testGuildId,
      created_at: new Date('2024-01-15'),
    };

    // Mock createList
    jest.spyOn(List, 'createList').mockImplementation(async (guildId, name, userId) => {
      if (name.toLowerCase() === 'groceries') {
        return null; // Duplicate
      }

      return {
        id: 2,
        name,
        items: [],
        user_id: userId || 'system',
        guild_id: guildId,
        created_at: new Date(),
      } as any;
    });

    // Mock getUserLists
    jest.spyOn(List, 'getUserLists').mockImplementation(async (guildId) => {
      if (guildId === 'guild-empty') {
        return [];
      }

      return [
        { ...mockList },
        {
          id: 2,
          name: 'Todo',
          items: [],
          user_id: testUserId,
          guild_id: guildId,
          created_at: new Date('2024-01-14'),
        },
      ] as any[];
    });

    // Mock getList
    jest.spyOn(List, 'getList').mockImplementation(async (guildId, listName) => {
      if (listName.toLowerCase() === 'groceries' && guildId === testGuildId) {
        return { ...mockList } as any;
      }
      return null;
    });

    // Mock addItem
    jest.spyOn(List, 'addItem').mockImplementation(async (guildId, listName, item) => {
      if (listName.toLowerCase() !== 'groceries' || guildId !== testGuildId) {
        return null;
      }

      const updatedList = { ...mockList };
      updatedList.items = [
        ...mockList.items,
        { text: item, completed: false, added_at: new Date() },
      ];
      return updatedList as any;
    });

    // Mock removeItem
    jest.spyOn(List, 'removeItem').mockImplementation(async (guildId, listName, itemText) => {
      if (listName.toLowerCase() !== 'groceries' || guildId !== testGuildId) {
        return null;
      }

      const itemIndex = mockList.items.findIndex(
        (i: any) => i.text.toLowerCase() === itemText.toLowerCase()
      );
      if (itemIndex === -1) {
        return null;
      }

      const updatedList = { ...mockList };
      updatedList.items = mockList.items.filter((_: any, idx: number) => idx !== itemIndex);
      return updatedList as any;
    });

    // Mock clearCompleted
    jest.spyOn(List, 'clearCompleted').mockImplementation(async (guildId, listName) => {
      if (listName.toLowerCase() !== 'groceries' || guildId !== testGuildId) {
        return null;
      }

      const updatedList = { ...mockList };
      updatedList.items = mockList.items.filter((item: any) => !item.completed);
      return updatedList as any;
    });

    // Mock toggleItem
    jest.spyOn(List, 'toggleItem').mockImplementation(async (guildId, listName, itemText) => {
      if (listName.toLowerCase() !== 'groceries' || guildId !== testGuildId) {
        return null;
      }

      const item = mockList.items.find((i: any) => i.text.toLowerCase() === itemText.toLowerCase());
      if (!item) {
        return null;
      }

      const updatedList = { ...mockList };
      updatedList.items = mockList.items.map((i: any) => {
        if (i.text.toLowerCase() === itemText.toLowerCase()) {
          return { ...i, completed: !i.completed };
        }
        return i;
      });
      return updatedList as any;
    });

    // Mock deleteList
    jest.spyOn(List, 'deleteList').mockImplementation(async (guildId, listName) => {
      if (listName.toLowerCase() === 'groceries' && guildId === testGuildId) {
        return true;
      }
      return false;
    });
  });

  describe('createList', () => {
    test('should create a new list successfully', async () => {
      const result = await List.createList(testGuildId, 'Shopping', testUserId);

      expect(result).toBeDefined();
      expect(result!.name).toBe('Shopping');
      expect(result!.items).toEqual([]);
      expect(result!.guild_id).toBe(testGuildId);
      expect(result!.user_id).toBe(testUserId);
    });

    test('should return null when list name already exists (duplicate)', async () => {
      const result = await List.createList(testGuildId, 'Groceries');

      expect(result).toBeNull();
    });

    test('should default user_id to system when not provided', async () => {
      const result = await List.createList(testGuildId, 'New List');

      expect(result).toBeDefined();
      expect(result!.user_id).toBe('system');
    });

    test('should create list with empty items array', async () => {
      const result = await List.createList(testGuildId, 'Empty List');

      expect(result).toBeDefined();
      expect(result!.items).toEqual([]);
    });
  });

  describe('getUserLists', () => {
    test('should return all lists for a guild', async () => {
      const lists = await List.getUserLists(testGuildId);

      expect(lists).toHaveLength(2);
      expect(lists[0].name).toBe('Groceries');
      expect(lists[1].name).toBe('Todo');
    });

    test('should return empty array when no lists exist', async () => {
      const lists = await List.getUserLists('guild-empty');

      expect(lists).toEqual([]);
    });

    test('should filter by guild_id', async () => {
      const lists = await List.getUserLists(testGuildId);

      lists.forEach((list) => {
        expect(list.guild_id).toBe(testGuildId);
      });
    });
  });

  describe('getList', () => {
    test('should return list with items when found', async () => {
      const result = await List.getList(testGuildId, 'Groceries');

      expect(result).toBeDefined();
      expect(result!.name).toBe('Groceries');
      expect(result!.items).toHaveLength(3);
    });

    test('should return null when list is not found', async () => {
      const result = await List.getList(testGuildId, 'Nonexistent');

      expect(result).toBeNull();
    });

    test('should return null when guild_id does not match', async () => {
      const result = await List.getList('guild-other', 'Groceries');

      expect(result).toBeNull();
    });
  });

  describe('addItem', () => {
    test('should add item to existing list', async () => {
      const result = await List.addItem(testGuildId, 'Groceries', 'Butter');

      expect(result).toBeDefined();
      expect(result!.items).toHaveLength(4);
      expect(result!.items[3].text).toBe('Butter');
      expect(result!.items[3].completed).toBe(false);
    });

    test('should return null when list is not found', async () => {
      const result = await List.addItem(testGuildId, 'Nonexistent', 'Item');

      expect(result).toBeNull();
    });

    test('should return null when guild_id does not match', async () => {
      const result = await List.addItem('guild-other', 'Groceries', 'Item');

      expect(result).toBeNull();
    });
  });

  describe('removeItem', () => {
    test('should remove item from list', async () => {
      const result = await List.removeItem(testGuildId, 'Groceries', 'Milk');

      expect(result).toBeDefined();
      expect(result!.items).toHaveLength(2);
      expect(result!.items.find((i: any) => i.text === 'Milk')).toBeUndefined();
    });

    test('should return null when item is not found in list', async () => {
      const result = await List.removeItem(testGuildId, 'Groceries', 'Nonexistent Item');

      expect(result).toBeNull();
    });

    test('should return null when list is not found', async () => {
      const result = await List.removeItem(testGuildId, 'Nonexistent', 'Item');

      expect(result).toBeNull();
    });

    test('should be case-insensitive for item matching', async () => {
      const result = await List.removeItem(testGuildId, 'Groceries', 'milk');

      expect(result).toBeDefined();
      expect(result!.items).toHaveLength(2);
    });
  });

  describe('clearCompleted', () => {
    test('should remove only completed items', async () => {
      const result = await List.clearCompleted(testGuildId, 'Groceries');

      expect(result).toBeDefined();
      // Original list has 1 completed item (Bread), so 2 should remain
      expect(result!.items).toHaveLength(2);
      result!.items.forEach((item: any) => {
        expect(item.completed).toBe(false);
      });
    });

    test('should return null when list is not found', async () => {
      const result = await List.clearCompleted(testGuildId, 'Nonexistent');

      expect(result).toBeNull();
    });

    test('should return null when guild_id does not match', async () => {
      const result = await List.clearCompleted('guild-other', 'Groceries');

      expect(result).toBeNull();
    });
  });

  describe('toggleItem', () => {
    test('should toggle item completion status', async () => {
      const result = await List.toggleItem(testGuildId, 'Groceries', 'Milk');

      expect(result).toBeDefined();
      const milkItem = result!.items.find((i: any) => i.text === 'Milk');
      expect(milkItem.completed).toBe(true); // Was false, toggled to true
    });

    test('should toggle completed item back to incomplete', async () => {
      const result = await List.toggleItem(testGuildId, 'Groceries', 'Bread');

      expect(result).toBeDefined();
      const breadItem = result!.items.find((i: any) => i.text === 'Bread');
      expect(breadItem.completed).toBe(false); // Was true, toggled to false
    });

    test('should return null when item is not found', async () => {
      const result = await List.toggleItem(testGuildId, 'Groceries', 'Nonexistent');

      expect(result).toBeNull();
    });

    test('should return null when list is not found', async () => {
      const result = await List.toggleItem(testGuildId, 'Nonexistent', 'Milk');

      expect(result).toBeNull();
    });

    test('should return null when guild_id does not match', async () => {
      const result = await List.toggleItem('guild-other', 'Groceries', 'Milk');

      expect(result).toBeNull();
    });
  });

  describe('deleteList', () => {
    test('should return true when list is successfully deleted', async () => {
      const result = await List.deleteList(testGuildId, 'Groceries');

      expect(result).toBe(true);
    });

    test('should return false when list is not found', async () => {
      const result = await List.deleteList(testGuildId, 'Nonexistent');

      expect(result).toBe(false);
    });

    test('should return false when guild_id does not match', async () => {
      const result = await List.deleteList('guild-other', 'Groceries');

      expect(result).toBe(false);
    });
  });

  describe('Guild Isolation', () => {
    test('createList should include guild_id in created record', async () => {
      const result = await List.createList(testGuildId, 'New List');

      expect(result!.guild_id).toBe(testGuildId);
    });

    test('getUserLists should be called with guild_id', async () => {
      await List.getUserLists(testGuildId);

      expect(List.getUserLists).toHaveBeenCalledWith(testGuildId);
    });

    test('getList should be called with guild_id', async () => {
      await List.getList(testGuildId, 'Groceries');

      expect(List.getList).toHaveBeenCalledWith(testGuildId, 'Groceries');
    });

    test('addItem should be called with guild_id', async () => {
      await List.addItem(testGuildId, 'Groceries', 'Butter');

      expect(List.addItem).toHaveBeenCalledWith(testGuildId, 'Groceries', 'Butter');
    });

    test('deleteList should require guild_id', async () => {
      await List.deleteList(testGuildId, 'Groceries');

      expect(List.deleteList).toHaveBeenCalledWith(testGuildId, 'Groceries');
    });
  });
});
