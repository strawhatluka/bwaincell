# ListGrid

**Source:** `frontend/components/lists/ListGrid.tsx`

Top-level lists view: create-list dialog, loading skeleton, empty state, and 1/2/3-column grid of `ListCard`.

## Props

None.

## Hooks

`useLists()` — `{ lists, isLoading, createList, deleteList, isCreating }`. `deleteList` is imported but used inside `ListCard` instances, not here.

## Local State

- `isCreateOpen: boolean` — create dialog visibility.
- `newListName: string` — name input.

## Behaviors

- Clicking `Create List` opens a Dialog.
- `handleCreateList` submits via `createList({ name: trimmed })`, then clears input and closes the dialog.
- While `isLoading` → renders `<ListGridSkeleton />`.
- Empty: centered icon + copy + `"Create Your First List"` button.
- Populated: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` of `<ListCard>`.

## Dependencies

- `ListCard`, `ListGridSkeleton`
- shadcn: `Button`, `Input`, `Label`, `Dialog*`
- lucide: `Plus`, `List as ListIcon`

## Integration

Rendered by `app/dashboard/lists/page.tsx` inside an `ErrorBoundary`.
