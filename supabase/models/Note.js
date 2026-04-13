"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = __importDefault(require("../supabase"));
class Note {
    static async createNote(guildId, title, content, tags = [], userId) {
        const insert = {
            user_id: userId || 'system', // Keep for audit trail (WO-015)
            guild_id: guildId,
            title,
            content,
            tags,
        };
        const { data, error } = await supabase_1.default
            .from('notes')
            .insert(insert)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    // NOTE: Filters by guild_id only for shared household access (WO-015)
    static async getNotes(guildId) {
        const { data, error } = await supabase_1.default
            .from('notes')
            .select('*')
            .eq('guild_id', guildId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data;
    }
    static async getNote(noteId, guildId) {
        const { data, error } = await supabase_1.default
            .from('notes')
            .select('*')
            .eq('id', noteId)
            .eq('guild_id', guildId)
            .single();
        if (error) {
            if (error.code === 'PGRST116')
                return null;
            throw error;
        }
        return data;
    }
    static async deleteNote(noteId, guildId) {
        const { data, error } = await supabase_1.default
            .from('notes')
            .delete()
            .eq('id', noteId)
            .eq('guild_id', guildId)
            .select();
        if (error)
            throw error;
        return data.length > 0;
    }
    static async searchNotes(guildId, keyword) {
        const { data, error } = await supabase_1.default
            .from('notes')
            .select('*')
            .eq('guild_id', guildId)
            .or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data;
    }
    static async updateNote(noteId, guildId, updates) {
        const updatePayload = {
            updated_at: new Date().toISOString(),
        };
        if (updates.title)
            updatePayload.title = updates.title;
        if (updates.content)
            updatePayload.content = updates.content;
        if (updates.tags)
            updatePayload.tags = updates.tags;
        const { data, error } = await supabase_1.default
            .from('notes')
            .update(updatePayload)
            .eq('id', noteId)
            .eq('guild_id', guildId)
            .select()
            .single();
        if (error) {
            if (error.code === 'PGRST116')
                return null;
            throw error;
        }
        return data;
    }
    static async getNotesByTag(guildId, tag) {
        const { data, error } = await supabase_1.default
            .from('notes')
            .select('*')
            .eq('guild_id', guildId);
        if (error)
            throw error;
        return data.filter((note) => {
            const tags = note.tags || [];
            return tags.some((t) => t.toLowerCase() === tag.toLowerCase());
        });
    }
    static async getAllTags(guildId) {
        const { data, error } = await supabase_1.default
            .from('notes')
            .select('tags')
            .eq('guild_id', guildId);
        if (error)
            throw error;
        const allTags = new Set();
        data.forEach((note) => {
            if (note.tags && Array.isArray(note.tags)) {
                note.tags.forEach((tag) => allTags.add(tag));
            }
        });
        return Array.from(allTags);
    }
}
exports.default = Note;
//# sourceMappingURL=Note.js.map