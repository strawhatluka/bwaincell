'use client';

import { TaskList } from '@/components/tasks/TaskList';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export default function TasksPage() {
  return (
    <ErrorBoundary>
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage your to-do items</p>
        </div>
        <TaskList />
      </div>
    </ErrorBoundary>
  );
}
