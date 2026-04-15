'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Bell, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Reminder {
  id: number;
  userId: string;
  guildId: string;
  message: string;
  frequency: 'once' | 'daily' | 'weekly';
  time: string;
  dayOfWeek?: number;
  nextTrigger: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ReminderItemProps {
  reminder: Reminder;
  onDelete: (id: number) => void;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function ReminderItem({ reminder, onDelete }: ReminderItemProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleDelete = () => {
    onDelete(reminder.id);
    setIsDeleteOpen(false);
  };

  const getTypeDisplay = () => {
    if (reminder.frequency === 'once') return 'One-time';
    if (reminder.frequency === 'daily') return 'Daily';
    if (reminder.frequency === 'weekly' && reminder.dayOfWeek !== undefined) {
      return `Weekly (${DAYS[reminder.dayOfWeek]})`;
    }
    return 'Weekly';
  };

  const getTypeBadgeColor = () => {
    if (reminder.frequency === 'once') return 'bg-blue-100 text-blue-800';
    if (reminder.frequency === 'daily') return 'bg-green-100 text-green-800';
    return 'bg-purple-100 text-purple-800';
  };

  return (
    <>
      <div className="flex items-start gap-4 p-4 bg-card rounded-lg border border-border hover:border-[#f59e0b] transition-colors">
        <div className="shrink-0 p-2 bg-[#f59e0b]/10 rounded-lg">
          <Bell className="w-5 h-5 text-[#f59e0b]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-sm font-medium text-foreground">{reminder.message}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteOpen(true)}
              className="hover:bg-red-50 hover:text-red-600 shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className={getTypeBadgeColor()}>{getTypeDisplay()}</Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>at {format(parseISO(reminder.nextTrigger), 'h:mm a')}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Next: {format(parseISO(reminder.nextTrigger), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Reminder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this reminder? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
