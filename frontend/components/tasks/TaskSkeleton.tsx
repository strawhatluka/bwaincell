import { Skeleton } from '@/components/ui/skeleton';

export function TaskSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-5 w-5 rounded mt-0.5" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <div className="space-y-3">
      <TaskSkeleton />
      <TaskSkeleton />
      <TaskSkeleton />
      <TaskSkeleton />
      <TaskSkeleton />
    </div>
  );
}
