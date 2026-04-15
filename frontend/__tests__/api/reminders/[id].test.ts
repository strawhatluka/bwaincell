/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(),
}));
jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn() }));

import { DELETE } from '@/app/api/reminders/[id]/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { User } from '@database/models/User';
import Reminder from '@database/models/Reminder';

const mockSession = getServerSession as jest.Mock;

describe('/api/reminders/[id] DELETE', () => {
  const req = () => new NextRequest('http://localhost/api/reminders/1', { method: 'DELETE' });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (User.findByEmail as jest.Mock).mockResolvedValue({ guild_id: 'guild-456' });
  });

  it('deletes a reminder', async () => {
    (Reminder.deleteReminder as jest.Mock).mockResolvedValue(true);
    const res = await DELETE(req(), { params: Promise.resolve({ id: '1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('returns 401 when no session', async () => {
    mockSession.mockResolvedValue(null);
    const res = await DELETE(req(), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    (User.findByEmail as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(req(), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid id', async () => {
    const res = await DELETE(req(), { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 when reminder not found', async () => {
    (Reminder.deleteReminder as jest.Mock).mockResolvedValue(false);
    const res = await DELETE(req(), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(404);
  });

  it('scopes delete by guild_id', async () => {
    (Reminder.deleteReminder as jest.Mock).mockResolvedValue(true);
    await DELETE(req(), { params: Promise.resolve({ id: '42' }) });
    expect(Reminder.deleteReminder).toHaveBeenCalledWith(42, 'guild-456');
  });

  it('returns 500 on db error', async () => {
    (Reminder.deleteReminder as jest.Mock).mockRejectedValue(new Error('db'));
    const res = await DELETE(req(), { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(500);
  });
});
