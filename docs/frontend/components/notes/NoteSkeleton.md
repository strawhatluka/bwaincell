# NoteSkeleton / NoteGridSkeleton

**Source:** `frontend/components/notes/NoteSkeleton.tsx`

Loading placeholders for `NoteGrid`.

## `NoteSkeleton`

Single card-shaped placeholder with a header row (title bar + action button), three content lines, and a date bar.

## `NoteGridSkeleton`

Six `NoteSkeleton`s in a `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`. Used by `NoteGrid` while `useNotes().isLoading`.

## Props

None.

## Dependencies

- `Skeleton` from `@/components/ui/skeleton`.
