# /budget Command

**Source:** `backend/commands/budget.ts`
**Model:** `supabase/models/Budget`

Track income and expenses per guild.

## Subcommands

| Subcommand | Options | Purpose |
|---|---|---|
| `add` | `category` (required), `amount` (number, required, >0), `description` (optional) | Records expense. |
| `income` | `amount` (number, required, >0), `description` (optional) | Records income. |
| `summary` | `month` (integer 1–12, optional) | Shows income/expenses/balance and top 5 categories for given or current month. |
| `categories` | — | Lists top 15 categories with amount, transaction count, and visual bar (`█` per $100). |
| `recent` | `limit` (1–25, default 10) | Recent transactions list. |
| `trend` | `months` (1–12, default 6) | Monthly income/expenses/balance trend. |

## Local Types

```ts
interface BudgetSummary {
  income: string;
  expenses: string;
  balance: string;
  categories: Array<{ name: string; amount: string; percentage: string }>;
  entryCount: number;
}

interface CategoryData { category: string; total: string; count: number; }
interface MonthlyTrend { month: string; income: string; expenses: string; balance: string; }
```

## Model Methods Used

`addExpense(guildId, category, amount, description, userId)`, `addIncome(guildId, amount, description, userId)`, `getSummary(guildId, month?)`, `getCategories(guildId)`, `getRecentEntries(guildId, limit)`, `getMonthlyTrend(guildId, months)`.

## Validation

- Amount must be `> 0`; otherwise "Amount must be greater than 0." is returned.
- Requires `interaction.guild.id`.

## Error Handling

Errors are logged with `{ command, subcommand, error, stack, userId, guildId }`; generic user-facing message on failure.
