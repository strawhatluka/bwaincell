# /api/notes

**Sources:** `frontend/app/api/notes/route.ts`, `frontend/app/api/notes/[id]/route.ts`

All handlers: `export const dynamic = 'force-dynamic'; export const runtime = 'nodejs';` and auth/user guard as per other routes.

## `GET /api/notes?search={query}`

- Query param `search` (optional, trimmed): when non-empty, calls `Note.searchNotes(user.guild_id, search)`; otherwise `Note.getNotes(user.guild_id)`.
- Response: `{ success: true, data: Note[] }`.

## `POST /api/notes`

Body:

```ts
{ title: string; content: string; tags?: string[]; }
```

- 400 when `title` or `content` missing.
- Calls `Note.createNote(user.guild_id, title.trim(), content.trim(), Array.isArray(tags) ? tags : [], user.discord_id)`.
- Response: 201 `{ success: true, data: Note }`.

## `GET /api/notes/[id]` / `PATCH /api/notes/[id]` / `DELETE /api/notes/[id]`

`[id]/route.ts` implements:

- `GET` — fetches a single note by id within the user's guild.
- `PATCH` — accepts `{ title?, content?, tags? }` and calls `Note.updateNote(id, user.guild_id, updates)`.
- `DELETE` — `Note.deleteNote(id, user.guild_id)`; 404 when the model returns `false`.

IDs are parsed via `parseInt(id, 10)`; invalid ids return 400.

## Response Shape

Success: `{ success: true, data?, message? }`.
Failure: `{ success: false, error, message? }` with status 400 / 401 / 404 / 500.
