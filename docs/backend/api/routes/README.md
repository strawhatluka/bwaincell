# Backend REST Routes

All routes are Express routers mounted under `/api` in `backend/src/api/server.ts`. Unless noted otherwise, every endpoint requires a Bearer JWT access token issued by `/api/auth/google/verify`.

## Route Files

| File                           | Mount            | Auth                          | Main purpose                                             |
| ------------------------------ | ---------------- | ----------------------------- | -------------------------------------------------------- |
| [oauth.md](./oauth.md)         | `/api/auth`      | None (mints/refreshes tokens) | Google Sign-In, JWT refresh, logout                      |
| [health.md](./health.md)       | `/api/health`    | Bearer JWT                    | Auth probe                                               |
| [tasks.md](./tasks.md)         | `/api/tasks`     | Bearer JWT                    | CRUD + complete/uncomplete                               |
| [lists.md](./lists.md)         | `/api/lists`     | Bearer JWT                    | List CRUD + item add/toggle/remove/clear                 |
| [notes.md](./notes.md)         | `/api/notes`     | Bearer JWT                    | Note CRUD + tags endpoint                                |
| [reminders.md](./reminders.md) | `/api/reminders` | Bearer JWT                    | List/create/delete reminders (PATCH stubbed)             |
| [schedule.md](./schedule.md)   | `/api/schedule`  | Bearer JWT                    | Event list/today/countdown/create/delete (PATCH stubbed) |
| [budget.md](./budget.md)       | `/api/budget`    | Bearer JWT                    | Transactions, summary, categories, trends                |

## Response Envelope

All routes wrap responses with helpers in `backend/src/api/utils/response.ts`:

- Success: `{ success: true, data: <payload> }`
- Message: `{ success: true, message: <string> }`
- Validation (400): `{ success: false, error: <msg> }`
- Not found (404): `{ success: false, error: '<Resource> not found' }`
- Server (500): `{ success: false, error: 'Internal server error' }`

## Middleware

- [auth.md](../middleware/auth.md) — HTTP Basic auth (legacy).
- [oauth.md](../middleware/oauth.md) — JWT/Google OAuth (current).
