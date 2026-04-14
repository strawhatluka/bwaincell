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
    task: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  return { __esModule: true, default: mock, prisma: mock };
});

import { PATCH, DELETE } from '@/app/api/tasks/[id]/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';

const mockSession = getServerSession as jest.Mock;

const makeReq = (body: unknown = {}) =>
  new NextRequest('http://localhost/api/tasks/1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

describe('/api/tasks/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ guildId: 'guild-456' });
  });

  describe('PATCH', () => {
    it('updates task successfully', async () => {
      (prisma.task.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.task.findUnique as jest.Mock).mockResolvedValue({ id: 1, description: 'updated' });
      const res = await PATCH(makeReq({ description: 'updated' }), { params: { id: '1' } });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data.description).toBe('updated');
    });

    it('sets completedAt when completed=true', async () => {
      (prisma.task.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.task.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      await PATCH(makeReq({ completed: true }), { params: { id: '1' } });
      const call = (prisma.task.updateMany as jest.Mock).mock.calls[0][0];
      expect(call.data.completed).toBe(true);
      expect(call.data.completedAt).toBeInstanceOf(Date);
    });

    it('clears completedAt when completed=false', async () => {
      (prisma.task.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.task.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      await PATCH(makeReq({ completed: false }), { params: { id: '1' } });
      const call = (prisma.task.updateMany as jest.Mock).mock.calls[0][0];
      expect(call.data.completedAt).toBeNull();
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await PATCH(makeReq({}), { params: { id: '1' } });
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await PATCH(makeReq({}), { params: { id: '1' } });
      expect(res.status).toBe(404);
    });

    it('returns 400 when id is not a number', async () => {
      const res = await PATCH(makeReq({}), { params: { id: 'abc' } });
      expect(res.status).toBe(400);
    });

    it('returns 404 when task not found', async () => {
      (prisma.task.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
      const res = await PATCH(makeReq({ description: 'x' }), { params: { id: '999' } });
      expect(res.status).toBe(404);
    });

    it('returns 500 on prisma error', async () => {
      (prisma.task.updateMany as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await PATCH(makeReq({}), { params: { id: '1' } });
      expect(res.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    const delReq = () => new NextRequest('http://localhost/api/tasks/1', { method: 'DELETE' });

    it('deletes task successfully', async () => {
      (prisma.task.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      const res = await DELETE(delReq(), { params: { id: '1' } });
      expect(res.status).toBe(200);
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await DELETE(delReq(), { params: { id: '1' } });
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid id', async () => {
      const res = await DELETE(delReq(), { params: { id: 'xyz' } });
      expect(res.status).toBe(400);
    });

    it('returns 404 when task not found', async () => {
      (prisma.task.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      const res = await DELETE(delReq(), { params: { id: '1' } });
      expect(res.status).toBe(404);
    });

    it('returns 500 on prisma error', async () => {
      (prisma.task.deleteMany as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await DELETE(delReq(), { params: { id: '1' } });
      expect(res.status).toBe(500);
    });
  });
});
