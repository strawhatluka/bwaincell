# /api/schedule

**Sources:** `frontend/app/api/schedule/route.ts`, `frontend/app/api/schedule/[id]/route.ts`

`export const dynamic = 'force-dynamic'; export const runtime = 'nodejs';`

## `GET /api/schedule?filter=upcoming|past|all`

- Auth guard.
- Filter narrowed to `'upcoming' | 'past' | 'all'`; anything else defaults to `'upcoming'`:
  ```ts
  const filter = filterParam === 'past' || filterParam === 'all' ? filterParam : 'upcoming';
  ```
- `Schedule.getEvents(user.guild_id, filter)`.
- Response: `{ success: true, data: ScheduleEvent[] }`; `data` is `[]` when the model returns a falsy result.
- 500 `{ success: false, error: 'Internal server error' }`.

## `POST /api/schedule`, `PATCH /api/schedule/[id]`, `DELETE /api/schedule/[id]`

`[id]/route.ts` and `route.ts` call the corresponding `Schedule` methods (`addEvent`, `updateEvent`, `deleteEvent`). 404 when the model returns `null`/`false`; IDs parsed with `parseInt(id, 10)` (400 on `NaN`).

## Response Shape

Success: `{ success: true, data? }`.
Failure: `{ success: false, error, message? }` with 401 / 404 / 500.
