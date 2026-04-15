# /note Command

**Source:** `backend/commands/note.ts`
**Model:** `supabase/models/Note`

Manage per-guild notes with titles, free-form content, and tags.

## Subcommands

| Subcommand | Options                                                                                                   | Purpose                                                                              |
| ---------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `add`      | `title`, `content` (both required), `tags` (optional, comma-separated)                                    | Creates a note.                                                                      |
| `list`     | —                                                                                                         | Shows up to 10 notes with title, tags, and 50-char preview.                          |
| `view`     | `title` (required, autocomplete)                                                                          | Displays full note, created / updated dates, and tags. Match is case-insensitive.    |
| `delete`   | `title` (required, autocomplete)                                                                          | Deletes matched note.                                                                |
| `search`   | `keyword` (required)                                                                                      | Full-text search via `Note.searchNotes`. Shows up to 10 results.                     |
| `edit`     | `current_title` (required, autocomplete), `new_title` (optional), `content` (optional), `tags` (optional) | Updates any subset. If `tags` is an empty string it is still applied (split on `,`). |
| `tag`      | `tag` (required)                                                                                          | Lists notes carrying the tag via `Note.getNotesByTag`.                               |
| `tags`     | —                                                                                                         | Lists all unique tags via `Note.getAllTags`.                                         |

## Local Types

```ts
interface NoteUpdateData {
  title?: string;
  content?: string;
  tags?: string[];
}
```

## Autocomplete

For focused options `title` or `current_title`, returns up to 25 note titles from `Note.getNotes(guildId)` filtered case-insensitively.

## Model Methods Used

`createNote`, `getNotes`, `deleteNote`, `searchNotes`, `updateNote`, `getNotesByTag`, `getAllTags`.

## Error Handling

Errors logged with `{ command, subcommand, error, stack, userId, guildId }`; user receives "An error occurred while processing your request."
