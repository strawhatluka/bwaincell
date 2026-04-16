/**
 * Unit Tests: Recipe Model
 *
 * Uses jest.spyOn on static methods (supabase client abstraction happens
 * at the model layer, so we spy at that boundary).
 */

// Mock logger BEFORE imports
jest.mock('../../../shared/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import Recipe from '@database/models/Recipe';
import type { RecipeRow } from '@database/types';

function makeRecipe(overrides: Partial<RecipeRow> = {}): RecipeRow {
  return {
    id: 1,
    name: 'Test Recipe',
    source_url: null,
    source_type: 'manual',
    ingredients: [{ name: 'salt', quantity: 1, unit: 'tsp' }],
    instructions: ['Step 1'],
    servings: 4,
    prep_time_minutes: 10,
    cook_time_minutes: 20,
    nutrition: null,
    cuisine: 'italian',
    difficulty: 'easy',
    dietary_tags: [],
    image_url: null,
    notes: null,
    is_favorite: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_id: 'user-1',
    guild_id: 'guild-1',
    ...overrides,
  };
}

describe('Recipe Model', () => {
  const guildId = 'guild-1';
  const otherGuildId = 'guild-other';

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createRecipe', () => {
    test('returns created recipe', async () => {
      const created = makeRecipe({ id: 42, name: 'New Recipe' });
      jest.spyOn(Recipe, 'createRecipe').mockResolvedValue(created);

      const result = await Recipe.createRecipe({
        name: 'New Recipe',
        ingredients: [{ name: 'salt', quantity: 1, unit: 'tsp' }],
        instructions: ['Step 1'],
        user_id: 'user-1',
        guild_id: guildId,
      });

      expect(result.id).toBe(42);
      expect(result.name).toBe('New Recipe');
    });
  });

  describe('getRecipes', () => {
    test('returns list of recipes', async () => {
      const recipes = [makeRecipe({ id: 1 }), makeRecipe({ id: 2, name: 'Other' })];
      jest.spyOn(Recipe, 'getRecipes').mockResolvedValue(recipes);

      const result = await Recipe.getRecipes(guildId);
      expect(result).toHaveLength(2);
    });

    test('filters by guild_id', async () => {
      const spy = jest.spyOn(Recipe, 'getRecipes').mockResolvedValue([]);
      await Recipe.getRecipes(otherGuildId);
      expect(spy).toHaveBeenCalledWith(otherGuildId);
    });
  });

  describe('getRecipe', () => {
    test('returns recipe when found', async () => {
      jest.spyOn(Recipe, 'getRecipe').mockResolvedValue(makeRecipe({ id: 10 }));
      const result = await Recipe.getRecipe(10, guildId);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(10);
    });

    test('returns null when not found', async () => {
      jest.spyOn(Recipe, 'getRecipe').mockResolvedValue(null);
      const result = await Recipe.getRecipe(999, guildId);
      expect(result).toBeNull();
    });
  });

  describe('updateRecipe', () => {
    test('returns updated recipe on success', async () => {
      jest.spyOn(Recipe, 'updateRecipe').mockResolvedValue(makeRecipe({ id: 1, name: 'Updated' }));
      const result = await Recipe.updateRecipe(1, guildId, { name: 'Updated' });
      expect(result!.name).toBe('Updated');
    });

    test('returns null when not found', async () => {
      jest.spyOn(Recipe, 'updateRecipe').mockResolvedValue(null);
      const result = await Recipe.updateRecipe(999, guildId, { name: 'x' });
      expect(result).toBeNull();
    });
  });

  describe('deleteRecipe', () => {
    test('returns true when deleted', async () => {
      jest.spyOn(Recipe, 'deleteRecipe').mockResolvedValue(true);
      expect(await Recipe.deleteRecipe(1, guildId)).toBe(true);
    });

    test('returns false when not found', async () => {
      jest.spyOn(Recipe, 'deleteRecipe').mockResolvedValue(false);
      expect(await Recipe.deleteRecipe(999, guildId)).toBe(false);
    });
  });

  describe('searchByName', () => {
    test('returns matches', async () => {
      jest.spyOn(Recipe, 'searchByName').mockResolvedValue([makeRecipe({ name: 'Chicken Soup' })]);
      const result = await Recipe.searchByName(guildId, 'chicken');
      expect(result).toHaveLength(1);
    });

    test('returns empty when no matches', async () => {
      jest.spyOn(Recipe, 'searchByName').mockResolvedValue([]);
      const result = await Recipe.searchByName(guildId, 'nothing');
      expect(result).toHaveLength(0);
    });
  });

  describe('searchByFilters', () => {
    test('filters by cuisine', async () => {
      const spy = jest
        .spyOn(Recipe, 'searchByFilters')
        .mockResolvedValue([makeRecipe({ cuisine: 'italian' })]);
      const result = await Recipe.searchByFilters(guildId, { cuisine: 'italian' });
      expect(spy).toHaveBeenCalledWith(guildId, { cuisine: 'italian' });
      expect(result).toHaveLength(1);
    });

    test('filters by difficulty', async () => {
      const spy = jest
        .spyOn(Recipe, 'searchByFilters')
        .mockResolvedValue([makeRecipe({ difficulty: 'hard' })]);
      await Recipe.searchByFilters(guildId, { difficulty: 'hard' });
      expect(spy).toHaveBeenCalledWith(guildId, { difficulty: 'hard' });
    });

    test('filters by tag', async () => {
      const spy = jest.spyOn(Recipe, 'searchByFilters').mockResolvedValue([]);
      await Recipe.searchByFilters(guildId, { tag: 'vegan' });
      expect(spy).toHaveBeenCalledWith(guildId, { tag: 'vegan' });
    });

    test('filters by keyword', async () => {
      const spy = jest.spyOn(Recipe, 'searchByFilters').mockResolvedValue([]);
      await Recipe.searchByFilters(guildId, { keyword: 'pasta' });
      expect(spy).toHaveBeenCalledWith(guildId, { keyword: 'pasta' });
    });

    test('filters by maxPrepTime', async () => {
      const spy = jest.spyOn(Recipe, 'searchByFilters').mockResolvedValue([]);
      await Recipe.searchByFilters(guildId, { maxPrepTime: 30 });
      expect(spy).toHaveBeenCalledWith(guildId, { maxPrepTime: 30 });
    });

    test('handles multiple filters combined', async () => {
      const spy = jest.spyOn(Recipe, 'searchByFilters').mockResolvedValue([]);
      const filters = { cuisine: 'italian', difficulty: 'easy' as const, maxPrepTime: 15 };
      await Recipe.searchByFilters(guildId, filters);
      expect(spy).toHaveBeenCalledWith(guildId, filters);
    });

    test('handles empty filter object', async () => {
      jest.spyOn(Recipe, 'searchByFilters').mockResolvedValue([]);
      const result = await Recipe.searchByFilters(guildId, {});
      expect(result).toHaveLength(0);
    });
  });

  describe('toggleFavorite', () => {
    test('flips false → true', async () => {
      jest
        .spyOn(Recipe, 'toggleFavorite')
        .mockResolvedValue(makeRecipe({ id: 1, is_favorite: true }));
      const result = await Recipe.toggleFavorite(1, guildId);
      expect(result!.is_favorite).toBe(true);
    });

    test('flips true → false', async () => {
      jest
        .spyOn(Recipe, 'toggleFavorite')
        .mockResolvedValue(makeRecipe({ id: 1, is_favorite: false }));
      const result = await Recipe.toggleFavorite(1, guildId);
      expect(result!.is_favorite).toBe(false);
    });

    test('returns null when not found', async () => {
      jest.spyOn(Recipe, 'toggleFavorite').mockResolvedValue(null);
      const result = await Recipe.toggleFavorite(999, guildId);
      expect(result).toBeNull();
    });
  });

  describe('getFavorites', () => {
    test('returns only favorites', async () => {
      jest.spyOn(Recipe, 'getFavorites').mockResolvedValue([makeRecipe({ is_favorite: true })]);
      const result = await Recipe.getFavorites(guildId);
      expect(result.every((r) => r.is_favorite)).toBe(true);
    });
  });

  describe('getRandom', () => {
    test('returns one recipe', async () => {
      jest.spyOn(Recipe, 'getRandom').mockResolvedValue(makeRecipe({ id: 7 }));
      const result = await Recipe.getRandom(guildId);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(7);
    });

    test('returns null when no recipes', async () => {
      jest.spyOn(Recipe, 'getRandom').mockResolvedValue(null);
      const result = await Recipe.getRandom(guildId);
      expect(result).toBeNull();
    });
  });
});
