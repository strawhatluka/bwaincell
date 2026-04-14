import { Skeleton } from '@/components/ui/skeleton';

export function ReminderSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-9 w-9 rounded" />
      </div>
    </div>
  );
}

export function ReminderListSkeleton() {
  return (
    <div className="space-y-3">
      <ReminderSkeleton />
      <ReminderSkeleton />
      <ReminderSkeleton />
      <ReminderSkeleton />
      <ReminderSkeleton />
    </div>
  );
}
