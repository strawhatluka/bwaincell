/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(),
}));
jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn() }));

import { GET, POST } from '@/app/api/budget/transactions/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { User } from '@database/models/User';
import Budget from '@database/models/Budget';

const mockSession = getServerSession as jest.Mock;

describe('/api/budget/transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (User.findByEmail as jest.Mock).mockResolvedValue({
      guild_id: 'guild-456',
      discord_id: 'discord-123',
    });
  });

  describe('GET', () => {
    it('returns transactions for authenticated user', async () => {
      (Budget.getRecentEntries as jest.Mock).mockResolvedValue([{ id: 1, amount: 50 }]);
      const res = await GET(new NextRequest('http://localhost/api/budget/transactions'));
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/budget/transactions'));
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/budget/transactions'));
      expect(res.status).toBe(404);
    });

    it('returns 500 on db error', async () => {
      (Budget.getRecentEntries as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await GET(new NextRequest('http://localhost/api/budget/transactions'));
      expect(res.status).toBe(500);
    });
  });

  describe('POST', () => {
    const makeReq = (body: unknown) =>
      new NextRequest('http://localhost/api/budget/transactions', {
        method: 'POST',
        body: JSON.stringify(body),
      });

    it('creates an income transaction', async () => {
      (Budget.addIncome as jest.Mock).mockResolvedValue({ id: 1, amount: 100 });
      const res = await POST(makeReq({ amount: 100, type: 'income', description: 'pay' }));
      const body = await res.json();
      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.amount).toBe(100);
      expect(Budget.addIncome).toHaveBeenCalled();
    });

    it('creates an expense transaction', async () => {
      (Budget.addExpense as jest.Mock).mockResolvedValue({ id: 2, amount: 10 });
      await POST(makeReq({ amount: 10, type: 'expense', category: 'food' }));
      expect(Budget.addExpense).toHaveBeenCalledWith(
        'guild-456',
        'food',
        10,
        undefined,
        'discord-123'
      );
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await POST(makeReq({ amount: 10, type: 'income' }));
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ amount: 10, type: 'income' }));
      expect(res.status).toBe(404);
    });

    it('returns 400 when amount missing', async () => {
      const res = await POST(makeReq({ type: 'income' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when amount is not a number', async () => {
      const res = await POST(makeReq({ amount: 'bad', type: 'income' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid type', async () => {
      const res = await POST(makeReq({ amount: 10, type: 'bogus' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when category missing for expense', async () => {
      const res = await POST(makeReq({ amount: 10, type: 'expense' }));
      expect(res.status).toBe(400);
    });

    it('returns 500 on db error', async () => {
      (Budget.addIncome as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await POST(makeReq({ amount: 10, type: 'income' }));
      expect(res.status).toBe(500);
    });
  });
});
