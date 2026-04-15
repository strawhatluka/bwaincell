# List Model

**Source:** `supabase/models/List.ts`
**Table:** `lists`
**Schema:** `supabase/migrations/20260413000000_initial_schema.sql`

Guild-scoped shared lists (shopping, to-do, etc.) with items stored as a JSONB array on the row.

## Columns

| Column       | Type         | Constraints                     |
| ------------ | ------------ | ------------------------------- |
| `id`         | SERIAL       | PRIMARY KEY                     |
| `name`       | VARCHAR(255) | NOT NULL                        |
| `items`      | JSONB        | NOT NULL, DEFAULT `'[]'::jsonb` |
| `user_id`    | VARCHAR(255) | NOT NULL (audit trail)          |
| `guild_id`   | VARCHAR(255) | NOT NULL                        |
| `created_at` | TIMESTAMPTZ  | NOT NULL, DEFAULT `NOW()`       |

Index: `idx_lists_guild_id`.

## `items` JSONB Shape

Each array element is a `ListItem`:

```ts
export interface ListItem {
  text: string;
  completed: boolean;
  added_at: string; // ISO-8601 timestamp
}
```

Items are appended, removed, and toggled in-place by mutating the array and writing the full array back (no row-per-item storage).

## Static Methods

| Method           | Signature                       | Returns                                                             |
| ---------------- | ------------------------------- | ------------------------------------------------------------------- |
| `createList`     | `(guildId, name, userId?)`      | `Promise<ListRow \| null>` (null if name case-insensitively exists) |
| `addItem`        | `(guildId, listName, item)`     | `Promise<ListRow \| null>`                                          |
| `removeItem`     | `(guildId, listName, itemText)` | `Promise<ListRow \| null>`                                          |
| `getList`        | `(guildId, listName)`           | `Promise<ListRow \| null>`                                          |
| `getUserLists`   | `(guildId)`                     | `Promise<ListRow[]>`                                                |
| `clearCompleted` | `(guildId, listName)`           | `Promise<ListRow \| null>`                                          |
| `deleteList`     | `(guildId, listName)`           | `Promise<boolean>`                                                  |
| `toggleItem`     | `(guildId, listName, itemText)` | `Promise<ListRow \| null>`                                          |

All lookups are case-insensitive (see `findListCaseInsensitive`).

## Example

```ts
import List from '@database/models/List';

const list = await List.createList(guildId, 'Shopping', userId);
await List.addItem(guildId, 'Shopping', 'Milk');
await List.toggleItem(guildId, 'Shopping', 'Milk'); // mark complete
await List.clearCompleted(guildId, 'Shopping'); // purge completed
```

## Related

- Command: [docs/api/discord-commands.md#2-list-management---list](../../api/discord-commands.md#2-list-management---list)
- Route: [docs/backend/api/routes/lists.md](../api/routes/lists.md)
