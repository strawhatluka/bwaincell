# Frontend Hooks

**Source:** `frontend/hooks/`

| Hook                                      | Query Keys               | API Endpoints                                      | Purpose                                             |
| ----------------------------------------- | ------------------------ | -------------------------------------------------- | --------------------------------------------------- |
| [useAuth](./useAuth.md)                   | —                        | —                                                  | Legacy `localStorage`/`sessionStorage` credentials. |
| [useTasks](./useTasks.md)                 | `['tasks']`              | `/tasks`, `/tasks/:id`                             | Tasks CRUD with 15s polling.                        |
| [useLists](./useLists.md)                 | `['lists']`              | `/lists` + nested item routes                      | Lists and list-items.                               |
| [useNotes](./useNotes.md)                 | `['notes', searchQuery]` | `/notes`, `/notes/:id`                             | Notes CRUD + search.                                |
| [useReminders](./useReminders.md)         | `['reminders']`          | `/reminders`, `/reminders/:id`                     | List + delete only (create via `/remind`).          |
| [useSchedule](./useSchedule.md)           | `['events']`             | `/schedule`, `/schedule/:id`                       | Schedule events CRUD.                               |
| [useBudget](./useBudget.md)               | `['transactions']`       | `/budget/transactions`, `/budget/transactions/:id` | Transactions CRUD.                                  |
| [useDarkMode](./useDarkMode.md)           | —                        | —                                                  | Context + toggle for dark class on `<html>`.        |
| [useInstallPrompt](./useInstallPrompt.md) | —                        | —                                                  | Captures PWA `beforeinstallprompt`.                 |
| [useOnlineStatus](./useOnlineStatus.md)   | —                        | —                                                  | Boolean online status.                              |
| [use-toast](./use-toast.md)               | —                        | —                                                  | shadcn/ui toast store (limit 1).                    |

## Patterns

- All data hooks poll with `refetchInterval: 15_000` except `useNotes` (30s stale, no window-focus refetch).
- All mutations invalidate their query key on success and surface toasts (`"Created"` / `"Updated"` / `"Deleted"` titles).
- Error toasts use `variant: 'destructive'` and show `error.message`.
- Dynamic path segments (list names, item text) are always wrapped in `encodeURIComponent`.

## Related

- API client wrapper: [../lib/api.md](../lib/api.md)
- Auth context (NextAuth): [../contexts/AuthContext.md](../contexts/AuthContext.md)
