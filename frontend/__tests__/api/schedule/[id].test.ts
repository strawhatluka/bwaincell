/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(),
}));
jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn() }));

import { PATCH, DELETE } from '@/app/api/schedule/[id]/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { User } from '@database/models/User';
import Schedule from '@database/models/Schedule';
import supabaseRaw from '@database/supabase';

// Cast to any since the chained mock shape doesn't match SupabaseClient's typed interface
const supabase = supabaseRaw as any;
const mockSession = getServerSession as jest.Mock;

describe('/api/schedule/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (User.findByEmail as jest.Mock).mockResolvedValue({ guild_id: 'guild-456' });
    (supabase.single as jest.Mock).mockResolvedValue({
      data: { id: 1, event: 'Meeting' },
      error: null,
    });
  });

  describe('PATCH', () => {
    const req = (body: unknown) =>
      new NextRequest('http://localhost/api/schedule/1', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

    it('updates with title', async () => {
      const res = await PATCH(req({ title: 'Meeting' }), { params: Promise.resolve({ id: '1' }) });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      const updateArg = (supabase.update as jest.Mock).mock.calls[0][0];
      expect(updateArg.event).toBe('Meeting');
    });

    it('updates with event field (compat)', async () => {
      await PATCH(req({ event: 'Ev' }), { params: Promise.resolve({ id: '1' }) });
      const updateArg = (supabase.update as jest.Mock).mock.calls[0][0];
      expect(updateArg.event).toBe('Ev');
    });

    it('splits datetime into date + time', async () => {
      await PATCH(req({ datetime: '2026-05-01T10:00:00Z' }), {
        params: Promise.resolve({ id: '1' }),
      });
      const updateArg = (supabase.update as jest.Mock).mock.calls[0][0];
      expect(updateArg.date).toBe('2026-05-01');
      expect(typeof updateArg.time).toBe('string');
    });

    it('updates with separate date and time', async () => {
      await PATCH(req({ date: '2026-05-01', time: '10:00:00' }), {
        params: Promise.resolve({ id: '1' }),
      });
      const updateArg = (supabase.update as jest.Mock).mock.calls[0][0];
      expect(updateArg.date).toBe('2026-05-01');
      expect(updateArg.time).toBe('10:00:00');
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await PATCH(req({ title: 'x' }), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue(null);
      const res = await PATCH(req({ title: 'x' }), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid id', async () => {
      const res = await PATCH(req({ title: 'x' }), { params: Promise.resolve({ id: 'abc' }) });
      expect(res.status).toBe(400);
    });

    it('returns 404 when event not found', async () => {
      (supabase.single as jest.Mock).mockResolvedValue({ data: null, error: { message: 'nope' } });
      const res = await PATCH(req({ title: 'x' }), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 500 on supabase throw', async () => {
      (supabase.single as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await PATCH(req({ title: 'x' }), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    const delReq = () => new NextRequest('http://localhost/api/schedule/1', { method: 'DELETE' });

    it('deletes an event', async () => {
      (Schedule.deleteEvent as jest.Mock).mockResolvedValue(true);
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(200);
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue(null);
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid id', async () => {
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: 'abc' }) });
      expect(res.status).toBe(400);
    });

    it('returns 404 when event not found', async () => {
      (Schedule.deleteEvent as jest.Mock).mockResolvedValue(false);
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 500 on db error', async () => {
      (Schedule.deleteEvent as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(500);
    });
  });
});
