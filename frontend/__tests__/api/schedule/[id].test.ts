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
    schedule: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  return { __esModule: true, default: mock, prisma: mock };
});

import { PATCH, DELETE } from '@/app/api/schedule/[id]/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';

const mockSession = getServerSession as jest.Mock;

describe('/api/schedule/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ guildId: 'guild-456' });
  });

  describe('PATCH', () => {
    const req = (body: unknown) =>
      new NextRequest('http://localhost/api/schedule/1', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

    it('updates with title', async () => {
      (prisma.schedule.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.schedule.findUnique as jest.Mock).mockResolvedValue({ id: 1, event: 'Meeting' });
      const res = await PATCH(req({ title: 'Meeting' }), { params: { id: '1' } });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      const updateArg = (prisma.schedule.updateMany as jest.Mock).mock.calls[0][0].data;
      expect(updateArg.event).toBe('Meeting');
    });

    it('updates with event field (compat)', async () => {
      (prisma.schedule.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.schedule.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      await PATCH(req({ event: 'Ev' }), { params: { id: '1' } });
      const updateArg = (prisma.schedule.updateMany as jest.Mock).mock.calls[0][0].data;
      expect(updateArg.event).toBe('Ev');
    });

    it('splits datetime into date + time', async () => {
      (prisma.schedule.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.schedule.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      await PATCH(req({ datetime: '2026-05-01T10:00:00Z' }), { params: { id: '1' } });
      const updateArg = (prisma.schedule.updateMany as jest.Mock).mock.calls[0][0].data;
      expect(updateArg.date).toBe('2026-05-01');
      expect(typeof updateArg.time).toBe('string');
    });

    it('updates with separate date and time', async () => {
      (prisma.schedule.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.schedule.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      await PATCH(req({ date: '2026-05-01', time: '10:00:00' }), { params: { id: '1' } });
      const updateArg = (prisma.schedule.updateMany as jest.Mock).mock.calls[0][0].data;
      expect(updateArg.date).toBe('2026-05-01');
      expect(updateArg.time).toBe('10:00:00');
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await PATCH(req({ title: 'x' }), { params: { id: '1' } });
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await PATCH(req({ title: 'x' }), { params: { id: '1' } });
      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid id', async () => {
      const res = await PATCH(req({ title: 'x' }), { params: { id: 'abc' } });
      expect(res.status).toBe(400);
    });

    it('returns 404 when event not found', async () => {
      (prisma.schedule.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      const res = await PATCH(req({ title: 'x' }), { params: { id: '1' } });
      expect(res.status).toBe(404);
    });

    it('returns 500 on prisma error', async () => {
      (prisma.schedule.updateMany as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await PATCH(req({ title: 'x' }), { params: { id: '1' } });
      expect(res.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    const delReq = () => new NextRequest('http://localhost/api/schedule/1', { method: 'DELETE' });

    it('deletes an event', async () => {
      (prisma.schedule.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      const res = await DELETE(delReq(), { params: { id: '1' } });
      expect(res.status).toBe(200);
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await DELETE(delReq(), { params: { id: '1' } });
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await DELETE(delReq(), { params: { id: '1' } });
      expect(res.status).toBe(404);
    });

    it('returns 400 for invalid id', async () => {
      const res = await DELETE(delReq(), { params: { id: 'abc' } });
      expect(res.status).toBe(400);
    });

    it('returns 404 when event not found', async () => {
      (prisma.schedule.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      const res = await DELETE(delReq(), { params: { id: '1' } });
      expect(res.status).toBe(404);
    });

    it('returns 500 on prisma error', async () => {
      (prisma.schedule.deleteMany as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await DELETE(delReq(), { params: { id: '1' } });
      expect(res.status).toBe(500);
    });
  });
});
