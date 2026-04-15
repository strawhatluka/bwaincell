# BudgetSkeleton

**Source:** `frontend/components/budget/BudgetSkeleton.tsx`

Loading placeholders for the budget page.

## Exports

### `BudgetCardSkeleton`

Single placeholder card with three `Skeleton` bars (4-height 24-width, 8-height 32-width, 3-height full-width).

### `BudgetChartSkeleton`

Chart placeholder: 48-width title bar + 64-height full-width chart-shaped skeleton. Used as the `next/dynamic({ loading: ... })` fallback for `MonthlyChart`.

### `BudgetPageSkeleton`

Full-page placeholder: three `BudgetCardSkeleton`s in a responsive 1-col / 3-col grid, followed by `BudgetChartSkeleton`. Used by `app/dashboard/budget/page.tsx` while `useBudget().isLoading`.

## Props

None on any export.

## Dependencies

- `Skeleton` from `@/components/ui/skeleton` (shadcn primitive).
