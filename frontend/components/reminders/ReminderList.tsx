'use client';

import { useReminders } from '@/hooks/useReminders';
import { ReminderItem } from './ReminderItem';
import { ReminderListSkeleton } from './ReminderSkeleton';
import { Bell, MessageSquare } from 'lucide-react';

export function ReminderList() {
  const { reminders, isLoading, deleteReminder } = useReminders();

  if (isLoading) {
    return <ReminderListSkeleton />;
  }

  return (
    <div>
      {reminders.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium text-foreground mb-1">No reminders yet</h3>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Use the <code className="px-1.5 py-0.5 bg-muted rounded text-sm">/remind</code> command
            in Discord to create reminders
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <ReminderItem key={reminder.id} reminder={reminder} onDelete={deleteReminder} />
          ))}
        </div>
      )}
    </div>
  );
}
