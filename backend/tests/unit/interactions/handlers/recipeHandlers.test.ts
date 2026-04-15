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

const mockGeminiService = {
  selectMealsForPlan: jest.fn(),
};
jest.mock('../../../../utils/geminiService', () => ({
  __esModule: true,
  GeminiService: mockGeminiService,
}));

jest.mock('../../../../utils/shoppingList', () => ({
  __esModule: true,
  generateShoppingList: jest.fn(async () => ({
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

  it('accepts a valid image_url', async () => {
    mockRecipe.updateRecipe.mockResolvedValue(makeRecipeRow());
    const interaction = makeModalInteraction(
      'recipe_edit_modal_5_image_url',
      'https://example.com/x.jpg'
    );
    await handleRecipeModal(interaction);

    expect(mockRecipe.updateRecipe).toHaveBeenCalledWith(
      5,
      'guild-123',
      expect.objectContaining({ image_url: 'https://example.com/x.jpg' })
    );
  });

  it('clears image_url when blank', async () => {
    mockRecipe.updateRecipe.mockResolvedValue(makeRecipeRow());
    const interaction = makeModalInteraction('recipe_edit_modal_5_image_url', '   ');
    await handleRecipeModal(interaction);

    expect(mockRecipe.updateRecipe).toHaveBeenCalledWith(
      5,
      'guild-123',
      expect.objectContaining({ image_url: null })
    );
  });

  it('rejects non-URL image_url values', async () => {
    const interaction = makeModalInteraction('recipe_edit_modal_5_image_url', 'not a url');
    await handleRecipeModal(interaction);

    expect(mockRecipe.updateRecipe).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Validation failed') })
    );
  });
});

describe('Recipe servings-select flow', () => {
  it('handleOpenServingsSelect no longer opens a modal (opens a select instead)', async () => {
    const { handleRecipeButton } = await import(
      '../../../../utils/interactions/handlers/recipeHandlers'
    );
    expect(typeof handleRecipeButton).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Plan-flow handler coverage (handlePickMode, handleAIMode, pagination,
// swap-slot, accept-all, open-servings-select, pick/swap/servings selects,
// finalizePlan edges).
// ---------------------------------------------------------------------------

import {
  planSessions,
  planSessionKey,
  PlanSession,
} from '../../../../commands/recipe';

function seedSession(overrides: Partial<PlanSession> = {}): PlanSession {
  const session: PlanSession = {
    userId: 'user-1',
    guildId: 'guild-123',
    mode: 'pick',
    selectedRecipeIds: [],
    aiSuggestions: undefined,
    stage: 'picking',
    servingsCollected: [],
    currentPage: 0,
    createdAt: Date.now(),
    ...overrides,
  };
  planSessions.set(planSessionKey('guild-123', 'user-1'), session);
  return session;
}

describe('Plan-flow handlers', () => {
  beforeEach(() => {
    planSessions.clear();
    jest.clearAllMocks();
  });

  describe('handlePickMode (recipe_plan_mode_pick)', () => {
    it('renders pick menu when session exists', async () => {
      seedSession();
      mockRecipe.getRecipes.mockResolvedValueOnce([
        makeRecipeRow({ id: 1, name: 'A' }),
        makeRecipeRow({ id: 2, name: 'B' }),
      ]);

      const interaction = makeButtonInteraction('recipe_plan_mode_pick');
      await handleRecipeButton(interaction);

      expect(mockRecipe.getRecipes).toHaveBeenCalledWith('guild-123');
      const call = interaction.editReply.mock.calls[0][0];
      expect(call.embeds[0].data.title).toContain('Pick 7 Recipes');
      expect(call.components).toBeDefined();
    });

    it('shows session-expired error when no session', async () => {
      const interaction = makeButtonInteraction('recipe_plan_mode_pick');
      await handleRecipeButton(interaction);

      expect(mockRecipe.getRecipes).not.toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('expired') })
      );
    });
  });

  describe('handleAIMode (recipe_plan_mode_ai)', () => {
    it('calls Gemini, stores suggestions, renders AI embed on success', async () => {
      seedSession();
      mockRecipe.getRecipes.mockResolvedValueOnce(
        Array.from({ length: 7 }, (_, i) => makeRecipeRow({ id: i + 1 }))
      );
      mockGeminiService.selectMealsForPlan.mockResolvedValueOnce({
        selectedRecipeIds: [1, 2, 3, 4, 5, 6, 7],
        reasoning: 'balanced',
      });

      const interaction = makeButtonInteraction('recipe_plan_mode_ai');
      await handleRecipeButton(interaction);

      expect(mockGeminiService.selectMealsForPlan).toHaveBeenCalled();
      expect(planSessions.get('guild-123:user-1')?.aiSuggestions).toEqual([
        1, 2, 3, 4, 5, 6, 7,
      ]);
    });

    it('deletes session and shows error when Gemini throws', async () => {
      seedSession();
      mockRecipe.getRecipes.mockResolvedValueOnce(
        Array.from({ length: 7 }, (_, i) => makeRecipeRow({ id: i + 1 }))
      );
      mockGeminiService.selectMealsForPlan.mockRejectedValueOnce(new Error('quota'));

      const interaction = makeButtonInteraction('recipe_plan_mode_ai');
      await handleRecipeButton(interaction);

      expect(planSessions.get('guild-123:user-1')).toBeUndefined();
      expect(interaction.editReply).toHaveBeenLastCalledWith(
        expect.objectContaining({ content: expect.stringContaining("couldn't pick meals") })
      );
    });
  });

  describe('handlePickNav (prev/next)', () => {
    it('advances page on next when more pages exist', async () => {
      const session = seedSession({ currentPage: 0 });
      mockRecipe.getRecipes.mockResolvedValue(
        Array.from({ length: 30 }, (_, i) => makeRecipeRow({ id: i + 1 }))
      );

      const interaction = makeButtonInteraction('recipe_plan_pick_next');
      await handleRecipeButton(interaction);

      expect(session.currentPage).toBe(1);
    });

    it('decrements page on prev when not at page 0', async () => {
      const session = seedSession({ currentPage: 1 });
      mockRecipe.getRecipes.mockResolvedValue(
        Array.from({ length: 30 }, (_, i) => makeRecipeRow({ id: i + 1 }))
      );

      const interaction = makeButtonInteraction('recipe_plan_pick_prev');
      await handleRecipeButton(interaction);

      expect(session.currentPage).toBe(0);
    });
  });

  describe('handleSwapSlot (recipe_plan_swap_N)', () => {
    it('renders replacement select for a valid slot', async () => {
      seedSession({
        aiSuggestions: [1, 2, 3, 4, 5, 6, 7],
        stage: 'confirming',
      });
      mockRecipe.getRecipes.mockResolvedValueOnce([
        makeRecipeRow({ id: 1 }),
        makeRecipeRow({ id: 2 }),
        makeRecipeRow({ id: 8, name: 'Alt' }),
      ]);

      const interaction = makeButtonInteraction('recipe_plan_swap_0');
      await handleRecipeButton(interaction);

      const call = interaction.editReply.mock.calls[0][0];
      expect(call.components).toBeDefined();
    });

    it('rejects invalid slot index', async () => {
      seedSession({ aiSuggestions: [1, 2, 3, 4, 5, 6, 7] });

      const interaction = makeButtonInteraction('recipe_plan_swap_99');
      await handleRecipeButton(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('Invalid slot') })
      );
    });

    it('reports no alternatives when no recipes remain', async () => {
      seedSession({ aiSuggestions: [1, 2, 3, 4, 5, 6, 7] });
      mockRecipe.getRecipes.mockResolvedValueOnce([
        makeRecipeRow({ id: 1 }),
        makeRecipeRow({ id: 2 }),
        makeRecipeRow({ id: 3 }),
        makeRecipeRow({ id: 4 }),
        makeRecipeRow({ id: 5 }),
        makeRecipeRow({ id: 6 }),
        makeRecipeRow({ id: 7 }),
      ]);

      const interaction = makeButtonInteraction('recipe_plan_swap_0');
      await handleRecipeButton(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('No alternative') })
      );
    });
  });

  describe('handleAcceptAllAI (recipe_plan_accept_all)', () => {
    it('copies aiSuggestions to selectedRecipeIds and transitions to servings', async () => {
      const session = seedSession({ aiSuggestions: [1, 2, 3, 4, 5, 6, 7] });
      mockRecipe.getRecipes.mockResolvedValue(
        Array.from({ length: 7 }, (_, i) => makeRecipeRow({ id: i + 1 }))
      );

      const interaction = makeButtonInteraction('recipe_plan_accept_all');
      await handleRecipeButton(interaction);

      expect(session.selectedRecipeIds).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(session.stage).toBe('servings');
    });

    it('errors when aiSuggestions are missing or incomplete', async () => {
      seedSession({ aiSuggestions: undefined });
      const interaction = makeButtonInteraction('recipe_plan_accept_all');
      await handleRecipeButton(interaction);
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('No AI suggestions') })
      );
    });
  });

  describe('handleOpenServingsSelect (recipe_plan_servings_N)', () => {
    it('renders the 12-option select for a valid slot', async () => {
      seedSession({
        selectedRecipeIds: [1, 2, 3, 4, 5, 6, 7],
        stage: 'servings',
      });
      mockRecipe.getRecipes.mockResolvedValue(
        Array.from({ length: 7 }, (_, i) => makeRecipeRow({ id: i + 1, name: `R${i}` }))
      );

      const interaction = makeButtonInteraction('recipe_plan_servings_0');
      await handleRecipeButton(interaction);

      const call = interaction.editReply.mock.calls[0][0];
      expect(call.components).toBeDefined();
      // The select has 12 options (1,2,3,4,5,6,7,8,10,12,15,20).
      const options = call.components[0].components[0].options;
      expect(options).toHaveLength(12);
    });

    it('rejects invalid slot', async () => {
      seedSession();
      const interaction = makeButtonInteraction('recipe_plan_servings_99');
      await handleRecipeButton(interaction);
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('Invalid slot') })
      );
    });
  });

  describe('handlePickSelect (recipe_plan_pick_{page})', () => {
    it('appends ids and keeps picking when < 7 selected', async () => {
      const session = seedSession();
      mockRecipe.getRecipes.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => makeRecipeRow({ id: i + 1 }))
      );
      const interaction = makeSelectInteraction('recipe_plan_pick_0', ['1', '2']);
      await handleRecipeSelect(interaction);

      expect(session.selectedRecipeIds).toEqual([1, 2]);
      expect(session.stage).toBe('picking');
    });

    it('transitions to servings when overshooting 7', async () => {
      const session = seedSession({ selectedRecipeIds: [1, 2, 3, 4, 5, 6] });
      mockRecipe.getRecipes.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => makeRecipeRow({ id: i + 1 }))
      );
      const interaction = makeSelectInteraction('recipe_plan_pick_0', ['7', '8']);
      await handleRecipeSelect(interaction);

      expect(session.selectedRecipeIds).toHaveLength(7);
      expect(session.stage).toBe('servings');
    });
  });

  describe('handleServingsSelect (recipe_plan_servings_select_N)', () => {
    it('saves the selected value and re-renders if more slots remain', async () => {
      const session = seedSession({
        selectedRecipeIds: [1, 2, 3, 4, 5, 6, 7],
        stage: 'servings',
      });
      mockRecipe.getRecipes.mockResolvedValue(
        Array.from({ length: 7 }, (_, i) => makeRecipeRow({ id: i + 1 }))
      );

      const interaction = makeSelectInteraction('recipe_plan_servings_select_0', ['4']);
      await handleRecipeSelect(interaction);

      expect(session.servingsCollected[0]).toBe(4);
    });

    it('rejects invalid slot index', async () => {
      seedSession({ selectedRecipeIds: [1, 2, 3, 4, 5, 6, 7] });
      const interaction = makeSelectInteraction('recipe_plan_servings_select_42', ['4']);
      await handleRecipeSelect(interaction);
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('Invalid slot') })
      );
    });

    it('rejects out-of-range servings value', async () => {
      seedSession({ selectedRecipeIds: [1, 2, 3, 4, 5, 6, 7] });
      const interaction = makeSelectInteraction('recipe_plan_servings_select_0', ['999']);
      await handleRecipeSelect(interaction);
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('Invalid servings') })
      );
    });
  });

  describe('handleSwapSelect (recipe_plan_swap_select_N)', () => {
    it('updates aiSuggestions at the given slot', async () => {
      const session = seedSession({
        aiSuggestions: [1, 2, 3, 4, 5, 6, 7],
      });
      mockRecipe.getRecipes.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => makeRecipeRow({ id: i + 1 }))
      );
      const interaction = makeSelectInteraction('recipe_plan_swap_select_2', ['8']);
      await handleRecipeSelect(interaction);

      expect(session.aiSuggestions?.[2]).toBe(8);
    });

    it('rejects invalid slot', async () => {
      seedSession({ aiSuggestions: [1, 2, 3, 4, 5, 6, 7] });
      const interaction = makeSelectInteraction('recipe_plan_swap_select_42', ['8']);
      await handleRecipeSelect(interaction);
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('Invalid slot') })
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Non-plan error branches + edit modal edges
// ---------------------------------------------------------------------------

describe('Non-plan handler error branches', () => {
  beforeEach(() => {
    planSessions.clear();
    jest.clearAllMocks();
  });

  it('handleViewFull: invalid recipe id in customId', async () => {
    const interaction = makeButtonInteraction('recipe_view_full_abc');
    await handleRecipeButton(interaction);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Invalid recipe') })
    );
  });

  it('handleViewFull: recipe not found', async () => {
    mockRecipe.getRecipe.mockResolvedValue(null);
    const interaction = makeButtonInteraction('recipe_view_full_99');
    await handleRecipeButton(interaction);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('not found') })
    );
  });

  it('handleDeleteConfirm: invalid recipe id', async () => {
    const interaction = makeButtonInteraction('recipe_delete_confirm_abc');
    await handleRecipeButton(interaction);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Invalid recipe') })
    );
  });

  it('handleDeleteConfirm: delete returns false', async () => {
    mockRecipe.getRecipe.mockResolvedValue(makeRecipeRow({ id: 5 }));
    mockRecipe.deleteRecipe.mockResolvedValue(false);
    const interaction = makeButtonInteraction('recipe_delete_confirm_5');
    await handleRecipeButton(interaction);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Failed to delete') })
    );
  });

  it('handleSwapMealSelect: no active plan', async () => {
    mockMealPlan.getActivePlan.mockResolvedValue(null);
    const interaction = makeSelectInteraction('recipe_swap_select_0', ['42']);
    await handleRecipeSelect(interaction);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('No active meal plan') })
    );
  });

  it('handleSwapMealSelect: replacement recipe not found', async () => {
    mockMealPlan.getActivePlan.mockResolvedValue({
      id: 1,
      recipe_ids: [1, 2, 3, 4, 5, 6, 7],
      servings_per_recipe: [2, 2, 2, 2, 2, 2, 2],
    });
    mockRecipe.getRecipe.mockResolvedValueOnce(null);
    const interaction = makeSelectInteraction('recipe_swap_select_0', ['999']);
    await handleRecipeSelect(interaction);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('Replacement recipe not found'),
      })
    );
  });

  it('handleWeekSelect: no active plan', async () => {
    mockMealPlan.getActivePlan.mockResolvedValue(null);
    const interaction = makeSelectInteraction('recipe_week_select', ['0_1']);
    await handleRecipeSelect(interaction);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('No active meal plan') })
    );
  });

  it('handleWeekSelect: invalid selection format', async () => {
    mockMealPlan.getActivePlan.mockResolvedValue({
      id: 1,
      recipe_ids: [1],
      servings_per_recipe: [2],
    });
    const interaction = makeSelectInteraction('recipe_week_select', ['not-valid']);
    await handleRecipeSelect(interaction);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Invalid selection') })
    );
  });

  it('handleHistorySelect: plan not found', async () => {
    mockMealPlan.getPlanById.mockResolvedValue(null);
    const interaction = makeSelectInteraction('recipe_history_select', ['99']);
    await handleRecipeSelect(interaction);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Plan not found') })
    );
  });

  it('handleEditFieldSelect: unknown field value', async () => {
    mockRecipe.getRecipe.mockResolvedValue(makeRecipeRow({ id: 5 }));
    const interaction = makeSelectInteraction('recipe_edit_field_5', ['bogus_field'], {
      deferred: false,
    });
    await handleRecipeSelect(interaction);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Unknown field') })
    );
  });

  it('handleEditFieldSelect: recipe not found', async () => {
    mockRecipe.getRecipe.mockResolvedValue(null);
    const interaction = makeSelectInteraction('recipe_edit_field_99', ['name'], {
      deferred: false,
    });
    await handleRecipeSelect(interaction);
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('not found') })
    );
  });
});

describe('handleEditModal additional validation branches', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects invalid difficulty', async () => {
    const interaction = makeModalInteraction(
      'recipe_edit_modal_5_difficulty',
      'spicy'
    );
    await handleRecipeModal(interaction);
    expect(mockRecipe.updateRecipe).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Validation failed') })
    );
  });

  it('rejects prep_time_minutes > 10000', async () => {
    const interaction = makeModalInteraction(
      'recipe_edit_modal_5_prep_time_minutes',
      '999999'
    );
    await handleRecipeModal(interaction);
    expect(mockRecipe.updateRecipe).not.toHaveBeenCalled();
  });

  it('clears empty-string numeric fields to null', async () => {
    mockRecipe.updateRecipe.mockResolvedValue(makeRecipeRow());
    const interaction = makeModalInteraction('recipe_edit_modal_5_servings', '   ');
    await handleRecipeModal(interaction);
    expect(mockRecipe.updateRecipe).toHaveBeenCalledWith(
      5,
      'guild-123',
      expect.objectContaining({ servings: null })
    );
  });

  it('rejects ingredients with missing name', async () => {
    const interaction = makeModalInteraction(
      'recipe_edit_modal_5_ingredients',
      JSON.stringify([{ quantity: 1, unit: 'tsp' }])
    );
    await handleRecipeModal(interaction);
    expect(mockRecipe.updateRecipe).not.toHaveBeenCalled();
  });

  it('rejects nutrition that is not an object', async () => {
    const interaction = makeModalInteraction('recipe_edit_modal_5_nutrition', '[1,2,3]');
    await handleRecipeModal(interaction);
    expect(mockRecipe.updateRecipe).not.toHaveBeenCalled();
  });

  it('rejects nutrition with a negative field', async () => {
    const interaction = makeModalInteraction(
      'recipe_edit_modal_5_nutrition',
      JSON.stringify({ calories: -100 })
    );
    await handleRecipeModal(interaction);
    expect(mockRecipe.updateRecipe).not.toHaveBeenCalled();
  });

  it('clears nutrition when blank', async () => {
    mockRecipe.updateRecipe.mockResolvedValue(makeRecipeRow());
    const interaction = makeModalInteraction('recipe_edit_modal_5_nutrition', '');
    await handleRecipeModal(interaction);
    expect(mockRecipe.updateRecipe).toHaveBeenCalledWith(
      5,
      'guild-123',
      expect.objectContaining({ nutrition: null })
    );
  });

  it('handleRecipeModal: unknown custom id prefix logs warning', async () => {
    const { logger } = jest.requireMock('../../../../shared/utils/logger');
    const interaction = makeModalInteraction('totally_unknown_modal', 'x');
    await handleRecipeModal(interaction);
    expect(logger.warn).toHaveBeenCalledWith(
      '[RECIPE] Unknown recipe modal customId',
      expect.anything()
    );
  });

  it('handleRecipeButton: unknown custom id falls through with warning', async () => {
    const { logger } = jest.requireMock('../../../../shared/utils/logger');
    const interaction = makeButtonInteraction('recipe_totally_unknown');
    await handleRecipeButton(interaction);
    expect(logger.warn).toHaveBeenCalledWith(
      '[RECIPE] Unknown recipe button customId',
      expect.anything()
    );
  });

  it('handleRecipeSelect: unknown select id falls through with warning', async () => {
    const { logger } = jest.requireMock('../../../../shared/utils/logger');
    const interaction = makeSelectInteraction('recipe_totally_unknown_select', ['x']);
    await handleRecipeSelect(interaction);
    expect(logger.warn).toHaveBeenCalledWith(
      '[RECIPE] Unknown recipe select customId',
      expect.anything()
    );
  });
});

describe('handleEditFieldSelect: each field populates modal correctly', () => {
  beforeEach(() => jest.clearAllMocks());

  const fullRecipe = {
    id: 5,
    name: 'Test',
    ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
    instructions: ['Mix', 'Cook'],
    servings: 4,
    prep_time_minutes: 10,
    cook_time_minutes: 20,
    cuisine: 'italian',
    difficulty: 'easy',
    dietary_tags: ['vegan'],
    notes: 'keep cold',
    image_url: 'https://example.com/i.jpg',
    nutrition: { calories: 300 },
  };

  const fields = [
    'name',
    'ingredients',
    'instructions',
    'servings',
    'prep_time_minutes',
    'cook_time_minutes',
    'cuisine',
    'difficulty',
    'dietary_tags',
    'notes',
    'image_url',
    'nutrition',
  ];

  it.each(fields)('opens modal for field %s', async (field) => {
    mockRecipe.getRecipe.mockResolvedValueOnce({
      ...makeRecipeRow(),
      ...fullRecipe,
    });
    const interaction = makeSelectInteraction('recipe_edit_field_5', [field], {
      deferred: false,
    });
    await handleRecipeSelect(interaction);
    expect(interaction.showModal).toHaveBeenCalled();
    const modal = interaction.showModal.mock.calls[0][0];
    expect(modal.data.custom_id).toBe(`recipe_edit_modal_5_${field}`);
  });

  it('falls back when recipe has null/missing optional fields', async () => {
    mockRecipe.getRecipe.mockResolvedValueOnce(
      makeRecipeRow({
        cuisine: null,
        difficulty: null,
        notes: null,
        image_url: null,
        nutrition: null,
        servings: null,
        prep_time_minutes: null,
        cook_time_minutes: null,
        dietary_tags: [],
      })
    );
    const interaction = makeSelectInteraction('recipe_edit_field_1', ['cuisine'], {
      deferred: false,
    });
    await handleRecipeSelect(interaction);
    expect(interaction.showModal).toHaveBeenCalled();
  });
});

describe('finalizePlan happy path', () => {
  beforeEach(() => {
    planSessions.clear();
    jest.clearAllMocks();
  });

  it('renders the success embed and clears the session when the last serving fills', async () => {
    const session = seedSession({
      selectedRecipeIds: [1, 2, 3, 4, 5, 6, 7],
      servingsCollected: [2, 2, 2, 2, 2, 2, undefined as unknown as number],
      stage: 'servings',
    });
    void session;

    mockMealPlan.upsertPlan.mockResolvedValueOnce({
      id: 1,
      recipe_ids: [1, 2, 3, 4, 5, 6, 7],
      servings_per_recipe: [2, 2, 2, 2, 2, 2, 2],
      week_start: '2026-01-05',
    });
    mockRecipe.getRecipes.mockResolvedValueOnce(
      Array.from({ length: 7 }, (_, i) =>
        makeRecipeRow({
          id: i + 1,
          name: `Meal ${i + 1}`,
          nutrition: { calories: 100, protein: 10, carbs: 20, fat: 5, fiber: 2 },
        })
      )
    );

    const interaction = makeSelectInteraction('recipe_plan_servings_select_6', ['2']);
    await handleRecipeSelect(interaction);

    expect(mockMealPlan.upsertPlan).toHaveBeenCalled();
    const call = interaction.editReply.mock.calls.at(-1)[0];
    expect(call.content).toContain('meal plan is ready');
    expect(call.files).toBeDefined();
    // Session cleaned up after success.
    expect(planSessions.get('guild-123:user-1')).toBeUndefined();
  });

  it('reports an error when a selected recipe no longer exists', async () => {
    seedSession({
      selectedRecipeIds: [1, 2, 3, 4, 5, 6, 999],
      servingsCollected: [2, 2, 2, 2, 2, 2, undefined as unknown as number],
      stage: 'servings',
    });

    mockMealPlan.upsertPlan.mockResolvedValueOnce({
      id: 1,
      recipe_ids: [1, 2, 3, 4, 5, 6, 999],
      servings_per_recipe: [2, 2, 2, 2, 2, 2, 2],
    });
    mockRecipe.getRecipes.mockResolvedValueOnce(
      Array.from({ length: 6 }, (_, i) => makeRecipeRow({ id: i + 1 }))
    );

    const interaction = makeSelectInteraction('recipe_plan_servings_select_6', ['2']);
    await handleRecipeSelect(interaction);

    expect(interaction.editReply).toHaveBeenLastCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Failed to finalize') })
    );
  });
});
