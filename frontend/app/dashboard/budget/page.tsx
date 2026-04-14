'use client';

import dynamic from 'next/dynamic';
import { useBudget } from '@/hooks/useBudget';
import { TransactionForm } from '@/components/budget/TransactionForm';
import { TransactionList } from '@/components/budget/TransactionList';
import { BudgetPageSkeleton, BudgetChartSkeleton } from '@/components/budget/BudgetSkeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

const MonthlyChart = dynamic(
  () =>
    import('@/components/budget/MonthlyChart').then((mod) => ({
      default: mod.MonthlyChart,
    })),
  {
    loading: () => <BudgetChartSkeleton />,
    ssr: false,
  }
);

export default function BudgetPage() {
  const { transactions, isLoading, createTransaction, deleteTransaction, isCreating } = useBudget();

  return (
    <ErrorBoundary>
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Budget</h1>
            <p className="text-muted-foreground mt-1">
              Track your expenses and manage your finances
            </p>
          </div>
          <TransactionForm onCreate={createTransaction} isCreating={isCreating} />
        </div>

        {isLoading ? (
          <BudgetPageSkeleton />
        ) : (
          <div className="space-y-6">
            <MonthlyChart transactions={transactions} />
            <TransactionList transactions={transactions} onDelete={deleteTransaction} />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
