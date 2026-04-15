/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(),
}));
jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn() }));

import { PATCH, DELETE } from '@/app/api/tasks/[id]/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { User } from '@database/models/User';
import Task from '@database/models/Task';

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
    (User.findByEmail as jest.Mock).mockResolvedValue({ guild_id: 'guild-456' });
  });

  describe('PATCH', () => {
    it('updates task description successfully', async () => {
      (Task.editTask as jest.Mock).mockResolvedValue({ id: 1, description: 'updated' });
      const res = await PATCH(makeReq({ description: 'updated' }), {
        params: Promise.resolve({ id: '1' }),
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data.description).toBe('updated');
    });

    it('calls completeTask when completed=true', async () => {
      (Task.completeTask as jest.Mock).mockResolvedValue({ id: 1, completed: true });
      const res = await PATCH(makeReq({ completed: true }), {
        params: Promise.resolve({ id: '1' }),
      });
      expect(res.status).toBe(200);
      expect(Task.completeTask).toHaveBeenCalledWith(1, 'guild-456');
    });

    it('returns 400 when completed=false without other fields', async () => {
      const res = await PATCH(makeReq({ completed: false }), {
        params: Promise.resolve({ id: '1' }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await PATCH(makeReq({}), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue(null);
      const res = await PATCH(makeReq({}), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 400 when id is not a number', async () => {
      const res = await PATCH(makeReq({}), { params: Promise.resolve({ id: 'abc' }) });
      expect(res.status).toBe(400);
    });

    it('returns 404 when task not found', async () => {
      (Task.editTask as jest.Mock).mockResolvedValue(null);
      const res = await PATCH(makeReq({ description: 'x' }), {
        params: Promise.resolve({ id: '999' }),
      });
      expect(res.status).toBe(404);
    });

    it('returns 500 on db error', async () => {
      (Task.editTask as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await PATCH(makeReq({ description: 'x' }), {
        params: Promise.resolve({ id: '1' }),
      });
      expect(res.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    const delReq = () => new NextRequest('http://localhost/api/tasks/1', { method: 'DELETE' });

    it('deletes task successfully', async () => {
      (Task.deleteTask as jest.Mock).mockResolvedValue(true);
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(200);
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid id', async () => {
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: 'xyz' }) });
      expect(res.status).toBe(400);
    });

    it('returns 404 when task not found', async () => {
      (Task.deleteTask as jest.Mock).mockResolvedValue(false);
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 500 on db error', async () => {
      (Task.deleteTask as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(500);
    });
  });
});
