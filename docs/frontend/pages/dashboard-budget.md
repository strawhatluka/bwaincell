# Dashboard Budget Page

**Source:** `frontend/app/dashboard/budget/page.tsx`
**Route:** `/dashboard/budget`

Client component.

## Dynamic Imports

`MonthlyChart` is imported via `next/dynamic` with `ssr: false` and a skeleton fallback to defer the recharts bundle:

```ts
const MonthlyChart = dynamic(
  () => import('@/components/budget/MonthlyChart').then((mod) => ({ default: mod.MonthlyChart })),
  { loading: () => <BudgetChartSkeleton />, ssr: false }
);
```

## Data Hook

```ts
const { transactions, isLoading, createTransaction, deleteTransaction, isCreating } = useBudget();
```

## Composition

1. Header row: title + description on the left, `<TransactionForm onCreate={createTransaction} isCreating={isCreating} />` on the right.
2. `isLoading` → `<BudgetPageSkeleton />`.
3. Otherwise: stacked `<MonthlyChart transactions={transactions} />` and `<TransactionList transactions={transactions} onDelete={deleteTransaction} />`.

Everything is wrapped in `<ErrorBoundary>`.

## Dependencies

- `useBudget` hook
- `TransactionForm`, `TransactionList`, `MonthlyChart`
- `BudgetPageSkeleton`, `BudgetChartSkeleton` from `@/components/budget/BudgetSkeleton`
- `ErrorBoundary`
