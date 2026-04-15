# /api/reminders

**Sources:** `frontend/app/api/reminders/route.ts`, `frontend/app/api/reminders/[id]/route.ts`

`export const dynamic = 'force-dynamic'; export const runtime = 'nodejs';`

## `GET /api/reminders`

- Auth guard via `getServerSession(authOptions)`.
- `Reminder.getUserReminders(user.guild_id)`.
- Normalizes the `time` field to an `HH:MM` string:
  - ISO-like `"…T14:30:…"` → `timeStr.substring(11, 16)`
  - Long non-ISO string → `timeStr.substring(0, 5)`
  - `Date` → `.toISOString().substring(11, 16)`
- Response: `{ success: true, data: Reminder[] }`.
- Logged as `[API] GET /api/reminders error`.

## `POST /api/reminders`, `PATCH /api/reminders/[id]`, `DELETE /api/reminders/[id]`

Implemented in `[id]/route.ts` and `route.ts` using the `Reminder` model:

- `POST` — creates a reminder via `Reminder.createReminder(...)` using the same positional args as `backend/commands/remind.ts`.
- `PATCH` — partial update.
- `DELETE` — `Reminder.deleteReminder(id, user.guild_id)`; 404 if not found.

## Response Shape

Success: `{ success: true, data? }`.
Failure: `{ success: false, error }` with 401 / 404 / 500.
