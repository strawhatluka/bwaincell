# TaskSkeleton / TaskListSkeleton

**Source:** `frontend/components/tasks/TaskSkeleton.tsx`

Loading placeholders composed from shadcn `Skeleton`.

## Exports

### `TaskSkeleton`

Single-row placeholder: a 5×5 checkbox skeleton plus two horizontal bars (3/4 width and 1/2 width).

### `TaskListSkeleton`

Stack of five `TaskSkeleton` items with `space-y-3`. Rendered by `TaskList` during `isLoading`.

## Props

Both components take no props.

## Dependencies

- `Skeleton` from `@/components/ui/skeleton` (shadcn primitive).
