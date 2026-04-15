# useNotes

**Source:** `frontend/hooks/useNotes.ts`

React Query hook for notes CRUD with optional search.

## Signature

```ts
function useNotes(searchQuery?: string): {
  notes: Note[];
  isLoading: boolean;
  error: Error | null;
  createNote: (payload: { title: string; content: string; tags?: string[] }) => void;
  updateNote: (payload: { id: number; data: Partial<Note> }) => void;
  deleteNote: (id: number) => void;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
};
```

## Note Type

```ts
interface Note {
  id: number;
  userId: string;
  guildId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

## React Query Keys

- Query key: `['notes', searchQuery]` — re-fetches when `searchQuery` changes.
- Invalidated on every mutation (`invalidateQueries({ queryKey: ['notes'] })`).

## Query Options

- `staleTime: 30_000` (30s fresh).
- `refetchOnWindowFocus: false`.

## API Endpoints

| Operation     | Method / Path                               |
| ------------- | ------------------------------------------- |
| List / Search | `GET /notes` or `GET /notes?search={query}` |
| Create        | `POST /notes`                               |
| Update        | `PATCH /notes/:id`                          |
| Delete        | `DELETE /notes/:id`                         |

`searchQuery` is `encodeURIComponent`-wrapped.

## Side-effects

- Toast on success and failure (destructive variant for errors).
