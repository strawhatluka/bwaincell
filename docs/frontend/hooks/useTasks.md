# useTasks

**Source:** `frontend/hooks/useTasks.ts`

React Query hook for tasks CRUD.

## Signature

```ts
function useTasks(): {
  tasks: Task[];
  isLoading: boolean;
  error: Error | null;
  createTask: (payload: { description: string; dueDate?: string }) => void;
  updateTask: (payload: { id: number; data: Partial<Task> }) => void;
  deleteTask: (id: number) => void;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}
```

## Task Type

```ts
interface Task {
  id: number;
  userId: string;
  guildId: string;
  description: string;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
```

## React Query Keys

- Query: `['tasks']`
- Invalidated on success by every mutation.

## Queries / Mutations

| Operation | Method / Path |
|---|---|
| List | `GET /tasks` (via `api.get<Task[]>('/tasks')`) |
| Create | `POST /tasks` |
| Update | `PATCH /tasks/:id` |
| Delete | `DELETE /tasks/:id` |

Polling: `refetchInterval: 15000` on the list query.

## Side-effects

- Success → toast (`title: 'Task created/updated/deleted'`).
- Failure → toast with `variant: 'destructive'` and the caught `error.message`.

## Example

```ts
const { tasks, createTask, isCreating } = useTasks();
createTask({ description: 'Write docs', dueDate: '2026-04-16' });
```
