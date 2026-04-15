/**
 * Unit tests for /recipe slash command
 */

// Mocks BEFORE imports
jest.mock('../../../shared/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../../supabase/models/Recipe', () => ({
  __esModule: true,
  default: {
    createRecipe: jest.fn(),
    getRecipes: jest.fn(),
    getRecipe: jest.fn(),
    updateRecipe: jest.fn(),
    deleteRecipe: jest.fn(),
    searchByName: jest.fn(),
    searchByFilters: jest.fn(),
    toggleFavorite: jest.fn(),
    getFavorites: jest.fn(),
    getRandom: jest.fn(),
  },
}));

jest.mock('../../../../supabase/models/MealPlan', () => ({
  __esModule: true,
  default: {
    getActivePlan: jest.fn(),
    upsertPlan: jest.fn(),
    swapMeal: jest.fn(),
    updateServings: jest.fn(),
    getArchivedPlans: jest.fn(),
    getPlanById: jest.fn(),
  },
}));

jest.mock('../../../../supabase/models/RecipePreferences', () => ({
  __esModule: true,
  default: {
    getPreferences: jest.fn(),
    upsertPreferences: jest.fn(),
    addDietaryRestriction: jest.fn(),
    removeDietaryRestriction: jest.fn(),
    addExcludedCuisine: jest.fn(),
    removeExcludedCuisine: jest.fn(),
  },
}));

jest.mock('../../../utils/geminiService', () => ({
  __esModule: true,
  GeminiService: {
    parseRecipeFromUrl: jest.fn(),
    parseRecipeFromFile: jest.fn(),
    suggestDietaryTags: jest.fn(),
    researchMissingFields: jest.fn().mockResolvedValue({}),
  },
}));

// Mock the ingestion orchestrator so existing /recipe add tests continue to
// drive behavior via GeminiService.parseRecipeFromUrl / parseRecipeFromFile mocks.
// The orchestrator internally scrapes + calls Gemini; here we short-circuit
// to delegate to the Gemini mock (looked up at call time via require) and build
// a plausible IngestionResult.
jest.mock('../../../utils/recipeIngestion', () => {
  return {
    __esModule: true,
    summarizeProvenance: () => ({
      sourceCount: 0,
      researchedCount: 2,
      unknownCount: 0,
      researchedFields: ['name', 'ingredients'],
    }),
    ingestRecipeFromUrl: jest.fn(async (url: string) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { GeminiService } = require('../../../utils/geminiService');
      const parsed = await GeminiService.parseRecipeFromUrl(url);
      return {
        recipe: { ...parsed, dietary_tags: [] },
        provenance: { name: 'researched', ingredients: 'researched' },
        pass1Source: 'gemini-url',
        researchRan: false,
      };
    }),
    ingestRecipeFromFile: jest.fn(async (buf: Buffer, mime: string, name: string) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { GeminiService } = require('../../../utils/geminiService');
      const parsed = await GeminiService.parseRecipeFromFile(buf, mime, name);
      return {
        recipe: { ...parsed, dietary_tags: [] },
        provenance: { name: 'researched', ingredients: 'researched' },
        pass1Source: 'gemini-file',
        researchRan: false,
      };
    }),
  };
});

// Mock global fetch for file-mode add
const mockFetch = jest.fn().mockResolvedValue({
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(4)),
});
(globalThis as any).fetch = mockFetch;

import recipeCommand, {
  planSessions,
  getWeekStart,
  planSessionKey,
  scaleIngredient,
  sanitizeFilename,
} from '../../../commands/recipe';
import Recipe from '../../../../supabase/models/Recipe';
import MealPlan from '../../../../supabase/models/MealPlan';
import RecipePreferences from '../../../../supabase/models/RecipePreferences';
import { GeminiService } from '../../../utils/geminiService';
import type { RecipeRow } from '../../../../supabase/types';
import { ChatInputCommandInteraction } from 'discord.js';

function makeRecipe(o: Partial<RecipeRow> = {}): RecipeRow {
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
    ...o,
  };
}

describe('/recipe Slash Command', () => {
  let mockInteraction: any;

  beforeEach(() => {
    jest.clearAllMocks();
    planSessions.clear();

    mockInteraction = {
      user: { id: 'user-1' },
      guild: { id: 'guild-1' },
      guildId: 'guild-1',
      replied: false,
      deferred: true,
      commandName: 'recipe',
      options: {
        getSubcommand: jest.fn(),
        getString: jest.fn().mockReturnValue(null),
        getInteger: jest.fn().mockReturnValue(null),
        getAttachment: jest.fn().mockReturnValue(null),
      },
      deferReply: jest.fn().mockResolvedValue({}),
      reply: jest.fn().mockResolvedValue({}),
      editReply: jest.fn().mockResolvedValue({}),
      followUp: jest.fn().mockResolvedValue({}),
    };
  });

  describe('Command Configuration', () => {
    it('has correct name and description', () => {
      expect(recipeCommand.data.name).toBe('recipe');
      expect(recipeCommand.data.description).toContain('recipes');
    });

    it('has execute and autocomplete', () => {
      expect(typeof recipeCommand.execute).toBe('function');
      expect(typeof recipeCommand.autocomplete).toBe('function');
    });
  });

  describe('guild check', () => {
    it('errors when not in a guild', async () => {
      mockInteraction.guild = null;
      mockInteraction.options.getSubcommand.mockReturnValue('random');
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('server') })
      );
    });
  });

  describe('Subcommand: add', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('add');
    });

    it('creates recipe from link', async () => {
      mockInteraction.options.getString.mockImplementation((n: string) =>
        n === 'link' ? 'https://example.com/recipe' : null
      );
      (GeminiService.parseRecipeFromUrl as jest.Mock).mockResolvedValue({
        name: 'Pasta',
        ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
        instructions: ['Mix'],
        servings: 4,
        prep_time_minutes: 10,
        cook_time_minutes: 15,
        nutrition: null,
        cuisine: 'italian',
        difficulty: 'easy',
        image_url: null,
      });
      (GeminiService.suggestDietaryTags as jest.Mock).mockResolvedValue(['vegetarian']);
      (Recipe.searchByName as jest.Mock).mockResolvedValue([]);
      (Recipe.createRecipe as jest.Mock).mockResolvedValue(makeRecipe({ id: 5, name: 'Pasta' }));

      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(GeminiService.parseRecipeFromUrl).toHaveBeenCalledWith('https://example.com/recipe');
      expect(Recipe.createRecipe).toHaveBeenCalled();
    });

    it('handles parse failure', async () => {
      mockInteraction.options.getString.mockImplementation((n: string) =>
        n === 'link' ? 'https://example.com' : null
      );
      (GeminiService.parseRecipeFromUrl as jest.Mock).mockRejectedValue(new Error('parse failed'));
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(mockInteraction.editReply).toHaveBeenLastCalledWith(
        expect.objectContaining({ content: expect.stringContaining('Failed to parse') })
      );
    });

    it('appends "(2)" suffix for duplicate names', async () => {
      mockInteraction.options.getString.mockImplementation((n: string) =>
        n === 'link' ? 'https://example.com' : null
      );
      (GeminiService.parseRecipeFromUrl as jest.Mock).mockResolvedValue({
        name: 'Pasta',
        ingredients: [],
        instructions: [],
        servings: null,
        prep_time_minutes: null,
        cook_time_minutes: null,
        nutrition: null,
        cuisine: null,
        difficulty: null,
        image_url: null,
      });
      (GeminiService.suggestDietaryTags as jest.Mock).mockResolvedValue([]);
      (Recipe.searchByName as jest.Mock).mockResolvedValue([makeRecipe({ name: 'Pasta' })]);
      (Recipe.createRecipe as jest.Mock).mockImplementation(async (data: any) =>
        makeRecipe({ id: 10, name: data.name })
      );

      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const createCall = (Recipe.createRecipe as jest.Mock).mock.calls[0][0];
      expect(createCall.name).toBe('Pasta (2)');
    });
  });

  describe('Subcommand: view', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('view');
    });

    it('errors when recipe not found', async () => {
      mockInteraction.options.getString.mockReturnValue('999');
      mockInteraction.options.getInteger.mockReturnValue(2);
      (Recipe.getRecipe as jest.Mock).mockResolvedValue(null);
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('not found') })
      );
    });

    it('scales ingredients and sends markdown attachment', async () => {
      mockInteraction.options.getString.mockReturnValue('1');
      mockInteraction.options.getInteger.mockReturnValue(2);
      (Recipe.getRecipe as jest.Mock).mockResolvedValue(
        makeRecipe({
          id: 1,
          servings: 4,
          ingredients: [{ name: 'flour', quantity: 4, unit: 'cup' }],
        })
      );
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      const call = mockInteraction.editReply.mock.calls.at(-1)[0];
      expect(call.files).toBeDefined();
      expect(call.files.length).toBe(1);
    });

    it('errors for non-finite recipe id', async () => {
      mockInteraction.options.getString.mockReturnValue('not-a-number');
      mockInteraction.options.getInteger.mockReturnValue(2);
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('not found') })
      );
    });

    it('renders all optional sections (dietary_tags, nutrition, notes, source_url)', async () => {
      mockInteraction.options.getString.mockReturnValue('1');
      mockInteraction.options.getInteger.mockReturnValue(4);
      (Recipe.getRecipe as jest.Mock).mockResolvedValue(
        makeRecipe({
          id: 1,
          servings: null, // triggers null-servings branch
          ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
          dietary_tags: ['vegan', 'gluten-free'],
          nutrition: {
            calories: 500,
            protein: 30,
            carbs: 40,
            fat: 20,
            fiber: 5,
            sugar: 10,
            sodium: 600,
          },
          notes: 'Best served warm.',
          source_url: 'https://example.com/r',
          image_url: 'https://example.com/img.jpg',
        })
      );
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      const call = mockInteraction.editReply.mock.calls.at(-1)[0];
      expect(call.files).toBeDefined();
    });
  });

  describe('Subcommand: delete', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('delete');
    });

    it('errors when recipe not found', async () => {
      mockInteraction.options.getString.mockReturnValue('999');
      (Recipe.getRecipe as jest.Mock).mockResolvedValue(null);
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('not found') })
      );
    });

    it('shows confirmation buttons when found', async () => {
      mockInteraction.options.getString.mockReturnValue('1');
      (Recipe.getRecipe as jest.Mock).mockResolvedValue(makeRecipe());
      (MealPlan.getActivePlan as jest.Mock).mockResolvedValue(null);
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      const call = mockInteraction.editReply.mock.calls.at(-1)[0];
      expect(call.components).toBeDefined();
      expect(call.components.length).toBe(1);
    });

    it('warns when recipe is in active plan', async () => {
      mockInteraction.options.getString.mockReturnValue('1');
      (Recipe.getRecipe as jest.Mock).mockResolvedValue(makeRecipe({ id: 1 }));
      (MealPlan.getActivePlan as jest.Mock).mockResolvedValue({
        id: 99,
        recipe_ids: [1, 2, 3, 4, 5, 6, 7],
        servings_per_recipe: [2, 2, 2, 2, 2, 2, 2],
      });
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      const call = mockInteraction.editReply.mock.calls.at(-1)[0];
      expect(JSON.stringify(call.embeds[0])).toContain('Warning');
    });
  });

  describe('Subcommand: edit', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('edit');
    });

    it('errors when recipe not found', async () => {
      mockInteraction.options.getString.mockReturnValue('999');
      (Recipe.getRecipe as jest.Mock).mockResolvedValue(null);
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('not found') })
      );
    });

    it('shows field select menu', async () => {
      mockInteraction.options.getString.mockReturnValue('1');
      (Recipe.getRecipe as jest.Mock).mockResolvedValue(makeRecipe());
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      const call = mockInteraction.editReply.mock.calls.at(-1)[0];
      expect(call.components).toBeDefined();
    });
  });

  describe('Subcommand: search', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('search');
    });

    it('errors when no filters provided', async () => {
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(mockInteraction.editReply).toHaveBeenLastCalledWith(
        expect.objectContaining({ content: expect.stringContaining('at least one') })
      );
    });

    it('returns results with filters', async () => {
      mockInteraction.options.getString.mockImplementation((n: string) =>
        n === 'cuisine' ? 'italian' : null
      );
      (Recipe.searchByFilters as jest.Mock).mockResolvedValue([makeRecipe()]);
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      const call = mockInteraction.editReply.mock.calls.at(-1)[0];
      expect(call.embeds).toBeDefined();
    });

    it('shows empty-state embed when no results', async () => {
      mockInteraction.options.getString.mockImplementation((n: string) =>
        n === 'cuisine' ? 'french' : null
      );
      (Recipe.searchByFilters as jest.Mock).mockResolvedValue([]);
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      const call = mockInteraction.editReply.mock.calls.at(-1)[0];
      expect(JSON.stringify(call.embeds[0])).toContain('No recipes match');
    });
  });

  describe('Subcommand: favorite', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('favorite');
    });

    it('toggles and reports success', async () => {
      mockInteraction.options.getString.mockReturnValue('1');
      (Recipe.toggleFavorite as jest.Mock).mockResolvedValue(makeRecipe({ is_favorite: true }));
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      const call = mockInteraction.editReply.mock.calls.at(-1)[0];
      expect(JSON.stringify(call.embeds[0])).toContain('added to favorites');
    });

    it('errors when not found', async () => {
      mockInteraction.options.getString.mockReturnValue('999');
      (Recipe.toggleFavorite as jest.Mock).mockResolvedValue(null);
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('not found') })
      );
    });
  });

  describe('Subcommand: plan', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('plan');
    });

    it('errors when fewer than 7 recipes', async () => {
      (Recipe.getRecipes as jest.Mock).mockResolvedValue([makeRecipe(), makeRecipe({ id: 2 })]);
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(mockInteraction.editReply).toHaveBeenLastCalledWith(
        expect.objectContaining({ content: expect.stringContaining('at least 7 recipes') })
      );
    });

    it('shows mode buttons when 7+ recipes exist', async () => {
      const recipes = Array.from({ length: 7 }, (_, i) => makeRecipe({ id: i + 1 }));
      (Recipe.getRecipes as jest.Mock).mockResolvedValue(recipes);
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      const call = mockInteraction.editReply.mock.calls.at(-1)[0];
      expect(call.components).toBeDefined();
      expect(planSessions.get(planSessionKey('guild-1', 'user-1'))).toBeDefined();
    });
  });

  describe('Subcommand: swap', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('swap');
      mockInteraction.options.getInteger.mockReturnValue(1);
    });

    it('errors when no active plan', async () => {
      (MealPlan.getActivePlan as jest.Mock).mockResolvedValue(null);
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(mockInteraction.editReply).toHaveBeenLastCalledWith(
        expect.objectContaining({ content: expect.stringContaining('No active meal plan') })
      );
    });

    it('shows select menu for swap', async () => {
      (MealPlan.getActivePlan as jest.Mock).mockResolvedValue({
        id: 1,
        recipe_ids: [1, 2, 3, 4, 5, 6, 7],
        servings_per_recipe: [2, 2, 2, 2, 2, 2, 2],
      });
      (Recipe.getRecipe as jest.Mock).mockResolvedValue(makeRecipe());
      (Recipe.getRecipes as jest.Mock).mockResolvedValue([makeRecipe(), makeRecipe({ id: 2 })]);
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      const call = mockInteraction.editReply.mock.calls.at(-1)[0];
      expect(call.components).toBeDefined();
    });
  });

  describe('Subcommand: week', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('week');
    });

    it('errors when no active plan', async () => {
      (MealPlan.getActivePlan as jest.Mock).mockResolvedValue(null);
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(mockInteraction.editReply).toHaveBeenLastCalledWith(
        expect.objectContaining({ content: expect.stringContaining('No active meal plan') })
      );
    });

    it('shows active plan', async () => {
      (MealPlan.getActivePlan as jest.Mock).mockResolvedValue({
        id: 1,
        recipe_ids: [1, 2, 3, 4, 5, 6, 7],
        servings_per_recipe: [2, 2, 2, 2, 2, 2, 2],
        week_start: '2024-01-01',
      });
      (Recipe.getRecipe as jest.Mock).mockResolvedValue(makeRecipe());
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      const call = mockInteraction.editReply.mock.calls.at(-1)[0];
      expect(call.embeds).toBeDefined();
    });
  });

  describe('Subcommand: history', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('history');
    });

    it('shows empty state when no archived plans', async () => {
      (MealPlan.getArchivedPlans as jest.Mock).mockResolvedValue([]);
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(mockInteraction.editReply).toHaveBeenLastCalledWith(
        expect.objectContaining({ content: expect.stringContaining('No archived') })
      );
    });

    it('shows list when archived plans exist', async () => {
      (MealPlan.getArchivedPlans as jest.Mock).mockResolvedValue([
        {
          id: 1,
          recipe_ids: [1],
          servings_per_recipe: [1],
          week_start: '2023-12-25',
          archived: true,
          created_at: '2023-12-25T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]);
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      const call = mockInteraction.editReply.mock.calls.at(-1)[0];
      expect(call.components).toBeDefined();
    });
  });

  describe('Subcommand: preferences', () => {
    beforeEach(() => {
      mockInteraction.options.getSubcommand.mockReturnValue('preferences');
    });

    it('view: empty shows friendly message', async () => {
      mockInteraction.options.getString.mockImplementation((n: string) =>
        n === 'action' ? 'view' : null
      );
      (RecipePreferences.getPreferences as jest.Mock).mockResolvedValue(null);
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(mockInteraction.editReply).toHaveBeenLastCalledWith(
        expect.objectContaining({ content: expect.stringContaining('No preferences set') })
      );
    });

    it('view: populated shows embed', async () => {
      mockInteraction.options.getString.mockImplementation((n: string) =>
        n === 'action' ? 'view' : null
      );
      (RecipePreferences.getPreferences as jest.Mock).mockResolvedValue({
        id: 1,
        guild_id: 'guild-1',
        user_id: 'user-1',
        dietary_restrictions: ['vegan'],
        excluded_cuisines: ['thai'],
        created_at: 'x',
        updated_at: 'x',
      });
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      const call = mockInteraction.editReply.mock.calls.at(-1)[0];
      expect(call.embeds).toBeDefined();
    });

    it('add_restriction without value errors', async () => {
      mockInteraction.options.getString.mockImplementation((n: string) =>
        n === 'action' ? 'add_restriction' : null
      );
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      const call = mockInteraction.editReply.mock.calls.at(-1)[0];
      expect(JSON.stringify(call.embeds[0])).toContain('Provide a');
    });

    it('add_restriction with value calls model', async () => {
      mockInteraction.options.getString.mockImplementation((n: string) => {
        if (n === 'action') return 'add_restriction';
        if (n === 'value') return 'vegan';
        return null;
      });
      (RecipePreferences.addDietaryRestriction as jest.Mock).mockResolvedValue({});
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(RecipePreferences.addDietaryRestriction).toHaveBeenCalledWith(
        'guild-1',
        'user-1',
        'vegan'
      );
    });

    it('remove_restriction calls model', async () => {
      mockInteraction.options.getString.mockImplementation((n: string) => {
        if (n === 'action') return 'remove_restriction';
        if (n === 'value') return 'vegan';
        return null;
      });
      (RecipePreferences.removeDietaryRestriction as jest.Mock).mockResolvedValue({});
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(RecipePreferences.removeDietaryRestriction).toHaveBeenCalled();
    });

    it('add_exclusion calls model', async () => {
      mockInteraction.options.getString.mockImplementation((n: string) => {
        if (n === 'action') return 'add_exclusion';
        if (n === 'value') return 'thai';
        return null;
      });
      (RecipePreferences.addExcludedCuisine as jest.Mock).mockResolvedValue({});
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(RecipePreferences.addExcludedCuisine).toHaveBeenCalled();
    });

    it('remove_exclusion calls model', async () => {
      mockInteraction.options.getString.mockImplementation((n: string) => {
        if (n === 'action') return 'remove_exclusion';
        if (n === 'value') return 'thai';
        return null;
      });
      (RecipePreferences.removeExcludedCuisine as jest.Mock).mockResolvedValue({});
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(RecipePreferences.removeExcludedCuisine).toHaveBeenCalled();
    });

    it('clear calls upsert with empty arrays', async () => {
      mockInteraction.options.getString.mockImplementation((n: string) =>
        n === 'action' ? 'clear' : null
      );
      (RecipePreferences.upsertPreferences as jest.Mock).mockResolvedValue({});
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(RecipePreferences.upsertPreferences).toHaveBeenCalledWith('guild-1', 'user-1', {
        dietary_restrictions: [],
        excluded_cuisines: [],
      });
    });
  });

  describe('Unknown subcommand + preferences error', () => {
    it('unknown subcommand falls through to default editReply', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('bogus');
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('Unknown subcommand') })
      );
    });

    it('preferences: unknown action produces error embed', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('preferences');
      mockInteraction.options.getString.mockImplementation((n: string) => {
        if (n === 'action') return 'mystery';
        if (n === 'value') return 'something';
        return null;
      });
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      const call = mockInteraction.editReply.mock.calls.at(-1)[0];
      expect(JSON.stringify(call.embeds[0])).toContain('Unknown preference');
    });

    it('preferences: missing value for add_restriction produces error', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('preferences');
      mockInteraction.options.getString.mockImplementation((n: string) =>
        n === 'action' ? 'add_restriction' : null
      );
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      const call = mockInteraction.editReply.mock.calls.at(-1)[0];
      expect(JSON.stringify(call.embeds[0])).toContain('Provide a');
    });
  });

  describe('Error handling', () => {
    it('catches model errors and replies gracefully', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('favorite');
      mockInteraction.options.getString.mockReturnValue('1');
      (Recipe.toggleFavorite as jest.Mock).mockRejectedValue(new Error('db down'));
      await recipeCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('error occurred') })
      );
    });
  });

  describe('helpers', () => {
    it('getWeekStart returns YYYY-MM-DD', () => {
      const result = getWeekStart();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('planSessionKey format', () => {
      expect(planSessionKey('g', 'u')).toBe('g:u');
    });
  });

  describe('autocomplete', () => {
    it('returns matching choices', async () => {
      const ac: any = {
        guild: { id: 'guild-1' },
        options: {
          getFocused: jest.fn().mockReturnValue({ name: 'recipe', value: 'past' }),
          getSubcommand: jest.fn().mockReturnValue('view'),
        },
        respond: jest.fn().mockResolvedValue(undefined),
      };
      (Recipe.getRecipes as jest.Mock).mockResolvedValue([
        makeRecipe({ id: 1, name: 'Pasta', is_favorite: true }),
        makeRecipe({ id: 2, name: 'Soup' }),
      ]);
      await recipeCommand.autocomplete(ac);
      expect(ac.respond).toHaveBeenCalled();
      const choices = ac.respond.mock.calls[0][0];
      expect(choices.length).toBeGreaterThan(0);
      expect(choices[0].name).toContain('Pasta');
    });

    it('responds empty when no guild', async () => {
      const ac: any = {
        guild: null,
        options: { getFocused: jest.fn(), getSubcommand: jest.fn() },
        respond: jest.fn().mockResolvedValue(undefined),
      };
      await recipeCommand.autocomplete(ac);
      expect(ac.respond).toHaveBeenCalledWith([]);
    });

    it('responds empty for non-matching subcommand', async () => {
      const ac: any = {
        guild: { id: 'guild-1' },
        options: {
          getFocused: jest.fn().mockReturnValue({ name: 'recipe', value: '' }),
          getSubcommand: jest.fn().mockReturnValue('random'),
        },
        respond: jest.fn().mockResolvedValue(undefined),
      };
      await recipeCommand.autocomplete(ac);
      expect(ac.respond).toHaveBeenCalledWith([]);
    });

    it('responds empty when focused field is not "recipe"', async () => {
      const ac: any = {
        guild: { id: 'guild-1' },
        options: {
          getFocused: jest.fn().mockReturnValue({ name: 'cuisine', value: 'ita' }),
          getSubcommand: jest.fn().mockReturnValue('view'),
        },
        respond: jest.fn().mockResolvedValue(undefined),
      };
      await recipeCommand.autocomplete(ac);
      expect(ac.respond).toHaveBeenCalledWith([]);
    });
  });

  describe('exported helpers (scaleIngredient, sanitizeFilename)', () => {
    it('scaleIngredient halves a numeric quantity when scale=0.5', () => {
      const line = scaleIngredient({ name: 'flour', quantity: 2, unit: 'cup' }, 0.5);
      expect(line).toContain('1');
      expect(line).toContain('cup');
      expect(line).toContain('flour');
    });

    it('scaleIngredient parses fraction-string quantity and scales', () => {
      const line = scaleIngredient({ name: 'salt', quantity: '1/2', unit: 'tsp' }, 2);
      expect(line).toContain('1 tsp salt');
    });

    it('scaleIngredient parses mixed fraction quantity', () => {
      const line = scaleIngredient({ name: 'milk', quantity: '1 1/2', unit: 'cup' }, 2);
      expect(line).toContain('3 cup milk');
    });

    it('scaleIngredient marks unparseable quantity as unscaled', () => {
      const line = scaleIngredient({ name: 'salt', quantity: 'to taste', unit: '' }, 2);
      expect(line).toContain('unscaled');
    });

    it('scaleIngredient rounds count-unit values up to whole numbers', () => {
      const line = scaleIngredient({ name: 'eggs', quantity: 1, unit: '' }, 2.5);
      expect(line).toMatch(/3 eggs/);
    });

    it('scaleIngredient handles empty/missing quantity', () => {
      const line = scaleIngredient({ name: 'pepper', quantity: '', unit: '' }, 2);
      expect(line).toContain('pepper');
    });

    it('sanitizeFilename lowercases and hyphenates', () => {
      expect(sanitizeFilename('Chicken Noodle Soup!')).toBe('chicken-noodle-soup');
    });

    it('sanitizeFilename strips special chars and collapses dashes', () => {
      expect(sanitizeFilename('!!! Pasta --- Verde ???')).toBe('pasta-verde');
    });

    it('sanitizeFilename returns "recipe" for input with no valid chars', () => {
      expect(sanitizeFilename('!!!')).toBe('recipe');
    });
  });
});
