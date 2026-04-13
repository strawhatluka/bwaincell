import supabase from '../supabase';
import type { TaskRow, TaskInsert, TaskUpdate } from '../types';

class Task {
  static async createTask(
    guildId: string,
    description: string,
    dueDate: Date | null = null,
    userId?: string
  ): Promise<TaskRow> {
    const insert: TaskInsert = {
      user_id: userId || 'system', // Keep for audit trail (WO-015)
      guild_id: guildId,
      description,
      due_date: dueDate ? dueDate.toISOString() : null,
    };

    const { data, error } = await supabase.from('tasks').insert(insert).select().single();

    if (error) throw error;
    return data;
  }

  // NOTE: Filters by guild_id only for shared household access (WO-015)
  static async getUserTasks(
    guildId: string,
    filter: 'all' | 'pending' | 'completed' = 'all'
  ): Promise<TaskRow[]> {
    let query = supabase.from('tasks').select('*').eq('guild_id', guildId);

    if (filter === 'pending') {
      query = query.eq('completed', false);
    } else if (filter === 'completed') {
      query = query.eq('completed', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async completeTask(taskId: number, guildId: string): Promise<TaskRow | null> {
    const update: TaskUpdate = {
      completed: true,
      completed_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('tasks')
      .update(update)
      .eq('id', taskId)
      .eq('guild_id', guildId)
      .select()
      .single();

    if (error) {
      // No matching row returns a PGRST116 error
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  static async deleteTask(taskId: number, guildId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('guild_id', guildId)
      .select();

    if (error) throw error;
    return data.length > 0;
  }

  static async editTask(
    taskId: number,
    guildId: string,
    newDescription?: string | null,
    newDueDate?: Date | null
  ): Promise<TaskRow | null> {
    const update: TaskUpdate = {};

    if (newDescription !== undefined && newDescription !== null) {
      update.description = newDescription;
    }
    if (newDueDate !== undefined) {
      update.due_date = newDueDate ? newDueDate.toISOString() : null;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(update)
      .eq('id', taskId)
      .eq('guild_id', guildId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }
}

export default Task;
