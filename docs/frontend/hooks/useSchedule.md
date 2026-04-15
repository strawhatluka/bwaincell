# useSchedule

**Source:** `frontend/hooks/useSchedule.ts`

React Query hook for schedule events.

## Signature

```ts
function useSchedule(): {
  events: Event[];
  isLoading: boolean;
  error: Error | null;
  createEvent: (payload: { title: string; description: string; datetime: string }) => void;
  updateEvent: (payload: { id: number; data: Partial<Event> }) => void;
  deleteEvent: (id: number) => void;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
};
```

## Event Type

```ts
interface Event {
  id: number;
  userId: string;
  guildId: string;
  title: string;
  description: string;
  datetime: string;
  createdAt: string;
  updatedAt: string;
}
```

Note: the backend `Schedule` model splits date/time into `event` (name), `date`, `time`, `description` — the hook exposes a flattened `{ title, description, datetime }` shape that the API route maps to the underlying columns.

## React Query

- Query key: `['events']`.
- `refetchInterval: 15_000`.
- Invalidated on every mutation.

## API Endpoints

| Operation | Method / Path          |
| --------- | ---------------------- |
| List      | `GET /schedule`        |
| Create    | `POST /schedule`       |
| Update    | `PATCH /schedule/:id`  |
| Delete    | `DELETE /schedule/:id` |

## Side-effects

Success + error toasts, same pattern as other hooks.
