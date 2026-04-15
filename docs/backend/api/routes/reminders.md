# Reminders Routes

**Source:** `backend/src/api/routes/reminders.ts`
**Mount point:** `/api/reminders`
**Auth:** Bearer JWT.

## Endpoints

### `GET /api/reminders`

Return active reminders for the guild (`Reminder.getUserReminders`).

- **Returns:** `200 { success, data: ReminderRow[] }`.

### `POST /api/reminders`

Create a reminder.

- **Body:**
  - `message` (string, required, non-empty)
  - `time` (string, required, format `HH:MM` 24-hour — regex `/^([01]\d|2[0-3]):([0-5]\d)$/`)
  - `frequency` (string, optional) — `'once' | 'daily' | 'weekly'`; defaults to `'once'`.
  - `dayOfWeek` (number, 0-6, required for `weekly`; Sunday=0 .. Saturday=6)
  - `channelId` (string, optional) — falls back to `req.user.guildId` if omitted (known limitation).
- **Returns:** `201 { success, data: ReminderRow }`.
- **Errors:** `400` for missing/invalid fields or weekly without `dayOfWeek`.

### `PATCH /api/reminders/:id`

NOT YET IMPLEMENTED. Always returns `400 'Reminder updates not yet implemented. Please delete and create a new reminder.'`

### `DELETE /api/reminders/:id`

Soft-delete (sets `active=false`) via `Reminder.deleteReminder`.

- **Returns:** `200 { success, message: 'Reminder deleted successfully' }`.
- **Errors:** `404` if not found.

## Scheduler

Reminders created through this route are NOT immediately registered with the running node-cron scheduler. The scheduler picks them up on next boot, or the polling path (`Reminder.getTriggeredReminders`) catches them at or after their `next_trigger` timestamp. See [docs/backend/services/scheduler.md](../../services/scheduler.md).

## Related

- Model: [docs/backend/models/Reminder.md](../../models/Reminder.md)
