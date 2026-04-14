/**
 * Unit Tests: Recipe Interaction Handlers (non-plan flows)
 *
 * Covers button, select-menu, and modal dispatch for the recipe commands
 * outside the `/recipe plan` flow: view-full, delete confirm/cancel,
 * edit field → modal, edit modal submit, swap meal, week select, history select.
 *
 * Regression guard: plan-flow customIds still route correctly after
 * the dispatcher prefix was broadened from `recipe_plan_` to `recipe_`.
 */

jest.mock('../../../../shared/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockRecipe = {
  getRecipe: jest.fn(),
  getRecipes: jest.fn(),
  updateRecipe: jest.fn(),
  deleteRecipe: jest.fn(),
};
jest.mock('../../../../../supabase/models/Recipe', () => ({
  __esModule: true,
  default: mockRecipe,
}));

const mockMealPlan = {
  getActivePlan: jest.fn(),
  getPlanById: jest.fn(),
  swapMeal: jest.fn(),
  upsertPlan: jest.fn(),
};
jest.mock('../../../../../supabase/models/MealPlan', () => ({
  __esModule: true,
  default: mockMealPlan,
}));

jest.mock('../../../../../supabase/models/RecipePreferences', () => ({
  __esModule: true,
  default: { getPreferences: jest.fn() },
}));

jest.mock('../../../../utils/geminiService', () => ({
  __esModule: true,
  GeminiService: { selectMealsForPlan: jest.fn() },
}));

jest.mock('../../../../utils/shoppingList', () => ({
  __esModule: true,
  generateShoppingList: jest.fn(() => ({
    markdown: '# Shopping List\n- eggs',
    nutrition: {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      totalFiber: 0,
    },
  })),
}));

import {
  handleRecipeButton,
  handleRecipeSelect,
  handleRecipeModal,
} from '../../../../utils/interactions/handlers/recipeHandlers';

function makeRecipeRow(o: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Test Recipe',
    ingredients: [{ name: 'egg', quantity: 2, unit: '' }],
    instructions: ['Cook it'],
    servings: 2,
    prep_time_minutes: 5,
    cook_time_minutes: 10,
    cuisine: 'italian',
    difficulty: 'easy',
    dietary_tags: [],
    notes: null,
    image_url: null,
    source_url: null,
    source_type: 'manual',
    nutrition: null,
    is_favorite: false,
    user_id: 'u1',
    guild_id: 'guild-123',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...o,
  };
}

function makeButtonInteraction(customId: string, overrides: Record<string, unknown> = {}) {
  return {
    customId,
    user: { id: 'user-1' },
    guild: { id: 'guild-123' },
    deferred: true,
    replied: false,
    editReply: jest.fn().mockResolvedValue(undefined),
    reply: jest.fn().mockResolvedValue(undefined),
    followUp: jest.fn().mockResolvedValue(undefined),
    showModal: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any;
}

function makeSelectInteraction(
  customId: string,
  values: string[],
  overrides: Record<string, unknown> = {}
) {
  return {
    ...makeButtonInteraction(customId, overrides),
    values,
  } as any;
}

function makeModalInteraction(
  customId: string,
  fieldValue: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    ...makeButtonInteraction(customId, overrides),
    fields: {
      getTextInputValue: jest.fn().mockReturnValue(fieldValue),
    },
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Recipe button dispatcher', () => {
  it('routes recipe_view_full_{id} and attaches full-recipe markdown', async () => {
    mockRecipe.getRecipe.mockResolvedValue(makeRecipeRow({ id: 42, name: 'Spaghetti' }));

    const interaction = makeButtonInteraction('recipe_view_full_42');
    await handleRecipeButton(interaction);

    expect(mockRecipe.getRecipe).toHaveBeenCalledWith(42, 'guild-123');
    expect(interaction.editReply).toHaveBeenCalledTimes(1);
    const call = interaction.editReply.mock.calls[0][0];
    expect(call.files).toHaveLength(1);
    expect(call.embeds[0].data.title).toContain('Spaghetti');
  });

  it('routes recipe_delete_confirm_{id} and calls Recipe.deleteRecipe with guildId', async () => {
    mockRecipe.getRecipe.mockResolvedValue(makeRecipeRow({ id: 7, name: 'Pasta' }));
    mockRecipe.deleteRecipe.mockResolvedValue(true);

    const interaction = makeButtonInteraction('recipe_delete_confirm_7');
    await handleRecipeButton(interaction);

    expect(mockRecipe.deleteRecipe).toHaveBeenCalledWith(7, 'guild-123');
    const call = interaction.editReply.mock.calls[0][0];
    expect(call.embeds[0].data.title).toContain('Deleted');
    expect(call.components).toEqual([]);
  });

  it('routes recipe_delete_confirm_{id} and reports not-found without deleting', async () => {
    mockRecipe.getRecipe.mockResolvedValue(null);

    const interaction = makeButtonInteraction('recipe_delete_confirm_99');
    await handleRecipeButton(interaction);

    expect(mockRecipe.deleteRecipe).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('not found') })
    );
  });

  it('routes recipe_delete_cancel without touching models', async () => {
    const interaction = makeButtonInteraction('recipe_delete_cancel');
    await handleRecipeButton(interaction);

    expect(mockRecipe.deleteRecipe).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Cancelled') })
    );
  });

  it('does NOT warn for the previously-unhandled recipe_delete_confirm_1 (regression for bug report)', async () => {
    mockRecipe.getRecipe.mockResolvedValue(makeRecipeRow({ id: 1 }));
    mockRecipe.deleteRecipe.mockResolvedValue(true);
    const { logger } = jest.requireMock('../../../../shared/utils/logger');

    const interaction = makeButtonInteraction('recipe_delete_confirm_1');
    await handleRecipeButton(interaction);

    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe('Recipe select-menu dispatcher', () => {
  it('routes recipe_edit_field_{id} and opens an edit modal with current value', async () => {
    mockRecipe.getRecipe.mockResolvedValue(makeRecipeRow({ id: 3, name: 'Tacos' }));

    const interaction = makeSelectInteraction('recipe_edit_field_3', ['name'], {
      deferred: false,
    });
    await handleRecipeSelect(interaction);

    expect(interaction.showModal).toHaveBeenCalledTimes(1);
    const modal = interaction.showModal.mock.calls[0][0];
    expect(modal.data.custom_id).toBe('recipe_edit_modal_3_name');
  });

  it('routes recipe_swap_select_{slot} and updates meal plan', async () => {
    mockMealPlan.getActivePlan.mockResolvedValue({
      id: 1,
      recipe_ids: [1, 2, 3, 4, 5, 6, 7],
      servings_per_recipe: [2, 2, 2, 2, 2, 2, 2],
      week_start: '2026-01-05',
    });
    mockRecipe.getRecipe.mockResolvedValue(makeRecipeRow({ id: 42, name: 'New Meal' }));
    mockMealPlan.swapMeal.mockResolvedValue({
      id: 1,
      recipe_ids: [1, 2, 42, 4, 5, 6, 7],
      servings_per_recipe: [2, 2, 2, 2, 2, 2, 2],
    });
    mockRecipe.getRecipes.mockResolvedValue([
      makeRecipeRow({ id: 1 }),
      makeRecipeRow({ id: 2 }),
      makeRecipeRow({ id: 42 }),
      makeRecipeRow({ id: 4 }),
      makeRecipeRow({ id: 5 }),
      makeRecipeRow({ id: 6 }),
      makeRecipeRow({ id: 7 }),
    ]);

    const interaction = makeSelectInteraction('recipe_swap_select_2', ['42']);
    await handleRecipeSelect(interaction);

    expect(mockMealPlan.swapMeal).toHaveBeenCalledWith('guild-123', 2, 42, 2);
    const call = interaction.editReply.mock.calls[0][0];
    expect(call.files).toHaveLength(1);
    expect(call.embeds[0].data.title).toContain('Swapped');
  });

  it('routes recipe_week_select and attaches scaled recipe markdown', async () => {
    mockMealPlan.getActivePlan.mockResolvedValue({
      id: 1,
      recipe_ids: [10, 20, 30, 40, 50, 60, 70],
      servings_per_recipe: [4, 2, 2, 2, 2, 2, 2],
      week_start: '2026-01-05',
    });
    mockRecipe.getRecipe.mockResolvedValue(makeRecipeRow({ id: 10, name: 'Stew', servings: 2 }));

    const interaction = makeSelectInteraction('recipe_week_select', ['0_10']);
    await handleRecipeSelect(interaction);

    expect(mockRecipe.getRecipe).toHaveBeenCalledWith(10, 'guild-123');
    const call = interaction.editReply.mock.calls[0][0];
    expect(call.files).toHaveLength(1);
    expect(call.embeds[0].data.title).toContain('Stew');
    expect(call.embeds[0].data.title).toContain('4');
  });

  it('routes recipe_history_select and renders archived plan', async () => {
    mockMealPlan.getPlanById.mockResolvedValue({
      id: 5,
      recipe_ids: [1, 2, 3, 4, 5, 6, 7],
      servings_per_recipe: [2, 2, 2, 2, 2, 2, 2],
      week_start: '2025-12-01',
    });
    mockRecipe.getRecipe.mockResolvedValue(makeRecipeRow());

    const interaction = makeSelectInteraction('recipe_history_select', ['5']);
    await handleRecipeSelect(interaction);

    expect(mockMealPlan.getPlanById).toHaveBeenCalledWith(5, 'guild-123');
    const call = interaction.editReply.mock.calls[0][0];
    expect(call.embeds[0].data.title).toContain('2025-12-01');
  });
});

describe('Recipe modal dispatcher', () => {
  it('routes recipe_edit_modal_{id}_{field} and updates a simple field', async () => {
    mockRecipe.updateRecipe.mockResolvedValue(makeRecipeRow({ id: 8, name: 'Renamed' }));

    const interaction = makeModalInteraction('recipe_edit_modal_8_name', 'Renamed');
    await handleRecipeModal(interaction);

    expect(mockRecipe.updateRecipe).toHaveBeenCalledWith(
      8,
      'guild-123',
      expect.objectContaining({ name: 'Renamed' })
    );
    const call = interaction.editReply.mock.calls[0][0];
    expect(call.embeds[0].data.title).toContain('Updated');
  });

  it('validates numeric fields and rejects out-of-range values', async () => {
    const interaction = makeModalInteraction('recipe_edit_modal_8_servings', '-1');
    await handleRecipeModal(interaction);

    expect(mockRecipe.updateRecipe).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Validation failed') })
    );
  });

  it('parses ingredients JSON and persists the array', async () => {
    mockRecipe.updateRecipe.mockResolvedValue(makeRecipeRow());
    const ingJson = JSON.stringify([{ name: 'salt', quantity: 1, unit: 'tsp' }]);

    const interaction = makeModalInteraction('recipe_edit_modal_5_ingredients', ingJson);
    await handleRecipeModal(interaction);

    expect(mockRecipe.updateRecipe).toHaveBeenCalledWith(
      5,
      'guild-123',
      expect.objectContaining({
        ingredients: [{ name: 'salt', quantity: 1, unit: 'tsp' }],
      })
    );
  });

  it('rejects invalid ingredients JSON', async () => {
    const interaction = makeModalInteraction('recipe_edit_modal_5_ingredients', 'not-json');
    await handleRecipeModal(interaction);

    expect(mockRecipe.updateRecipe).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Validation failed') })
    );
  });

  it('rejects invalid difficulty values', async () => {
    const interaction = makeModalInteraction('recipe_edit_modal_5_difficulty', 'extreme');
    await handleRecipeModal(interaction);

    expect(mockRecipe.updateRecipe).not.toHaveBeenCalled();
  });

  it('splits instructions by newline and filters empty lines', async () => {
    mockRecipe.updateRecipe.mockResolvedValue(makeRecipeRow());
    const interaction = makeModalInteraction(
      'recipe_edit_modal_5_instructions',
      'Step 1\n\nStep 2\n  Step 3  '
    );
    await handleRecipeModal(interaction);

    expect(mockRecipe.updateRecipe).toHaveBeenCalledWith(
      5,
      'guild-123',
      expect.objectContaining({ instructions: ['Step 1', 'Step 2', 'Step 3'] })
    );
  });
});
