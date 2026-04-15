/**
 * Unit Tests: RecipePreferences Model
 *
 * For add/remove methods, we let the real function run and spy on
 * the underlying getPreferences / upsertPreferences helpers.
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

import RecipePreferences from '../../../../supabase/models/RecipePreferences';
import type { RecipePreferencesRow } from '../../../../supabase/types';

function makePrefs(overrides: Partial<RecipePreferencesRow> = {}): RecipePreferencesRow {
  return {
    id: 1,
    guild_id: 'guild-1',
    dietary_restrictions: [],
    excluded_cuisines: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_id: 'user-1',
    ...overrides,
  };
}

describe('RecipePreferences Model', () => {
  const guildId = 'guild-1';
  const userId = 'user-1';

  afterEach(() => jest.restoreAllMocks());

  describe('getPreferences', () => {
    test('returns preferences when found', async () => {
      jest
        .spyOn(RecipePreferences, 'getPreferences')
        .mockResolvedValue(makePrefs({ dietary_restrictions: ['vegan'] }));
      const result = await RecipePreferences.getPreferences(guildId);
      expect(result).not.toBeNull();
      expect(result!.dietary_restrictions).toEqual(['vegan']);
    });

    test('returns null when not found', async () => {
      jest.spyOn(RecipePreferences, 'getPreferences').mockResolvedValue(null);
      expect(await RecipePreferences.getPreferences(guildId)).toBeNull();
    });
  });

  describe('upsertPreferences', () => {
    test('creates new preferences', async () => {
      const created = makePrefs({ dietary_restrictions: ['vegan'] });
      jest.spyOn(RecipePreferences, 'upsertPreferences').mockResolvedValue(created);
      const result = await RecipePreferences.upsertPreferences(guildId, userId, {
        dietary_restrictions: ['vegan'],
      });
      expect(result.dietary_restrictions).toEqual(['vegan']);
    });

    test('updates existing preferences', async () => {
      const updated = makePrefs({ excluded_cuisines: ['thai'] });
      const spy = jest.spyOn(RecipePreferences, 'upsertPreferences').mockResolvedValue(updated);
      await RecipePreferences.upsertPreferences(guildId, userId, {
        excluded_cuisines: ['thai'],
      });
      expect(spy).toHaveBeenCalledWith(guildId, userId, { excluded_cuisines: ['thai'] });
    });
  });

  describe('addDietaryRestriction', () => {
    test('adds a new restriction', async () => {
      jest
        .spyOn(RecipePreferences, 'getPreferences')
        .mockResolvedValue(makePrefs({ dietary_restrictions: ['vegan'] }));
      const upsertSpy = jest
        .spyOn(RecipePreferences, 'upsertPreferences')
        .mockResolvedValue(makePrefs({ dietary_restrictions: ['vegan', 'gluten-free'] }));

      await RecipePreferences.addDietaryRestriction(guildId, userId, 'gluten-free');

      expect(upsertSpy).toHaveBeenCalledWith(guildId, userId, {
        dietary_restrictions: ['vegan', 'gluten-free'],
        excluded_cuisines: [],
      });
    });

    test('ignores duplicate', async () => {
      jest
        .spyOn(RecipePreferences, 'getPreferences')
        .mockResolvedValue(makePrefs({ dietary_restrictions: ['vegan'] }));
      const upsertSpy = jest
        .spyOn(RecipePreferences, 'upsertPreferences')
        .mockResolvedValue(makePrefs({ dietary_restrictions: ['vegan'] }));

      await RecipePreferences.addDietaryRestriction(guildId, userId, 'vegan');

      expect(upsertSpy).toHaveBeenCalledWith(guildId, userId, {
        dietary_restrictions: ['vegan'],
        excluded_cuisines: [],
      });
    });
  });

  describe('removeDietaryRestriction', () => {
    test('removes existing restriction', async () => {
      jest
        .spyOn(RecipePreferences, 'getPreferences')
        .mockResolvedValue(makePrefs({ dietary_restrictions: ['vegan', 'gluten-free'] }));
      const upsertSpy = jest
        .spyOn(RecipePreferences, 'upsertPreferences')
        .mockResolvedValue(makePrefs({ dietary_restrictions: ['gluten-free'] }));

      await RecipePreferences.removeDietaryRestriction(guildId, userId, 'vegan');

      expect(upsertSpy).toHaveBeenCalledWith(guildId, userId, {
        dietary_restrictions: ['gluten-free'],
        excluded_cuisines: [],
      });
    });

    test('handles non-present restriction', async () => {
      jest
        .spyOn(RecipePreferences, 'getPreferences')
        .mockResolvedValue(makePrefs({ dietary_restrictions: ['vegan'] }));
      const upsertSpy = jest
        .spyOn(RecipePreferences, 'upsertPreferences')
        .mockResolvedValue(makePrefs({ dietary_restrictions: ['vegan'] }));

      await RecipePreferences.removeDietaryRestriction(guildId, userId, 'nonexistent');

      expect(upsertSpy).toHaveBeenCalledWith(guildId, userId, {
        dietary_restrictions: ['vegan'],
        excluded_cuisines: [],
      });
    });
  });

  describe('addExcludedCuisine', () => {
    test('adds a new cuisine', async () => {
      jest
        .spyOn(RecipePreferences, 'getPreferences')
        .mockResolvedValue(makePrefs({ excluded_cuisines: ['thai'] }));
      const upsertSpy = jest
        .spyOn(RecipePreferences, 'upsertPreferences')
        .mockResolvedValue(makePrefs({ excluded_cuisines: ['thai', 'indian'] }));

      await RecipePreferences.addExcludedCuisine(guildId, userId, 'indian');

      expect(upsertSpy).toHaveBeenCalledWith(guildId, userId, {
        dietary_restrictions: [],
        excluded_cuisines: ['thai', 'indian'],
      });
    });

    test('ignores duplicate', async () => {
      jest
        .spyOn(RecipePreferences, 'getPreferences')
        .mockResolvedValue(makePrefs({ excluded_cuisines: ['thai'] }));
      const upsertSpy = jest
        .spyOn(RecipePreferences, 'upsertPreferences')
        .mockResolvedValue(makePrefs({ excluded_cuisines: ['thai'] }));

      await RecipePreferences.addExcludedCuisine(guildId, userId, 'thai');

      expect(upsertSpy).toHaveBeenCalledWith(guildId, userId, {
        dietary_restrictions: [],
        excluded_cuisines: ['thai'],
      });
    });
  });

  describe('removeExcludedCuisine', () => {
    test('removes existing cuisine', async () => {
      jest
        .spyOn(RecipePreferences, 'getPreferences')
        .mockResolvedValue(makePrefs({ excluded_cuisines: ['thai', 'indian'] }));
      const upsertSpy = jest
        .spyOn(RecipePreferences, 'upsertPreferences')
        .mockResolvedValue(makePrefs({ excluded_cuisines: ['indian'] }));

      await RecipePreferences.removeExcludedCuisine(guildId, userId, 'thai');

      expect(upsertSpy).toHaveBeenCalledWith(guildId, userId, {
        dietary_restrictions: [],
        excluded_cuisines: ['indian'],
      });
    });

    test('handles non-present cuisine', async () => {
      jest
        .spyOn(RecipePreferences, 'getPreferences')
        .mockResolvedValue(makePrefs({ excluded_cuisines: ['thai'] }));
      const upsertSpy = jest
        .spyOn(RecipePreferences, 'upsertPreferences')
        .mockResolvedValue(makePrefs({ excluded_cuisines: ['thai'] }));

      await RecipePreferences.removeExcludedCuisine(guildId, userId, 'nonexistent');

      expect(upsertSpy).toHaveBeenCalledWith(guildId, userId, {
        dietary_restrictions: [],
        excluded_cuisines: ['thai'],
      });
    });

    test('handles null preferences gracefully', async () => {
      jest.spyOn(RecipePreferences, 'getPreferences').mockResolvedValue(null);
      const upsertSpy = jest
        .spyOn(RecipePreferences, 'upsertPreferences')
        .mockResolvedValue(makePrefs());

      await RecipePreferences.removeExcludedCuisine(guildId, userId, 'thai');

      expect(upsertSpy).toHaveBeenCalledWith(guildId, userId, {
        dietary_restrictions: [],
        excluded_cuisines: [],
      });
    });
  });
});
