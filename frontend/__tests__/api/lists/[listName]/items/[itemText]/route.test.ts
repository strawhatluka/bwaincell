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

import { DELETE } from '@/app/api/lists/[listName]/items/[itemText]/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';

const mockSession = getServerSession as jest.Mock;

const makeReq = () =>
  new NextRequest('http://localhost/api/lists/Groceries/items/milk', { method: 'DELETE' });

describe('/api/lists/[listName]/items/[itemText] DELETE', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ guildId: 'guild-456' });
  });

  it('removes the item', async () => {
    (prisma.list.findFirst as jest.Mock).mockResolvedValue({
      id: 1,
      items: [
        { text: 'milk', completed: false, added_at: 'x' },
        { text: 'eggs', completed: false, added_at: 'y' },
      ],
    });
    (prisma.list.update as jest.Mock).mockResolvedValue({ id: 1 });
    const res = await DELETE(makeReq(), {
      params: Promise.resolve({ listName: 'Groceries', itemText: 'milk' }),
    });
    expect(res.status).toBe(200);
    const call = (prisma.list.update as jest.Mock).mock.calls[0][0];
    expect(call.data.items).toHaveLength(1);
    expect(call.data.items[0].text).toBe('eggs');
  });

  it('matches item case-insensitively', async () => {
    (prisma.list.findFirst as jest.Mock).mockResolvedValue({
      id: 1,
      items: [{ text: 'Milk', completed: false, added_at: 'x' }],
    });
    (prisma.list.update as jest.Mock).mockResolvedValue({ id: 1 });
    const res = await DELETE(makeReq(), {
      params: Promise.resolve({ listName: 'Groceries', itemText: 'MILK' }),
    });
    expect(res.status).toBe(200);
  });

  it('returns 401 when no session', async () => {
    mockSession.mockResolvedValue(null);
    const res = await DELETE(makeReq(), {
      params: Promise.resolve({ listName: 'g', itemText: 'x' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(makeReq(), {
      params: Promise.resolve({ listName: 'g', itemText: 'x' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 when list not found', async () => {
    (prisma.list.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(makeReq(), {
      params: Promise.resolve({ listName: 'g', itemText: 'x' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 when item not found', async () => {
    (prisma.list.findFirst as jest.Mock).mockResolvedValue({
      id: 1,
      items: [{ text: 'other', completed: false, added_at: 'x' }],
    });
    const res = await DELETE(makeReq(), {
      params: Promise.resolve({ listName: 'g', itemText: 'missing' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 500 on prisma error', async () => {
    (prisma.list.findFirst as jest.Mock).mockRejectedValue(new Error('db'));
    const res = await DELETE(makeReq(), {
      params: Promise.resolve({ listName: 'g', itemText: 'x' }),
    });
    expect(res.status).toBe(500);
  });
});
