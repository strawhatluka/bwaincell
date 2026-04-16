# Tasks Routes

**Source:** `backend/src/api/routes/tasks.ts`
**Mount point:** `/api/tasks`
**Auth:** All endpoints require Bearer JWT via `authenticateToken` middleware. `req.user.guildId` and `req.user.discordId` are used for isolation and audit.

## Imports

Handlers in this route use the `@database/*` path alias to reach the model layer:

```ts
// backend/src/api/routes/tasks.ts
import { Task, supabase } from '@database/index';
// Equivalently:
// import Task from '@database/models/Task';
```

The alias is defined in `backend/tsconfig.json` (`"@database/*": ["../supabase/*"]`) and must be used instead of relative `../../../supabase/...` paths — `tsc` does not rewrite cross-workspace relative imports during build.

## Endpoints

### `GET /api/tasks`

List tasks for the authenticated user's guild.

- **Query:** `filter` — one of `all | pending | completed` (default `all`).
- **Returns:** `200 { success, data: TaskRow[] }`
- **Errors:** `400` invalid filter; `500` server error.

### `GET /api/tasks/:id`

Fetch one task by numeric ID (scoped to guild).

- **Params:** `id` — integer task ID.
- **Returns:** `200 { success, data: TaskRow }`
- **Errors:** `400` invalid ID; `404` not found; `500` server error.
- Note: implementation calls `Task.getUserTasks(guildId)` and filters in JS.

### `POST /api/tasks`

Create a new task.

- **Body:**
  - `description` (string, required, non-empty)
  - `dueDate` (string, optional — must parse via `new Date()`)
- **Returns:** `201 { success, data: TaskRow }`
- **Errors:** `400` missing/empty description, invalid due date; `500` server error.

### `PATCH /api/tasks/:id`

Update an existing task. Supports three modes:

- `{ completed: true }` → `Task.completeTask(id, guildId)`
- `{ completed: false }` → direct Supabase update sets `completed=false, completed_at=null`.
- `{ description?, dueDate? }` → `Task.editTask(id, guildId, description, parsedDueDate)`; `dueDate` can be `null` to clear.

At least one of `description`, `dueDate`, or `completed` must be provided. Returns `200 { success, data: TaskRow }`, `404` if not found.

### `DELETE /api/tasks/:id`

Delete a task. Returns `200 { success, message: 'Task deleted successfully' }`, `404` if not found.

## Related

- Model: [docs/backend/models/Task.md](../../models/Task.md)
- OAuth middleware: [docs/backend/api/middleware/oauth.md](../middleware/oauth.md)
- Response helpers: `backend/src/api/utils/response.ts` (`successResponse`, `successMessageResponse`, `validationError`, `notFoundError`, `serverError`).
