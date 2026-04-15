/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn(),
}));
jest.mock('next-auth/providers/google', () => ({ __esModule: true, default: jest.fn() }));

import { GET, POST } from '@/app/api/notes/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { User } from '@database/models/User';
import Note from '@database/models/Note';

const mockSession = getServerSession as jest.Mock;

describe('/api/notes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockResolvedValue({ user: { email: 'test@example.com' } });
    (User.findByEmail as jest.Mock).mockResolvedValue({
      guild_id: 'guild-456',
      discord_id: 'discord-123',
    });
  });

  describe('GET', () => {
    it('returns notes for authenticated user', async () => {
      (Note.getNotes as jest.Mock).mockResolvedValue([{ id: 1, title: 'N1' }]);
      const res = await GET(new NextRequest('http://localhost/api/notes'));
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(1);
    });

    it('applies search filter when query provided', async () => {
      (Note.searchNotes as jest.Mock).mockResolvedValue([]);
      await GET(new NextRequest('http://localhost/api/notes?search=foo'));
      expect(Note.searchNotes).toHaveBeenCalledWith('guild-456', 'foo');
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/notes'));
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue(null);
      const res = await GET(new NextRequest('http://localhost/api/notes'));
      expect(res.status).toBe(404);
    });

    it('returns 500 on db error', async () => {
      (Note.getNotes as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await GET(new NextRequest('http://localhost/api/notes'));
      expect(res.status).toBe(500);
    });
  });

  describe('POST', () => {
    const makeReq = (body: unknown) =>
      new NextRequest('http://localhost/api/notes', {
        method: 'POST',
        body: JSON.stringify(body),
      });

    it('creates a note', async () => {
      (Note.createNote as jest.Mock).mockResolvedValue({
        id: 1,
        title: 'T',
        content: 'C',
      });
      const res = await POST(makeReq({ title: 'T', content: 'C' }));
      const body = await res.json();
      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('T');
    });

    it('passes tags array when provided', async () => {
      (Note.createNote as jest.Mock).mockResolvedValue({ id: 1 });
      await POST(makeReq({ title: 'T', content: 'C', tags: ['a', 'b'] }));
      // createNote(guild_id, title, content, tags, discord_id)
      expect((Note.createNote as jest.Mock).mock.calls[0][3]).toEqual(['a', 'b']);
    });

    it('returns 401 when no session', async () => {
      mockSession.mockResolvedValue(null);
      const res = await POST(makeReq({ title: 'T', content: 'C' }));
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue(null);
      const res = await POST(makeReq({ title: 'T', content: 'C' }));
      expect(res.status).toBe(404);
    });

    it('returns 400 when title missing', async () => {
      const res = await POST(makeReq({ content: 'C' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when content missing', async () => {
      const res = await POST(makeReq({ title: 'T' }));
      expect(res.status).toBe(400);
    });

    it('returns 500 on db error', async () => {
      (Note.createNote as jest.Mock).mockRejectedValue(new Error('db'));
      const res = await POST(makeReq({ title: 'T', content: 'C' }));
      expect(res.status).toBe(500);
    });
  });
});
