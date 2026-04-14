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

const mockSession = getServerSession as jest.Mock;

describe('/api/schedule GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
  });

  it('returns empty array when authenticated', async () => {
    const res = await GET(new NextRequest('http://localhost/api/schedule'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
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

  it('returns 500 when getServerSession throws', async () => {
    mockSession.mockRejectedValue(new Error('boom'));
    const res = await GET(new NextRequest('http://localhost/api/schedule'));
    expect(res.status).toBe(500);
  });
});
