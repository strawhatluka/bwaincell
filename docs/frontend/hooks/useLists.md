# useLists

**Source:** `frontend/hooks/useLists.ts`

React Query hook for list + list-item CRUD.

## Signature

```ts
function useLists(): {
  lists: List[];
  isLoading: boolean;
  error: Error | null;
  createList: (payload: { name: string }) => void;
  addItem: (payload: { listName: string; item: string }) => void;
  removeItem: (payload: { listName: string; itemText: string }) => void;
  toggleItem: (payload: { listName: string; itemText: string }) => void;
  clearCompleted: (listName: string) => void;
  deleteList: (listName: string) => void;
  isCreating: boolean;
  isAddingItem: boolean;
  isRemovingItem: boolean;
  isTogglingItem: boolean;
  isClearingCompleted: boolean;
  isDeleting: boolean;
};
```

## Types

```ts
interface ListItem {
  text: string;
  completed: boolean;
  added_at: string;
}
interface List {
  id: number;
  userId: string;
  guildId: string;
  name: string;
  items: ListItem[];
  createdAt: string;
}
```

## React Query Keys

- Query key: `['lists']`.
- Invalidated on every mutation success.

## API Endpoints

| Operation       | Method / Path                                              |
| --------------- | ---------------------------------------------------------- |
| List            | `GET /lists`                                               |
| Create          | `POST /lists`                                              |
| Add item        | `POST /lists/{encodeURIComponent(listName)}/items`         |
| Remove item     | `DELETE /lists/{listName}/items/{itemText}` (both encoded) |
| Toggle item     | `PATCH /lists/{listName}/items/{itemText}/toggle`          |
| Clear completed | `POST /lists/{listName}/clear-completed`                   |
| Delete list     | `DELETE /lists/{listName}`                                 |

All path segments are `encodeURIComponent`-wrapped.

Polling: `refetchInterval: 15000`.

## Side-effects

- Toasts on success (except `toggleItem` which is silent).
- Error toasts use `variant: 'destructive'`.
