/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(),
}));
jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn() }));

import { DELETE } from '@/app/api/lists/[listName]/items/[itemText]/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { User } from '@database/models/User';
import List from '@database/models/List';

const mockSession = getServerSession as jest.Mock;

const makeReq = () =>
  new NextRequest('http://localhost/api/lists/Groceries/items/milk', { method: 'DELETE' });

describe('/api/lists/[listName]/items/[itemText] DELETE', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (User.findByEmail as jest.Mock).mockResolvedValue({ guild_id: 'guild-456' });
  });

  it('removes the item', async () => {
    (List.removeItem as jest.Mock).mockResolvedValue({ id: 1, items: [] });
    const res = await DELETE(makeReq(), {
      params: Promise.resolve({ listName: 'Groceries', itemText: 'milk' }),
    });
    expect(res.status).toBe(200);
    expect(List.removeItem).toHaveBeenCalledWith('guild-456', 'Groceries', 'milk');
  });

  it('decodes encoded item text', async () => {
    (List.removeItem as jest.Mock).mockResolvedValue({ id: 1, items: [] });
    await DELETE(makeReq(), {
      params: Promise.resolve({ listName: 'Groceries', itemText: 'my%20milk' }),
    });
    expect(List.removeItem).toHaveBeenCalledWith('guild-456', 'Groceries', 'my milk');
  });

  it('returns 401 when no session', async () => {
    mockSession.mockResolvedValue(null);
    const res = await DELETE(makeReq(), {
      params: Promise.resolve({ listName: 'g', itemText: 'x' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    (User.findByEmail as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(makeReq(), {
      params: Promise.resolve({ listName: 'g', itemText: 'x' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 404 when list or item not found', async () => {
    (List.removeItem as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(makeReq(), {
      params: Promise.resolve({ listName: 'g', itemText: 'missing' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 500 on db error', async () => {
    (List.removeItem as jest.Mock).mockRejectedValue(new Error('db'));
    const res = await DELETE(makeReq(), {
      params: Promise.resolve({ listName: 'g', itemText: 'x' }),
    });
    expect(res.status).toBe(500);
  });
});
