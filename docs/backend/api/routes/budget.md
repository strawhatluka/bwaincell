# Budget Routes

**Source:** `backend/src/api/routes/budget.ts`
**Mount point:** `/api/budget`
**Auth:** Bearer JWT.

## Endpoints

### `GET /api/budget/transactions`

Recent transactions (income + expense).

- **Query:** `limit` — clamped to `[1, 100]`, default 10.
- **Returns:** `200 { success, data: BudgetRow[] }`.

### `GET /api/budget/summary`

Monthly summary with income, expenses, balance, and per-category breakdown.

- **Query:** `month` — integer `1-12`. Omit for current month.
- **Returns:** `200 { success, data: BudgetSummary }` — see [Budget model](../../models/Budget.md).
- **Errors:** `400` if month out of range.

### `GET /api/budget/categories`

Expense totals grouped by category (sorted desc).

- **Returns:** `200 { success, data: CategoryResult[] }`.

### `GET /api/budget/trends`

Monthly trends for the last N months.

- **Query:** `months` — clamped to `[1, 12]`, default 6.
- **Returns:** `200 { success, data: MonthlyTrend[] }` (chronological).

### `POST /api/budget/transactions`

Create a transaction (expense or income).

- **Body:**
  - `type` (string, required) — `'expense' | 'income'`.
  - `amount` (number, required, positive).
  - `category` (string, required for `type='expense'`).
  - `description` (string, optional).
- **Returns:** `201 { success, data: BudgetRow }`.
- Dispatch: expense → `Budget.addExpense(...)`; income → `Budget.addIncome(...)`. `addIncome` always sets category to `'Income'` regardless of the input.
- **Errors:** `400` invalid type / non-positive amount / missing category for expense.

### `DELETE /api/budget/transactions/:id`

Delete a transaction.

- **Returns:** `200 { success, message }`.
- **Errors:** `404` if not found.

## Related

- Model: [docs/backend/models/Budget.md](../../models/Budget.md)
