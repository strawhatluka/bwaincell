# /task Command

**Source:** `backend/commands/task.ts`
**Model:** `supabase/models/Task`
**Handler:** `backend/utils/interactions/handlers/taskHandlers.ts`

Discord slash command for managing per-guild tasks.

## Subcommands

| Subcommand | Options | Purpose |
|---|---|---|
| `add` | `description` (string, required), `date` (MM-DD-YYYY, optional), `time` (hh:mm AM/PM, optional) | Creates a task. Date and time must be provided together or not at all. |
| `list` | `filter` (`all` / `pending` / `completed`, default `all`) | Lists up to 25 tasks with status, due date and interactive buttons / select menu. |
| `done` | `task_id` (integer, required, autocomplete → pending tasks) | Marks a task complete. |
| `delete` | `task_id` (integer, required, autocomplete) | Deletes a task. |
| `edit` | `task_id` (integer, required), `new_text` (optional), `date` (optional), `time` (optional) | Edits description and/or date+time. At least one updatable field is required; date and time must be provided together. |

## Date/Time Parsing

Internal helper `parseDateString(dateStr)` accepts `MM-DD-YYYY hh:mm AM/PM` and returns `Date | null`. It validates month 1–12, day 1–31, hour 1–12, minute 0–59, converts AM/PM to 24-hour, and returns `null` for invalid input.

## Flow

1. Interaction is pre-deferred in `bot.js`.
2. Command requires `interaction.guild.id`; otherwise replies with "This command can only be used in a server."
3. Model methods used: `Task.createTask(guildId, description, dueDate?, userId)`, `Task.getUserTasks(guildId, filter)`, `Task.completeTask(taskId, guildId)`, `Task.deleteTask(taskId, guildId)`, `Task.editTask(taskId, guildId, newText?, dueDate?)`.
4. Errors are logged via `logger.error` with `{ command, subcommand, error, stack, userId, guildId }` and respond with a generic failure message.

## Interactive Components

The command emits buttons with customIds consumed by `taskHandlers.ts`:

- `task_done_{id}` – mark done
- `task_edit_{id}` – edit
- `task_delete_{id}` – delete
- `task_list_all`, `task_list_pending` – re-list
- `task_add_new` – new task prompt
- `task_quick_complete` – bulk complete flow
- `task_refresh` – refresh current list
- `task_quick_action` (StringSelectMenu) – per-task quick action by task id

## Autocomplete

`task_id` option uses `Task.getUserTasks(guildId, filter)`; `filter = 'pending'` for `done`, otherwise `'all'`. Returns up to 25 choices with name format `#{id} {status} {description} (Due: date time)`.
