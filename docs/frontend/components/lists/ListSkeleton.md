# ListSkeleton / ListGridSkeleton

**Source:** `frontend/components/lists/ListSkeleton.tsx`

Loading placeholders for `ListGrid`.

## `ListSkeleton`

Single card shape with a header row (title bar + action button), three body lines, and a footer row.

## `ListGridSkeleton`

Six `ListSkeleton`s in a `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`. Used by `ListGrid` while `useLists().isLoading`.

## Props

None on either export.

## Dependencies

- `Skeleton` from `@/components/ui/skeleton`.
