# Frontend API Routes

**Source:** `frontend/app/api/`

Next.js App Router API routes. All handlers declare `export const dynamic = 'force-dynamic'; export const runtime = 'nodejs';` and authenticate via `getServerSession(authOptions)` from `[...nextauth]/route.ts`.

## Route Table

| Method | Path | Backing Model | Auth | Purpose |
|---|---|---|---|---|
| GET / POST | `/api/auth/[...nextauth]` | `User` | — | NextAuth Google sign-in (see [auth.md](./auth.md)) |
| GET | `/api/tasks` | `Task.getUserTasks` | required | List tasks |
| POST | `/api/tasks` | `Task.createTask` | required | Create task |
| PATCH | `/api/tasks/[id]` | `Task.completeTask` / `Task.editTask` | required | Update task |
| DELETE | `/api/tasks/[id]` | `Task.deleteTask` | required | Delete task |
| GET | `/api/lists` | `List.getUserLists` | required | List lists |
| POST | `/api/lists` | `List.createList` | required | Create list |
| GET | `/api/lists/[listName]` | `List.getList` | required | View list |
| DELETE | `/api/lists/[listName]` | `List.deleteList` | required | Delete list |
| POST | `/api/lists/[listName]/items` | `List.addItem` | required | Add item |
| DELETE | `/api/lists/[listName]/items` | `List.removeItem` | required | Remove item |
| PATCH | `/api/lists/[listName]/items/toggle` | `List.toggleItem` | required | Toggle completion |
| POST | `/api/lists/[listName]/clear-completed` | `List.clearCompleted` | required | Clear completed |
| GET | `/api/notes` | `Note.getNotes` / `Note.searchNotes` | required | List / search notes |
| POST | `/api/notes` | `Note.createNote` | required | Create note |
| GET / PATCH / DELETE | `/api/notes/[id]` | `Note.*` | required | Per-note CRUD |
| GET | `/api/reminders` | `Reminder.getUserReminders` | required | List reminders (time normalized to HH:MM) |
| POST / PATCH / DELETE | `/api/reminders/[id]` | `Reminder.*` | required | Per-reminder CRUD |
| GET | `/api/schedule` | `Schedule.getEvents` | required | List events with `filter` (`upcoming` / `past` / `all`) |
| POST / PATCH / DELETE | `/api/schedule/[id]` | `Schedule.*` | required | Per-event CRUD |
| GET | `/api/budget` | `Budget.getRecentEntries` | required | Recent 100 transactions |
| GET / POST | `/api/budget/transactions` | `Budget.*` | required | Transaction list + create |
| PATCH / DELETE | `/api/budget/transactions/[id]` | `Budget.*` | required | Per-transaction update/delete |

## Common Patterns

- Session check → 401 if missing.
- `User.findByEmail(session.user.email)` → 404 if unknown.
- Model call with `user.guild_id` (acting as tenant scope) and `user.discord_id` (when an author id is needed).
- Response envelope: `{ success: boolean, data?, error?, message? }`.
- Logging: `console.error('[API] …', error)`.

## Detail Pages

- [auth.md](./auth.md)
- [tasks.md](./tasks.md)
- [lists.md](./lists.md)
- [notes.md](./notes.md)
- [reminders.md](./reminders.md)
- [schedule.md](./schedule.md)
- [budget.md](./budget.md)
