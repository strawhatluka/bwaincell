# Task Model

**Source:** `supabase/models/Task.ts`
**Table:** `tasks`
**Schema:** `supabase/migrations/20260413000000_initial_schema.sql`

Guild-scoped to-do items with optional due dates and completion tracking.

## Columns

| Column         | Type         | Constraints                |
| -------------- | ------------ | -------------------------- |
| `id`           | SERIAL       | PRIMARY KEY                |
| `description`  | TEXT         | NOT NULL                   |
| `due_date`     | TIMESTAMPTZ  | nullable                   |
| `completed`    | BOOLEAN      | NOT NULL, DEFAULT FALSE    |
| `created_at`   | TIMESTAMPTZ  | NOT NULL, DEFAULT `NOW()`  |
| `completed_at` | TIMESTAMPTZ  | nullable                   |
| `user_id`      | VARCHAR(255) | NOT NULL (audit trail)     |
| `guild_id`     | VARCHAR(255) | NOT NULL                   |

## Indexes

- `idx_tasks_guild_id`
- `idx_tasks_completed`
- `idx_tasks_guild_completed` (composite)

## Static Methods

| Method | Signature | Returns |
| ------ | --------- | ------- |
| `createTask` | `(guildId, description, dueDate: Date\|null = null, userId?)` | `Promise<TaskRow>` |
| `getUserTasks` | `(guildId, filter: 'all'\|'pending'\|'completed' = 'all')` | `Promise<TaskRow[]>` |
| `completeTask` | `(taskId, guildId)` | `Promise<TaskRow \| null>` |
| `deleteTask` | `(taskId, guildId)` | `Promise<boolean>` |
| `editTask` | `(taskId, guildId, newDescription?, newDueDate?)` | `Promise<TaskRow \| null>` |

All reads/writes filter by `guild_id` for shared household access (WO-015). `user_id` defaults to `'system'` for audit-only storage.

## Example

```ts
import Task from '@database/models/Task';

// Create
const t = await Task.createTask(guildId, 'Buy milk', new Date('2026-04-16T14:00Z'), userId);

// List pending
const pending = await Task.getUserTasks(guildId, 'pending');

// Complete
await Task.completeTask(t.id, guildId);

// Edit description
await Task.editTask(t.id, guildId, 'Buy whole milk');

// Delete
await Task.deleteTask(t.id, guildId);
```

## Related

- Command: [docs/api/discord-commands.md#1-task-management---task](../../api/discord-commands.md#1-task-management---task)
- Route: [docs/backend/api/routes/tasks.md](../api/routes/tasks.md)
