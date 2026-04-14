/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(),
}));
jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/db/prisma', () => {
  const mock = {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    budget: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  return { __esModule: true, default: mock, prisma: mock };
});

import { GET, POST } from '@/app/api/budget/transactions/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';

const mockSession = getServerSession as jest.Mock;

describe('/api/budget/transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      guildId: 'guild-456',
      discordId: 'discord-123',
    });
  });

  describe('GET', () => {
    it('returns transactions for authenticated user', async () => {
      (prisma.budget.findMany as jest.Mock).mockResolvedValue([{ id: 1, amount: 50 }]);
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
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/budget/transactions'));
      expect(res.status).toBe(404);
    });

    it('returns 500 on prisma error', async () => {
      (prisma.budget.findMany as jest.Mock).mockRejectedValue(new Error('db'));
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

    it('creates a transaction', async () => {
      (prisma.budget.create as jest.Mock).mockResolvedValue({ id: 1, amount: 100 });
      const res = await POST(
        makeReq({ amount: 100, type: 'income', category: 'salary', description: 'pay' })
      );
      const body = await res.json();
      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.amount).toBe(100);
    });

    it('parses YYYY-MM-DD date as local midnight', async () => {
      (prisma.budget.create as jest.Mock).mockResolvedValue({ id: 2 });
      await POST(makeReq({ amount: 10, type: 'expense', category: 'food', date: '2026-05-01' }));
      const callArg = (prisma.budget.create as jest.Mock).mock.calls[0][0].data.date;
      expect(callArg).toBeInstanceOf(Date);
      expect(callArg.getFullYear()).toBe(2026);
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await POST(makeReq({ amount: 10, type: 'income', category: 'a' }));
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ amount: 10, type: 'income', category: 'a' }));
      expect(res.status).toBe(404);
    });

    it('returns 400 when amount missing', async () => {
      const res = await POST(makeReq({ type: 'income', category: 'a' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when amount is not a number', async () => {
      const res = await POST(makeReq({ amount: 'bad', type: 'income', category: 'a' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid type', async () => {
      const res = await POST(makeReq({ amount: 10, type: 'bogus', category: 'a' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when category missing', async () => {
      const res = await POST(makeReq({ amount: 10, type: 'income' }));
      expect(res.status).toBe(400);
    });

    it('returns 500 on prisma error', async () => {
      (prisma.budget.create as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await POST(makeReq({ amount: 10, type: 'income', category: 'a' }));
      expect(res.status).toBe(500);
    });
  });
});
