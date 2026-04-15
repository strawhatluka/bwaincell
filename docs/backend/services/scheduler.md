# scheduler Service (Central Scheduler)

**Source:** `backend/utils/scheduler.ts`
**Role:** Singleton coordinator for all time-based Discord jobs: reminders, weekly event announcements, daily sunset announcements.

## Class: `Scheduler`

Singleton accessed via `Scheduler.getInstance(client?)`. The first call must pass a `discord.js` `Client`; subsequent calls ignore the argument.

### Internal State

- `jobs: Map<string, { id, task }>` — keyed by `reminder_<id>`, `events_<guildId>`, `sunset_<guildId>`.
- `client: Client` — used to fetch channels for posting.

### Public Methods

| Method                           | Purpose                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `Scheduler.getInstance(client?)` | Returns (and lazily creates) the singleton. Returns `null` if called without `client` before initialization.                    |
| `initialize()`                   | Loads reminders, event configs, sunset configs from Supabase and registers cron jobs. Swallows per-section errors with logging. |
| `addReminder(reminderId)`        | Add a new reminder to the running scheduler.                                                                                    |
| `addEventConfig(guildId)`        | Register/refresh a guild's weekly event announcement job.                                                                       |
| `addSunsetConfig(guildId)`       | Register/refresh a guild's daily sunset announcement job.                                                                       |
| `removeSunsetConfig(guildId)`    | Stop + remove the guild's sunset job.                                                                                           |
| `removeEventConfig(guildId)`     | Stop + remove the guild's event job.                                                                                            |

(Exported accessor: `getScheduler()` in the command files returns the singleton or `null`.)

## Startup Sequence

`initialize()`:

1. Dynamic-import models (`Reminder`, `EventConfig`, `SunsetConfig`) from `../../supabase` to avoid initialization order problems.
2. `loadReminders(Reminder)` — for each active reminder, schedule via `scheduleReminder()`.
3. `loadEventConfigs(EventConfig)` — for each enabled `EventConfig`, schedule via `scheduleEventAnnouncement()`.
4. `scheduleDailyQuestions(EventConfig)` — question-of-the-day job (separate cron).
5. `loadSunsetConfigs(SunsetConfig)` — for each enabled `SunsetConfig`, schedule via `scheduleSunsetAnnouncement()`.

Logs `'Scheduler initialized successfully'` on completion.

## Cron Expression Construction

`getCronExpression(reminder)` maps frequency to node-cron:

| Frequency | Expression                              |
| --------- | --------------------------------------- |
| `daily`   | `<min> <hour> * * *`                    |
| `weekly`  | `<min> <hour> * * <day_of_week>`        |
| `monthly` | `<min> <hour> <day_of_month> * *`       |
| `yearly`  | `<min> <hour> <day_of_month> <month> *` |
| `once`    | handled separately via `setTimeout`     |

One-time reminders are scheduled via `scheduleOneTimeReminder` which calls `setTimeout(...)`, executes, calls `Reminder.deleteReminder`, and removes the job.

Event announcements use `buildCronExpression(minute, hour, dayOfWeek)` from `backend/utils/dateHelpers` with `timezone: config.timezone` in the node-cron options.

## Reminder Execution

`executeReminder(reminder, Reminder)`:

1. `client.channels.fetch(channel_id)`.
2. If `TextChannel`, send `` `<@${user_id}> ⏰ Reminder: **${message}**` ``.
3. If recurring (`frequency !== 'once'`), `Reminder.updateNextTrigger(reminder.id)`.

## Coordination with Models

| Model                                     | Source-of-truth method used by scheduler                          |
| ----------------------------------------- | ----------------------------------------------------------------- |
| [Reminder](../models/Reminder.md)         | `getActiveReminders()`, `updateNextTrigger()`, `deleteReminder()` |
| [EventConfig](../models/EventConfig.md)   | `getEnabledConfigs()`, `updateLastAnnouncement()`                 |
| [SunsetConfig](../models/SunsetConfig.md) | `getEnabledConfigs()`, `updateLastAnnouncement()`                 |

## Related

- Command triggers: `/remind` (indirect), [`/events`](../commands/events.md), [`/sunset`](../commands/sunset.md).
- Sunset math: [sunsetService.md](./sunsetService.md).
- Events discovery: [eventsService.md](./eventsService.md).
