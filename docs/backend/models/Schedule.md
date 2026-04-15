# Schedule Model

**Source:** `supabase/models/Schedule.ts`
**Table:** `schedules`

Calendar events with date + time, filterable by upcoming / past / all.

## Columns

| Column        | Type         | Constraints               |
| ------------- | ------------ | ------------------------- |
| `id`          | SERIAL       | PRIMARY KEY               |
| `event`       | VARCHAR(255) | NOT NULL                  |
| `date`        | DATE         | NOT NULL                  |
| `time`        | TIME         | NOT NULL                  |
| `description` | TEXT         | nullable                  |
| `user_id`     | VARCHAR(255) | NOT NULL (audit trail)    |
| `guild_id`    | VARCHAR(255) | NOT NULL                  |
| `created_at`  | TIMESTAMPTZ  | NOT NULL, DEFAULT `NOW()` |

Indexes: `idx_schedules_guild_id`, `idx_schedules_date`.

`DATE` and `TIME` are stored without a timezone; the model uses `process.env.TIMEZONE` (default `America/Los_Angeles`) + Luxon when filtering for "today" / "upcoming".

## Static Methods

| Method              | Signature                                                   | Returns                                                                             |
| ------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `addEvent`          | `(guildId, event, date, time, description=null, userId?)`   | `Promise<ScheduleRow>`                                                              |
| `getEvents`         | `(guildId, filter: 'upcoming'\|'past'\|'all' = 'upcoming')` | `Promise<ScheduleRow[]>`                                                            |
| `deleteEvent`       | `(eventId, guildId)`                                        | `Promise<boolean>`                                                                  |
| `getCountdown`      | `(guildId, eventName)`                                      | `Promise<{ event, timeLeft } \| null>` — ILIKE partial match, earliest by date+time |
| `getTodaysEvents`   | `(guildId)`                                                 | `Promise<ScheduleRow[]>`                                                            |
| `getUpcomingEvents` | `(guildId, days=7)`                                         | `Promise<ScheduleRow[]>`                                                            |

## Example

```ts
import Schedule from '@database/models/Schedule';

await Schedule.addEvent(guildId, 'Dentist', '2026-04-20', '10:30', 'Cleaning');
const today = await Schedule.getTodaysEvents(guildId);
const cd = await Schedule.getCountdown(guildId, 'Dentist');
```

## Related

- Command: [docs/api/discord-commands.md#6-schedule-management---schedule](../../api/discord-commands.md#6-schedule-management---schedule)
- Route: [docs/backend/api/routes/schedule.md](../api/routes/schedule.md)
