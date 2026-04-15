/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(),
}));
jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn() }));

import { DELETE } from '@/app/api/lists/[listName]/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { User } from '@database/models/User';
import List from '@database/models/List';

const mockSession = getServerSession as jest.Mock;

const makeReq = () => new NextRequest('http://localhost/api/lists/Groceries', { method: 'DELETE' });

describe('/api/lists/[listName] DELETE', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (User.findByEmail as jest.Mock).mockResolvedValue({ guild_id: 'guild-456' });
  });

  it('deletes the list', async () => {
    (List.deleteList as jest.Mock).mockResolvedValue(true);
    const res = await DELETE(makeReq(), { params: Promise.resolve({ listName: 'Groceries' }) });
    expect(res.status).toBe(200);
  });

  it('decodes the list name', async () => {
    (List.deleteList as jest.Mock).mockResolvedValue(true);
    await DELETE(makeReq(), { params: Promise.resolve({ listName: 'My%20List' }) });
    expect(List.deleteList).toHaveBeenCalledWith('guild-456', 'My List');
  });

  it('returns 401 when no session', async () => {
    mockSession.mockResolvedValue(null);
    const res = await DELETE(makeReq(), { params: Promise.resolve({ listName: 'x' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    (User.findByEmail as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(makeReq(), { params: Promise.resolve({ listName: 'x' }) });
    expect(res.status).toBe(404);
  });

  it('returns 404 when list not found', async () => {
    (List.deleteList as jest.Mock).mockResolvedValue(false);
    const res = await DELETE(makeReq(), { params: Promise.resolve({ listName: 'x' }) });
    expect(res.status).toBe(404);
  });

  it('returns 500 on db error', async () => {
    (List.deleteList as jest.Mock).mockRejectedValue(new Error('db'));
    const res = await DELETE(makeReq(), { params: Promise.resolve({ listName: 'x' }) });
    expect(res.status).toBe(500);
  });
});
