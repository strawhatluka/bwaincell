# /list Command

**Source:** `backend/commands/list.ts`
**Model:** `supabase/models/List` (exports `ListItem` type)
**Handler:** `backend/utils/interactions/handlers/listHandlers.ts`

Discord slash command for managing named lists with checkable items.

## Subcommands

| Subcommand | Options                                 | Purpose                                                                                            |
| ---------- | --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `create`   | `name` (string, required)               | Creates a new list; fails if name already exists.                                                  |
| `add`      | `list_name` (autocomplete), `item`      | Appends item to a list.                                                                            |
| `show`     | `list_name` (autocomplete)              | Displays list with checkbox status (`✅` / `☐`) and `X/Y completed` footer.                        |
| `remove`   | `list_name`, `item` (both autocomplete) | Removes an item.                                                                                   |
| `clear`    | `list_name` (autocomplete)              | Clears completed items via `List.clearCompleted`.                                                  |
| `delete`   | `list_name` (autocomplete)              | Two-step confirm/cancel button flow.                                                               |
| `all`      | —                                       | Shows all lists with item + completed counts. Renders a `StringSelectMenu` when `1–5` lists exist. |
| `complete` | `list_name`, `item` (both autocomplete) | Toggles item completion via `List.toggleItem` (case-insensitive match).                            |

## Autocomplete

- `list_name`: returns up to 25 list names from `List.getUserLists(guildId)`, filtered by focused value.
- `item`: reads `list_name` option, fetches the list via `List.getList(guildId, listName)`, returns up to 25 item `text` values.

## Model Methods Used

`createList`, `addItem`, `getList`, `removeItem`, `clearCompleted`, `getUserLists`, `toggleItem`.

## Interactive Components

- `list_add_{name}` — add-item prompt
- `list_view_{name}` — view list
- `list_mark_complete_{name}` — mark complete (disabled when empty or all completed)
- `list_clear_completed_{name}` — clear (disabled when no completed items)
- `list_delete_confirm_{name}` / `list_delete_cancel` — delete confirmation
- `list_select_view` — select-menu for viewing when 1–5 lists exist, value `{name}_{index}`

## Error Handling

Errors logged with `{ command, subcommand, error, stack, userId, guildId }`; user receives "An error occurred while processing your request."
