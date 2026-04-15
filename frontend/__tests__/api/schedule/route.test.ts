/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(),
}));
jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn() }));

import { GET } from '@/app/api/schedule/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { User } from '@database/models/User';
import Schedule from '@database/models/Schedule';

const mockSession = getServerSession as jest.Mock;

describe('/api/schedule GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (User.findByEmail as jest.Mock).mockResolvedValue({ guild_id: 'guild-456' });
    (Schedule.getEvents as jest.Mock).mockResolvedValue([]);
  });

  it('returns events when authenticated', async () => {
    (Schedule.getEvents as jest.Mock).mockResolvedValue([{ id: 1, event: 'M' }]);
    const res = await GET(new NextRequest('http://localhost/api/schedule'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it('defaults to upcoming filter', async () => {
    await GET(new NextRequest('http://localhost/api/schedule'));
    expect(Schedule.getEvents).toHaveBeenCalledWith('guild-456', 'upcoming');
  });

  it('accepts past filter', async () => {
    await GET(new NextRequest('http://localhost/api/schedule?filter=past'));
    expect(Schedule.getEvents).toHaveBeenCalledWith('guild-456', 'past');
  });

  it('returns 401 when no session', async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/schedule'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when email missing', async () => {
    mockSession.mockResolvedValue({ user: {} });
    const res = await GET(new NextRequest('http://localhost/api/schedule'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    (User.findByEmail as jest.Mock).mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/schedule'));
    expect(res.status).toBe(404);
  });

  it('returns 500 when getServerSession throws', async () => {
    mockSession.mockRejectedValue(new Error('boom'));
    const res = await GET(new NextRequest('http://localhost/api/schedule'));
    expect(res.status).toBe(500);
  });
});
