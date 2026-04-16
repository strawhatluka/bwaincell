/**
 * Unit tests for /api/notes Express route handlers
 *
 * Tests all CRUD operations for notes via the REST API,
 * including search, tag filtering, and tag listing.
 */

// Mock dependencies BEFORE imports
jest.mock('../../../../shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@database/index', () => ({
  Note: {
    getNotes: jest.fn(),
    searchNotes: jest.fn(),
    getNotesByTag: jest.fn(),
    getAllTags: jest.fn(),
    getNote: jest.fn(),
    createNote: jest.fn(),
    updateNote: jest.fn(),
    deleteNote: jest.fn(),
  },
}));

import { Note } from '@database/index';
import express from 'express';
import notesRouter from '../../../../src/api/routes/notes';
import request from 'supertest';

const mockNote = Note as jest.Mocked<typeof Note>;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = {
      discordId: 'discord-123',
      guildId: 'guild-123',
      email: 'test@test.com',
      googleId: 'google-123',
      name: 'Test User',
    };
    next();
  });
  app.use('/notes', notesRouter);
  return app;
}

describe('Notes API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  // ─── GET /notes ───────────────────────────────────────────────────

  describe('GET /notes', () => {
    it('should return all notes without filters', async () => {
      const fakeNotes = [
        { id: 1, title: 'Note 1', content: 'Content 1', tags: [] },
        { id: 2, title: 'Note 2', content: 'Content 2', tags: ['work'] },
      ];
      mockNote.getNotes.mockResolvedValue(fakeNotes as any);

      const res = await request(app).get('/notes');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(fakeNotes);
      expect(mockNote.getNotes).toHaveBeenCalledWith('guild-123');
    });

    it('should search notes by keyword', async () => {
      const fakeNotes = [{ id: 1, title: 'Meeting notes', content: 'Discussed project' }];
      mockNote.searchNotes.mockResolvedValue(fakeNotes as any);

      const res = await request(app).get('/notes?search=meeting');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(fakeNotes);
      expect(mockNote.searchNotes).toHaveBeenCalledWith('guild-123', 'meeting');
    });

    it('should filter notes by tag', async () => {
      const fakeNotes = [{ id: 2, title: 'Work note', content: 'Content', tags: ['work'] }];
      mockNote.getNotesByTag.mockResolvedValue(fakeNotes as any);

      const res = await request(app).get('/notes?tag=work');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(fakeNotes);
      expect(mockNote.getNotesByTag).toHaveBeenCalledWith('guild-123', 'work');
    });

    it('should prefer search over tag filter when both provided', async () => {
      mockNote.searchNotes.mockResolvedValue([] as any);

      const res = await request(app).get('/notes?search=test&tag=work');

      expect(res.status).toBe(200);
      expect(mockNote.searchNotes).toHaveBeenCalledWith('guild-123', 'test');
      expect(mockNote.getNotesByTag).not.toHaveBeenCalled();
    });

    it('should handle server errors', async () => {
      mockNote.getNotes.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/notes');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /notes/tags ──────────────────────────────────────────────

  describe('GET /notes/tags', () => {
    it('should return all unique tags', async () => {
      const fakeTags = ['work', 'personal', 'project'];
      mockNote.getAllTags.mockResolvedValue(fakeTags as any);

      const res = await request(app).get('/notes/tags');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(fakeTags);
      expect(mockNote.getAllTags).toHaveBeenCalledWith('guild-123');
    });

    it('should return empty array when no tags exist', async () => {
      mockNote.getAllTags.mockResolvedValue([] as any);

      const res = await request(app).get('/notes/tags');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should handle server errors', async () => {
      mockNote.getAllTags.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/notes/tags');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /notes/:id ───────────────────────────────────────────────

  describe('GET /notes/:id', () => {
    it('should return a note by ID', async () => {
      const fakeNote = { id: 1, title: 'Note 1', content: 'Content', tags: ['work'] };
      mockNote.getNote.mockResolvedValue(fakeNote as any);

      const res = await request(app).get('/notes/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(fakeNote);
      expect(mockNote.getNote).toHaveBeenCalledWith(1, 'guild-123');
    });

    it('should return 400 for invalid note ID', async () => {
      const res = await request(app).get('/notes/abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid note ID');
    });

    it('should return 404 when note is not found', async () => {
      mockNote.getNote.mockResolvedValue(null as any);

      const res = await request(app).get('/notes/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Note not found');
    });

    it('should handle server errors', async () => {
      mockNote.getNote.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/notes/1');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── POST /notes ──────────────────────────────────────────────────

  describe('POST /notes', () => {
    it('should create a note with title and content', async () => {
      const createdNote = { id: 1, title: 'New Note', content: 'Content here', tags: [] };
      mockNote.createNote.mockResolvedValue(createdNote as any);

      const res = await request(app)
        .post('/notes')
        .send({ title: 'New Note', content: 'Content here' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(createdNote);
      expect(mockNote.createNote).toHaveBeenCalledWith(
        'guild-123',
        'New Note',
        'Content here',
        [],
        'discord-123'
      );
    });

    it('should create a note with tags', async () => {
      const createdNote = {
        id: 2,
        title: 'Tagged Note',
        content: 'Content',
        tags: ['work', 'important'],
      };
      mockNote.createNote.mockResolvedValue(createdNote as any);

      const res = await request(app)
        .post('/notes')
        .send({ title: 'Tagged Note', content: 'Content', tags: ['work', 'important'] });

      expect(res.status).toBe(201);
      expect(mockNote.createNote).toHaveBeenCalledWith(
        'guild-123',
        'Tagged Note',
        'Content',
        ['work', 'important'],
        'discord-123'
      );
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app).post('/notes').send({ content: 'Content' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Title is required');
    });

    it('should return 400 when title is not a string', async () => {
      const res = await request(app).post('/notes').send({ title: 123, content: 'Content' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Title is required');
    });

    it('should return 400 when title is empty', async () => {
      const res = await request(app).post('/notes').send({ title: '  ', content: 'Content' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Title cannot be empty');
    });

    it('should return 400 when content is missing', async () => {
      const res = await request(app).post('/notes').send({ title: 'Title' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Content is required');
    });

    it('should return 400 when content is not a string', async () => {
      const res = await request(app).post('/notes').send({ title: 'Title', content: 123 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Content is required');
    });

    it('should return 400 when content is empty', async () => {
      const res = await request(app).post('/notes').send({ title: 'Title', content: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Content cannot be empty');
    });

    it('should return 400 when tags is not an array', async () => {
      const res = await request(app)
        .post('/notes')
        .send({ title: 'Title', content: 'Content', tags: 'not-array' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Tags must be an array');
    });

    it('should filter out invalid tags', async () => {
      const createdNote = { id: 1, title: 'Note', content: 'Content', tags: ['valid'] };
      mockNote.createNote.mockResolvedValue(createdNote as any);

      const res = await request(app)
        .post('/notes')
        .send({ title: 'Note', content: 'Content', tags: ['valid', '', 123, '  '] });

      expect(res.status).toBe(201);
      expect(mockNote.createNote).toHaveBeenCalledWith(
        'guild-123',
        'Note',
        'Content',
        ['valid'],
        'discord-123'
      );
    });

    it('should handle server errors', async () => {
      mockNote.createNote.mockRejectedValue(new Error('DB error'));

      const res = await request(app).post('/notes').send({ title: 'Test', content: 'Content' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── PATCH /notes/:id ─────────────────────────────────────────────

  describe('PATCH /notes/:id', () => {
    it('should return 400 for invalid note ID', async () => {
      const res = await request(app).patch('/notes/abc').send({ title: 'Updated' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid note ID');
    });

    it('should update note title', async () => {
      const updatedNote = { id: 1, title: 'Updated Title', content: 'Content', tags: [] };
      mockNote.updateNote.mockResolvedValue(updatedNote as any);

      const res = await request(app).patch('/notes/1').send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(updatedNote);
      expect(mockNote.updateNote).toHaveBeenCalledWith(1, 'guild-123', { title: 'Updated Title' });
    });

    it('should update note content', async () => {
      const updatedNote = { id: 1, title: 'Title', content: 'Updated Content', tags: [] };
      mockNote.updateNote.mockResolvedValue(updatedNote as any);

      const res = await request(app).patch('/notes/1').send({ content: 'Updated Content' });

      expect(res.status).toBe(200);
      expect(mockNote.updateNote).toHaveBeenCalledWith(1, 'guild-123', {
        content: 'Updated Content',
      });
    });

    it('should update note tags', async () => {
      const updatedNote = { id: 1, title: 'Title', content: 'Content', tags: ['new-tag'] };
      mockNote.updateNote.mockResolvedValue(updatedNote as any);

      const res = await request(app)
        .patch('/notes/1')
        .send({ tags: ['new-tag'] });

      expect(res.status).toBe(200);
      expect(mockNote.updateNote).toHaveBeenCalledWith(1, 'guild-123', {
        tags: ['new-tag'],
      });
    });

    it('should return 400 when no fields are provided', async () => {
      const res = await request(app).patch('/notes/1').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('At least one field');
    });

    it('should return 400 when title is empty string', async () => {
      const res = await request(app).patch('/notes/1').send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Title must be a non-empty string');
    });

    it('should return 400 when content is empty string', async () => {
      const res = await request(app).patch('/notes/1').send({ content: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Content must be a non-empty string');
    });

    it('should return 400 when tags is not an array', async () => {
      const res = await request(app).patch('/notes/1').send({ tags: 'not-array' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Tags must be an array');
    });

    it('should return 404 when note is not found', async () => {
      mockNote.updateNote.mockResolvedValue(null as any);

      const res = await request(app).patch('/notes/999').send({ title: 'Updated' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Note not found');
    });

    it('should handle server errors', async () => {
      mockNote.updateNote.mockRejectedValue(new Error('DB error'));

      const res = await request(app).patch('/notes/1').send({ title: 'Updated' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── DELETE /notes/:id ────────────────────────────────────────────

  describe('DELETE /notes/:id', () => {
    it('should delete a note successfully', async () => {
      mockNote.deleteNote.mockResolvedValue(true as any);

      const res = await request(app).delete('/notes/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Note deleted successfully');
      expect(mockNote.deleteNote).toHaveBeenCalledWith(1, 'guild-123');
    });

    it('should return 400 for invalid note ID', async () => {
      const res = await request(app).delete('/notes/abc');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid note ID');
    });

    it('should return 404 when note is not found', async () => {
      mockNote.deleteNote.mockResolvedValue(false as any);

      const res = await request(app).delete('/notes/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Note not found');
    });

    it('should handle server errors', async () => {
      mockNote.deleteNote.mockRejectedValue(new Error('DB error'));

      const res = await request(app).delete('/notes/1');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});
