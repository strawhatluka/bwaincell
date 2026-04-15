# ListCard

**Source:** `frontend/components/lists/ListCard.tsx`

Card representation of a single list: header, items (checkbox + text + remove), add-item form, footer with counts and clear-completed, plus delete confirmation.

## Props

| Name | Type | Required | Description |
|---|---|---|---|
| `list` | `List` | yes | See shape below. |

### `List` / `ListItem`

```ts
interface ListItem { text: string; completed: boolean; added_at: string; }
interface List {
  id: number; userId: string; guildId: string;
  name: string; items: ListItem[]; createdAt: string;
}
```

## Hooks

`useLists()` — consumes `addItem`, `removeItem`, `toggleItem`, `clearCompleted`, `deleteList`, `isAddingItem`.

## Local State

- `newItem: string` — add-item input.
- `isDeleteOpen: boolean` — delete dialog open state.

## Behaviors

- **Add item** (form submit): `addItem({ listName: list.name, item: newItem.trim() })` then clears input.
- **Toggle** (checkbox): `toggleItem({ listName, itemText })`.
- **Remove** (hover X): `removeItem({ listName, itemText })`.
- **Clear completed** (footer button, only when there are completed items): `clearCompleted(list.name)`.
- **Delete list** (trash button → Dialog): `deleteList(list.name)`.

## Footer

Shows `"{n} item(s)"` with a parenthesized completed count when > 0; renders "Clear completed" button when at least one item is completed.

## Integration

Rendered by `ListGrid` for every list. All actions reflect immediately via React Query cache invalidation.
