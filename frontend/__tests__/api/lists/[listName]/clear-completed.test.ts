/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(),
}));
jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn() }));

import { POST } from '@/app/api/lists/[listName]/clear-completed/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { User } from '@database/models/User';
import List from '@database/models/List';

const mockSession = getServerSession as jest.Mock;

const makeReq = () =>
  new NextRequest('http://localhost/api/lists/Groceries/clear-completed', { method: 'POST' });

describe('/api/lists/[listName]/clear-completed POST', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (User.findByEmail as jest.Mock).mockResolvedValue({ guild_id: 'guild-456' });
  });

  it('clears completed items', async () => {
    (List.clearCompleted as jest.Mock).mockResolvedValue({
      id: 1,
      items: [{ text: 'b', completed: false, added_at: 'y' }],
    });
    const res = await POST(makeReq(), { params: Promise.resolve({ listName: 'Groceries' }) });
    expect(res.status).toBe(201);
    expect(List.clearCompleted).toHaveBeenCalledWith('guild-456', 'Groceries');
  });

  it('returns 401 when no session', async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(makeReq(), { params: Promise.resolve({ listName: 'g' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    (User.findByEmail as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeReq(), { params: Promise.resolve({ listName: 'g' }) });
    expect(res.status).toBe(404);
  });

  it('returns 404 when list not found', async () => {
    (List.clearCompleted as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeReq(), { params: Promise.resolve({ listName: 'g' }) });
    expect(res.status).toBe(404);
  });

  it('returns 500 on db error', async () => {
    (List.clearCompleted as jest.Mock).mockRejectedValue(new Error('db'));
    const res = await POST(makeReq(), { params: Promise.resolve({ listName: 'g' }) });
    expect(res.status).toBe(500);
  });
});
