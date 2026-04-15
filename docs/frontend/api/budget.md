# /api/budget

**Sources:**

- `frontend/app/api/budget/route.ts`
- `frontend/app/api/budget/transactions/route.ts`
- `frontend/app/api/budget/transactions/[id]/route.ts`

`export const dynamic = 'force-dynamic'; export const runtime = 'nodejs';`

## `GET /api/budget`

- Auth guard via `getServerSession(authOptions)` + `User.findByEmail`.
- `Budget.getRecentEntries(user.guild_id, 100)` — returns up to 100 most recent transactions.
- Response: `{ success: true, data: BudgetEntry[] }`.

## `GET /api/budget/transactions`

Alternate read endpoint used by the dashboard when a paginated / filtered view is needed.

## `POST /api/budget/transactions`

Body:

```ts
{ type: 'income' | 'expense'; category?: string; amount: number; description?: string | null; date?: string }
```

- `expense` → `Budget.addExpense(user.guild_id, category, amount, description, user.discord_id)`.
- `income` → `Budget.addIncome(user.guild_id, amount, description, user.discord_id)`.
- Amount must be `> 0`; 400 otherwise.

## `PATCH /api/budget/transactions/[id]` / `DELETE /api/budget/transactions/[id]`

- `PATCH` — partial update (category / amount / description).
- `DELETE` — removes the row via the `Budget` model.
- IDs parsed via `parseInt(id, 10)`; 400 on invalid; 404 when the model returns `false`.

## Response Shape

Success: `{ success: true, data? }`.
Failure: `{ success: false, error, message? }` with 401 / 404 / 500.
