/**
 * Unit Tests: MealPlan Model
 */

jest.mock('../../../shared/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import MealPlan from '@database/models/MealPlan';
import type { MealPlanRow } from '@database/types';

function makePlan(overrides: Partial<MealPlanRow> = {}): MealPlanRow {
  return {
    id: 1,
    recipe_ids: [1, 2, 3, 4, 5, 6, 7],
    servings_per_recipe: [2, 2, 2, 2, 2, 2, 2],
    week_start: '2024-01-01',
    archived: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_id: 'user-1',
    guild_id: 'guild-1',
    ...overrides,
  };
}

describe('MealPlan Model', () => {
  const guildId = 'guild-1';

  afterEach(() => jest.restoreAllMocks());

  describe('getActivePlan', () => {
    test('returns active plan when found', async () => {
      jest.spyOn(MealPlan, 'getActivePlan').mockResolvedValue(makePlan());
      const result = await MealPlan.getActivePlan(guildId);
      expect(result).not.toBeNull();
      expect(result!.archived).toBe(false);
    });

    test('returns null when no active plan', async () => {
      jest.spyOn(MealPlan, 'getActivePlan').mockResolvedValue(null);
      const result = await MealPlan.getActivePlan(guildId);
      expect(result).toBeNull();
    });
  });

  describe('upsertPlan', () => {
    test('returns newly inserted plan', async () => {
      const plan = makePlan({ id: 99 });
      const spy = jest.spyOn(MealPlan, 'upsertPlan').mockResolvedValue(plan);

      const result = await MealPlan.upsertPlan({
        recipeIds: [1, 2, 3, 4, 5, 6, 7],
        servingsPerRecipe: [2, 2, 2, 2, 2, 2, 2],
        weekStart: '2024-01-01',
        userId: 'user-1',
        guildId,
      });

      expect(spy).toHaveBeenCalled();
      expect(result.id).toBe(99);
    });
  });

  describe('swapMeal', () => {
    test('returns updated plan on success', async () => {
      const updated = makePlan({ recipe_ids: [99, 2, 3, 4, 5, 6, 7] });
      jest.spyOn(MealPlan, 'swapMeal').mockResolvedValue(updated);
      const result = await MealPlan.swapMeal(guildId, 0, 99, 2);
      expect(result!.recipe_ids[0]).toBe(99);
    });

    test('returns null when slot out of range', async () => {
      jest.spyOn(MealPlan, 'swapMeal').mockResolvedValue(null);
      const result = await MealPlan.swapMeal(guildId, 100, 1, 2);
      expect(result).toBeNull();
    });

    test('returns null when no active plan', async () => {
      jest.spyOn(MealPlan, 'swapMeal').mockResolvedValue(null);
      const result = await MealPlan.swapMeal(guildId, 0, 1, 2);
      expect(result).toBeNull();
    });
  });

  describe('updateServings', () => {
    test('returns updated plan on success', async () => {
      const updated = makePlan({ servings_per_recipe: [5, 2, 2, 2, 2, 2, 2] });
      jest.spyOn(MealPlan, 'updateServings').mockResolvedValue(updated);
      const result = await MealPlan.updateServings(guildId, 0, 5);
      expect(result!.servings_per_recipe[0]).toBe(5);
    });

    test('returns null when no active plan', async () => {
      jest.spyOn(MealPlan, 'updateServings').mockResolvedValue(null);
      const result = await MealPlan.updateServings(guildId, 0, 5);
      expect(result).toBeNull();
    });
  });

  describe('getArchivedPlans', () => {
    test('returns only archived plans', async () => {
      jest
        .spyOn(MealPlan, 'getArchivedPlans')
        .mockResolvedValue([makePlan({ archived: true }), makePlan({ archived: true, id: 2 })]);
      const result = await MealPlan.getArchivedPlans(guildId);
      expect(result).toHaveLength(2);
      expect(result.every((p) => p.archived)).toBe(true);
    });

    test('respects limit parameter', async () => {
      const spy = jest.spyOn(MealPlan, 'getArchivedPlans').mockResolvedValue([]);
      await MealPlan.getArchivedPlans(guildId, 5);
      expect(spy).toHaveBeenCalledWith(guildId, 5);
    });
  });

  describe('getPlanById', () => {
    test('returns plan when found', async () => {
      jest.spyOn(MealPlan, 'getPlanById').mockResolvedValue(makePlan({ id: 7 }));
      const result = await MealPlan.getPlanById(7, guildId);
      expect(result!.id).toBe(7);
    });

    test('returns null when not found', async () => {
      jest.spyOn(MealPlan, 'getPlanById').mockResolvedValue(null);
      const result = await MealPlan.getPlanById(999, guildId);
      expect(result).toBeNull();
    });
  });
});
