# Reminder Model

**Source:** `supabase/models/Reminder.ts`
**Table:** `reminders`

Timezone-aware recurring/one-time reminders fired by the central scheduler.

## Columns

| Column         | Type                 | Constraints                   |
| -------------- | -------------------- | ----------------------------- |
| `id`           | SERIAL               | PRIMARY KEY                   |
| `message`      | TEXT                 | NOT NULL                      |
| `time`         | TIME                 | NOT NULL (`HH:MM`, 24-hour)   |
| `frequency`    | `reminder_frequency` | NOT NULL, DEFAULT `'once'`    |
| `day_of_week`  | INTEGER              | nullable (0=Sun .. 6=Sat)     |
| `day_of_month` | INTEGER              | nullable (1..31)              |
| `month`        | INTEGER              | nullable (1..12, yearly only) |
| `channel_id`   | VARCHAR(255)         | NOT NULL                      |
| `user_id`      | VARCHAR(255)         | NOT NULL (audit trail)        |
| `guild_id`     | VARCHAR(255)         | NOT NULL                      |
| `active`       | BOOLEAN              | NOT NULL, DEFAULT TRUE        |
| `next_trigger` | TIMESTAMPTZ          | nullable (computed)           |

Enum `reminder_frequency`: `'once' | 'daily' | 'weekly' | 'monthly' | 'yearly'`.

Indexes: `idx_reminders_guild_id`, `idx_reminders_active`, `idx_reminders_next_trigger` (partial, `WHERE active = TRUE`).

## Static Methods

| Method                  | Signature                                                                                                          | Returns                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `createReminder`        | `(guildId, channelId, message, time, frequency='once', dayOfWeek=null, userId?, targetDate?, dayOfMonth?, month?)` | `Promise<ReminderRow>`                                                                    |
| `calculateNextTrigger`  | `(time, frequency, dayOfWeek, targetDate?, dayOfMonth?, month?)`                                                   | `Date` — timezone-aware via Luxon (`TIMEZONE` env, default `America/Los_Angeles`)         |
| `getActiveReminders`    | `()`                                                                                                               | `Promise<ReminderRow[]>` (global — used by scheduler on boot)                             |
| `getUserReminders`      | `(guildId)`                                                                                                        | `Promise<ReminderRow[]>` (active only)                                                    |
| `deleteReminder`        | `(reminderId, guildId)`                                                                                            | `Promise<boolean>` — soft-deletes by setting `active=false`                               |
| `updateNextTrigger`     | `(reminderId)`                                                                                                     | `Promise<ReminderRow \| null>` — deactivates one-time reminders, recomputes for recurring |
| `getTriggeredReminders` | `()`                                                                                                               | `Promise<ReminderRow[]>` (active + `next_trigger <= now`)                                 |

## Scheduler Coupling

`backend/utils/scheduler.ts` loads all active reminders on boot and registers node-cron jobs; `getTriggeredReminders` is the polling fallback. See [docs/backend/services/scheduler.md](../services/scheduler.md).

## Example

```ts
import Reminder from '@database/models/Reminder';

// Daily 9am
await Reminder.createReminder(guildId, channelId, 'Standup', '09:00', 'daily');

// Weekly Mondays 10am
await Reminder.createReminder(guildId, channelId, 'Team meeting', '10:00', 'weekly', 1);

// Soft-delete
await Reminder.deleteReminder(id, guildId);
```

## Related

- Command: [docs/api/discord-commands.md#4-reminder-system---remind](../../api/discord-commands.md#4-reminder-system---remind)
- Route: [docs/backend/api/routes/reminders.md](../api/routes/reminders.md)
- Scheduler: [docs/backend/services/scheduler.md](../services/scheduler.md)
