/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(),
}));
jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn() }));

import { GET } from '@/app/api/reminders/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { User } from '@database/models/User';
import Reminder from '@database/models/Reminder';

const mockSession = getServerSession as jest.Mock;

describe('/api/reminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (User.findByEmail as jest.Mock).mockResolvedValue({ guild_id: 'guild-456' });
  });

  describe('GET', () => {
    it('returns formatted reminders with HH:MM time from ISO', async () => {
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue([
        { id: 1, message: 'r', time: '2026-01-01T14:30:00Z', active: true },
      ]);
      const res = await GET(new NextRequest('http://localhost/api/reminders'));
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data[0].time).toBe('14:30');
    });

    it('formats HH:MM:SS time strings to HH:MM', async () => {
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue([
        { id: 1, message: 'r', time: '09:15:00', active: true },
      ]);
      const res = await GET(new NextRequest('http://localhost/api/reminders'));
      const body = await res.json();
      expect(body.data[0].time).toBe('09:15');
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
      (User.findByEmail as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/reminders'));
      expect(res.status).toBe(404);
    });

    it('queries reminders for user guild', async () => {
      (Reminder.getUserReminders as jest.Mock).mockResolvedValue([]);
      await GET(new NextRequest('http://localhost/api/reminders'));
      expect(Reminder.getUserReminders).toHaveBeenCalledWith('guild-456');
    });

    it('returns 500 on db error', async () => {
      (Reminder.getUserReminders as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await GET(new NextRequest('http://localhost/api/reminders'));
      expect(res.status).toBe(500);
    });
  });
});
