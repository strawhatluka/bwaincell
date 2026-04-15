# Budget Model

**Source:** `supabase/models/Budget.ts`
**Table:** `budgets`

Income and expense tracking with monthly summaries, category breakdowns, and multi-month trends.

## Columns

| Column        | Type           | Constraints                      |
| ------------- | -------------- | -------------------------------- |
| `id`          | SERIAL         | PRIMARY KEY                      |
| `type`        | `budget_type`  | NOT NULL (`'expense'\|'income'`) |
| `category`    | VARCHAR(255)   | nullable                         |
| `amount`      | DECIMAL(10, 2) | NOT NULL                         |
| `description` | TEXT           | nullable                         |
| `date`        | TIMESTAMPTZ    | NOT NULL, DEFAULT `NOW()`        |
| `user_id`     | VARCHAR(255)   | NOT NULL (audit trail)           |
| `guild_id`    | VARCHAR(255)   | NOT NULL                         |

Indexes: `idx_budgets_guild_id`, `idx_budgets_type`, `idx_budgets_date`.

## Static Methods

| Method             | Signature                                                | Returns                                                                              |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `addExpense`       | `(guildId, category, amount, description=null, userId?)` | `Promise<BudgetRow>`                                                                 |
| `addIncome`        | `(guildId, amount, description=null, userId?)`           | `Promise<BudgetRow>` — category is hard-coded `'Income'`                             |
| `getSummary`       | `(guildId, month=null)`                                  | `Promise<BudgetSummary>` — income/expenses/balance (as strings) + category breakdown |
| `getCategories`    | `(guildId)`                                              | `Promise<CategoryResult[]>` — expense totals grouped in JS                           |
| `getRecentEntries` | `(guildId, limit=10)`                                    | `Promise<BudgetRow[]>` (newest first)                                                |
| `getMonthlyTrend`  | `(guildId, months=6)`                                    | `Promise<MonthlyTrend[]>` — one row per month, chronological                         |
| `deleteEntry`      | `(entryId, guildId)`                                     | `Promise<boolean>`                                                                   |

All monetary values returned from summary/trend are pre-formatted decimal strings (`toFixed(2)`).

## Exported Interfaces

- `BudgetSummary`, `CategorySummary`, `CategoryResult`, `MonthlyTrend`

## Example

```ts
import Budget from '@database/models/Budget';

await Budget.addExpense(guildId, 'Groceries', 52.3, 'Whole Foods');
await Budget.addIncome(guildId, 2500.0, 'Paycheck');

const summary = await Budget.getSummary(guildId); // current month
const april = await Budget.getSummary(guildId, 4);
const trend = await Budget.getMonthlyTrend(guildId, 12);
```

## Related

- Command: [docs/api/discord-commands.md#5-budget-tracking---budget](../../api/discord-commands.md#5-budget-tracking---budget)
- Route: [docs/backend/api/routes/budget.md](../api/routes/budget.md)
