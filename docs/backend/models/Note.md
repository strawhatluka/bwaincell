# Note Model

**Source:** `supabase/models/Note.ts`
**Table:** `notes`

Guild-scoped notes with free-text content and tag-based categorization.

## Columns

| Column       | Type         | Constraints                       |
| ------------ | ------------ | --------------------------------- |
| `id`         | SERIAL       | PRIMARY KEY                       |
| `title`      | VARCHAR(255) | NOT NULL                          |
| `content`    | TEXT         | NOT NULL                          |
| `tags`       | JSONB        | NOT NULL, DEFAULT `'[]'::jsonb`   |
| `created_at` | TIMESTAMPTZ  | NOT NULL, DEFAULT `NOW()`         |
| `updated_at` | TIMESTAMPTZ  | NOT NULL, DEFAULT `NOW()`         |
| `user_id`    | VARCHAR(255) | NOT NULL (audit trail)            |
| `guild_id`   | VARCHAR(255) | NOT NULL                          |

Index: `idx_notes_guild_id`. Tags are stored as a JSONB array of strings.

## Static Methods

| Method | Signature | Returns |
| ------ | --------- | ------- |
| `createNote` | `(guildId, title, content, tags: string[] = [], userId?)` | `Promise<NoteRow>` |
| `getNotes` | `(guildId)` | `Promise<NoteRow[]>` (sorted `created_at DESC`) |
| `getNote` | `(noteId, guildId)` | `Promise<NoteRow \| null>` |
| `deleteNote` | `(noteId, guildId)` | `Promise<boolean>` |
| `searchNotes` | `(guildId, keyword)` | `Promise<NoteRow[]>` — ILIKE on title or content |
| `updateNote` | `(noteId, guildId, updates: { title?; content?; tags? })` | `Promise<NoteRow \| null>` — always bumps `updated_at` |
| `getNotesByTag` | `(guildId, tag)` | `Promise<NoteRow[]>` (case-insensitive tag match, in-memory filter) |
| `getAllTags` | `(guildId)` | `Promise<string[]>` (deduped across all notes) |

## Example

```ts
import Note from '@database/models/Note';

const n = await Note.createNote(guildId, 'Meeting', 'Discussed plans', ['work'], userId);
await Note.updateNote(n.id, guildId, { tags: ['work', 'q2'] });
const results = await Note.searchNotes(guildId, 'plans');
const tags = await Note.getAllTags(guildId);
```

## Related

- Command: [docs/api/discord-commands.md#3-note-management---note](../../api/discord-commands.md#3-note-management---note)
- Route: [docs/backend/api/routes/notes.md](../api/routes/notes.md)
