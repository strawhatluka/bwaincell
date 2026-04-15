# Dashboard Tasks Page

**Source:** `frontend/app/dashboard/tasks/page.tsx`
**Route:** `/dashboard/tasks`

Client component.

## Composition

```tsx
<ErrorBoundary>
  <div>
    <h1>Tasks</h1>
    <p>Manage your to-do items</p>
    <TaskList />
  </div>
</ErrorBoundary>
```

## Dependencies

- `TaskList` from `@/components/tasks/TaskList` — loads + renders tasks via `useTasks()`.
- `ErrorBoundary` from `@/components/common/ErrorBoundary`.

## Data Loading

Handled by `TaskList` through the `useTasks` hook (React Query). See [../hooks/useTasks.md](../hooks/useTasks.md) and [../components/tasks/TaskList.md](../components/tasks/TaskList.md).

## State / Hooks

None at this level.
