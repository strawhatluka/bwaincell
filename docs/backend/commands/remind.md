# /remind Command

**Source:** `backend/commands/remind.ts`
**Model:** `supabase/models/Reminder`
**Handler:** `backend/utils/interactions/handlers/reminderHandlers.ts`
**Scheduler:** `backend/utils/scheduler` (`getScheduler().addReminder(id)`)
**Config:** `backend/config/config` (`settings.defaultReminderChannel`, `settings.timezone`)

Manage one-time and recurring reminders. Announcements go to `settings.defaultReminderChannel` if set, else the channel where the command was issued.

## Subcommands

| Subcommand | Required options | Frequency |
|---|---|---|
| `me` | `message`, `time` (12h); optional `date` (`MM-DD-YYYY` or `tomorrow`) | `once` |
| `daily` | `message`, `time` | `daily` |
| `weekly` | `message`, `day` (choice 0–6 = Sun–Sat), `time` | `weekly` |
| `monthly` | `message`, `day` (1–31), `time` | `monthly` |
| `yearly` | `message`, `month` (choice 1–12), `day` (1–31), `time` | `yearly` |
| `list` | — | Lists reminders with ID / message / frequency / next trigger. |
| `delete` | `reminder_id` (autocomplete) | Deletes reminder. |

## Time / Date Parsing

- `parseTimeToMilitaryFormat(str)` — accepts `h:mm AM/PM` (case-insensitive), returns 24h `HH:MM` or `null`.
- `formatTimeTo12Hour(time24)` — display helper.
- `getDaySuffix(day)` — ordinal suffix (`st`/`nd`/`rd`/`th`, with 11–13 override).
- Dates in `me` subcommand: `tomorrow` computed with Luxon `DateTime.now().setZone(timezone).plus({days:1})`; else regex `^(\d{1,2})-(\d{1,2})-(\d{4})$` parsed with `DateTime.fromObject({...}, {zone})`.

## Model Signature

`Reminder.createReminder(guildId, channelId, message, time, frequency, dayOfWeek|null, userId, targetDate?, dayOfMonth?, month?)` — subsequent optional positional parameters are passed `null` when unused.

## Scheduler Integration

After creation: `const scheduler = getScheduler(); if (scheduler) await scheduler.addReminder(reminder.id);`

## Interactive Components

- `reminder_delete_{id}` — cancel reminder
- `reminder_list`, `reminder_refresh`, `reminder_add_new`, `reminder_add_another`
- `reminder_create_daily` / `_weekly` / `_once` — empty-state creation prompts
- `reminder_quick_delete` (StringSelectMenu)

## Autocomplete

`reminder_id` returns up to 25 reminders from `Reminder.getUserReminders(guildId)` formatted as `#{id} - {message} ({frequency} at {time})`.
