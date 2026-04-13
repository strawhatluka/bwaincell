'use client';

import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { TaskCreateForm } from './TaskCreateForm';
import { TaskItem } from './TaskItem';
import { TaskListSkeleton } from './TaskSkeleton';
import { Button } from '@/components/ui/button';
import { CheckSquare } from 'lucide-react';

type FilterType = 'all' | 'pending' | 'completed';

export function TaskList() {
  const { tasks, isLoading, createTask, updateTask, deleteTask, isCreating } = useTasks();
  const [filter, setFilter] = useState<FilterType>('all');

  // Wrap mutation functions to match TaskItem's expected signature
  const handleUpdateTask = (id: number, data: Partial<any>) => {
    updateTask({ id, data });
  };

  const handleDeleteTask = (id: number) => {
    deleteTask(id);
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'pending') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  if (isLoading) {
    return (
      <div>
        <TaskCreateForm onCreate={createTask} isCreating={isCreating} />
        <TaskListSkeleton />
      </div>
    );
  }

  return (
    <div>
      <TaskCreateForm onCreate={createTask} isCreating={isCreating} />

      <div className="mb-4 flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          className={
            filter === 'all'
              ? 'bg-dawn-500 hover:bg-dawn-600 text-white border-dawn-500'
              : 'bg-gradient-to-r from-twilight-500 to-dusk-500 text-white hover:from-twilight-600 hover:to-dusk-600 border-0'
          }
        >
          All ({tasks.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
          className={
            filter === 'pending'
              ? 'bg-dawn-500 hover:bg-dawn-600 text-white border-dawn-500'
              : 'bg-gradient-to-r from-twilight-500 to-dusk-500 text-white hover:from-twilight-600 hover:to-dusk-600 border-0'
          }
        >
          Pending ({tasks.filter((t) => !t.completed).length})
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          onClick={() => setFilter('completed')}
          className={
            filter === 'completed'
              ? 'bg-dawn-500 hover:bg-dawn-600 text-white border-dawn-500'
              : 'bg-gradient-to-r from-twilight-500 to-dusk-500 text-white hover:from-twilight-600 hover:to-dusk-600 border-0'
          }
        >
          Completed ({tasks.filter((t) => t.completed).length})
        </Button>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <CheckSquare className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium text-foreground mb-1">
            {filter === 'all' && 'No tasks yet'}
            {filter === 'pending' && 'No pending tasks'}
            {filter === 'completed' && 'No completed tasks'}
          </h3>
          <p className="text-muted-foreground">
            {filter === 'all' && 'Create your first task to get started!'}
            {filter === 'pending' && 'All tasks are completed!'}
            {filter === 'completed' && 'Complete some tasks to see them here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onUpdate={handleUpdateTask}
              onDelete={handleDeleteTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}
