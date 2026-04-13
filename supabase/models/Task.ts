/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, Optional, Sequelize } from 'sequelize';
import schemas from '../schema';

// Define attributes interface matching the schema
interface TaskAttributes {
  id: number;
  description: string;
  due_date?: Date | null;
  completed: boolean;
  created_at: Date;
  completed_at?: Date | null;
  user_id: string;
  guild_id: string;
}

// Creation attributes (id and timestamps are optional during creation)
interface TaskCreationAttributes
  extends Optional<TaskAttributes, 'id' | 'created_at' | 'completed' | 'completed_at'> {}

const TaskBase = Model as any;
class Task extends TaskBase<TaskAttributes, TaskCreationAttributes> implements TaskAttributes {
  // Sequelize automatically provides getters/setters for these fields
  // Commenting out to prevent shadowing warnings
  // public id!: number;
  // public description!: string;
  // public due_date?: Date | null;
  // public completed!: boolean;
  // public created_at!: Date;
  // public completed_at?: Date | null;
  // public user_id!: string;
  // public guild_id!: string;

  static init(sequelize: Sequelize) {
    return Model.init.call(this as any, schemas.task, {
      sequelize,
      modelName: 'Task',
      tableName: 'tasks',
      timestamps: false,
    });
  }

  static async createTask(
    guildId: string,
    description: string,
    dueDate: Date | null = null,
    userId?: string
  ): Promise<Task> {
    return await (this as any).create({
      user_id: userId || 'system', // Keep for audit trail (WO-015)
      guild_id: guildId,
      description,
      due_date: dueDate,
    });
  }

  // NOTE: Filters by guild_id only for shared household access (WO-015)
  static async getUserTasks(
    guildId: string,
    filter: 'all' | 'pending' | 'completed' = 'all'
  ): Promise<Task[]> {
    const where: Record<string, unknown> = { guild_id: guildId };

    if (filter === 'pending') {
      where.completed = false;
    } else if (filter === 'completed') {
      where.completed = true;
    }

    return await (this as any).findAll({ where, order: [['created_at', 'DESC']] });
  }

  static async completeTask(taskId: number, guildId: string): Promise<Task | null> {
    const task = await (this as any).findOne({
      where: { id: taskId, guild_id: guildId },
    });

    if (!task) return null;

    task.completed = true;
    task.completed_at = new Date();
    await task.save();

    return task;
  }

  static async deleteTask(taskId: number, guildId: string): Promise<boolean> {
    const result = await (this as any).destroy({
      where: { id: taskId, guild_id: guildId },
    });

    return result > 0;
  }

  static async editTask(
    taskId: number,
    guildId: string,
    newDescription?: string | null,
    newDueDate?: Date | null
  ): Promise<Task | null> {
    const task = await (this as any).findOne({
      where: { id: taskId, guild_id: guildId },
    });

    if (!task) return null;

    if (newDescription !== undefined && newDescription !== null) {
      task.description = newDescription;
    }
    if (newDueDate !== undefined) {
      task.due_date = newDueDate;
    }
    await task.save();

    return task;
  }
}

export default Task;
