# TaskList

**Source:** `frontend/components/tasks/TaskList.tsx`

Top-level tasks view: data loading, filter tabs, create form, and per-task items.

## Props

None.

## Hooks

- `useTasks()` — `{ tasks, isLoading, createTask, updateTask, deleteTask, isCreating }`.
- `useState<FilterType>('all')` where `FilterType = 'all' | 'pending' | 'completed'`.

## Composition

1. `<TaskCreateForm onCreate={createTask} isCreating={isCreating} />`.
2. Three filter buttons: `All`, `Pending`, `Completed` — each shows a count derived from `tasks`.
3. When `isLoading` → additionally renders `<TaskListSkeleton />`.
4. Otherwise filters `tasks` by `completed` state and renders `<TaskItem>` per task, or an empty state with a `CheckSquare` icon and contextual copy.

## Mutation Wrappers

```ts
const handleUpdateTask = (id: number, data: Partial<any>) => updateTask({ id, data });
const handleDeleteTask = (id: number) => deleteTask(id);
```

These adapt `TaskItem`'s `(id, data)` signature to React Query's `{ id, data }` mutation payload.

## Integration

Rendered by `app/dashboard/tasks/page.tsx` inside an `ErrorBoundary`.
