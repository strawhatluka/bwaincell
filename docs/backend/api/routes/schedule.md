# Schedule Routes

**Source:** `backend/src/api/routes/schedule.ts`
**Mount point:** `/api/schedule`
**Auth:** Bearer JWT.

## Imports

```ts
// backend/src/api/routes/schedule.ts
import { Schedule } from '@database/index';
// Equivalently:
// import Schedule from '@database/models/Schedule';
```

`@database/*` is the path alias defined in `backend/tsconfig.json`.

## Endpoints

### `GET /api/schedule`

List events.

- **Query:**
  - `filter` — `'upcoming' | 'past' | 'all'` (default `'upcoming'`).
  - `days` — when `filter=upcoming` and `days > 0`, uses `Schedule.getUpcomingEvents(guildId, days)` instead of open-ended.
- **Returns:** `200 { success, data: ScheduleRow[] }`.
- **Errors:** `400` invalid filter.

### `GET /api/schedule/today`

Today's events (timezone-aware via Luxon + `TIMEZONE` env).

- **Returns:** `200 { success, data: ScheduleRow[] }`.

### `GET /api/schedule/countdown/:eventName`

Return earliest matching upcoming event plus `timeLeft` string.

- **Params:** `eventName` URL-decoded, partial case-insensitive match.
- **Returns:** `200 { success, data: { event: ScheduleRow, timeLeft: string } }`.
- **Errors:** `404` if no match.

### `POST /api/schedule`

Create an event.

- **Body:**
  - `event` (string, required, non-empty)
  - `date` (string, required, format `YYYY-MM-DD`)
  - `time` (string, required, format `HH:MM` 24-hour)
  - `description` (string, optional)
- **Returns:** `201 { success, data: ScheduleRow }`.
- **Errors:** `400` invalid format.

### `PATCH /api/schedule/:id`

NOT YET IMPLEMENTED. Returns `400 'Event updates not yet implemented. Please delete and create a new event.'`

### `DELETE /api/schedule/:id`

Delete an event. (See source for full handler — standard `Schedule.deleteEvent(id, guildId)` + 404 if none.)

## Related

- Model: [docs/backend/models/Schedule.md](../../models/Schedule.md)
