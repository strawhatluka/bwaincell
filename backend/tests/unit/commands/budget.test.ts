/**
 * Unit tests for /budget Discord slash command
 *
 * Tests the Discord slash command for budget tracking: expenses, income,
 * summaries, categories, recent transactions, and monthly trends.
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

const mockBudget = {
  addExpense: jest.fn(),
  addIncome: jest.fn(),
  getSummary: jest.fn(),
  getCategories: jest.fn(),
  getRecentEntries: jest.fn(),
  getMonthlyTrend: jest.fn(),
};

jest.mock('@database/models/Budget', () => ({
  __esModule: true,
  default: mockBudget,
}));

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import budgetCommand from '../../../commands/budget';
import { logger } from '../../../shared/utils/logger';

describe('/budget Discord Command', () => {
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
      commandName: 'budget',
      options: {
        getSubcommand: jest.fn(),
        getString: jest.fn(),
        getNumber: jest.fn(),
        getInteger: jest.fn(),
      } as any,
      editReply: jest.fn().mockResolvedValue({}),
      followUp: jest.fn().mockResolvedValue({}),
      reply: jest.fn().mockResolvedValue({}),
      deferReply: jest.fn().mockResolvedValue({}),
    };
  });

  // ──────────────────────────────────────────────
  // Command Configuration
  // ──────────────────────────────────────────────

  describe('Command Configuration', () => {
    it('should have correct command name', () => {
      expect(budgetCommand.data).toBeInstanceOf(SlashCommandBuilder);
      expect(budgetCommand.data.name).toBe('budget');
    });

    it('should have correct description', () => {
      expect(budgetCommand.data.description).toBe('Track your budget and expenses');
    });

    it('should have exactly 6 subcommands', () => {
      const commandData = budgetCommand.data.toJSON();
      expect(commandData.options).toHaveLength(6);
    });

    it('should have all required subcommands', () => {
      const commandData = budgetCommand.data.toJSON();
      const subcommandNames = commandData.options?.map((opt: any) => opt.name) || [];

      expect(subcommandNames).toContain('add');
      expect(subcommandNames).toContain('income');
      expect(subcommandNames).toContain('summary');
      expect(subcommandNames).toContain('categories');
      expect(subcommandNames).toContain('recent');
      expect(subcommandNames).toContain('trend');
    });

    it('should have execute function defined', () => {
      expect(budgetCommand.execute).toBeDefined();
      expect(typeof budgetCommand.execute).toBe('function');
    });
  });

  // ──────────────────────────────────────────────
  // Guild Check
  // ──────────────────────────────────────────────

  describe('Guild Validation', () => {
    it('should reject commands outside a guild', async () => {
      mockInteraction.guild = null as any;
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('add');

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'This command can only be used in a server.',
      });
      expect(mockBudget.addExpense).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // Subcommand: add
  // ──────────────────────────────────────────────

  describe('Subcommand: add', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('add');
      (mockInteraction.options!.getString as jest.Mock).mockImplementation(
        (name: string, _required?: boolean) => {
          if (name === 'category') return 'Food';
          if (name === 'description') return 'Lunch at cafe';
          return null;
        }
      );
      (mockInteraction.options!.getNumber as jest.Mock).mockImplementation(
        (name: string, _required?: boolean) => {
          if (name === 'amount') return 25.5;
          return null;
        }
      );
      mockBudget.addExpense.mockResolvedValue({});
    });

    it('should add an expense with description successfully', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockBudget.addExpense).toHaveBeenCalledWith(
        'guild-123',
        'Food',
        25.5,
        'Lunch at cafe',
        'user-456'
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Expense Recorded',
                description: expect.stringContaining('-$25.50'),
              }),
            }),
          ]),
        })
      );
    });

    it('should add an expense without description', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation(
        (name: string, _required?: boolean) => {
          if (name === 'category') return 'Transport';
          if (name === 'description') return null;
          return null;
        }
      );
      (mockInteraction.options!.getNumber as jest.Mock).mockReturnValue(15.0);

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockBudget.addExpense).toHaveBeenCalledWith(
        'guild-123',
        'Transport',
        15.0,
        null,
        'user-456'
      );
      expect(mockInteraction.editReply).toHaveBeenCalled();
    });

    it('should include category and amount fields in embed', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      const fields = embed.data.fields;

      const categoryField = fields.find((f: any) => f.name === 'Category');
      const amountField = fields.find((f: any) => f.name === 'Amount');

      expect(categoryField).toBeDefined();
      expect(categoryField.value).toBe('Food');
      expect(amountField).toBeDefined();
      expect(amountField.value).toBe('$25.50');
    });

    it('should include description field in embed when provided', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      const descField = embed.data.fields.find((f: any) => f.name === 'Description');
      expect(descField).toBeDefined();
      expect(descField.value).toBe('Lunch at cafe');
    });

    it('should not include description field when not provided', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'category') return 'Food';
        return null;
      });

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      const descField = embed.data.fields.find((f: any) => f.name === 'Description');
      expect(descField).toBeUndefined();
    });

    it('should reject amount less than or equal to 0', async () => {
      (mockInteraction.options!.getNumber as jest.Mock).mockReturnValue(0);

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Amount must be greater than 0.',
      });
      expect(mockBudget.addExpense).not.toHaveBeenCalled();
    });

    it('should reject negative amount', async () => {
      (mockInteraction.options!.getNumber as jest.Mock).mockReturnValue(-10);

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Amount must be greater than 0.',
      });
      expect(mockBudget.addExpense).not.toHaveBeenCalled();
    });

    it('should set embed color to red (0xff0000) for expenses', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      expect(embed.data.color).toBe(0xff0000);
    });
  });

  // ──────────────────────────────────────────────
  // Subcommand: income
  // ──────────────────────────────────────────────

  describe('Subcommand: income', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('income');
      (mockInteraction.options!.getNumber as jest.Mock).mockImplementation(
        (name: string, _required?: boolean) => {
          if (name === 'amount') return 3000;
          return null;
        }
      );
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'description') return 'Monthly salary';
        return null;
      });
      mockBudget.addIncome.mockResolvedValue({});
    });

    it('should add income with description successfully', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockBudget.addIncome).toHaveBeenCalledWith(
        'guild-123',
        3000,
        'Monthly salary',
        'user-456'
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Income Recorded',
                description: expect.stringContaining('+$3000.00'),
              }),
            }),
          ]),
        })
      );
    });

    it('should add income without description', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockReturnValue(null);

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockBudget.addIncome).toHaveBeenCalledWith('guild-123', 3000, null, 'user-456');
      expect(mockInteraction.editReply).toHaveBeenCalled();
    });

    it('should include Source field when description is provided', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      const sourceField = embed.data.fields.find((f: any) => f.name === 'Source');
      expect(sourceField).toBeDefined();
      expect(sourceField.value).toBe('Monthly salary');
    });

    it('should not include Source field when description is not provided', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockReturnValue(null);

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      const sourceField = embed.data.fields.find((f: any) => f.name === 'Source');
      expect(sourceField).toBeUndefined();
    });

    it('should reject amount less than or equal to 0', async () => {
      (mockInteraction.options!.getNumber as jest.Mock).mockReturnValue(0);

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Amount must be greater than 0.',
      });
      expect(mockBudget.addIncome).not.toHaveBeenCalled();
    });

    it('should set embed color to green (0x00ff00) for income', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      expect(embed.data.color).toBe(0x00ff00);
    });
  });

  // ──────────────────────────────────────────────
  // Subcommand: summary
  // ──────────────────────────────────────────────

  describe('Subcommand: summary', () => {
    const mockSummary = {
      income: '5000.00',
      expenses: '3200.00',
      balance: '1800.00',
      categories: [
        { name: 'Food', amount: '1200.00', percentage: '37.5' },
        { name: 'Transport', amount: '800.00', percentage: '25.0' },
        { name: 'Entertainment', amount: '600.00', percentage: '18.75' },
      ],
      entryCount: 45,
    };

    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('summary');
      (mockInteraction.options!.getInteger as jest.Mock).mockReturnValue(null);
      mockBudget.getSummary.mockResolvedValue(mockSummary);
    });

    it('should show current month summary when no month param', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockBudget.getSummary).toHaveBeenCalledWith('guild-123', null);
      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      expect(embed.data.title).toContain('Current Month');
    });

    it('should show specific month summary when month param given', async () => {
      (mockInteraction.options!.getInteger as jest.Mock).mockReturnValue(3);

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockBudget.getSummary).toHaveBeenCalledWith('guild-123', 3);
      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      expect(embed.data.title).toContain('March');
    });

    it('should display income, expenses, and balance fields', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      const fields = embed.data.fields;

      expect(fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: expect.stringContaining('Income'), value: '$5000.00' }),
          expect.objectContaining({ name: expect.stringContaining('Expenses'), value: '$3200.00' }),
          expect.objectContaining({ name: expect.stringContaining('Balance'), value: '$1800.00' }),
        ])
      );
    });

    it('should set color to green when balance is positive', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      expect(embed.data.color).toBe(0x00ff00);
    });

    it('should set color to red when balance is negative', async () => {
      mockBudget.getSummary.mockResolvedValue({
        ...mockSummary,
        balance: '-500.00',
      });

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      expect(embed.data.color).toBe(0xff0000);
    });

    it('should set color to green when balance is zero', async () => {
      mockBudget.getSummary.mockResolvedValue({
        ...mockSummary,
        balance: '0.00',
      });

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      expect(embed.data.color).toBe(0x00ff00);
    });

    it('should display top expense categories when available', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      const catField = embed.data.fields.find((f: any) => f.name === 'Top Expense Categories');

      expect(catField).toBeDefined();
      expect(catField.value).toContain('Food: $1200.00 (37.5%)');
      expect(catField.value).toContain('Transport: $800.00 (25.0%)');
    });

    it('should not display categories field when no categories', async () => {
      mockBudget.getSummary.mockResolvedValue({
        ...mockSummary,
        categories: [],
      });

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      const catField = embed.data.fields.find((f: any) => f.name === 'Top Expense Categories');
      expect(catField).toBeUndefined();
    });

    it('should show transaction count in footer', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      expect(embed.data.footer.text).toBe('45 transactions this month');
    });
  });

  // ──────────────────────────────────────────────
  // Subcommand: categories
  // ──────────────────────────────────────────────

  describe('Subcommand: categories', () => {
    const mockCategories = [
      { category: 'Food', total: '1200.00', count: 20 },
      { category: 'Transport', total: '800.00', count: 15 },
      { category: 'Entertainment', total: '350.00', count: 8 },
    ];

    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('categories');
      mockBudget.getCategories.mockResolvedValue(mockCategories);
    });

    it('should display categories with bar chart', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];

      expect(embed.data.title).toBe('Spending by Category');
      expect(embed.data.description).toContain('**Food**');
      expect(embed.data.description).toContain('$1200.00 (20 transactions)');
      // 1200 / 100 = 12 bars
      expect(embed.data.description).toContain('████████████');
    });

    it('should display bar chart with correct bar count for each category', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      const description = embed.data.description;

      // Food: 1200 / 100 = 12 bars
      expect(description).toContain('█'.repeat(12));
      // Transport: 800 / 100 = 8 bars
      expect(description).toContain('█'.repeat(8));
      // Entertainment: 350 / 100 = 3 bars (Math.floor(3.5))
      expect(description).toContain('█'.repeat(3));
    });

    it('should number categories sequentially', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];

      expect(embed.data.description).toContain('1. **Food**');
      expect(embed.data.description).toContain('2. **Transport**');
      expect(embed.data.description).toContain('3. **Entertainment**');
    });

    it('should show message when no categories found', async () => {
      mockBudget.getCategories.mockResolvedValue([]);

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'No expense categories found.',
      });
    });

    it('should set embed color to blue (0x0099ff)', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      expect(embed.data.color).toBe(0x0099ff);
    });

    it('should show footer when more than 15 categories', async () => {
      const manyCategories = Array.from({ length: 20 }, (_, i) => ({
        category: `Category ${i + 1}`,
        total: '100.00',
        count: 5,
      }));
      mockBudget.getCategories.mockResolvedValue(manyCategories);

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      expect(embed.data.footer.text).toBe('Showing 15 of 20 categories');
    });
  });

  // ──────────────────────────────────────────────
  // Subcommand: recent
  // ──────────────────────────────────────────────

  describe('Subcommand: recent', () => {
    const mockEntries = [
      {
        type: 'expense',
        amount: '45.00',
        date: '2026-01-15T12:00:00Z',
        category: 'Food',
        description: 'Groceries',
      },
      {
        type: 'income',
        amount: '2000.00',
        date: '2026-01-14T09:00:00Z',
        category: 'Salary',
        description: null,
      },
    ];

    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('recent');
      (mockInteraction.options!.getInteger as jest.Mock).mockReturnValue(null);
      mockBudget.getRecentEntries.mockResolvedValue(mockEntries);
    });

    it('should use default limit of 10 when no limit specified', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockBudget.getRecentEntries).toHaveBeenCalledWith('guild-123', 10);
    });

    it('should use custom limit when specified', async () => {
      (mockInteraction.options!.getInteger as jest.Mock).mockReturnValue(5);

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockBudget.getRecentEntries).toHaveBeenCalledWith('guild-123', 5);
    });

    it('should display transactions with correct formatting', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];

      expect(embed.data.title).toBe('Recent Transactions');
      expect(embed.data.description).toContain('-$45.00');
      expect(embed.data.description).toContain('+$2000.00');
      expect(embed.data.description).toContain('Food');
      expect(embed.data.description).toContain('Salary');
    });

    it('should show description when present and omit when null', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];

      expect(embed.data.description).toContain('Groceries');
      // The income entry with null description should not have a trailing dash
      const lines = embed.data.description.split('\n');
      const incomeLine = lines.find((l: string) => l.includes('Salary'));
      expect(incomeLine).not.toContain(' - ');
    });

    it('should use correct emoji for income and expense', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const description = replyCall.embeds[0].data.description;
      const lines = description.split('\n');

      const expenseLine = lines.find((l: string) => l.includes('Food'));
      const incomeLine = lines.find((l: string) => l.includes('Salary'));

      expect(expenseLine).toMatch(/^💸/);
      expect(incomeLine).toMatch(/^💰/);
    });

    it('should show message when no transactions found', async () => {
      mockBudget.getRecentEntries.mockResolvedValue([]);

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'No transactions found.',
      });
    });

    it('should show transaction count in footer', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      expect(embed.data.footer.text).toBe('Showing 2 transactions');
    });
  });

  // ──────────────────────────────────────────────
  // Subcommand: trend
  // ──────────────────────────────────────────────

  describe('Subcommand: trend', () => {
    const mockTrend = [
      { month: 'January', income: '5000.00', expenses: '3200.00', balance: '1800.00' },
      { month: 'February', income: '4500.00', expenses: '4800.00', balance: '-300.00' },
      { month: 'March', income: '5200.00', expenses: '5200.00', balance: '0.00' },
    ];

    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('trend');
      (mockInteraction.options!.getInteger as jest.Mock).mockReturnValue(null);
      mockBudget.getMonthlyTrend.mockResolvedValue(mockTrend);
    });

    it('should use default of 6 months when no months specified', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockBudget.getMonthlyTrend).toHaveBeenCalledWith('guild-123', 6);
    });

    it('should use custom months when specified', async () => {
      (mockInteraction.options!.getInteger as jest.Mock).mockReturnValue(3);

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockBudget.getMonthlyTrend).toHaveBeenCalledWith('guild-123', 3);
    });

    it('should display trend title with correct month count', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      expect(embed.data.title).toBe('Budget Trend - Last 6 Months');
    });

    it('should display custom month count in title', async () => {
      (mockInteraction.options!.getInteger as jest.Mock).mockReturnValue(12);

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      expect(embed.data.title).toBe('Budget Trend - Last 12 Months');
    });

    it('should use checkmark emoji for positive balance', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const description = replyCall.embeds[0].data.description;

      expect(description).toContain('✅ Balance: $1800.00');
    });

    it('should use cross emoji for negative balance', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const description = replyCall.embeds[0].data.description;

      expect(description).toContain('❌ Balance: $-300.00');
    });

    it('should use checkmark emoji for zero balance', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const description = replyCall.embeds[0].data.description;

      expect(description).toContain('✅ Balance: $0.00');
    });

    it('should display monthly income and expenses', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const description = replyCall.embeds[0].data.description;

      expect(description).toContain('**January**');
      expect(description).toContain('💰 Income: $5000.00');
      expect(description).toContain('💸 Expenses: $3200.00');
      expect(description).toContain('**February**');
      expect(description).toContain('💰 Income: $4500.00');
      expect(description).toContain('💸 Expenses: $4800.00');
    });

    it('should set embed color to blue (0x0099ff)', async () => {
      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const replyCall = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = replyCall.embeds[0];
      expect(embed.data.color).toBe(0x0099ff);
    });
  });

  // ──────────────────────────────────────────────
  // Error Handling
  // ──────────────────────────────────────────────

  describe('Error Handling', () => {
    it('should catch errors and log them', async () => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('add');
      (mockInteraction.options!.getString as jest.Mock).mockReturnValue('Food');
      (mockInteraction.options!.getNumber as jest.Mock).mockReturnValue(50);
      mockBudget.addExpense.mockRejectedValue(new Error('Database connection failed'));

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in budget command',
        expect.objectContaining({
          command: 'budget',
          subcommand: 'add',
          error: 'Database connection failed',
          userId: 'user-456',
          guildId: 'guild-123',
        })
      );
    });

    it('should use followUp when interaction is already deferred', async () => {
      mockInteraction.deferred = true;
      mockInteraction.replied = false;
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('summary');
      mockBudget.getSummary.mockRejectedValue(new Error('Query failed'));

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content: 'An error occurred while processing your request.',
      });
    });

    it('should use followUp when interaction is already replied', async () => {
      mockInteraction.replied = true;
      mockInteraction.deferred = false;
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('categories');
      mockBudget.getCategories.mockRejectedValue(new Error('Query failed'));

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content: 'An error occurred while processing your request.',
      });
    });

    it('should use editReply when interaction is not replied or deferred', async () => {
      mockInteraction.replied = false;
      mockInteraction.deferred = false;
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('recent');
      mockBudget.getRecentEntries.mockRejectedValue(new Error('Query failed'));

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'An error occurred while processing your request.',
      });
    });

    it('should include stack trace in error log when available', async () => {
      const testError = new Error('Test error with stack');
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('trend');
      (mockInteraction.options!.getInteger as jest.Mock).mockReturnValue(null);
      mockBudget.getMonthlyTrend.mockRejectedValue(testError);

      await budgetCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in budget command',
        expect.objectContaining({
          stack: expect.stringContaining('Test error with stack'),
        })
      );
    });
  });
});
