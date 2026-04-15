'use client';

import { ListGrid } from '@/components/lists/ListGrid';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export default function ListsPage() {
  return (
    <ErrorBoundary>
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Lists</h1>
          <p className="text-muted-foreground mt-1">Create and manage your custom lists</p>
        </div>
        <ListGrid />
      </div>
    </ErrorBoundary>
  );
}
