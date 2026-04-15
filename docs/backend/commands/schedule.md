# /schedule Command

**Source:** `backend/commands/schedule.ts`
**Model:** `supabase/models/Schedule`
**Config:** `backend/config/config` (`settings.timezone` — Luxon zone used by `week`)

Manage dated events with optional descriptions and countdowns.

## Subcommands

| Subcommand | Options | Purpose |
|---|---|---|
| `add` | `event` (required), `date` (`MM-DD-YYYY`, required), `time` (12h, required), `description` (optional) | Adds an event. Date stored as `YYYY-MM-DD`. |
| `list` | `filter` (`upcoming` / `past` / `all`, default `upcoming`) | Shows up to 10 events. |
| `delete` | `event_id` (integer, required) | Deletes event. |
| `countdown` | `event` (partial match, autocomplete) | Returns matched event with time remaining via `Schedule.getCountdown`. |
| `today` | — | Events scheduled for today. |
| `week` | — | Next 7 days, grouped by date with day-of-week label in `settings.timezone`. |

## Local Types

```ts
interface ScheduleEvent {
  id: number; user_id: string; guild_id: string;
  event: string; date: string; time: string;
  description?: string | null; created_at: string;
}
interface CountdownResult { event: ScheduleEvent; timeLeft: string; }
```

## Helpers

- `parseTimeToMilitaryFormat(str)` — `h:mm AM/PM` → `HH:MM` or `null`.
- `formatTimeTo12Hour(time24)` — display helper.
- `formatDateForDisplay(yyyyMmDd)` — `YYYY-MM-DD` → `MM-DD-YYYY`.

## Validation

- Date regex `^(\d{1,2})-(\d{1,2})-(\d{4})$`, month 1–12, day 1–31.
- Must be run inside a guild.

## Model Methods Used

`addEvent`, `getEvents`, `deleteEvent`, `getCountdown`, `getTodaysEvents`, `getUpcomingEvents(guildId, days)`.

## Autocomplete

`event` returns up to 25 upcoming events in the form `{event} ({MM-DD-YYYY} at {h:mm AM/PM})`, value = event name, filtered case-insensitively on focused input.
