import supabase from '../supabase';
import type { NoteRow, NoteInsert, NoteUpdate } from '../types';

// Update attributes interface (preserved for caller compatibility)
interface NoteUpdateAttributes {
  title?: string;
  content?: string;
  tags?: string[];
}

class Note {
  static async createNote(
    guildId: string,
    title: string,
    content: string,
    tags: string[] = [],
    userId?: string
  ): Promise<NoteRow> {
    const insert: NoteInsert = {
      user_id: userId || 'system', // Keep for audit trail (WO-015)
      guild_id: guildId,
      title,
      content,
      tags,
    };

    const { data, error } = await supabase
      .from('notes')
      .insert(insert)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // NOTE: Filters by guild_id only for shared household access (WO-015)
  static async getNotes(guildId: string): Promise<NoteRow[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getNote(noteId: number, guildId: string): Promise<NoteRow | null> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('guild_id', guildId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  static async deleteNote(noteId: number, guildId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('guild_id', guildId)
      .select();

    if (error) throw error;
    return data.length > 0;
  }

  static async searchNotes(guildId: string, keyword: string): Promise<NoteRow[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('guild_id', guildId)
      .or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async updateNote(
    noteId: number,
    guildId: string,
    updates: NoteUpdateAttributes
  ): Promise<NoteRow | null> {
    const updatePayload: NoteUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title) updatePayload.title = updates.title;
    if (updates.content) updatePayload.content = updates.content;
    if (updates.tags) updatePayload.tags = updates.tags;

    const { data, error } = await supabase
      .from('notes')
      .update(updatePayload)
      .eq('id', noteId)
      .eq('guild_id', guildId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  static async getNotesByTag(guildId: string, tag: string): Promise<NoteRow[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('guild_id', guildId);

    if (error) throw error;

    return data.filter((note: NoteRow) => {
      const tags = note.tags || [];
      return tags.some((t: string) => t.toLowerCase() === tag.toLowerCase());
    });
  }

  static async getAllTags(guildId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('tags')
      .eq('guild_id', guildId);

    if (error) throw error;

    const allTags = new Set<string>();
    data.forEach((note: Pick<NoteRow, 'tags'>) => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach((tag: string) => allTags.add(tag));
      }
    });

    return Array.from(allTags);
  }
}

export default Note;
