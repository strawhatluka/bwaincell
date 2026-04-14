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
    reminder: { deleteMany: jest.fn() },
  };
  return { __esModule: true, default: mock, prisma: mock };
});

import { DELETE } from '@/app/api/reminders/[id]/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';

const mockSession = getServerSession as jest.Mock;

describe('/api/reminders/[id] DELETE', () => {
  const req = () => new NextRequest('http://localhost/api/reminders/1', { method: 'DELETE' });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ guildId: 'guild-456' });
  });

  it('deletes a reminder', async () => {
    (prisma.reminder.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
    const res = await DELETE(req(), { params: { id: '1' } });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('returns 401 when no session', async () => {
    mockSession.mockResolvedValue(null);
    const res = await DELETE(req(), { params: { id: '1' } });
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(req(), { params: { id: '1' } });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid id', async () => {
    const res = await DELETE(req(), { params: { id: 'abc' } });
    expect(res.status).toBe(400);
  });

  it('returns 404 when reminder not found', async () => {
    (prisma.reminder.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
    const res = await DELETE(req(), { params: { id: '1' } });
    expect(res.status).toBe(404);
  });

  it('scopes delete by guildId', async () => {
    (prisma.reminder.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
    await DELETE(req(), { params: { id: '42' } });
    expect(prisma.reminder.deleteMany).toHaveBeenCalledWith({
      where: { id: 42, guildId: 'guild-456' },
    });
  });

  it('returns 500 on prisma error', async () => {
    (prisma.reminder.deleteMany as jest.Mock).mockRejectedValue(new Error('db'));
    const res = await DELETE(req(), { params: { id: '1' } });
    expect(res.status).toBe(500);
  });
});
