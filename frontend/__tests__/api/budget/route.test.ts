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

import { GET } from '@/app/api/budget/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';

const mockSession = getServerSession as jest.Mock;

describe('/api/budget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ guildId: 'guild-456' });
  });

  describe('GET', () => {
    it('returns transactions for authenticated user', async () => {
      (prisma.budget.findMany as jest.Mock).mockResolvedValue([
        { id: 1, amount: 100, type: 'income', category: 'salary' },
      ]);
      const res = await GET(new NextRequest('http://localhost/api/budget'));
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: { guildId: 'guild-456' },
        orderBy: { date: 'desc' },
      });
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/budget'));
      expect(res.status).toBe(401);
    });

    it('returns 401 when session has no email', async () => {
      mockSession.mockResolvedValue({ user: {} });
      const res = await GET(new NextRequest('http://localhost/api/budget'));
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/budget'));
      expect(res.status).toBe(404);
    });

    it('returns 500 on prisma error', async () => {
      (prisma.budget.findMany as jest.Mock).mockRejectedValue(new Error('db fail'));
      const res = await GET(new NextRequest('http://localhost/api/budget'));
      expect(res.status).toBe(500);
    });

    it('returns empty array when no transactions', async () => {
      (prisma.budget.findMany as jest.Mock).mockResolvedValue([]);
      const res = await GET(new NextRequest('http://localhost/api/budget'));
      const body = await res.json();
      expect(body.data).toEqual([]);
    });
  });
});
