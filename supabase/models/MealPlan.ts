import supabase from '../supabase';
import type { MealPlanRow, MealPlanInsert, MealPlanUpdate } from '../types';

class MealPlan {
  static async getActivePlan(guildId: string): Promise<MealPlanRow | null> {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('guild_id', guildId)
      .eq('archived', false)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }

  static async upsertPlan(data: {
    recipeIds: number[];
    servingsPerRecipe: number[];
    weekStart: string;
    userId: string;
    guildId: string;
  }): Promise<MealPlanRow> {
    // Archive existing active plan(s)
    const { error: archiveError } = await supabase
      .from('meal_plans')
      .update({ archived: true, updated_at: new Date().toISOString() })
      .eq('guild_id', data.guildId)
      .eq('archived', false);

    if (archiveError) throw archiveError;

    // Insert new plan
    const insert: MealPlanInsert = {
      recipe_ids: data.recipeIds,
      servings_per_recipe: data.servingsPerRecipe,
      week_start: data.weekStart,
      archived: false,
      user_id: data.userId,
      guild_id: data.guildId,
    };

    const { data: row, error } = await supabase.from('meal_plans').insert(insert).select().single();

    if (error) throw error;
    return row;
  }

  static async swapMeal(
    guildId: string,
    slotIndex: number,
    newRecipeId: number,
    newServings: number
  ): Promise<MealPlanRow | null> {
    const active = await MealPlan.getActivePlan(guildId);
    if (!active) return null;
    if (slotIndex < 0 || slotIndex >= active.recipe_ids.length) return null;

    const recipeIds = [...active.recipe_ids];
    const servings = [...active.servings_per_recipe];
    recipeIds[slotIndex] = newRecipeId;
    servings[slotIndex] = newServings;

    const update: MealPlanUpdate = {
      recipe_ids: recipeIds,
      servings_per_recipe: servings,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('meal_plans')
      .update(update)
      .eq('id', active.id)
      .eq('guild_id', guildId)
      .select()
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }

  static async updateServings(
    guildId: string,
    slotIndex: number,
    servings: number
  ): Promise<MealPlanRow | null> {
    const active = await MealPlan.getActivePlan(guildId);
    if (!active) return null;
    if (slotIndex < 0 || slotIndex >= active.servings_per_recipe.length) return null;

    const servingsArr = [...active.servings_per_recipe];
    servingsArr[slotIndex] = servings;

    const update: MealPlanUpdate = {
      servings_per_recipe: servingsArr,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('meal_plans')
      .update(update)
      .eq('id', active.id)
      .eq('guild_id', guildId)
      .select()
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }

  static async getArchivedPlans(guildId: string, limit: number = 10): Promise<MealPlanRow[]> {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('guild_id', guildId)
      .eq('archived', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  static async getPlanById(id: number, guildId: string): Promise<MealPlanRow | null> {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('id', id)
      .eq('guild_id', guildId)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }
}

export default MealPlan;
export { MealPlan };
