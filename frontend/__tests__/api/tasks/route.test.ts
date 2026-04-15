/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(),
}));
jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn() }));

import { GET, POST } from '@/app/api/tasks/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { User } from '@database/models/User';
import Task from '@database/models/Task';

const mockSession = getServerSession as jest.Mock;

describe('/api/tasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (User.findByEmail as jest.Mock).mockResolvedValue({
      guild_id: 'guild-456',
      discord_id: 'discord-123',
    });
  });

  describe('GET', () => {
    it('returns tasks for authenticated user', async () => {
      (Task.getUserTasks as jest.Mock).mockResolvedValue([{ id: 1, description: 'Task 1' }]);
      const res = await GET(new NextRequest('http://localhost/api/tasks'));
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/tasks'));
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/tasks'));
      expect(res.status).toBe(404);
    });

    it('returns 500 on db error', async () => {
      (Task.getUserTasks as jest.Mock).mockRejectedValue(new Error('db fail'));
      const res = await GET(new NextRequest('http://localhost/api/tasks'));
      expect(res.status).toBe(500);
    });
  });

  describe('POST', () => {
    const makeReq = (body: unknown) =>
      new NextRequest('http://localhost/api/tasks', {
        method: 'POST',
        body: JSON.stringify(body),
      });

    it('creates a task', async () => {
      (Task.createTask as jest.Mock).mockResolvedValue({
        id: 1,
        description: 'New task',
      });
      const res = await POST(makeReq({ description: 'New task' }));
      const body = await res.json();
      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.description).toBe('New task');
    });

    it('creates task with dueDate', async () => {
      (Task.createTask as jest.Mock).mockResolvedValue({ id: 2 });
      const res = await POST(makeReq({ description: 'Due task', dueDate: '2026-05-01' }));
      expect(res.status).toBe(201);
      expect((Task.createTask as jest.Mock).mock.calls[0][2]).toBeInstanceOf(Date);
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await POST(makeReq({ description: 'x' }));
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ description: 'x' }));
      expect(res.status).toBe(404);
    });

    it('returns 400 when description missing', async () => {
      const res = await POST(makeReq({}));
      expect(res.status).toBe(400);
    });

    it('returns 400 when description is empty', async () => {
      const res = await POST(makeReq({ description: '   ' }));
      expect(res.status).toBe(400);
    });

    it('returns 500 on db error', async () => {
      (Task.createTask as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await POST(makeReq({ description: 'x' }));
      expect(res.status).toBe(500);
    });
  });
});
