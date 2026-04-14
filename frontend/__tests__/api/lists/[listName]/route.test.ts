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
    list: { deleteMany: jest.fn() },
  };
  return { __esModule: true, default: mock, prisma: mock };
});

import { DELETE } from '@/app/api/lists/[listName]/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';

const mockSession = getServerSession as jest.Mock;

const makeReq = () => new NextRequest('http://localhost/api/lists/Groceries', { method: 'DELETE' });

describe('/api/lists/[listName] DELETE', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ guildId: 'guild-456' });
  });

  it('deletes the list', async () => {
    (prisma.list.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
    const res = await DELETE(makeReq(), { params: { listName: 'Groceries' } });
    expect(res.status).toBe(200);
  });

  it('decodes the list name', async () => {
    (prisma.list.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
    await DELETE(makeReq(), { params: { listName: 'My%20List' } });
    const call = (prisma.list.deleteMany as jest.Mock).mock.calls[0][0];
    expect(call.where.name.equals).toBe('My List');
  });

  it('returns 401 when no session', async () => {
    mockSession.mockResolvedValue(null);
    const res = await DELETE(makeReq(), { params: { listName: 'x' } });
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(makeReq(), { params: { listName: 'x' } });
    expect(res.status).toBe(404);
  });

  it('returns 404 when list not found', async () => {
    (prisma.list.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    const res = await DELETE(makeReq(), { params: { listName: 'x' } });
    expect(res.status).toBe(404);
  });

  it('returns 500 on prisma error', async () => {
    (prisma.list.deleteMany as jest.Mock).mockRejectedValue(new Error('db'));
    const res = await DELETE(makeReq(), { params: { listName: 'x' } });
    expect(res.status).toBe(500);
  });
});
