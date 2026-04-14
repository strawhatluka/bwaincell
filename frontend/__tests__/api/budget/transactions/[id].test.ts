/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(),
}));
jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn() }));

import { PATCH, DELETE } from '@/app/api/budget/transactions/[id]/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { User } from '@database/models/User';
import Budget from '@database/models/Budget';
import supabaseRaw from '@database/supabase';

// Cast to any since the chained mock shape doesn't match SupabaseClient's typed interface
const supabase = supabaseRaw as any;

const mockSession = getServerSession as jest.Mock;

describe('/api/budget/transactions/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (User.findByEmail as jest.Mock).mockResolvedValue({ guild_id: 'guild-456' });
    // Default supabase success response
    (supabase.single as jest.Mock).mockResolvedValue({ data: { id: 1, amount: 99 }, error: null });
  });

  const makeReq = (body: unknown) =>
    new NextRequest('http://localhost/api/budget/transactions/1', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });

  describe('PATCH', () => {
    it('updates a transaction', async () => {
      const res = await PATCH(makeReq({ amount: 99 }), { params: Promise.resolve({ id: '1' }) });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.amount).toBe(99);
    });

    it('updates all fields including date (YYYY-MM-DD)', async () => {
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
      const updateArg = (supabase.update as jest.Mock).mock.calls[0][0];
      expect(updateArg.amount).toBe(50);
      expect(updateArg.type).toBe('expense');
      expect(updateArg.category).toBe('food');
      expect(typeof updateArg.date).toBe('string');
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await PATCH(makeReq({ amount: 1 }), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue(null);
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
      (supabase.single as jest.Mock).mockResolvedValue({ data: null, error: { message: 'x' } });
      const res = await PATCH(makeReq({ amount: 1 }), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 500 on supabase throw', async () => {
      (supabase.single as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await PATCH(makeReq({ amount: 1 }), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    const delReq = () =>
      new NextRequest('http://localhost/api/budget/transactions/1', { method: 'DELETE' });

    it('deletes a transaction', async () => {
      (Budget.deleteEntry as jest.Mock).mockResolvedValue(true);
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
      (User.findByEmail as jest.Mock).mockResolvedValue(null);
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid id', async () => {
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: 'abc' }) });
      expect(res.status).toBe(400);
    });

    it('returns 404 when transaction not found', async () => {
      (Budget.deleteEntry as jest.Mock).mockResolvedValue(false);
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 500 on db error', async () => {
      (Budget.deleteEntry as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(500);
    });
  });
});
