'use client';

import { ReminderList } from '@/components/reminders/ReminderList';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export default function RemindersPage() {
  return (
    <ErrorBoundary>
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Reminders</h1>
          <p className="text-muted-foreground mt-1">Never forget important events and deadlines</p>
        </div>
        <ReminderList />
      </div>
    </ErrorBoundary>
  );
}
