'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';

interface TaskCreateFormProps {
  onCreate: (data: { description: string; dueDate?: string }) => void;
  isCreating: boolean;
}

export function TaskCreateForm({ onCreate, isCreating }: TaskCreateFormProps) {
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) return;

    // Combine date and time if both provided
    let combinedDueDate: string | undefined = undefined;
    if (dueDate) {
      if (dueTime) {
        const localDateTime = new Date(`${dueDate}T${dueTime}:00`);
        combinedDueDate = localDateTime.toISOString();
      } else {
        const localDateTime = new Date(`${dueDate}T00:00:00`);
        combinedDueDate = localDateTime.toISOString();
      }
    }

    onCreate({
      description: description.trim(),
      dueDate: combinedDueDate,
    });

    setDescription('');
    setDueDate('');
    setDueTime('');
  };

  return (
    <Card className="p-4 mb-6 bg-gradient-to-r from-[#f59e0b]/5 to-[#e84d8a]/5 border-[#f59e0b]/20">
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="new-task">New Task</Label>
            <Input
              id="new-task"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be done?"
              disabled={isCreating}
              className="border-[#f59e0b]/30 focus-visible:ring-[#f59e0b]"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="due-date">Due Date (Optional)</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isCreating}
              className="border-[#f59e0b]/30 focus-visible:ring-[#f59e0b]"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="due-time">Due Time (Optional)</Label>
            <Input
              id="due-time"
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              disabled={isCreating}
              className="border-[#f59e0b]/30 focus-visible:ring-[#f59e0b]"
            />
          </div>
          <Button
            type="submit"
            disabled={isCreating || !description.trim()}
            className="bg-[#f59e0b] hover:bg-[#e08c00] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isCreating ? 'Creating...' : 'Add Task'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
