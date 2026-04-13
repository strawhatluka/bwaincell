import { Skeleton } from '@/components/ui/skeleton';

export function BudgetCardSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow p-6 space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-full mt-4" />
    </div>
  );
}

export function BudgetChartSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow p-6">
      <Skeleton className="h-6 w-48 mb-6" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function BudgetPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <BudgetCardSkeleton />
        <BudgetCardSkeleton />
        <BudgetCardSkeleton />
      </div>
      <BudgetChartSkeleton />
    </div>
  );
}
