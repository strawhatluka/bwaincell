import type { TaskRow } from '../types';
declare class Task {
  static createTask(
    guildId: string,
    description: string,
    dueDate?: Date | null,
    userId?: string
  ): Promise<TaskRow>;
  static getUserTasks(
    guildId: string,
    filter?: 'all' | 'pending' | 'completed'
  ): Promise<TaskRow[]>;
  static completeTask(taskId: number, guildId: string): Promise<TaskRow | null>;
  static deleteTask(taskId: number, guildId: string): Promise<boolean>;
  static editTask(
    taskId: number,
    guildId: string,
    newDescription?: string | null,
    newDueDate?: Date | null
  ): Promise<TaskRow | null>;
}
export default Task;
//# sourceMappingURL=Task.d.ts.map
