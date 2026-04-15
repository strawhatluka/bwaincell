/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(),
}));
jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn() }));

import { GET } from '@/app/api/budget/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { User } from '@database/models/User';
import Budget from '@database/models/Budget';

const mockSession = getServerSession as jest.Mock;

describe('/api/budget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (User.findByEmail as jest.Mock).mockResolvedValue({ guild_id: 'guild-456' });
  });

  describe('GET', () => {
    it('returns transactions for authenticated user', async () => {
      (Budget.getRecentEntries as jest.Mock).mockResolvedValue([
        { id: 1, amount: 100, type: 'income', category: 'salary' },
      ]);
      const res = await GET(new NextRequest('http://localhost/api/budget'));
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(Budget.getRecentEntries).toHaveBeenCalledWith('guild-456', 100);
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
      (User.findByEmail as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/budget'));
      expect(res.status).toBe(404);
    });

    it('returns 500 on db error', async () => {
      (Budget.getRecentEntries as jest.Mock).mockRejectedValue(new Error('db fail'));
      const res = await GET(new NextRequest('http://localhost/api/budget'));
      expect(res.status).toBe(500);
    });

    it('returns empty array when no transactions', async () => {
      (Budget.getRecentEntries as jest.Mock).mockResolvedValue([]);
      const res = await GET(new NextRequest('http://localhost/api/budget'));
      const body = await res.json();
      expect(body.data).toEqual([]);
    });
  });
});
