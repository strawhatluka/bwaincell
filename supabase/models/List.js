'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const supabase_1 = __importDefault(require('../supabase'));
class List {
  // Helper method to find list case-insensitively
  // NOTE: Filters by guild_id only for shared household access (WO-015)
  static async findListCaseInsensitive(guildId, listName) {
    const { data } = await supabase_1.default.from('lists').select('*').eq('guild_id', guildId);
    if (!data) return null;
    return data.find((l) => l.name.toLowerCase() === listName.toLowerCase()) || null;
  }
  static async createList(guildId, name, userId) {
    const existing = await this.findListCaseInsensitive(guildId, name);
    if (existing) return null;
    const { data } = await supabase_1.default
      .from('lists')
      .insert({
        user_id: userId || 'system', // Keep for audit trail
        guild_id: guildId,
        name,
        items: [],
      })
      .select()
      .single();
    return data;
  }
  static async addItem(guildId, listName, item) {
    const list = await this.findListCaseInsensitive(guildId, listName);
    if (!list) return null;
    const items = list.items || [];
    items.push({
      text: item,
      completed: false,
      added_at: new Date().toISOString(),
    });
    const { data } = await supabase_1.default
      .from('lists')
      .update({ items })
      .eq('id', list.id)
      .select()
      .single();
    return data;
  }
  static async removeItem(guildId, listName, itemText) {
    const list = await this.findListCaseInsensitive(guildId, listName);
    if (!list) return null;
    const items = list.items || [];
    const index = items.findIndex((item) => item.text.toLowerCase() === itemText.toLowerCase());
    if (index === -1) return null;
    items.splice(index, 1);
    const { data } = await supabase_1.default
      .from('lists')
      .update({ items })
      .eq('id', list.id)
      .select()
      .single();
    return data;
  }
  static async getList(guildId, listName) {
    return await this.findListCaseInsensitive(guildId, listName);
  }
  static async getUserLists(guildId) {
    const { data } = await supabase_1.default
      .from('lists')
      .select('*')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false });
    return data || [];
  }
  static async clearCompleted(guildId, listName) {
    const list = await this.findListCaseInsensitive(guildId, listName);
    if (!list) return null;
    const items = (list.items || []).filter((item) => !item.completed);
    const { data } = await supabase_1.default
      .from('lists')
      .update({ items })
      .eq('id', list.id)
      .select()
      .single();
    return data;
  }
  static async deleteList(guildId, listName) {
    const targetList = await this.findListCaseInsensitive(guildId, listName);
    if (!targetList) return false;
    const { error } = await supabase_1.default.from('lists').delete().eq('id', targetList.id);
    return !error;
  }
  static async toggleItem(guildId, listName, itemText) {
    const list = await this.findListCaseInsensitive(guildId, listName);
    if (!list) return null;
    const items = list.items || [];
    const item = items.find((item) => item.text.toLowerCase() === itemText.toLowerCase());
    if (!item) return null;
    item.completed = !item.completed;
    const { data } = await supabase_1.default
      .from('lists')
      .update({ items })
      .eq('id', list.id)
      .select()
      .single();
    return data;
  }
}
exports.default = List;
//# sourceMappingURL=List.js.map
