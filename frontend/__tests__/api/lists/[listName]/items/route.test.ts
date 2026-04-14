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

import { POST } from '@/app/api/lists/[listName]/items/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';

const mockSession = getServerSession as jest.Mock;

const makeReq = (body: unknown) =>
  new NextRequest('http://localhost/api/lists/Groceries/items', {
    method: 'POST',
    body: JSON.stringify(body),
  });

describe('/api/lists/[listName]/items POST', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ guildId: 'guild-456' });
  });

  it('adds an item to the list', async () => {
    (prisma.list.findFirst as jest.Mock).mockResolvedValue({ id: 1, items: [] });
    (prisma.list.update as jest.Mock).mockResolvedValue({
      id: 1,
      items: [{ text: 'milk', completed: false, added_at: 'now' }],
    });
    const res = await POST(makeReq({ item: 'milk' }), { params: { listName: 'Groceries' } });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    const call = (prisma.list.update as jest.Mock).mock.calls[0][0];
    expect(call.data.items).toHaveLength(1);
    expect(call.data.items[0].text).toBe('milk');
  });

  it('preserves existing items', async () => {
    (prisma.list.findFirst as jest.Mock).mockResolvedValue({
      id: 1,
      items: [{ text: 'eggs', completed: false, added_at: 'x' }],
    });
    (prisma.list.update as jest.Mock).mockResolvedValue({ id: 1 });
    await POST(makeReq({ item: 'milk' }), { params: { listName: 'Groceries' } });
    const call = (prisma.list.update as jest.Mock).mock.calls[0][0];
    expect(call.data.items).toHaveLength(2);
  });

  it('returns 401 when no session', async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(makeReq({ item: 'x' }), { params: { listName: 'g' } });
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeReq({ item: 'x' }), { params: { listName: 'g' } });
    expect(res.status).toBe(404);
  });

  it('returns 400 when item missing', async () => {
    const res = await POST(makeReq({}), { params: { listName: 'g' } });
    expect(res.status).toBe(400);
  });

  it('returns 400 when item is empty', async () => {
    const res = await POST(makeReq({ item: '   ' }), { params: { listName: 'g' } });
    expect(res.status).toBe(400);
  });

  it('returns 404 when list not found', async () => {
    (prisma.list.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeReq({ item: 'x' }), { params: { listName: 'g' } });
    expect(res.status).toBe(404);
  });

  it('returns 500 on prisma error', async () => {
    (prisma.list.findFirst as jest.Mock).mockRejectedValue(new Error('db'));
    const res = await POST(makeReq({ item: 'x' }), { params: { listName: 'g' } });
    expect(res.status).toBe(500);
  });
});
