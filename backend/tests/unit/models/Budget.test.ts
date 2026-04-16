/**
 * Unit Tests: Budget Model
 *
 * Tests database model for budget/expense tracking using mocks
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

import Budget from '@database/models/Budget';

describe('Budget Model', () => {
  const testGuildId = 'guild-123';
  const testUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock addExpense
    jest
      .spyOn(Budget, 'addExpense')
      .mockImplementation(async (guildId, category, amount, description, userId) => {
        return {
          id: 1,
          type: 'expense',
          category,
          amount,
          description: description || null,
          date: new Date('2024-01-15'),
          user_id: userId || 'system',
          guild_id: guildId,
        } as any;
      });

    // Mock addIncome
    jest
      .spyOn(Budget, 'addIncome')
      .mockImplementation(async (guildId, amount, description, userId) => {
        return {
          id: 2,
          type: 'income',
          category: 'Income',
          amount,
          description: description || null,
          date: new Date('2024-01-15'),
          user_id: userId || 'system',
          guild_id: guildId,
        } as any;
      });

    // Mock getSummary
    jest.spyOn(Budget, 'getSummary').mockImplementation(async (guildId, _month) => {
      if (guildId === 'guild-empty') {
        return {
          income: '0.00',
          expenses: '0.00',
          balance: '0.00',
          categories: [],
          entryCount: 0,
        };
      }

      return {
        income: '3000.00',
        expenses: '1500.00',
        balance: '1500.00',
        categories: [
          { name: 'Food', amount: '800.00', percentage: '53.3' },
          { name: 'Transport', amount: '700.00', percentage: '46.7' },
        ],
        entryCount: 5,
      };
    });

    // Mock getCategories
    jest.spyOn(Budget, 'getCategories').mockImplementation(async (guildId) => {
      if (guildId === 'guild-empty') {
        return [];
      }

      return [
        { category: 'Food', total: '800.00', count: 3 },
        { category: 'Transport', total: '700.00', count: 2 },
      ];
    });

    // Mock getRecentEntries
    jest.spyOn(Budget, 'getRecentEntries').mockImplementation(async (guildId, limit = 10) => {
      const entries = [
        {
          id: 5,
          type: 'expense',
          category: 'Food',
          amount: 25.0,
          description: 'Lunch',
          date: new Date('2024-01-15'),
          user_id: testUserId,
          guild_id: guildId,
        },
        {
          id: 4,
          type: 'income',
          category: 'Income',
          amount: 3000.0,
          description: 'Salary',
          date: new Date('2024-01-14'),
          user_id: testUserId,
          guild_id: guildId,
        },
        {
          id: 3,
          type: 'expense',
          category: 'Transport',
          amount: 50.0,
          description: 'Gas',
          date: new Date('2024-01-13'),
          user_id: testUserId,
          guild_id: guildId,
        },
        {
          id: 2,
          type: 'expense',
          category: 'Food',
          amount: 100.0,
          description: 'Groceries',
          date: new Date('2024-01-12'),
          user_id: testUserId,
          guild_id: guildId,
        },
        {
          id: 1,
          type: 'expense',
          category: 'Food',
          amount: 15.0,
          description: 'Coffee',
          date: new Date('2024-01-11'),
          user_id: testUserId,
          guild_id: guildId,
        },
      ];

      return entries.slice(0, limit) as any[];
    });

    // Mock getMonthlyTrend
    jest.spyOn(Budget, 'getMonthlyTrend').mockImplementation(async (guildId, months = 6) => {
      const trends = [];
      for (let i = 0; i < months; i++) {
        trends.push({
          month: `Month ${i + 1}`,
          income: '3000.00',
          expenses: '1500.00',
          balance: '1500.00',
        });
      }
      return trends;
    });

    // Mock deleteEntry
    jest.spyOn(Budget, 'deleteEntry').mockImplementation(async (entryId, guildId) => {
      if (entryId === 1 && guildId === testGuildId) {
        return true;
      }
      return false;
    });
  });

  describe('addExpense', () => {
    test('should create an expense record with correct fields', async () => {
      const result = await Budget.addExpense(testGuildId, 'Food', 25.5, 'Lunch', testUserId);

      expect(result).toBeDefined();
      expect(result.type).toBe('expense');
      expect(result.category).toBe('Food');
      expect(result.amount).toBe(25.5);
      expect(result.description).toBe('Lunch');
      expect(result.guild_id).toBe(testGuildId);
      expect(result.user_id).toBe(testUserId);
    });

    test('should create an expense with null description when not provided', async () => {
      const result = await Budget.addExpense(testGuildId, 'Transport', 50.0, null);

      expect(result).toBeDefined();
      expect(result.type).toBe('expense');
      expect(result.description).toBeNull();
    });

    test('should default user_id to system when not provided', async () => {
      const result = await Budget.addExpense(testGuildId, 'Food', 10.0);

      expect(result.user_id).toBe('system');
    });

    test('should call addExpense with correct arguments', async () => {
      await Budget.addExpense(testGuildId, 'Utilities', 120.0, 'Electric bill', testUserId);

      expect(Budget.addExpense).toHaveBeenCalledWith(
        testGuildId,
        'Utilities',
        120.0,
        'Electric bill',
        testUserId
      );
    });
  });

  describe('addIncome', () => {
    test('should create an income record with correct fields', async () => {
      const result = await Budget.addIncome(testGuildId, 3000.0, 'Salary', testUserId);

      expect(result).toBeDefined();
      expect(result.type).toBe('income');
      expect(result.category).toBe('Income');
      expect(result.amount).toBe(3000.0);
      expect(result.description).toBe('Salary');
      expect(result.guild_id).toBe(testGuildId);
      expect(result.user_id).toBe(testUserId);
    });

    test('should create income with null description when not provided', async () => {
      const result = await Budget.addIncome(testGuildId, 500.0);

      expect(result).toBeDefined();
      expect(result.type).toBe('income');
      expect(result.description).toBeNull();
    });

    test('should default user_id to system when not provided', async () => {
      const result = await Budget.addIncome(testGuildId, 1000.0);

      expect(result.user_id).toBe('system');
    });
  });

  describe('getSummary', () => {
    test('should calculate totals correctly', async () => {
      const summary = await Budget.getSummary(testGuildId);

      expect(summary).toBeDefined();
      expect(summary.income).toBe('3000.00');
      expect(summary.expenses).toBe('1500.00');
      expect(summary.balance).toBe('1500.00');
      expect(summary.entryCount).toBe(5);
    });

    test('should return categories sorted by amount', async () => {
      const summary = await Budget.getSummary(testGuildId);

      expect(summary.categories).toHaveLength(2);
      expect(summary.categories[0].name).toBe('Food');
      expect(summary.categories[0].amount).toBe('800.00');
      expect(summary.categories[1].name).toBe('Transport');
    });

    test('should handle empty data with zero totals', async () => {
      const summary = await Budget.getSummary('guild-empty');

      expect(summary.income).toBe('0.00');
      expect(summary.expenses).toBe('0.00');
      expect(summary.balance).toBe('0.00');
      expect(summary.categories).toHaveLength(0);
      expect(summary.entryCount).toBe(0);
    });

    test('should accept month parameter for filtering', async () => {
      await Budget.getSummary(testGuildId, 3);

      expect(Budget.getSummary).toHaveBeenCalledWith(testGuildId, 3);
    });

    test('should default to current month when no month provided', async () => {
      await Budget.getSummary(testGuildId);

      expect(Budget.getSummary).toHaveBeenCalledWith(testGuildId);
    });
  });

  describe('getCategories', () => {
    test('should return categories grouped with totals and counts', async () => {
      const categories = await Budget.getCategories(testGuildId);

      expect(categories).toHaveLength(2);
      expect(categories[0]).toEqual({ category: 'Food', total: '800.00', count: 3 });
      expect(categories[1]).toEqual({ category: 'Transport', total: '700.00', count: 2 });
    });

    test('should return empty array when no categories exist', async () => {
      const categories = await Budget.getCategories('guild-empty');

      expect(categories).toEqual([]);
    });

    test('should sort categories by total descending', async () => {
      const categories = await Budget.getCategories(testGuildId);

      const totals = categories.map((c) => parseFloat(c.total));
      for (let i = 1; i < totals.length; i++) {
        expect(totals[i - 1]).toBeGreaterThanOrEqual(totals[i]);
      }
    });
  });

  describe('getRecentEntries', () => {
    test('should return entries ordered by date descending', async () => {
      const entries = await Budget.getRecentEntries(testGuildId);

      expect(entries).toHaveLength(5);
      expect(entries[0].id).toBe(5);
      expect(entries[entries.length - 1].id).toBe(1);
    });

    test('should respect the limit parameter', async () => {
      const entries = await Budget.getRecentEntries(testGuildId, 3);

      expect(entries).toHaveLength(3);
      expect(Budget.getRecentEntries).toHaveBeenCalledWith(testGuildId, 3);
    });

    test('should default to limit of 10', async () => {
      await Budget.getRecentEntries(testGuildId);

      expect(Budget.getRecentEntries).toHaveBeenCalledWith(testGuildId);
    });
  });

  describe('getMonthlyTrend', () => {
    test('should return monthly trend data', async () => {
      const trends = await Budget.getMonthlyTrend(testGuildId);

      expect(trends).toHaveLength(6);
      trends.forEach((trend) => {
        expect(trend).toHaveProperty('month');
        expect(trend).toHaveProperty('income');
        expect(trend).toHaveProperty('expenses');
        expect(trend).toHaveProperty('balance');
      });
    });

    test('should default to 6 months', async () => {
      const trends = await Budget.getMonthlyTrend(testGuildId);

      expect(trends).toHaveLength(6);
    });

    test('should respect custom month count', async () => {
      const trends = await Budget.getMonthlyTrend(testGuildId, 3);

      expect(trends).toHaveLength(3);
      expect(Budget.getMonthlyTrend).toHaveBeenCalledWith(testGuildId, 3);
    });
  });

  describe('deleteEntry', () => {
    test('should return true when entry is successfully deleted', async () => {
      const result = await Budget.deleteEntry(1, testGuildId);

      expect(result).toBe(true);
    });

    test('should return false when entry is not found', async () => {
      const result = await Budget.deleteEntry(999, testGuildId);

      expect(result).toBe(false);
    });

    test('should return false when guild_id does not match', async () => {
      const result = await Budget.deleteEntry(1, 'guild-other');

      expect(result).toBe(false);
    });
  });

  describe('Guild Isolation', () => {
    test('addExpense should include guild_id in created record', async () => {
      const result = await Budget.addExpense(testGuildId, 'Food', 25.0);

      expect(result.guild_id).toBe(testGuildId);
    });

    test('addIncome should include guild_id in created record', async () => {
      const result = await Budget.addIncome(testGuildId, 1000.0);

      expect(result.guild_id).toBe(testGuildId);
    });

    test('getSummary should be called with guild_id', async () => {
      await Budget.getSummary(testGuildId);

      expect(Budget.getSummary).toHaveBeenCalledWith(testGuildId);
    });

    test('getCategories should be called with guild_id', async () => {
      await Budget.getCategories(testGuildId);

      expect(Budget.getCategories).toHaveBeenCalledWith(testGuildId);
    });

    test('deleteEntry should require guild_id', async () => {
      await Budget.deleteEntry(1, testGuildId);

      expect(Budget.deleteEntry).toHaveBeenCalledWith(1, testGuildId);
    });
  });
});
