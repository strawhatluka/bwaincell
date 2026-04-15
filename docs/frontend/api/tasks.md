# /api/tasks

**Sources:** `frontend/app/api/tasks/route.ts`, `frontend/app/api/tasks/[id]/route.ts`

All endpoints: `export const dynamic = 'force-dynamic'; export const runtime = 'nodejs';`

Every handler calls `getServerSession(authOptions)`, then `User.findByEmail(session.user.email)` → 401 / 404 on auth/user failures.

## `GET /api/tasks`

- Returns every task for the user's guild: `Task.getUserTasks(user.guild_id, 'all')`.
- Response: `{ success: true, data: Task[] }`.

## `POST /api/tasks`

Body:

```ts
{ description: string; dueDate?: string | null; }
```

- `description` required and non-empty; returns 400 otherwise.
- Calls `Task.createTask(user.guild_id, description.trim(), dueDate ? new Date(dueDate) : null, user.discord_id)`.
- Response: 201 `{ success: true, data: Task, message: 'Task created successfully' }`.

## `PATCH /api/tasks/[id]`

Params: `{ id: string }` — `parseInt(id, 10)`; 400 if `NaN`.

Body:

```ts
{ description?: string; dueDate?: string | null; completed?: boolean; }
```

Behavior:

1. If `completed === true` → `Task.completeTask(taskId, user.guild_id)` (sets `completed_at`). 404 if not found.
2. If `description` or `dueDate` is defined → `Task.editTask(taskId, guild_id, description?, dueDate ? new Date(dueDate) : null)`. 404 if not found.
3. `completed === false` alone is **not supported** (model has no "uncomplete" helper) → 400 `"Uncompleting a task is not supported by the current model API"`.
4. No update fields → 400.

Response: `{ success: true, data: Task, message: 'Task updated successfully' }`.

## `DELETE /api/tasks/[id]`

- `Task.deleteTask(taskId, user.guild_id)`; 404 if not found.
- Response: `{ success: true, message: 'Task deleted successfully' }`.

## Error Shape

Failure: `{ success: false, error: string, message?: string }` with status 400 / 401 / 404 / 500.

Errors are logged via `console.error('[API] …', error)`.
