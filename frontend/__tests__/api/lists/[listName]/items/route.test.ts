/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(),
}));
jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn() }));

import { POST } from '@/app/api/lists/[listName]/items/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { User } from '@database/models/User';
import List from '@database/models/List';

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
    (User.findByEmail as jest.Mock).mockResolvedValue({ guild_id: 'guild-456' });
  });

  it('adds an item to the list', async () => {
    (List.addItem as jest.Mock).mockResolvedValue({
      id: 1,
      items: [{ text: 'milk', completed: false, added_at: 'now' }],
    });
    const res = await POST(makeReq({ item: 'milk' }), {
      params: Promise.resolve({ listName: 'Groceries' }),
    });
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(List.addItem).toHaveBeenCalledWith('guild-456', 'Groceries', 'milk');
  });

  it('trims the item text', async () => {
    (List.addItem as jest.Mock).mockResolvedValue({ id: 1 });
    await POST(makeReq({ item: '  milk  ' }), {
      params: Promise.resolve({ listName: 'Groceries' }),
    });
    expect(List.addItem).toHaveBeenCalledWith('guild-456', 'Groceries', 'milk');
  });

  it('returns 401 when no session', async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(makeReq({ item: 'x' }), { params: Promise.resolve({ listName: 'g' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    (User.findByEmail as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeReq({ item: 'x' }), { params: Promise.resolve({ listName: 'g' }) });
    expect(res.status).toBe(404);
  });

  it('returns 400 when item missing', async () => {
    const res = await POST(makeReq({}), { params: Promise.resolve({ listName: 'g' }) });
    expect(res.status).toBe(400);
  });

  it('returns 400 when item is empty', async () => {
    const res = await POST(makeReq({ item: '   ' }), {
      params: Promise.resolve({ listName: 'g' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when list not found', async () => {
    (List.addItem as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeReq({ item: 'x' }), { params: Promise.resolve({ listName: 'g' }) });
    expect(res.status).toBe(404);
  });

  it('returns 500 on db error', async () => {
    (List.addItem as jest.Mock).mockRejectedValue(new Error('db'));
    const res = await POST(makeReq({ item: 'x' }), { params: Promise.resolve({ listName: 'g' }) });
    expect(res.status).toBe(500);
  });
});
