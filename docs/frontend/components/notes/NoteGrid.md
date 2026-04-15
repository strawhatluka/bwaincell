# NoteGrid

**Source:** `frontend/components/notes/NoteGrid.tsx`

Top-level notes view with Enter-to-search, create/edit editor, loading skeleton, and empty states.

## Props

None.

## Hooks

`useNotes(activeSearch)` — `{ notes, isLoading, createNote, updateNote, deleteNote, isCreating, isUpdating }`.

## Local State

- `searchInput: string` — input box value.
- `activeSearch: string` — actual value used in the React Query key.
- `isEditorOpen: boolean`
- `editingNote: Note | null`
- `wasSaving: boolean` — tracks the previous saving state so the editor can close when a save transitions from pending → settled.

## Behaviors

- **Search**: Enter submits the form (`setActiveSearch(searchInput)`); clearing the input auto-clears `activeSearch`.
- **Create**: opens `NoteEditor` with `editingNote = null`.
- **Edit**: `NoteCard.onEdit(note)` opens `NoteEditor` with `editingNote = note`.
- **Save**: `handleSaveNote(data, noteId?)` dispatches `updateNote({ id, data })` or `createNote(data)`. The dialog is closed **after** the mutation settles (tracked via `wasSaving` + `useEffect`).

## Rendering

- `isLoading` → `<NoteGridSkeleton />`.
- Empty with `activeSearch` → "No notes found" copy.
- Empty without search → "No notes yet" with create button.
- Otherwise → `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` of `<NoteCard>` with `onEdit` and `onDelete={deleteNote}`.
- Always mounts `<NoteEditor>` controlled by local state.

## Dependencies

- `NoteCard`, `NoteEditor`, `NoteGridSkeleton`.
- shadcn: `Button`, `Input`.
- lucide: `Plus`, `StickyNote`, `Search`.

## Integration

Rendered by `app/dashboard/notes/page.tsx` inside an `ErrorBoundary`.
