# reminderHandlers

**Source:** `backend/utils/interactions/handlers/reminderHandlers.ts`

Dispatches button interactions emitted by the `/remind` command.

## Exported

`async handleReminderButton(interaction: ButtonInteraction<CacheType>): Promise<void>`

## Dependencies

- `getModels()` → `{ Reminder }`.
- `handleInteractionError`.

## Guild Guard

Non-guild interactions receive ephemeral "❌ This command can only be used in a server."

## customId Patterns

| Pattern | Action |
|---|---|
| `reminder_delete_{id}` | `Reminder.deleteReminder(id, guildId)`. Acknowledges with ephemeral 🗑️ confirmation or "not found" error. |
| `reminder_add_new`, `reminder_add_another` | Shows frequency-picker embed (once/daily/weekly/monthly/yearly buttons). |
| `reminder_create_daily`, `reminder_create_weekly`, `reminder_create_once` | Opens the corresponding modal (`reminder_modal_{frequency}`). |
| `reminder_list`, `reminder_refresh` | Re-renders the list view. |

## ID Parsing

`reminderId = parseInt(customId.split('_')[2])` — relies on the exact prefix `reminder_delete_`.

## Error Handling

All handlers are wrapped in `try/catch` delegating to `handleInteractionError(interaction, error, 'reminder button')`.
