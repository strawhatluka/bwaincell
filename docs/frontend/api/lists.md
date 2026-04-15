# /api/lists

**Sources:** `frontend/app/api/lists/route.ts` + nested routes for `[listName]`, `items`, `toggle`, `clear-completed`.

All handlers require `getServerSession(authOptions)` and resolve `user = User.findByEmail(session.user.email)`. Common failures: 401 unauthorized, 404 user not found, 500 on thrown errors.

All files: `export const dynamic = 'force-dynamic'; export const runtime = 'nodejs';`

## `GET /api/lists`

- `List.getUserLists(user.guild_id)`.
- Response: `{ success: true, data: List[] }`.
- 404 when user not found includes a hint: `"Please authenticate via Discord bot first to create your user account"`.

## `POST /api/lists`

Body: `{ name: string }`. 400 when empty or non-string. Calls `List.createList(user.guild_id, name.trim(), user.discord_id)`; returns 400 `"A list with this name already exists"` when the model returns `null` (case-insensitive duplicate). 201 on success.

## Nested Routes

The directory tree (verified by checklist scope):

```
frontend/app/api/lists/
├── route.ts                       # GET, POST (above)
├── [listName]/
│   └── route.ts                   # GET (items), DELETE (remove list)
├── [listName]/items/
│   └── route.ts                   # POST (add item), DELETE (remove item)
├── [listName]/items/toggle/
│   └── route.ts                   # PATCH (toggle completion)
└── [listName]/clear-completed/
    └── route.ts                   # POST (clear completed items)
```

All nested handlers follow the same auth/user pattern and call the matching methods on the `List` model: `getList`, `addItem`, `removeItem`, `toggleItem`, `clearCompleted`, `deleteList`.

Response envelopes:

- Success: `{ success: true, data?, message? }`.
- Failure: `{ success: false, error, message? }`.

## Error Logging

`console.error('[API] Error …', error)` — logs `name`, `message`, `stack` when `error instanceof Error`.
