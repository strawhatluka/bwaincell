# useReminders

**Source:** `frontend/hooks/useReminders.ts`

React Query hook for listing and deleting reminders. **Create/update are not implemented here** — reminders are authored via the Discord `/remind` command.

## Signature

```ts
function useReminders(): {
  reminders: Reminder[];
  isLoading: boolean;
  error: Error | null;
  deleteReminder: (id: number) => void;
  isDeleting: boolean;
}
```

## Reminder Type

```ts
interface Reminder {
  id: number; userId: string; guildId: string;
  message: string;
  frequency: 'once' | 'daily' | 'weekly';
  time: string;              // HH:MM (normalized by API)
  dayOfWeek?: number;
  nextTrigger: string;
  createdAt?: string;
  updatedAt?: string;
}
```

Note: the backend model also supports `monthly`/`yearly`, but this hook's local type narrows to the subset the frontend currently renders.

## React Query

- Query key: `['reminders']`.
- `refetchInterval: 15_000`.
- Invalidated on delete success.

## API Endpoints

| Operation | Method / Path |
|---|---|
| List | `GET /reminders` |
| Delete | `DELETE /reminders/:id` |

## Side-effects

Success toast: `"Reminder deleted"`. Error toast: destructive with `error.message`.
