# selectMenuHandlers

**Source:** `backend/utils/interactions/handlers/selectMenuHandlers.ts`

Cross-cutting dispatcher for all `StringSelectMenuInteraction`s. Routes `recipe_*` menus to `handleRecipeSelect` (in `recipeHandlers.ts`), and handles `task_*`, `list_*`, `reminder_*` menus directly.

## Exported

`async handleSelectMenuInteraction(interaction: StringSelectMenuInteraction<CacheType>): Promise<void>`

## Dependencies

- `getModels()` → `{ Task, List, Reminder }`.
- `supabase` client (direct `TaskRow` / `ListRow` queries).
- `handleInteractionError`.
- `handleRecipeSelect` from `./recipeHandlers`.

## Guild Guard

Logs `warn` with `{ userId, customId }` and replies ephemeral `"❌ This command can only be used in a server."`. Uses `editReply` if already deferred.

## Dispatch Order

1. If `customId.startsWith('recipe_')` → delegates to `handleRecipeSelect`, returns.
2. Otherwise loads models and dispatches:
   - `task_quick_action` — parses first value as `taskId`, fetches `tasks` row via supabase, renders task embed (green if completed, blue otherwise) with due date field.
   - (Subsequent branches in file handle `list_select_view`, `reminder_quick_delete`, etc.)

## customIds Handled

| customId | Behavior |
|---|---|
| `recipe_*` | → `handleRecipeSelect` |
| `task_quick_action` | View selected task |
| `list_select_view` | Open selected list view |
| `reminder_quick_delete` | Delete selected reminder |

## Error Handling

`handleInteractionError(interaction, error, 'recipe select menu')` for the recipe branch; otherwise `handleInteractionError` with context specific to each menu.
