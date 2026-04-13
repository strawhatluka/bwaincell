import { Skeleton } from '@/components/ui/skeleton';

export function NoteSkeleton() {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-9 rounded" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

export function NoteGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <NoteSkeleton />
      <NoteSkeleton />
      <NoteSkeleton />
      <NoteSkeleton />
      <NoteSkeleton />
      <NoteSkeleton />
    </div>
  );
}
