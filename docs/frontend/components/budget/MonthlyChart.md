# MonthlyChart

**Source:** `frontend/components/budget/MonthlyChart.tsx`

Summary cards + recharts bar chart comparing income vs. expense per category.

## Props

| Name           | Type            | Required | Description  |
| -------------- | --------------- | -------- | ------------ |
| `transactions` | `Transaction[]` | yes      | Source data. |

### `Transaction`

```ts
interface Transaction {
  id: number;
  userId: string;
  guildId: string;
  amount: number | { toNumber: () => number }; // Prisma Decimal tolerated
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}
```

## Derived Data (`useMemo`)

- `chartData` — `Map<category, { income, expense }>` collapsed to `[{ category, income, expense }]`. Amount is coerced via `typeof a === 'number' ? a : Number(a)`.
- `totals` — `{ income, expense, balance }` across all transactions.

## Rendering

1. Three summary cards (income = green, expense = red, balance = blue when ≥0 else orange). Amount formatting: `$${n.toFixed(2)}`.
2. When `chartData.length > 0`: `<ResponsiveContainer height={300}><BarChart>` with:
   - `CartesianGrid strokeDasharray="3 3"`.
   - `XAxis dataKey="category"`, `YAxis`.
   - `Tooltip`, `Legend`.
   - `Bar dataKey="income" fill="#10b981"`, `Bar dataKey="expense" fill="#ef4444"`.
3. Otherwise placeholder: `"No data to display. Add transactions to see the chart."`.

## Dependencies

- `recharts`: `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`, `ResponsiveContainer`.

## Integration

Imported via `next/dynamic({ ssr: false })` in `app/dashboard/budget/page.tsx` so the recharts bundle is client-only.
