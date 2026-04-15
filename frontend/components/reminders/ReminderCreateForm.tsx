'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

interface ReminderCreateFormProps {
  onCreate: (data: {
    message: string;
    frequency: 'once' | 'daily' | 'weekly';
    time: string;
    dayOfWeek?: number;
  }) => void;
  isCreating: boolean;
}

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export function ReminderCreateForm({ onCreate, isCreating }: ReminderCreateFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [frequency, setFrequency] = useState<'once' | 'daily' | 'weekly'>('once');
  const [time, setTime] = useState('09:00');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !time) return;

    onCreate({
      message: message.trim(),
      frequency,
      time,
      dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
    });

    // Reset form
    setMessage('');
    setFrequency('once');
    setTime('09:00');
    setDayOfWeek(1);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#f59e0b] hover:bg-[#e08c00]">
          <Plus className="w-4 h-4 mr-2" />
          Create Reminder
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Reminder</DialogTitle>
            <DialogDescription>
              Set up a reminder to never forget important tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Input
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What should I remind you about?"
                disabled={isCreating}
                className="border-[#f59e0b]/30 focus-visible:ring-[#f59e0b]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="frequency">Type</Label>
              <Select
                value={frequency}
                onValueChange={(value) => setFrequency(value as 'once' | 'daily' | 'weekly')}
                disabled={isCreating}
              >
                <SelectTrigger className="border-[#f59e0b]/30 focus:ring-[#f59e0b]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">One-time</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {frequency === 'weekly' && (
              <div className="grid gap-2">
                <Label htmlFor="dayOfWeek">Day of Week</Label>
                <Select
                  value={dayOfWeek.toString()}
                  onValueChange={(value) => setDayOfWeek(parseInt(value))}
                  disabled={isCreating}
                >
                  <SelectTrigger className="border-[#f59e0b]/30 focus:ring-[#f59e0b]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={isCreating}
                className="border-[#f59e0b]/30 focus-visible:ring-[#f59e0b]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !message.trim() || !time}
              className="bg-[#f59e0b] hover:bg-[#e08c00]"
            >
              {isCreating ? 'Creating...' : 'Create Reminder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
