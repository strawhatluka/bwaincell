# listHandlers

**Source:** `backend/utils/interactions/handlers/listHandlers.ts`

Dispatches button interactions emitted by the `/list` command.

## Exported

`async handleListButton(interaction: ButtonInteraction<CacheType>): Promise<void>`

## Dependencies

- `getModels()` → `{ List }`.
- `handleInteractionError` for unified error surfacing.

## Guild Guard

Non-guild interactions reply with ephemeral `"❌ This command can only be used in a server."` (`flags: 64`).

## customId Patterns

| Pattern                       | Action                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| `list_add_{name}`             | Opens modal `list_add_item_modal_{encodeURIComponent(name)}` with single `list_item` input (max 100). |
| `list_view_{name}`            | Renders the list via `List.getList(guildId, name)`; shows "not found" when null.                      |
| `list_mark_complete_{name}`   | Opens modal to choose items to mark complete.                                                         |
| `list_clear_completed_{name}` | Calls `List.clearCompleted(guildId, name)`.                                                           |
| `list_delete_confirm_{name}`  | Calls `List.deleteList(guildId, name)`.                                                               |
| `list_delete_cancel`          | Dismisses the confirm UI.                                                                             |

## Encoding

List names containing special characters are `encodeURIComponent`'d in modal customIds so the subsequent modal handler can decode them.

## Error Handling

All thrown errors pass to `handleInteractionError(interaction, error, 'list button')`.
