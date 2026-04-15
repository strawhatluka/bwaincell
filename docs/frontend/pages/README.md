# Frontend Pages

**Source root:** `frontend/app/`

Next.js App Router page components. All are `'use client'` components.

## Route Table

| Route                  | File                                    | Purpose                            | Hooks / Contexts                    |
| ---------------------- | --------------------------------------- | ---------------------------------- | ----------------------------------- |
| `/`                    | `app/page.tsx`                          | Landing page with Get Started CTA  | —                                   |
| `/login`               | `app/login/page.tsx`                    | Google sign-in                     | `useState`, `useRouter`, `signIn`   |
| `/privacy`             | `app/privacy/page.tsx`                  | Static privacy policy              | —                                   |
| `/terms`               | `app/terms/page.tsx`                    | Static terms of service            | —                                   |
| `/dashboard`           | `app/dashboard/page.tsx` + `layout.tsx` | Authenticated shell + welcome page | `useAuthContext`                    |
| `/dashboard/tasks`     | `app/dashboard/tasks/page.tsx`          | Tasks list                         | `useTasks` (via `TaskList`)         |
| `/dashboard/lists`     | `app/dashboard/lists/page.tsx`          | Lists grid                         | `useLists` (via `ListGrid`)         |
| `/dashboard/notes`     | `app/dashboard/notes/page.tsx`          | Notes grid                         | `useNotes` (via `NoteGrid`)         |
| `/dashboard/reminders` | `app/dashboard/reminders/page.tsx`      | Reminders list                     | `useReminders` (via `ReminderList`) |
| `/dashboard/budget`    | `app/dashboard/budget/page.tsx`         | Budget chart + transactions        | `useBudget`                         |

Root layout lives in `app/layout.tsx` — see [layout.md](./layout.md).

## Conventions

- Every dashboard page wraps children in `<ErrorBoundary>`.
- Every dashboard page delegates data fetching to its container component (`TaskList`, `ListGrid`, …), which calls the relevant hook.
- The dashboard layout enforces auth via `useAuthContext` and redirects unauthenticated users to `/login`.

## Detail Pages

- [layout.md](./layout.md)
- [home.md](./home.md)
- [login.md](./login.md)
- [privacy.md](./privacy.md)
- [terms.md](./terms.md)
- [dashboard.md](./dashboard.md)
- [dashboard-tasks.md](./dashboard-tasks.md)
- [dashboard-lists.md](./dashboard-lists.md)
- [dashboard-notes.md](./dashboard-notes.md)
- [dashboard-reminders.md](./dashboard-reminders.md)
- [dashboard-budget.md](./dashboard-budget.md)
