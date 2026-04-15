# taskHandlers

**Source:** `backend/utils/interactions/handlers/taskHandlers.ts`

Dispatches button interactions emitted by the `/task` command.

## Exported

`async handleTaskButton(interaction: ButtonInteraction<CacheType>): Promise<void>`

## Dependencies

- `getModels` from `../helpers/databaseHelper` — lazy model accessor returning `{ Task, List, Reminder, ... }`.
- `handleInteractionError` from `../responses/errorResponses` — unified error responder.
- `supabase` client and `TaskRow` type for direct reads.

## Guild Guard

Non-guild interactions reply (or `followUp` if already acknowledged) with `"❌ This command can only be used in a server."` (ephemeral).

## customId Patterns

| Pattern | Action |
|---|---|
| `task_add_new` | Opens `task_add_modal` with fields `task_description` (required, max 200), `task_due_date` (optional, placeholder `10-03-2025`). |
| `task_done_{id}` | Marks `Task.completeTask(id, guildId)`. |
| `task_edit_{id}` | Opens edit modal pre-filled with current description / due date. |
| `task_delete_{id}` | Deletes via `Task.deleteTask(id, guildId)`. |
| `task_list_all` / `task_list_pending` | Re-renders the list view. |
| `task_refresh` | Re-fetches current filter. |
| `task_quick_complete` | Bulk-complete pending tasks flow. |

## State Transitions

- Buttons transition the embed + action row by calling `interaction.update(...)` or `editReply`, preserving message identity.
- Modal submissions are routed separately (see `backend/utils/interactions/modals`) and ultimately call `Task.createTask` / `Task.editTask`.

## Error Handling

All errors bubble to `handleInteractionError(interaction, error, 'task button')`.
