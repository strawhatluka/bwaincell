'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const supabase_1 = __importDefault(require('../supabase'));
class Task {
  static async createTask(guildId, description, dueDate = null, userId) {
    const insert = {
      user_id: userId || 'system', // Keep for audit trail (WO-015)
      guild_id: guildId,
      description,
      due_date: dueDate ? dueDate.toISOString() : null,
    };
    const { data, error } = await supabase_1.default.from('tasks').insert(insert).select().single();
    if (error) throw error;
    return data;
  }
  // NOTE: Filters by guild_id only for shared household access (WO-015)
  static async getUserTasks(guildId, filter = 'all') {
    let query = supabase_1.default.from('tasks').select('*').eq('guild_id', guildId);
    if (filter === 'pending') {
      query = query.eq('completed', false);
    } else if (filter === 'completed') {
      query = query.eq('completed', true);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
  static async completeTask(taskId, guildId) {
    const update = {
      completed: true,
      completed_at: new Date().toISOString(),
    };
    const { data, error } = await supabase_1.default
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
  static async deleteTask(taskId, guildId) {
    const { data, error } = await supabase_1.default
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('guild_id', guildId)
      .select();
    if (error) throw error;
    return data.length > 0;
  }
  static async editTask(taskId, guildId, newDescription, newDueDate) {
    const update = {};
    if (newDescription !== undefined && newDescription !== null) {
      update.description = newDescription;
    }
    if (newDueDate !== undefined) {
      update.due_date = newDueDate ? newDueDate.toISOString() : null;
    }
    const { data, error } = await supabase_1.default
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
exports.default = Task;
//# sourceMappingURL=Task.js.map
