/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(),
}));
jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn() }));

import { PATCH, DELETE } from '@/app/api/notes/[id]/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { User } from '@database/models/User';
import Note from '@database/models/Note';

const mockSession = getServerSession as jest.Mock;

const makeReq = (body: unknown = {}) =>
  new NextRequest('http://localhost/api/notes/1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

describe('/api/notes/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (User.findByEmail as jest.Mock).mockResolvedValue({ guild_id: 'guild-456' });
  });

  describe('PATCH', () => {
    it('updates note', async () => {
      (Note.updateNote as jest.Mock).mockResolvedValue({ id: 1, title: 'Updated' });
      const res = await PATCH(makeReq({ title: 'Updated' }), {
        params: Promise.resolve({ id: '1' }),
      });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data.title).toBe('Updated');
    });

    it('updates tags when array provided', async () => {
      (Note.updateNote as jest.Mock).mockResolvedValue({ id: 1 });
      await PATCH(makeReq({ tags: ['x', 'y'] }), { params: Promise.resolve({ id: '1' }) });
      const call = (Note.updateNote as jest.Mock).mock.calls[0];
      expect(call[2].tags).toEqual(['x', 'y']);
    });

    it('ignores tags when not an array', async () => {
      (Note.updateNote as jest.Mock).mockResolvedValue({ id: 1 });
      await PATCH(makeReq({ tags: 'notarray' }), { params: Promise.resolve({ id: '1' }) });
      const call = (Note.updateNote as jest.Mock).mock.calls[0];
      expect(call[2].tags).toBeUndefined();
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

    it('returns 400 for invalid id', async () => {
      const res = await PATCH(makeReq({}), { params: Promise.resolve({ id: 'abc' }) });
      expect(res.status).toBe(400);
    });

    it('returns 404 when note not found', async () => {
      (Note.updateNote as jest.Mock).mockResolvedValue(null);
      const res = await PATCH(makeReq({ title: 'x' }), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 500 on db error', async () => {
      (Note.updateNote as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await PATCH(makeReq({}), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(500);
    });
  });

  describe('DELETE', () => {
    const delReq = () => new NextRequest('http://localhost/api/notes/1', { method: 'DELETE' });

    it('deletes note', async () => {
      (Note.deleteNote as jest.Mock).mockResolvedValue(true);
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

    it('returns 404 when note not found', async () => {
      (Note.deleteNote as jest.Mock).mockResolvedValue(false);
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(404);
    });

    it('returns 500 on db error', async () => {
      (Note.deleteNote as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await DELETE(delReq(), { params: Promise.resolve({ id: '1' }) });
      expect(res.status).toBe(500);
    });
  });
});
