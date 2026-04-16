/**
 * Unit tests for /note Discord command
 *
 * Tests all 8 subcommands: add, list, view, delete, search, edit, tag, tags
 * Plus autocomplete and error handling.
 */

// Mock dependencies BEFORE imports
jest.mock('../../../shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../config/config', () => ({
  __esModule: true,
  default: {
    settings: {
      timezone: 'America/Los_Angeles',
    },
  },
}));

jest.mock('@database/models/Note', () => ({
  __esModule: true,
  default: {
    createNote: jest.fn(),
    getNotes: jest.fn(),
    searchNotes: jest.fn(),
    deleteNote: jest.fn(),
    updateNote: jest.fn(),
    getNotesByTag: jest.fn(),
    getAllTags: jest.fn(),
  },
}));

import { ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import noteCommand from '../../../commands/note';
import Note from '@database/models/Note';
import { logger } from '../../../shared/utils/logger';

const mockNote = Note as jest.Mocked<typeof Note>;

describe('/note Discord Command', () => {
  let mockInteraction: Partial<ChatInputCommandInteraction>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInteraction = {
      user: {
        id: 'user-456',
        username: 'testuser',
      } as any,
      guild: {
        id: 'guild-123',
      } as any,
      guildId: 'guild-123',
      options: {
        getString: jest.fn(),
        getInteger: jest.fn(),
        getSubcommand: jest.fn(),
      } as any,
      editReply: jest.fn().mockResolvedValue({}),
      followUp: jest.fn().mockResolvedValue({}),
      reply: jest.fn().mockResolvedValue({}),
      deferReply: jest.fn().mockResolvedValue({}),
      replied: false,
      deferred: true,
      commandName: 'note',
    };
  });

  // ─── Command Configuration ───────────────────────────────────────────

  describe('Command Configuration', () => {
    it('should have correct command name', () => {
      expect(noteCommand.data.name).toBe('note');
    });

    it('should have correct description', () => {
      expect(noteCommand.data.description).toBe('Manage your notes');
    });

    it('should have exactly 8 subcommands', () => {
      const commandData = noteCommand.data.toJSON();
      expect(commandData.options).toHaveLength(8);
    });

    it('should have all required subcommands', () => {
      const commandData = noteCommand.data.toJSON();
      const subcommandNames = commandData.options?.map((opt: any) => opt.name) || [];

      expect(subcommandNames).toContain('add');
      expect(subcommandNames).toContain('list');
      expect(subcommandNames).toContain('view');
      expect(subcommandNames).toContain('delete');
      expect(subcommandNames).toContain('search');
      expect(subcommandNames).toContain('edit');
      expect(subcommandNames).toContain('tag');
      expect(subcommandNames).toContain('tags');
    });
  });

  // ─── Subcommand: add ─────────────────────────────────────────────────

  describe('Subcommand: add', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('add');
    });

    it('should create a note with tags successfully', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'title') return 'My Note';
        if (name === 'content') return 'Note content here';
        if (name === 'tags') return 'work, personal, urgent';
        return null;
      });

      (mockNote.createNote as jest.Mock).mockResolvedValue({
        id: 1,
        title: 'My Note',
        content: 'Note content here',
        tags: ['work', 'personal', 'urgent'],
      });

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockNote.createNote).toHaveBeenCalledWith(
        'guild-123',
        'My Note',
        'Note content here',
        ['work', 'personal', 'urgent'],
        'user-456'
      );
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Note Created',
              }),
            }),
          ]),
        })
      );
    });

    it('should create a note without tags successfully', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'title') return 'Simple Note';
        if (name === 'content') return 'Just a simple note';
        if (name === 'tags') return null;
        return null;
      });

      (mockNote.createNote as jest.Mock).mockResolvedValue({
        id: 2,
        title: 'Simple Note',
        content: 'Just a simple note',
        tags: [],
      });

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockNote.createNote).toHaveBeenCalledWith(
        'guild-123',
        'Simple Note',
        'Just a simple note',
        [],
        'user-456'
      );
      expect(mockInteraction.editReply).toHaveBeenCalled();
    });

    it('should reject when used outside a guild', async () => {
      mockInteraction.guild = null;

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'This command can only be used in a server.',
      });
      expect(mockNote.createNote).not.toHaveBeenCalled();
    });
  });

  // ─── Subcommand: list ────────────────────────────────────────────────

  describe('Subcommand: list', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('list');
    });

    it('should display notes with previews truncated at 50 characters', async () => {
      (mockNote.getNotes as jest.Mock).mockResolvedValue([
        {
          id: 1,
          title: 'First Note',
          content: 'This is a short note.',
          tags: ['work'],
        },
        {
          id: 2,
          title: 'Long Note',
          content:
            'This content is longer than fifty characters and should be truncated with ellipsis',
          tags: [],
        },
      ]);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Your Notes',
              }),
            }),
          ]),
        })
      );

      const embed = (mockInteraction.editReply as jest.Mock).mock.calls[0][0].embeds[0];
      const description = embed.data.description;
      // Short content should not have ellipsis
      expect(description).toContain('This is a short note.');
      // Long content should be truncated
      expect(description).toContain('...');
      // Tags should be displayed in brackets
      expect(description).toContain('[work]');
    });

    it('should show message when there are no notes', async () => {
      (mockNote.getNotes as jest.Mock).mockResolvedValue([]);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'You have no notes.',
      });
    });

    it('should show footer with count when 10 or fewer notes', async () => {
      const notes = Array.from({ length: 3 }, (_, i) => ({
        id: i + 1,
        title: `Note ${i + 1}`,
        content: 'Some content',
        tags: [],
      }));
      (mockNote.getNotes as jest.Mock).mockResolvedValue(notes);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const embed = (mockInteraction.editReply as jest.Mock).mock.calls[0][0].embeds[0];
      expect(embed.data.footer.text).toBe('3 note(s)');
    });

    it('should show footer with total count when more than 10 notes', async () => {
      const notes = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        title: `Note ${i + 1}`,
        content: 'Some content',
        tags: [],
      }));
      (mockNote.getNotes as jest.Mock).mockResolvedValue(notes);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const embed = (mockInteraction.editReply as jest.Mock).mock.calls[0][0].embeds[0];
      expect(embed.data.footer.text).toBe('Showing 10 of 15 notes');
    });
  });

  // ─── Subcommand: view ────────────────────────────────────────────────

  describe('Subcommand: view', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('view');
    });

    it('should display full note with tags and dates', async () => {
      const createdAt = '2026-01-15T10:00:00.000Z';
      const updatedAt = '2026-01-16T14:30:00.000Z';

      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'title') return 'My Note';
        return null;
      });

      (mockNote.getNotes as jest.Mock).mockResolvedValue([
        {
          id: 1,
          title: 'My Note',
          content: 'Full note content here with all the details.',
          tags: ['important', 'project'],
          created_at: createdAt,
          updated_at: updatedAt,
        },
      ]);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'My Note',
                description: 'Full note content here with all the details.',
              }),
            }),
          ]),
        })
      );
    });

    it('should find note with case-insensitive title match', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'title') return 'MY NOTE';
        return null;
      });

      (mockNote.getNotes as jest.Mock).mockResolvedValue([
        {
          id: 1,
          title: 'My Note',
          content: 'Content',
          tags: [],
          created_at: '2026-01-15T10:00:00.000Z',
          updated_at: '2026-01-15T10:00:00.000Z',
        },
      ]);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const embed = (mockInteraction.editReply as jest.Mock).mock.calls[0][0].embeds[0];
      expect(embed.data.title).toBe('My Note');
    });

    it('should show not found message when note does not exist', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'title') return 'Nonexistent Note';
        return null;
      });

      (mockNote.getNotes as jest.Mock).mockResolvedValue([]);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Note "Nonexistent Note" not found.',
      });
    });

    it('should not show Last Updated field when updated_at equals created_at', async () => {
      const sameDate = '2026-01-15T10:00:00.000Z';

      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'title') return 'Unchanged Note';
        return null;
      });

      (mockNote.getNotes as jest.Mock).mockResolvedValue([
        {
          id: 1,
          title: 'Unchanged Note',
          content: 'Content',
          tags: [],
          created_at: sameDate,
          updated_at: sameDate,
        },
      ]);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const embed = (mockInteraction.editReply as jest.Mock).mock.calls[0][0].embeds[0];
      const fieldNames = embed.data.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('Created');
      expect(fieldNames).not.toContain('**Last Updated**');
    });

    it('should show Last Updated field when updated_at differs from created_at', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'title') return 'Updated Note';
        return null;
      });

      (mockNote.getNotes as jest.Mock).mockResolvedValue([
        {
          id: 1,
          title: 'Updated Note',
          content: 'Updated content',
          tags: [],
          created_at: '2026-01-15T10:00:00.000Z',
          updated_at: '2026-01-16T14:30:00.000Z',
        },
      ]);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const embed = (mockInteraction.editReply as jest.Mock).mock.calls[0][0].embeds[0];
      const fieldNames = embed.data.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('**Last Updated**');
    });
  });

  // ─── Subcommand: delete ──────────────────────────────────────────────

  describe('Subcommand: delete', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('delete');
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'title') return 'Note To Delete';
        return null;
      });
    });

    it('should delete a note successfully', async () => {
      (mockNote.getNotes as jest.Mock).mockResolvedValue([
        { id: 5, title: 'Note To Delete', content: 'Content' },
      ]);
      (mockNote.deleteNote as jest.Mock).mockResolvedValue(true);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockNote.deleteNote).toHaveBeenCalledWith(5, 'guild-123');
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Note "Note To Delete" has been deleted.',
      });
    });

    it('should show not found when note does not exist', async () => {
      (mockNote.getNotes as jest.Mock).mockResolvedValue([]);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockNote.deleteNote).not.toHaveBeenCalled();
      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Note "Note To Delete" not found.',
      });
    });

    it('should handle deletion failure (returns false)', async () => {
      (mockNote.getNotes as jest.Mock).mockResolvedValue([
        { id: 5, title: 'Note To Delete', content: 'Content' },
      ]);
      (mockNote.deleteNote as jest.Mock).mockResolvedValue(false);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Failed to delete note "Note To Delete".',
      });
    });
  });

  // ─── Subcommand: search ──────────────────────────────────────────────

  describe('Subcommand: search', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('search');
    });

    it('should display search results when notes are found', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'keyword') return 'project';
        return null;
      });

      (mockNote.searchNotes as jest.Mock).mockResolvedValue([
        { id: 1, title: 'Project Plan', tags: ['work'] },
        { id: 2, title: 'Project Notes', tags: [] },
      ]);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockNote.searchNotes).toHaveBeenCalledWith('guild-123', 'project');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Search Results for "project"',
              }),
            }),
          ]),
        })
      );

      const embed = (mockInteraction.editReply as jest.Mock).mock.calls[0][0].embeds[0];
      expect(embed.data.description).toContain('Project Plan');
      expect(embed.data.description).toContain('[work]');
      expect(embed.data.footer.text).toBe('Found 2 note(s)');
    });

    it('should show no results message when search finds nothing', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'keyword') return 'nonexistent';
        return null;
      });

      (mockNote.searchNotes as jest.Mock).mockResolvedValue([]);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'No notes found containing "nonexistent".',
      });
    });
  });

  // ─── Subcommand: edit ────────────────────────────────────────────────

  describe('Subcommand: edit', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('edit');
    });

    it('should update note with new title, content, and tags', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'current_title') return 'Old Title';
        if (name === 'new_title') return 'New Title';
        if (name === 'content') return 'Updated content';
        if (name === 'tags') return 'updated, revised';
        return null;
      });

      (mockNote.getNotes as jest.Mock).mockResolvedValue([
        { id: 3, title: 'Old Title', content: 'Old content', tags: ['original'] },
      ]);

      (mockNote.updateNote as jest.Mock).mockResolvedValue({
        id: 3,
        title: 'New Title',
        content: 'Updated content',
        tags: ['updated', 'revised'],
      });

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockNote.updateNote).toHaveBeenCalledWith(3, 'guild-123', {
        title: 'New Title',
        content: 'Updated content',
        tags: ['updated', 'revised'],
      });

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Note Updated',
              }),
            }),
          ]),
        })
      );
    });

    it('should show error when no changes are provided', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'current_title') return 'My Note';
        if (name === 'new_title') return null;
        if (name === 'content') return null;
        if (name === 'tags') return null;
        return null;
      });

      (mockNote.getNotes as jest.Mock).mockResolvedValue([
        { id: 3, title: 'My Note', content: 'Content', tags: [] },
      ]);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'No changes provided.',
      });
      expect(mockNote.updateNote).not.toHaveBeenCalled();
    });

    it('should show not found when note does not exist', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'current_title') return 'Missing Note';
        if (name === 'new_title') return 'New Title';
        return null;
      });

      (mockNote.getNotes as jest.Mock).mockResolvedValue([]);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Note "Missing Note" not found.',
      });
      expect(mockNote.updateNote).not.toHaveBeenCalled();
    });

    it('should handle update failure (returns null)', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'current_title') return 'Broken Note';
        if (name === 'new_title') return 'New Title';
        if (name === 'content') return null;
        if (name === 'tags') return null;
        return null;
      });

      (mockNote.getNotes as jest.Mock).mockResolvedValue([
        { id: 7, title: 'Broken Note', content: 'Content', tags: [] },
      ]);

      (mockNote.updateNote as jest.Mock).mockResolvedValue(null);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Failed to update note "Broken Note".',
      });
    });

    it('should update only title when only new_title is provided', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'current_title') return 'Old Title';
        if (name === 'new_title') return 'Renamed Title';
        if (name === 'content') return null;
        if (name === 'tags') return null;
        return null;
      });

      (mockNote.getNotes as jest.Mock).mockResolvedValue([
        { id: 4, title: 'Old Title', content: 'Content', tags: [] },
      ]);

      (mockNote.updateNote as jest.Mock).mockResolvedValue({
        id: 4,
        title: 'Renamed Title',
        content: 'Content',
        tags: [],
      });

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockNote.updateNote).toHaveBeenCalledWith(4, 'guild-123', {
        title: 'Renamed Title',
      });
    });

    it('should display tags in the success embed when note has tags', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'current_title') return 'Tagged Note';
        if (name === 'new_title') return null;
        if (name === 'content') return 'New content';
        if (name === 'tags') return null;
        return null;
      });

      (mockNote.getNotes as jest.Mock).mockResolvedValue([
        { id: 8, title: 'Tagged Note', content: 'Old content', tags: ['tag1'] },
      ]);

      (mockNote.updateNote as jest.Mock).mockResolvedValue({
        id: 8,
        title: 'Tagged Note',
        content: 'New content',
        tags: ['tag1'],
      });

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const embed = (mockInteraction.editReply as jest.Mock).mock.calls[0][0].embeds[0];
      const fieldNames = embed.data.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('Tags');
    });
  });

  // ─── Subcommand: tag ─────────────────────────────────────────────────

  describe('Subcommand: tag', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('tag');
    });

    it('should display notes found for a given tag', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'tag') return 'work';
        return null;
      });

      (mockNote.getNotesByTag as jest.Mock).mockResolvedValue([
        { id: 1, title: 'Work Note 1' },
        { id: 2, title: 'Work Note 2' },
      ]);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockNote.getNotesByTag).toHaveBeenCalledWith('guild-123', 'work');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Notes tagged with "work"',
              }),
            }),
          ]),
        })
      );

      const embed = (mockInteraction.editReply as jest.Mock).mock.calls[0][0].embeds[0];
      expect(embed.data.description).toContain('Work Note 1');
      expect(embed.data.description).toContain('Work Note 2');
      expect(embed.data.footer.text).toBe('Found 2 note(s)');
    });

    it('should show no notes message when tag has no matches', async () => {
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'tag') return 'nonexistent';
        return null;
      });

      (mockNote.getNotesByTag as jest.Mock).mockResolvedValue([]);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'No notes found with tag "nonexistent".',
      });
    });
  });

  // ─── Subcommand: tags ────────────────────────────────────────────────

  describe('Subcommand: tags', () => {
    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('tags');
    });

    it('should list all unique tags', async () => {
      (mockNote.getAllTags as jest.Mock).mockResolvedValue(['personal', 'project', 'work']);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockNote.getAllTags).toHaveBeenCalledWith('guild-123');
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Your Tags',
              }),
            }),
          ]),
        })
      );

      const embed = (mockInteraction.editReply as jest.Mock).mock.calls[0][0].embeds[0];
      expect(embed.data.footer.text).toBe('3 unique tag(s)');
    });

    it('should show no tags message when there are none', async () => {
      (mockNote.getAllTags as jest.Mock).mockResolvedValue([]);

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'No tags found in your notes.',
      });
    });
  });

  // ─── Autocomplete ────────────────────────────────────────────────────

  describe('Autocomplete', () => {
    let mockAutocompleteInteraction: Partial<AutocompleteInteraction>;

    beforeEach(() => {
      mockAutocompleteInteraction = {
        user: {
          id: 'user-456',
          username: 'testuser',
        } as any,
        guild: {
          id: 'guild-123',
        } as any,
        options: {
          getFocused: jest.fn(),
        } as any,
        respond: jest.fn().mockResolvedValue(undefined),
      };
    });

    it('should filter note titles based on focused value', async () => {
      (mockAutocompleteInteraction.options!.getFocused as jest.Mock).mockReturnValue({
        name: 'title',
        value: 'pro',
      });

      (mockNote.getNotes as jest.Mock).mockResolvedValue([
        { title: 'Project Plan' },
        { title: 'Grocery List' },
        { title: 'Programming Notes' },
      ]);

      await noteCommand.autocomplete(mockAutocompleteInteraction as AutocompleteInteraction);

      expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([
        { name: 'Project Plan', value: 'Project Plan' },
        { name: 'Programming Notes', value: 'Programming Notes' },
      ]);
    });

    it('should limit autocomplete results to 25 entries', async () => {
      const manyNotes = Array.from({ length: 30 }, (_, i) => ({
        title: `Note ${i + 1}`,
      }));

      (mockAutocompleteInteraction.options!.getFocused as jest.Mock).mockReturnValue({
        name: 'title',
        value: '',
      });

      (mockNote.getNotes as jest.Mock).mockResolvedValue(manyNotes);

      await noteCommand.autocomplete(mockAutocompleteInteraction as AutocompleteInteraction);

      const respondCall = (mockAutocompleteInteraction.respond as jest.Mock).mock.calls[0][0];
      expect(respondCall.length).toBeLessThanOrEqual(25);
    });

    it('should handle current_title field for edit subcommand autocomplete', async () => {
      (mockAutocompleteInteraction.options!.getFocused as jest.Mock).mockReturnValue({
        name: 'current_title',
        value: 'my',
      });

      (mockNote.getNotes as jest.Mock).mockResolvedValue([
        { title: 'My Note' },
        { title: 'Other Note' },
      ]);

      await noteCommand.autocomplete(mockAutocompleteInteraction as AutocompleteInteraction);

      expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([
        { name: 'My Note', value: 'My Note' },
      ]);
    });

    it('should respond with empty array when guild is missing', async () => {
      mockAutocompleteInteraction.guild = null as any;

      await noteCommand.autocomplete(mockAutocompleteInteraction as AutocompleteInteraction);

      expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([]);
      expect(mockNote.getNotes).not.toHaveBeenCalled();
    });

    it('should respond with empty array on error', async () => {
      (mockAutocompleteInteraction.options!.getFocused as jest.Mock).mockReturnValue({
        name: 'title',
        value: 'test',
      });

      (mockNote.getNotes as jest.Mock).mockRejectedValue(new Error('Database error'));

      await noteCommand.autocomplete(mockAutocompleteInteraction as AutocompleteInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in note autocomplete',
        expect.objectContaining({
          error: 'Database error',
        })
      );
      expect(mockAutocompleteInteraction.respond).toHaveBeenCalledWith([]);
    });
  });

  // ─── Error Handling ──────────────────────────────────────────────────

  describe('Error Handling', () => {
    it('should catch errors and log them', async () => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('list');
      (mockNote.getNotes as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in note command',
        expect.objectContaining({
          error: 'Database connection failed',
          userId: 'user-456',
          guildId: 'guild-123',
        })
      );
    });

    it('should use followUp when interaction is already replied', async () => {
      mockInteraction.replied = true;
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('list');
      (mockNote.getNotes as jest.Mock).mockRejectedValue(new Error('Test error'));

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content: 'An error occurred while processing your request.',
      });
    });

    it('should use followUp when interaction is deferred', async () => {
      mockInteraction.replied = false;
      mockInteraction.deferred = true;
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('add');
      (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
        if (name === 'title') return 'Test';
        if (name === 'content') return 'Content';
        if (name === 'tags') return null;
        return null;
      });
      (mockNote.createNote as jest.Mock).mockRejectedValue(new Error('Insert error'));

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.followUp).toHaveBeenCalledWith({
        content: 'An error occurred while processing your request.',
      });
    });

    it('should use editReply when interaction is neither replied nor deferred', async () => {
      mockInteraction.replied = false;
      mockInteraction.deferred = false;
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('list');
      (mockNote.getNotes as jest.Mock).mockRejectedValue(new Error('Test error'));

      await noteCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'An error occurred while processing your request.',
      });
    });
  });
});
