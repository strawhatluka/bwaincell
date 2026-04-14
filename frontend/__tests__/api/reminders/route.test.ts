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
    reminder: { findMany: jest.fn(), deleteMany: jest.fn() },
  };
  return { __esModule: true, default: mock, prisma: mock };
});

import { GET } from '@/app/api/reminders/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';

const mockSession = getServerSession as jest.Mock;

describe('/api/reminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ guildId: 'guild-456' });
  });

  describe('GET', () => {
    it('returns formatted reminders with HH:MM time', async () => {
      (prisma.reminder.findMany as jest.Mock).mockResolvedValue([
        { id: 1, message: 'r', time: new Date('2026-01-01T14:30:00Z'), active: true },
      ]);
      const res = await GET(new NextRequest('http://localhost/api/reminders'));
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data[0].time).toBe('14:30');
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/reminders'));
      expect(res.status).toBe(401);
    });

    it('returns 401 when email missing', async () => {
      mockSession.mockResolvedValue({ user: {} });
      const res = await GET(new NextRequest('http://localhost/api/reminders'));
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/reminders'));
      expect(res.status).toBe(404);
    });

    it('queries only active reminders', async () => {
      (prisma.reminder.findMany as jest.Mock).mockResolvedValue([]);
      await GET(new NextRequest('http://localhost/api/reminders'));
      expect(prisma.reminder.findMany).toHaveBeenCalledWith({
        where: { guildId: 'guild-456', active: true },
        orderBy: { nextTrigger: 'asc' },
      });
    });

    it('returns 500 on prisma error', async () => {
      (prisma.reminder.findMany as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await GET(new NextRequest('http://localhost/api/reminders'));
      expect(res.status).toBe(500);
    });
  });
});
