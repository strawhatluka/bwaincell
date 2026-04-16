/**
 * Unit tests for /api/budget Express route handlers
 *
 * Tests all budget operations: transactions, summary, categories,
 * trends, creating expenses/income, and deleting transactions.
 */

// Mock dependencies BEFORE imports
jest.mock('../../../../shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@database/index', () => ({
  Budget: {
    getRecentEntries: jest.fn(),
    getSummary: jest.fn(),
    getCategories: jest.fn(),
    getMonthlyTrend: jest.fn(),
    addExpense: jest.fn(),
    addIncome: jest.fn(),
    deleteEntry: jest.fn(),
  },
}));

import { Budget } from '@database/index';
import express from 'express';
import budgetRouter from '../../../../src/api/routes/budget';
import request from 'supertest';

const mockBudget = Budget as jest.Mocked<typeof Budget>;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = {
      discordId: 'discord-123',
      guildId: 'guild-123',
      email: 'test@test.com',
      googleId: 'google-123',
      name: 'Test User',
    };
    next();
  });
  app.use('/budget', budgetRouter);
  return app;
}

describe('Budget API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  // ─── GET /budget/transactions ─────────────────────────────────────

  describe('GET /budget/transactions', () => {
    it('should return recent transactions with default limit', async () => {
      const fakeTransactions = [
        { id: 1, type: 'expense', amount: 50, category: 'Food' },
        { id: 2, type: 'income', amount: 2000, category: null },
      ];
      mockBudget.getRecentEntries.mockResolvedValue(fakeTransactions as any);

      const res = await request(app).get('/budget/transactions');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(fakeTransactions);
      expect(mockBudget.getRecentEntries).toHaveBeenCalledWith('guild-123', 10);
    });

    it('should accept custom limit', async () => {
      mockBudget.getRecentEntries.mockResolvedValue([] as any);

      const res = await request(app).get('/budget/transactions?limit=25');

      expect(res.status).toBe(200);
      expect(mockBudget.getRecentEntries).toHaveBeenCalledWith('guild-123', 25);
    });

    it('should cap limit at 100', async () => {
      mockBudget.getRecentEntries.mockResolvedValue([] as any);

      const res = await request(app).get('/budget/transactions?limit=500');

      expect(res.status).toBe(200);
      expect(mockBudget.getRecentEntries).toHaveBeenCalledWith('guild-123', 100);
    });

    it('should default to 10 for invalid limit', async () => {
      mockBudget.getRecentEntries.mockResolvedValue([] as any);

      const res = await request(app).get('/budget/transactions?limit=abc');

      expect(res.status).toBe(200);
      expect(mockBudget.getRecentEntries).toHaveBeenCalledWith('guild-123', 10);
    });

    it('should default to 10 for negative limit', async () => {
      mockBudget.getRecentEntries.mockResolvedValue([] as any);

      const res = await request(app).get('/budget/transactions?limit=-5');

      expect(res.status).toBe(200);
      expect(mockBudget.getRecentEntries).toHaveBeenCalledWith('guild-123', 10);
    });

    it('should handle server errors', async () => {
      mockBudget.getRecentEntries.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/budget/transactions');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /budget/summary ──────────────────────────────────────────

  describe('GET /budget/summary', () => {
    it('should return budget summary without month parameter', async () => {
      const fakeSummary = {
        totalIncome: 5000,
        totalExpenses: 2000,
        balance: 3000,
        entryCount: 15,
      };
      mockBudget.getSummary.mockResolvedValue(fakeSummary as any);

      const res = await request(app).get('/budget/summary');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(fakeSummary);
      expect(mockBudget.getSummary).toHaveBeenCalledWith('guild-123', null);
    });

    it('should return budget summary for a specific month', async () => {
      const fakeSummary = {
        totalIncome: 3000,
        totalExpenses: 1500,
        balance: 1500,
        entryCount: 8,
      };
      mockBudget.getSummary.mockResolvedValue(fakeSummary as any);

      const res = await request(app).get('/budget/summary?month=3');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(fakeSummary);
      expect(mockBudget.getSummary).toHaveBeenCalledWith('guild-123', 3);
    });

    it('should return 400 for invalid month (0)', async () => {
      const res = await request(app).get('/budget/summary?month=0');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Month must be a number between 1 and 12');
    });

    it('should return 400 for invalid month (13)', async () => {
      const res = await request(app).get('/budget/summary?month=13');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Month must be a number between 1 and 12');
    });

    it('should return 400 for non-numeric month', async () => {
      const res = await request(app).get('/budget/summary?month=abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Month must be a number between 1 and 12');
    });

    it('should handle server errors', async () => {
      mockBudget.getSummary.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/budget/summary');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /budget/categories ───────────────────────────────────────

  describe('GET /budget/categories', () => {
    it('should return spending by category', async () => {
      const fakeCategories = [
        { category: 'Food', total: 500 },
        { category: 'Transport', total: 200 },
      ];
      mockBudget.getCategories.mockResolvedValue(fakeCategories as any);

      const res = await request(app).get('/budget/categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(fakeCategories);
      expect(mockBudget.getCategories).toHaveBeenCalledWith('guild-123');
    });

    it('should return empty array when no categories exist', async () => {
      mockBudget.getCategories.mockResolvedValue([] as any);

      const res = await request(app).get('/budget/categories');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should handle server errors', async () => {
      mockBudget.getCategories.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/budget/categories');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /budget/trends ───────────────────────────────────────────

  describe('GET /budget/trends', () => {
    it('should return monthly trends with default 6 months', async () => {
      const fakeTrends = [
        { month: 'January', income: 5000, expenses: 3000 },
        { month: 'February', income: 5000, expenses: 2500 },
      ];
      mockBudget.getMonthlyTrend.mockResolvedValue(fakeTrends as any);

      const res = await request(app).get('/budget/trends');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(fakeTrends);
      expect(mockBudget.getMonthlyTrend).toHaveBeenCalledWith('guild-123', 6);
    });

    it('should accept custom months parameter', async () => {
      mockBudget.getMonthlyTrend.mockResolvedValue([] as any);

      const res = await request(app).get('/budget/trends?months=3');

      expect(res.status).toBe(200);
      expect(mockBudget.getMonthlyTrend).toHaveBeenCalledWith('guild-123', 3);
    });

    it('should cap months at 12', async () => {
      mockBudget.getMonthlyTrend.mockResolvedValue([] as any);

      const res = await request(app).get('/budget/trends?months=24');

      expect(res.status).toBe(200);
      expect(mockBudget.getMonthlyTrend).toHaveBeenCalledWith('guild-123', 12);
    });

    it('should default to 6 for invalid months', async () => {
      mockBudget.getMonthlyTrend.mockResolvedValue([] as any);

      const res = await request(app).get('/budget/trends?months=abc');

      expect(res.status).toBe(200);
      expect(mockBudget.getMonthlyTrend).toHaveBeenCalledWith('guild-123', 6);
    });

    it('should default to 6 for negative months', async () => {
      mockBudget.getMonthlyTrend.mockResolvedValue([] as any);

      const res = await request(app).get('/budget/trends?months=-2');

      expect(res.status).toBe(200);
      expect(mockBudget.getMonthlyTrend).toHaveBeenCalledWith('guild-123', 6);
    });

    it('should handle server errors', async () => {
      mockBudget.getMonthlyTrend.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/budget/trends');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── POST /budget/transactions ────────────────────────────────────

  describe('POST /budget/transactions', () => {
    it('should create an expense transaction', async () => {
      const createdTransaction = {
        id: 1,
        type: 'expense',
        amount: 50,
        category: 'Food',
        description: 'Lunch',
      };
      mockBudget.addExpense.mockResolvedValue(createdTransaction as any);

      const res = await request(app).post('/budget/transactions').send({
        type: 'expense',
        amount: 50,
        category: 'Food',
        description: 'Lunch',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(createdTransaction);
      expect(mockBudget.addExpense).toHaveBeenCalledWith(
        'guild-123',
        'Food',
        50,
        'Lunch',
        'discord-123'
      );
    });

    it('should create an income transaction', async () => {
      const createdTransaction = {
        id: 2,
        type: 'income',
        amount: 2000,
        description: 'Salary',
      };
      mockBudget.addIncome.mockResolvedValue(createdTransaction as any);

      const res = await request(app).post('/budget/transactions').send({
        type: 'income',
        amount: 2000,
        description: 'Salary',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(mockBudget.addIncome).toHaveBeenCalledWith('guild-123', 2000, 'Salary', 'discord-123');
    });

    it('should create an expense without description', async () => {
      const createdTransaction = { id: 3, type: 'expense', amount: 25, category: 'Transport' };
      mockBudget.addExpense.mockResolvedValue(createdTransaction as any);

      const res = await request(app).post('/budget/transactions').send({
        type: 'expense',
        amount: 25,
        category: 'Transport',
      });

      expect(res.status).toBe(201);
      expect(mockBudget.addExpense).toHaveBeenCalledWith(
        'guild-123',
        'Transport',
        25,
        null,
        'discord-123'
      );
    });

    it('should return 400 when type is missing', async () => {
      const res = await request(app)
        .post('/budget/transactions')
        .send({ amount: 50, category: 'Food' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Type is required');
    });

    it('should return 400 for invalid type', async () => {
      const res = await request(app)
        .post('/budget/transactions')
        .send({ type: 'transfer', amount: 50, category: 'Food' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Type is required');
    });

    it('should return 400 when amount is missing', async () => {
      const res = await request(app)
        .post('/budget/transactions')
        .send({ type: 'expense', category: 'Food' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Amount is required');
    });

    it('should return 400 when amount is zero', async () => {
      const res = await request(app)
        .post('/budget/transactions')
        .send({ type: 'expense', amount: 0, category: 'Food' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Amount must be a positive number');
    });

    it('should return 400 when amount is negative', async () => {
      const res = await request(app)
        .post('/budget/transactions')
        .send({ type: 'expense', amount: -50, category: 'Food' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Amount must be a positive number');
    });

    it('should return 400 when amount is not a number', async () => {
      const res = await request(app)
        .post('/budget/transactions')
        .send({ type: 'expense', amount: 'fifty', category: 'Food' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Amount must be a positive number');
    });

    it('should return 400 when category is missing for expense', async () => {
      const res = await request(app)
        .post('/budget/transactions')
        .send({ type: 'expense', amount: 50 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Category is required for expenses');
    });

    it('should return 400 when category is empty for expense', async () => {
      const res = await request(app)
        .post('/budget/transactions')
        .send({ type: 'expense', amount: 50, category: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Category cannot be empty');
    });

    it('should not require category for income', async () => {
      const createdTransaction = { id: 4, type: 'income', amount: 1000 };
      mockBudget.addIncome.mockResolvedValue(createdTransaction as any);

      const res = await request(app)
        .post('/budget/transactions')
        .send({ type: 'income', amount: 1000 });

      expect(res.status).toBe(201);
      expect(mockBudget.addIncome).toHaveBeenCalled();
    });

    it('should handle server errors', async () => {
      mockBudget.addExpense.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/budget/transactions')
        .send({ type: 'expense', amount: 50, category: 'Food' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── DELETE /budget/transactions/:id ──────────────────────────────

  describe('DELETE /budget/transactions/:id', () => {
    it('should delete a transaction successfully', async () => {
      mockBudget.deleteEntry.mockResolvedValue(true as any);

      const res = await request(app).delete('/budget/transactions/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Transaction deleted successfully');
      expect(mockBudget.deleteEntry).toHaveBeenCalledWith(1, 'guild-123');
    });

    it('should return 400 for invalid transaction ID', async () => {
      const res = await request(app).delete('/budget/transactions/abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid transaction ID');
    });

    it('should return 404 when transaction is not found', async () => {
      mockBudget.deleteEntry.mockResolvedValue(false as any);

      const res = await request(app).delete('/budget/transactions/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Transaction not found');
    });

    it('should handle server errors', async () => {
      mockBudget.deleteEntry.mockRejectedValue(new Error('DB error'));

      const res = await request(app).delete('/budget/transactions/1');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});
