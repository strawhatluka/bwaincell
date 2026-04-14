import supabase from '../supabase';
import type { RecipePreferencesRow, RecipePreferencesInsert } from '../types';

class RecipePreferences {
  static async getPreferences(guildId: string): Promise<RecipePreferencesRow | null> {
    const { data, error } = await supabase
      .from('recipe_preferences')
      .select('*')
      .eq('guild_id', guildId)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }

  static async upsertPreferences(
    guildId: string,
    userId: string,
    data: {
      dietary_restrictions?: string[];
      excluded_cuisines?: string[];
    }
  ): Promise<RecipePreferencesRow> {
    const payload: RecipePreferencesInsert = {
      guild_id: guildId,
      user_id: userId,
      dietary_restrictions: data.dietary_restrictions ?? [],
      excluded_cuisines: data.excluded_cuisines ?? [],
    };

    const { data: row, error } = await supabase
      .from('recipe_preferences')
      .upsert(payload, { onConflict: 'guild_id' })
      .select()
      .single();

    if (error) throw error;
    return row;
  }

  static async addDietaryRestriction(
    guildId: string,
    userId: string,
    restriction: string
  ): Promise<RecipePreferencesRow> {
    const existing = await RecipePreferences.getPreferences(guildId);
    const current = existing?.dietary_restrictions ?? [];
    const excluded = existing?.excluded_cuisines ?? [];
    const next = current.includes(restriction) ? current : [...current, restriction];

    return RecipePreferences.upsertPreferences(guildId, userId, {
      dietary_restrictions: next,
      excluded_cuisines: excluded,
    });
  }

  static async removeDietaryRestriction(
    guildId: string,
    userId: string,
    restriction: string
  ): Promise<RecipePreferencesRow> {
    const existing = await RecipePreferences.getPreferences(guildId);
    const current = existing?.dietary_restrictions ?? [];
    const excluded = existing?.excluded_cuisines ?? [];
    const next = current.filter((r) => r !== restriction);

    return RecipePreferences.upsertPreferences(guildId, userId, {
      dietary_restrictions: next,
      excluded_cuisines: excluded,
    });
  }

  static async addExcludedCuisine(
    guildId: string,
    userId: string,
    cuisine: string
  ): Promise<RecipePreferencesRow> {
    const existing = await RecipePreferences.getPreferences(guildId);
    const restrictions = existing?.dietary_restrictions ?? [];
    const current = existing?.excluded_cuisines ?? [];
    const next = current.includes(cuisine) ? current : [...current, cuisine];

    return RecipePreferences.upsertPreferences(guildId, userId, {
      dietary_restrictions: restrictions,
      excluded_cuisines: next,
    });
  }

  static async removeExcludedCuisine(
    guildId: string,
    userId: string,
    cuisine: string
  ): Promise<RecipePreferencesRow> {
    const existing = await RecipePreferences.getPreferences(guildId);
    const restrictions = existing?.dietary_restrictions ?? [];
    const current = existing?.excluded_cuisines ?? [];
    const next = current.filter((c) => c !== cuisine);

    return RecipePreferences.upsertPreferences(guildId, userId, {
      dietary_restrictions: restrictions,
      excluded_cuisines: next,
    });
  }
}

export default RecipePreferences;
export { RecipePreferences };
