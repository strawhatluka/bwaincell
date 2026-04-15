import supabase from '../supabase';
import type { ListRow } from '../types';

// Define interface for list items
export interface ListItem {
  text: string;
  completed: boolean;
  added_at: string;
}

class List {
  // Helper method to find list case-insensitively
  // NOTE: Filters by guild_id only for shared household access (WO-015)
  private static async findListCaseInsensitive(
    guildId: string,
    listName: string
  ): Promise<ListRow | null> {
    const { data } = await supabase.from('lists').select('*').eq('guild_id', guildId);
    if (!data) return null;
    return data.find((l) => l.name.toLowerCase() === listName.toLowerCase()) || null;
  }

  static async createList(guildId: string, name: string, userId?: string): Promise<ListRow | null> {
    const existing = await this.findListCaseInsensitive(guildId, name);

    if (existing) return null;

    const { data } = await supabase
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

  static async addItem(guildId: string, listName: string, item: string): Promise<ListRow | null> {
    const list = await this.findListCaseInsensitive(guildId, listName);

    if (!list) return null;

    const items = list.items || [];
    items.push({
      text: item,
      completed: false,
      added_at: new Date().toISOString(),
    } as any);

    const { data } = await supabase
      .from('lists')
      .update({ items })
      .eq('id', list.id)
      .select()
      .single();

    return data;
  }

  static async removeItem(
    guildId: string,
    listName: string,
    itemText: string
  ): Promise<ListRow | null> {
    const list = await this.findListCaseInsensitive(guildId, listName);

    if (!list) return null;

    const items = list.items || [];
    const index = items.findIndex((item) => item.text.toLowerCase() === itemText.toLowerCase());

    if (index === -1) return null;

    items.splice(index, 1);

    const { data } = await supabase
      .from('lists')
      .update({ items })
      .eq('id', list.id)
      .select()
      .single();

    return data;
  }

  static async getList(guildId: string, listName: string): Promise<ListRow | null> {
    return await this.findListCaseInsensitive(guildId, listName);
  }

  static async getUserLists(guildId: string): Promise<ListRow[]> {
    const { data } = await supabase
      .from('lists')
      .select('*')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false });

    return data || [];
  }

  static async clearCompleted(guildId: string, listName: string): Promise<ListRow | null> {
    const list = await this.findListCaseInsensitive(guildId, listName);

    if (!list) return null;

    const items = (list.items || []).filter((item) => !item.completed);

    const { data } = await supabase
      .from('lists')
      .update({ items })
      .eq('id', list.id)
      .select()
      .single();

    return data;
  }

  static async deleteList(guildId: string, listName: string): Promise<boolean> {
    const targetList = await this.findListCaseInsensitive(guildId, listName);

    if (!targetList) return false;

    const { error } = await supabase.from('lists').delete().eq('id', targetList.id);

    return !error;
  }

  static async toggleItem(
    guildId: string,
    listName: string,
    itemText: string
  ): Promise<ListRow | null> {
    const list = await this.findListCaseInsensitive(guildId, listName);

    if (!list) return null;

    const items = list.items || [];
    const item = items.find((item) => item.text.toLowerCase() === itemText.toLowerCase());

    if (!item) return null;

    item.completed = !item.completed;

    const { data } = await supabase
      .from('lists')
      .update({ items })
      .eq('id', list.id)
      .select()
      .single();

    return data;
  }
}

export default List;
