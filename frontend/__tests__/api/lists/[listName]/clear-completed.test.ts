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
    list: { findFirst: jest.fn(), update: jest.fn() },
  };
  return { __esModule: true, default: mock, prisma: mock };
});

import { POST } from '@/app/api/lists/[listName]/clear-completed/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';

const mockSession = getServerSession as jest.Mock;

const makeReq = () =>
  new NextRequest('http://localhost/api/lists/Groceries/clear-completed', { method: 'POST' });

describe('/api/lists/[listName]/clear-completed POST', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ guildId: 'guild-456' });
  });

  it('removes completed items', async () => {
    (prisma.list.findFirst as jest.Mock).mockResolvedValue({
      id: 1,
      items: [
        { text: 'a', completed: true, added_at: 'x' },
        { text: 'b', completed: false, added_at: 'y' },
        { text: 'c', completed: true, added_at: 'z' },
      ],
    });
    (prisma.list.update as jest.Mock).mockResolvedValue({ id: 1 });
    const res = await POST(makeReq(), { params: Promise.resolve({ listName: 'Groceries' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.message).toContain('2');
    const call = (prisma.list.update as jest.Mock).mock.calls[0][0];
    expect(call.data.items).toHaveLength(1);
    expect(call.data.items[0].text).toBe('b');
  });

  it('handles zero completed items', async () => {
    (prisma.list.findFirst as jest.Mock).mockResolvedValue({
      id: 1,
      items: [{ text: 'a', completed: false, added_at: 'x' }],
    });
    (prisma.list.update as jest.Mock).mockResolvedValue({ id: 1 });
    const res = await POST(makeReq(), { params: Promise.resolve({ listName: 'Groceries' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.message).toContain('0');
  });

  it('returns 401 when no session', async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(makeReq(), { params: Promise.resolve({ listName: 'g' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeReq(), { params: Promise.resolve({ listName: 'g' }) });
    expect(res.status).toBe(404);
  });

  it('returns 404 when list not found', async () => {
    (prisma.list.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeReq(), { params: Promise.resolve({ listName: 'g' }) });
    expect(res.status).toBe(404);
  });

  it('returns 500 on prisma error', async () => {
    (prisma.list.findFirst as jest.Mock).mockRejectedValue(new Error('db'));
    const res = await POST(makeReq(), { params: Promise.resolve({ listName: 'g' }) });
    expect(res.status).toBe(500);
  });
});
