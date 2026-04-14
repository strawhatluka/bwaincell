/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(),
}));
jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn() }));

import { GET, POST } from '@/app/api/lists/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { User } from '@database/models/User';
import List from '@database/models/List';

const mockSession = getServerSession as jest.Mock;

describe('/api/lists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (User.findByEmail as jest.Mock).mockResolvedValue({
      guild_id: 'guild-456',
      discord_id: 'discord-123',
    });
  });

  describe('GET', () => {
    it('returns lists for authenticated user', async () => {
      (List.getUserLists as jest.Mock).mockResolvedValue([{ id: 1, name: 'L1' }]);
      const res = await GET(new NextRequest('http://localhost/api/lists'));
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(1);
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/lists'));
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/lists'));
      expect(res.status).toBe(404);
    });

    it('returns 500 on db error', async () => {
      (List.getUserLists as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await GET(new NextRequest('http://localhost/api/lists'));
      expect(res.status).toBe(500);
    });
  });

  describe('POST', () => {
    const makeReq = (body: unknown) =>
      new NextRequest('http://localhost/api/lists', {
        method: 'POST',
        body: JSON.stringify(body),
      });

    it('creates a list', async () => {
      (List.createList as jest.Mock).mockResolvedValue({ id: 1, name: 'Groceries' });
      const res = await POST(makeReq({ name: 'Groceries' }));
      const body = await res.json();
      expect(res.status).toBe(201);
      expect(body.data.name).toBe('Groceries');
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await POST(makeReq({ name: 'x' }));
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ name: 'x' }));
      expect(res.status).toBe(404);
    });

    it('returns 400 when name missing', async () => {
      const res = await POST(makeReq({}));
      expect(res.status).toBe(400);
    });

    it('returns 400 when name is empty', async () => {
      const res = await POST(makeReq({ name: '  ' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when list with same name exists', async () => {
      (List.createList as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ name: 'Dup' }));
      expect(res.status).toBe(400);
    });

    it('returns 500 on db error', async () => {
      (List.createList as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await POST(makeReq({ name: 'x' }));
      expect(res.status).toBe(500);
    });
  });
});
