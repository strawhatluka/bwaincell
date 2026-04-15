# Notes Routes

**Source:** `backend/src/api/routes/notes.ts`
**Mount point:** `/api/notes`
**Auth:** Bearer JWT.

## Endpoints

### `GET /api/notes`

List notes, optionally filtered.

- **Query:**
  - `search` — keyword passed to `Note.searchNotes(guildId, keyword)` (ILIKE on title/content).
  - `tag` — filter via `Note.getNotesByTag(guildId, tag)` (case-insensitive array contains).
- If neither is provided, returns `Note.getNotes(guildId)` (newest first).
- **Returns:** `200 { success, data: NoteRow[] }`.

### `GET /api/notes/tags`

Return all unique tags across the guild's notes. Routes match before `:id` so `tags` is not interpreted as an ID.
- **Returns:** `200 { success, data: string[] }`.

### `GET /api/notes/:id`

Fetch a note by integer ID.
- **Errors:** `400` invalid ID; `404` not found.

### `POST /api/notes`

Create a note.
- **Body:**
  - `title` (string, required, non-empty)
  - `content` (string, required, non-empty)
  - `tags` (string[], optional; non-string or empty entries filtered out)
- **Returns:** `201 { success, data: NoteRow }`.
- **Errors:** `400` for missing/invalid fields.

### `PATCH /api/notes/:id`

Update a note. At least one of `title`, `content`, `tags` must be provided; empty strings are rejected.
- **Returns:** `200 { success, data: NoteRow }`.
- **Errors:** `400` invalid payload; `404` note not found.

### `DELETE /api/notes/:id`

Delete a note.
- **Returns:** `200 { success, message }`.
- **Errors:** `404` if not found.

## Related

- Model: [docs/backend/models/Note.md](../../models/Note.md)
