import supabase from '../supabase';
import type { RecipeRow, RecipeInsert, RecipeUpdate, RecipeDifficulty } from '../types';

class Recipe {
  static async createRecipe(data: RecipeInsert): Promise<RecipeRow> {
    const { data: row, error } = await supabase.from('recipes').insert(data).select().single();

    if (error) throw error;
    return row;
  }

  static async getRecipes(guildId: string): Promise<RecipeRow[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('guild_id', guildId)
      .order('is_favorite', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async getRecipe(id: number, guildId: string): Promise<RecipeRow | null> {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .eq('guild_id', guildId)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }

  static async updateRecipe(
    id: number,
    guildId: string,
    data: RecipeUpdate
  ): Promise<RecipeRow | null> {
    const update: RecipeUpdate = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: row, error } = await supabase
      .from('recipes')
      .update(update)
      .eq('id', id)
      .eq('guild_id', guildId)
      .select()
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return row;
  }

  static async deleteRecipe(id: number, guildId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)
      .eq('guild_id', guildId)
      .select();

    if (error) throw error;
    return data.length > 0;
  }

  static async searchByName(guildId: string, query: string): Promise<RecipeRow[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('guild_id', guildId)
      .ilike('name', `%${query}%`)
      .order('is_favorite', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async searchByFilters(
    guildId: string,
    filters: {
      cuisine?: string;
      difficulty?: RecipeDifficulty;
      tag?: string;
      keyword?: string;
      maxPrepTime?: number;
    }
  ): Promise<RecipeRow[]> {
    let query = supabase.from('recipes').select('*').eq('guild_id', guildId);

    if (filters.cuisine !== undefined) {
      query = query.ilike('cuisine', filters.cuisine);
    }
    if (filters.difficulty !== undefined) {
      query = query.ilike('difficulty', filters.difficulty);
    }
    if (filters.tag !== undefined) {
      query = query.contains('dietary_tags', [filters.tag.toLowerCase()]);
    }
    if (filters.keyword !== undefined) {
      query = query.ilike('name', `%${filters.keyword}%`);
    }
    if (filters.maxPrepTime !== undefined) {
      query = query.lte('prep_time_minutes', filters.maxPrepTime);
    }

    const { data, error } = await query
      .order('is_favorite', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async toggleFavorite(id: number, guildId: string): Promise<RecipeRow | null> {
    const existing = await Recipe.getRecipe(id, guildId);
    if (!existing) return null;

    const update: RecipeUpdate = {
      is_favorite: !existing.is_favorite,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('recipes')
      .update(update)
      .eq('id', id)
      .eq('guild_id', guildId)
      .select()
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }

  static async getFavorites(guildId: string): Promise<RecipeRow[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('guild_id', guildId)
      .eq('is_favorite', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async getRandom(guildId: string): Promise<RecipeRow | null> {
    const { data, error } = await supabase.from('recipes').select('*').eq('guild_id', guildId);

    if (error) throw error;
    if (!data || data.length === 0) return null;
    return data[Math.floor(Math.random() * data.length)];
  }
}

export default Recipe;
export { Recipe };
