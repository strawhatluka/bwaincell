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
    user: { findUnique: jest.fn() },
    budget: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  return { __esModule: true, default: mock, prisma: mock };
});

import { PATCH, DELETE } from '@/app/api/budget/transactions/[id]/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';

const mockSession = getServerSession as jest.Mock;

describe('/api/budget/transactions/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ guildId: 'guild-456' });
  });

  const makeReq = (body: unknown) =>
    new NextRequest('http://localhost/api/budget/transactions/1', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });

  describe('PATCH', () => {
    it('updates a transaction', async () => {
      (prisma.budget.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.budget.findUnique as jest.Mock).mockResolvedValue({ id: 1, amount: 99 });
      const res = await PATCH(makeReq({ amount: 99 }), { params: Promise.resolve({ id: '1' }) });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.amount).toBe(99);
    });

    it('updates all fields including date (YYYY-MM-DD)', async () => {
      (prisma.budget.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.budget.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      await PATCH(
        makeReq({
          amount: 50,
          type: 'expense',
          category: 'food',
          description: 'x',
          date: '2026-05-01',
        }),
        { params: Promise.resolve({ id: '1' }) }
      );
      const updateArg = (prisma.budget.updateMany as jest.Mock).mock.calls[0][0].data;
      expect(updateArg.date).toBeInstanceOf(Date);
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await PATCH(makeReq({ amount: 1 }), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await PATCH(makeReq({ amount: 1 }), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid id', async () => {
      const res = await PATCH(makeReq({ amount: 1 }), { params: Promise.resolve({ id: 'abc' }) });
      expect(res.status).toBe(400);
    });

    it('returns 400 when amount is not a number', async () => {
      const res = await PATCH(makeReq({ amount: 'bad' }), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid type', async () => {
      const res = await PATCH(makeReq({ type: 'nope' }), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(400);
    });

    it('returns 404 when transaction not found', async () => {
      (prisma.budget.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      const res = await PATCH(makeReq({ amount: 1 }), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 500 on prisma error', async () => {
      (prisma.budget.updateMany as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await PATCH(makeReq({ amount: 1 }), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    const delReq = () =>
      new NextRequest('http://localhost/api/budget/transactions/1', { method: 'DELETE' });

    it('deletes a transaction', async () => {
      (prisma.budget.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid id', async () => {
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: 'abc' }) });
      expect(res.status).toBe(400);
    });

    it('returns 404 when transaction not found', async () => {
      (prisma.budget.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 500 on prisma error', async () => {
      (prisma.budget.deleteMany as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(500);
    });
  });
});
