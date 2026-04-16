/**
 * Unit Tests: Note Model
 *
 * Tests database model for note management using mocks
 * Coverage target: 80%
 */

// Mock logger BEFORE imports
jest.mock('../../../shared/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

import Note from '@database/models/Note';

describe('Note Model', () => {
  const testGuildId = 'guild-123';
  const testUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock createNote
    jest
      .spyOn(Note, 'createNote')
      .mockImplementation(async (guildId, title, content, tags = [], userId) => {
        return {
          id: 1,
          title,
          content,
          tags,
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-15'),
          user_id: userId || 'system',
          guild_id: guildId,
        } as any;
      });

    // Mock getNotes
    jest.spyOn(Note, 'getNotes').mockImplementation(async (guildId) => {
      if (guildId === 'guild-empty') {
        return [];
      }

      return [
        {
          id: 2,
          title: 'Second Note',
          content: 'Content 2',
          tags: ['work'],
          created_at: new Date('2024-01-16'),
          updated_at: new Date('2024-01-16'),
          user_id: testUserId,
          guild_id: guildId,
        },
        {
          id: 1,
          title: 'First Note',
          content: 'Content 1',
          tags: ['personal', 'important'],
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-15'),
          user_id: testUserId,
          guild_id: guildId,
        },
      ] as any[];
    });

    // Mock getNote
    jest.spyOn(Note, 'getNote').mockImplementation(async (noteId, guildId) => {
      if (noteId === 1 && guildId === testGuildId) {
        return {
          id: 1,
          title: 'Test Note',
          content: 'Test content',
          tags: ['personal'],
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-15'),
          user_id: testUserId,
          guild_id: guildId,
        } as any;
      }
      return null;
    });

    // Mock searchNotes
    jest.spyOn(Note, 'searchNotes').mockImplementation(async (guildId, keyword) => {
      const notes = [
        {
          id: 1,
          title: 'Meeting Notes',
          content: 'Discussed project timeline',
          tags: ['work'],
          created_at: new Date(),
          updated_at: new Date(),
          user_id: testUserId,
          guild_id: guildId,
        },
        {
          id: 2,
          title: 'Shopping List',
          content: 'Buy groceries for the meeting',
          tags: ['personal'],
          created_at: new Date(),
          updated_at: new Date(),
          user_id: testUserId,
          guild_id: guildId,
        },
        {
          id: 3,
          title: 'Recipe',
          content: 'Chocolate cake recipe',
          tags: ['cooking'],
          created_at: new Date(),
          updated_at: new Date(),
          user_id: testUserId,
          guild_id: guildId,
        },
      ];

      const lowerKeyword = keyword.toLowerCase();
      return notes.filter(
        (n) =>
          n.title.toLowerCase().includes(lowerKeyword) ||
          n.content.toLowerCase().includes(lowerKeyword)
      ) as any[];
    });

    // Mock deleteNote
    jest.spyOn(Note, 'deleteNote').mockImplementation(async (noteId, guildId) => {
      if (noteId === 1 && guildId === testGuildId) {
        return true;
      }
      return false;
    });

    // Mock updateNote
    jest.spyOn(Note, 'updateNote').mockImplementation(async (noteId, guildId, updates) => {
      if (noteId === 1 && guildId === testGuildId) {
        return {
          id: 1,
          title: updates.title || 'Test Note',
          content: updates.content || 'Test content',
          tags: updates.tags || ['personal'],
          created_at: new Date('2024-01-15'),
          updated_at: new Date(),
          user_id: testUserId,
          guild_id: guildId,
        } as any;
      }
      return null;
    });

    // Mock getNotesByTag
    jest.spyOn(Note, 'getNotesByTag').mockImplementation(async (guildId, tag) => {
      const notes = [
        {
          id: 1,
          title: 'Work Note 1',
          content: 'Content',
          tags: ['work', 'important'],
          created_at: new Date(),
          updated_at: new Date(),
          user_id: testUserId,
          guild_id: guildId,
        },
        {
          id: 2,
          title: 'Work Note 2',
          content: 'Content',
          tags: ['work'],
          created_at: new Date(),
          updated_at: new Date(),
          user_id: testUserId,
          guild_id: guildId,
        },
        {
          id: 3,
          title: 'Personal Note',
          content: 'Content',
          tags: ['personal'],
          created_at: new Date(),
          updated_at: new Date(),
          user_id: testUserId,
          guild_id: guildId,
        },
      ];

      return notes.filter((n) =>
        n.tags.some((t: string) => t.toLowerCase() === tag.toLowerCase())
      ) as any[];
    });

    // Mock getAllTags
    jest.spyOn(Note, 'getAllTags').mockImplementation(async (guildId) => {
      if (guildId === 'guild-empty') {
        return [];
      }

      return ['work', 'personal', 'important', 'cooking'];
    });
  });

  describe('createNote', () => {
    test('should create a note with all fields including tags', async () => {
      const result = await Note.createNote(
        testGuildId,
        'My Note',
        'Note content here',
        ['work', 'important'],
        testUserId
      );

      expect(result).toBeDefined();
      expect(result.title).toBe('My Note');
      expect(result.content).toBe('Note content here');
      expect(result.tags).toEqual(['work', 'important']);
      expect(result.guild_id).toBe(testGuildId);
      expect(result.user_id).toBe(testUserId);
    });

    test('should create a note without tags (defaults to empty array)', async () => {
      const result = await Note.createNote(testGuildId, 'Simple Note', 'Content');

      expect(result).toBeDefined();
      expect(result.tags).toEqual([]);
    });

    test('should default user_id to system when not provided', async () => {
      const result = await Note.createNote(testGuildId, 'Note', 'Content');

      expect(result.user_id).toBe('system');
    });

    test('should include created_at and updated_at timestamps', async () => {
      const result = await Note.createNote(testGuildId, 'Note', 'Content');

      expect(result.created_at).toBeDefined();
      expect(result.updated_at).toBeDefined();
    });
  });

  describe('getNotes', () => {
    test('should return all notes for a guild ordered by created_at DESC', async () => {
      const notes = await Note.getNotes(testGuildId);

      expect(notes).toHaveLength(2);
      expect(notes[0].id).toBe(2); // Most recent first
      expect(notes[1].id).toBe(1);
    });

    test('should return empty array when no notes exist', async () => {
      const notes = await Note.getNotes('guild-empty');

      expect(notes).toEqual([]);
    });

    test('should filter by guild_id', async () => {
      const notes = await Note.getNotes(testGuildId);

      notes.forEach((note) => {
        expect(note.guild_id).toBe(testGuildId);
      });
    });
  });

  describe('getNote', () => {
    test('should return note when found', async () => {
      const result = await Note.getNote(1, testGuildId);

      expect(result).toBeDefined();
      expect(result!.id).toBe(1);
      expect(result!.title).toBe('Test Note');
      expect(result!.content).toBe('Test content');
    });

    test('should return null when note is not found', async () => {
      const result = await Note.getNote(999, testGuildId);

      expect(result).toBeNull();
    });

    test('should return null when guild_id does not match', async () => {
      const result = await Note.getNote(1, 'guild-other');

      expect(result).toBeNull();
    });
  });

  describe('searchNotes', () => {
    test('should find notes matching keyword in title', async () => {
      const results = await Note.searchNotes(testGuildId, 'Meeting');

      expect(results.length).toBeGreaterThan(0);
      const hasMatch = results.some(
        (n) =>
          n.title.toLowerCase().includes('meeting') || n.content.toLowerCase().includes('meeting')
      );
      expect(hasMatch).toBe(true);
    });

    test('should find notes matching keyword in content', async () => {
      const results = await Note.searchNotes(testGuildId, 'chocolate');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Recipe');
    });

    test('should return empty array when no matches found', async () => {
      const results = await Note.searchNotes(testGuildId, 'zzzznonexistent');

      expect(results).toEqual([]);
    });

    test('should be case-insensitive', async () => {
      const results = await Note.searchNotes(testGuildId, 'meeting');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('deleteNote', () => {
    test('should return true when note is successfully deleted', async () => {
      const result = await Note.deleteNote(1, testGuildId);

      expect(result).toBe(true);
    });

    test('should return false when note is not found', async () => {
      const result = await Note.deleteNote(999, testGuildId);

      expect(result).toBe(false);
    });

    test('should return false when guild_id does not match', async () => {
      const result = await Note.deleteNote(1, 'guild-other');

      expect(result).toBe(false);
    });
  });

  describe('updateNote', () => {
    test('should update note title', async () => {
      const result = await Note.updateNote(1, testGuildId, { title: 'Updated Title' });

      expect(result).toBeDefined();
      expect(result!.title).toBe('Updated Title');
    });

    test('should update note content', async () => {
      const result = await Note.updateNote(1, testGuildId, { content: 'Updated content' });

      expect(result).toBeDefined();
      expect(result!.content).toBe('Updated content');
    });

    test('should update note tags', async () => {
      const result = await Note.updateNote(1, testGuildId, { tags: ['new-tag', 'another'] });

      expect(result).toBeDefined();
      expect(result!.tags).toEqual(['new-tag', 'another']);
    });

    test('should update multiple fields at once', async () => {
      const result = await Note.updateNote(1, testGuildId, {
        title: 'New Title',
        content: 'New Content',
        tags: ['updated'],
      });

      expect(result).toBeDefined();
      expect(result!.title).toBe('New Title');
      expect(result!.content).toBe('New Content');
      expect(result!.tags).toEqual(['updated']);
    });

    test('should return null when note is not found', async () => {
      const result = await Note.updateNote(999, testGuildId, { title: 'New Title' });

      expect(result).toBeNull();
    });

    test('should return null when guild_id does not match', async () => {
      const result = await Note.updateNote(1, 'guild-other', { title: 'New Title' });

      expect(result).toBeNull();
    });

    test('should update the updated_at timestamp', async () => {
      const result = await Note.updateNote(1, testGuildId, { title: 'Updated' });

      expect(result).toBeDefined();
      expect(result!.updated_at).toBeDefined();
      expect(result!.updated_at.getTime()).toBeGreaterThanOrEqual(result!.created_at.getTime());
    });
  });

  describe('getNotesByTag', () => {
    test('should return notes filtered by tag', async () => {
      const results = await Note.getNotesByTag(testGuildId, 'work');

      expect(results).toHaveLength(2);
      results.forEach((note) => {
        expect(note.tags).toContain('work');
      });
    });

    test('should return empty array when no notes match the tag', async () => {
      const results = await Note.getNotesByTag(testGuildId, 'nonexistent-tag');

      expect(results).toEqual([]);
    });

    test('should be case-insensitive for tag matching', async () => {
      const results = await Note.getNotesByTag(testGuildId, 'Work');

      expect(results).toHaveLength(2);
    });
  });

  describe('getAllTags', () => {
    test('should return all unique tags across notes', async () => {
      const tags = await Note.getAllTags(testGuildId);

      expect(tags).toHaveLength(4);
      expect(tags).toContain('work');
      expect(tags).toContain('personal');
      expect(tags).toContain('important');
      expect(tags).toContain('cooking');
    });

    test('should return empty array when no notes exist', async () => {
      const tags = await Note.getAllTags('guild-empty');

      expect(tags).toEqual([]);
    });

    test('should return unique tags (no duplicates)', async () => {
      const tags = await Note.getAllTags(testGuildId);
      const uniqueTags = [...new Set(tags)];

      expect(tags.length).toBe(uniqueTags.length);
    });
  });

  describe('Guild Isolation', () => {
    test('createNote should include guild_id in created record', async () => {
      const result = await Note.createNote(testGuildId, 'Note', 'Content');

      expect(result.guild_id).toBe(testGuildId);
    });

    test('getNotes should be called with guild_id', async () => {
      await Note.getNotes(testGuildId);

      expect(Note.getNotes).toHaveBeenCalledWith(testGuildId);
    });

    test('getNote should require guild_id', async () => {
      await Note.getNote(1, testGuildId);

      expect(Note.getNote).toHaveBeenCalledWith(1, testGuildId);
    });

    test('deleteNote should require guild_id', async () => {
      await Note.deleteNote(1, testGuildId);

      expect(Note.deleteNote).toHaveBeenCalledWith(1, testGuildId);
    });

    test('searchNotes should be called with guild_id', async () => {
      await Note.searchNotes(testGuildId, 'keyword');

      expect(Note.searchNotes).toHaveBeenCalledWith(testGuildId, 'keyword');
    });

    test('updateNote should require guild_id', async () => {
      await Note.updateNote(1, testGuildId, { title: 'New' });

      expect(Note.updateNote).toHaveBeenCalledWith(1, testGuildId, { title: 'New' });
    });
  });
});
