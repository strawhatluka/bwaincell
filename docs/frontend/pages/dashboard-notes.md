# Dashboard Notes Page

**Source:** `frontend/app/dashboard/notes/page.tsx`
**Route:** `/dashboard/notes`

Client component.

## Composition

```tsx
<ErrorBoundary>
  <div>
    <h1>Notes</h1>
    <p>Capture your thoughts and ideas</p>
    <NoteGrid />
  </div>
</ErrorBoundary>
```

## Dependencies

- `NoteGrid` from `@/components/notes/NoteGrid` — uses `useNotes()`.
- `ErrorBoundary` from `@/components/common/ErrorBoundary`.

## Data Loading

`NoteGrid` fetches via `useNotes`.
