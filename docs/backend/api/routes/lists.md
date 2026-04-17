# Lists Routes

**Source:** `backend/src/api/routes/lists.ts`
**Mount point:** `/api/lists`
**Auth:** Bearer JWT (see [oauth middleware](../middleware/oauth.md)).

List names are passed in the URL and `decodeURIComponent`-ed; lookups are case-insensitive at the model layer.

## Imports

```ts
// backend/src/api/routes/lists.ts
import { List } from '@database/index';
// Equivalently:
// import List from '@database/models/List';
```

The `@database/*` alias (defined in `backend/tsconfig.json`) is required for all Supabase imports from backend source.

## Endpoints

### `GET /api/lists`

Return all lists for the authenticated user's guild.

- **Returns:** `200 { success, data: ListRow[] }`.

### `GET /api/lists/:name`

Return one list (with items) by name (case-insensitive).

- **Returns:** `200 { success, data: ListRow }`.
- **Errors:** `404` if not found.

### `POST /api/lists`

Create a new list.

- **Body:** `{ name: string }` (required, non-empty).
- **Returns:** `201 { success, data: ListRow }`.
- **Errors:** `400` missing/empty name or duplicate (`'A list with this name already exists'`).

### `POST /api/lists/:name/items`

Append an item to the list.

- **Body:** `{ item: string }` (required, non-empty).
- **Returns:** `200 { success, data: ListRow }`.
- **Errors:** `400` missing/empty item; `404` list not found.

### `PATCH /api/lists/:name/items/:itemText/toggle`

Toggle `completed` for a single item (case-insensitive match on `itemText`).

- **Returns:** `200 { success, data: ListRow }`.
- **Errors:** `404` if list or item not found.

### `DELETE /api/lists/:name/items/:itemText`

Remove an item from a list.

- **Returns:** `200 { success, data: ListRow }`.
- **Errors:** `404` if list or item not found.

### `POST /api/lists/:name/clear-completed`

Drop all completed items from the list.

- **Returns:** `200 { success, data: ListRow }`.
- **Errors:** `404` list not found.

### `DELETE /api/lists/:name`

Delete the list entirely.

- **Returns:** `200 { success, message: 'List deleted successfully' }`.
- **Errors:** `404` list not found.

## Related

- Model: [docs/backend/models/List.md](../../models/List.md)
