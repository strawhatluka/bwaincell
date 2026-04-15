/**
 * Unit Tests: shoppingList utilities.
 *
 * generateShoppingList is now async and routes through Gemini's
 * sanitizeShoppingList. For these tests we mock the sanitizer to return the
 * input unchanged (coerced to SanitizedItem shape) so the tests exercise the
 * deterministic aggregation + render pipeline without hitting Gemini.
 */

jest.mock('../../../utils/geminiService', () => {
  const actual = jest.requireActual('../../../utils/geminiService');
  return {
    ...actual,
    GeminiService: {
      ...actual.GeminiService,
      sanitizeShoppingList: jest.fn(async (items: unknown[]) => {
        const toCategory = (c: unknown): string => {
          const allowed = [
            'meats',
            'produce',
            'dairy',
            'spices',
            'pantry',
            'frozen',
            'bakery',
            'other',
          ];
          return allowed.includes(c as string) ? (c as string) : 'other';
        };
        return {
          items: (items as Array<Record<string, unknown>>).map((i) => ({
            name: i.name,
            quantity: i.quantity ?? null,
            unit: i.unit ?? '',
            category: toCategory(i.category),
          })),
          warnings: [],
        };
      }),
    },
  };
});

jest.mock('../../../shared/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import {
  parseQuantity,
  categorizeIngredient,
  generateShoppingList,
  aggregateIngredients,
  RecipeWithServings,
} from '../../../utils/shoppingList';
import type { RecipeRow } from '../../../../supabase/types';

function makeRecipe(overrides: Partial<RecipeRow> = {}): RecipeRow {
  return {
    id: 1,
    name: 'Test Recipe',
    source_url: null,
    source_type: 'manual',
    ingredients: [],
    instructions: [],
    servings: 4,
    prep_time_minutes: 10,
    cook_time_minutes: 20,
    nutrition: null,
    cuisine: null,
    difficulty: null,
    dietary_tags: [],
    image_url: null,
    notes: null,
    is_favorite: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_id: 'u',
    guild_id: 'g',
    ...overrides,
  };
}

describe('parseQuantity', () => {
  test('number input returns same number', () => {
    expect(parseQuantity(3)).toBe(3);
  });

  test('"1/2" returns 0.5', () => {
    expect(parseQuantity('1/2')).toBe(0.5);
  });

  test('"1 1/2" returns 1.5', () => {
    expect(parseQuantity('1 1/2')).toBe(1.5);
  });

  test('"2.5" returns 2.5', () => {
    expect(parseQuantity('2.5')).toBe(2.5);
  });

  test('"2" returns 2', () => {
    expect(parseQuantity('2')).toBe(2);
  });

  test('"abc" returns null', () => {
    expect(parseQuantity('abc')).toBeNull();
  });

  test('empty string returns null', () => {
    expect(parseQuantity('')).toBeNull();
  });

  test('NaN number returns null', () => {
    expect(parseQuantity(NaN)).toBeNull();
  });
});

describe('categorizeIngredient', () => {
  test('explicit valid category is returned as-is', () => {
    expect(categorizeIngredient({ name: 'foo', category: 'dairy' })).toBe('dairy');
  });

  test('chicken → meats', () => {
    expect(categorizeIngredient({ name: 'chicken breast' })).toBe('meats');
  });

  test('onion → produce', () => {
    expect(categorizeIngredient({ name: 'yellow onion' })).toBe('produce');
  });

  test('milk → dairy', () => {
    expect(categorizeIngredient({ name: 'whole milk' })).toBe('dairy');
  });

  test('cumin → spices', () => {
    expect(categorizeIngredient({ name: 'ground cumin' })).toBe('spices');
  });

  test('flour → pantry', () => {
    expect(categorizeIngredient({ name: 'all-purpose flour' })).toBe('pantry');
  });

  test('"frozen peas" → frozen', () => {
    expect(categorizeIngredient({ name: 'frozen peas' })).toBe('frozen');
  });

  test('tortilla → bakery', () => {
    expect(categorizeIngredient({ name: 'flour tortilla' })).toBe('bakery');
  });

  test('unknown → other', () => {
    expect(categorizeIngredient({ name: 'unobtanium' })).toBe('other');
  });
});

describe('generateShoppingList', () => {
  test('single meal, 1 serving, simple recipe has categories and nutrition', async () => {
    const recipe = makeRecipe({
      name: 'Simple',
      servings: 1,
      ingredients: [
        { name: 'Chicken', quantity: 1, unit: 'lb' },
        { name: 'Salt', quantity: 1, unit: 'tsp' },
      ],
      nutrition: { calories: 500, protein: 30, carbs: 10, fat: 20, fiber: 5 },
    });
    const meals: RecipeWithServings[] = [{ recipe, targetServings: 1 }];
    const { markdown, nutrition } = await generateShoppingList(meals);

    expect(markdown).toContain('# Shopping List');
    expect(markdown).toContain('## Meats');
    expect(markdown).toContain('## Pantry');
    expect(markdown).toContain('## Meals This Week');
    expect(markdown).toContain('Simple');
    expect(nutrition.totalCalories).toBe(500);
    expect(nutrition.totalProtein).toBe(30);
  });

  test('scaling: recipe with 4 servings scaled to 2 halves quantities', async () => {
    const recipe = makeRecipe({
      servings: 4,
      ingredients: [{ name: 'Chicken', quantity: 4, unit: 'lb' }],
    });
    const { markdown } = await generateShoppingList([{ recipe, targetServings: 2 }]);
    expect(markdown).toContain('2 lb Chicken');
  });

  test('scaling: unit-less count rounds up (2.5 eggs → 3)', async () => {
    const recipe = makeRecipe({
      servings: 2,
      ingredients: [{ name: 'eggs', quantity: 1, unit: '' }],
    });
    // scale = 5/2 = 2.5 eggs
    const { markdown } = await generateShoppingList([{ recipe, targetServings: 5 }]);
    expect(markdown).toMatch(/3 eggs/);
  });

  test('aggregation: same name+unit across 2 meals sums quantities', async () => {
    const a = makeRecipe({
      id: 1,
      servings: 1,
      ingredients: [{ name: 'Chicken', quantity: 2, unit: 'lb' }],
    });
    const b = makeRecipe({
      id: 2,
      servings: 1,
      ingredients: [{ name: 'chicken', quantity: 3, unit: 'lb' }],
    });
    const { markdown } = await generateShoppingList([
      { recipe: a, targetServings: 1 },
      { recipe: b, targetServings: 1 },
    ]);
    // Sum = 5 lb
    expect(markdown).toMatch(/5 lb (C|c)hicken/);
  });

  test('aggregation: same name different unit stays separate', async () => {
    const a = makeRecipe({
      id: 1,
      servings: 1,
      ingredients: [{ name: 'Chicken', quantity: 1, unit: 'lb' }],
    });
    const b = makeRecipe({
      id: 2,
      servings: 1,
      ingredients: [{ name: 'Chicken', quantity: 2, unit: 'kg' }],
    });
    const { markdown } = await generateShoppingList([
      { recipe: a, targetServings: 1 },
      { recipe: b, targetServings: 1 },
    ]);
    expect(markdown).toContain('1 lb');
    expect(markdown).toContain('2 kg');
  });

  test('null nutrition is skipped and note is shown', async () => {
    const recipe = makeRecipe({
      servings: 1,
      nutrition: null,
      ingredients: [{ name: 'Salt', quantity: 1, unit: 'tsp' }],
    });
    const { markdown, nutrition } = await generateShoppingList([{ recipe, targetServings: 1 }]);
    expect(markdown).toContain('Nutrition data missing for 1 recipes');
    expect(nutrition.totalCalories).toBe(0);
  });

  test('empty meals produces minimal markdown', async () => {
    const { markdown, nutrition } = await generateShoppingList([]);
    expect(markdown).toContain('# Shopping List');
    expect(markdown).toContain('Generated for 0 meals');
    expect(nutrition.totalCalories).toBe(0);
  });

  test('aggregated nutrition sums per-serving macros across meals (per-person)', async () => {
    const r1 = makeRecipe({
      id: 1,
      servings: 1,
      ingredients: [],
      nutrition: { calories: 100, protein: 10, carbs: 5, fat: 2, fiber: 1 },
    });
    const r2 = makeRecipe({
      id: 2,
      servings: 1,
      ingredients: [],
      nutrition: { calories: 200, protein: 20, carbs: 10, fat: 5, fiber: 2 },
    });
    // Per-person math: 100 + 200 = 300, independent of targetServings.
    const { nutrition } = await generateShoppingList([
      { recipe: r1, targetServings: 2 },
      { recipe: r2, targetServings: 1 },
    ]);
    expect(nutrition.totalCalories).toBe(300);
    expect(nutrition.totalProtein).toBe(30);
    expect(nutrition.totalCarbs).toBe(15);
    expect(nutrition.totalFat).toBe(7);
    expect(nutrition.totalFiber).toBe(3);
  });

  test('falls back to deterministic output when sanitizer throws', async () => {
    const { GeminiService } = jest.requireMock('../../../utils/geminiService');
    GeminiService.sanitizeShoppingList.mockRejectedValueOnce(new Error('API down'));

    const recipe = makeRecipe({
      servings: 1,
      ingredients: [{ name: 'Chicken', quantity: 1, unit: 'lb' }],
    });
    const { markdown } = await generateShoppingList([{ recipe, targetServings: 1 }]);
    // Still renders the ingredient even though Gemini bailed.
    expect(markdown).toContain('Chicken');
    expect(markdown).toContain('## Meats');
  });

  test('nutrition is invariant to targetServings (regression)', async () => {
    const recipe = makeRecipe({
      id: 1,
      servings: 2,
      ingredients: [],
      nutrition: { calories: 500, protein: 30, carbs: 40, fat: 15, fiber: 5 },
    });
    const { nutrition: n1 } = await generateShoppingList([{ recipe, targetServings: 1 }]);
    const { nutrition: n4 } = await generateShoppingList([{ recipe, targetServings: 4 }]);
    expect(n1.totalCalories).toBe(500);
    expect(n4.totalCalories).toBe(500);
    expect(n1.totalProtein).toBe(n4.totalProtein);
  });

  test('unparseable quantity preserved as rawNote', async () => {
    const recipe = makeRecipe({
      servings: 1,
      ingredients: [{ name: 'salt', quantity: 'a pinch', unit: '' }],
    });
    const { markdown } = await generateShoppingList([{ recipe, targetServings: 1 }]);
    expect(markdown).toContain('a pinch');
  });

  test('ingredients are sorted alphabetically within category', async () => {
    const recipe = makeRecipe({
      servings: 1,
      ingredients: [
        { name: 'Zucchini', quantity: 1, unit: '' },
        { name: 'Apple', quantity: 1, unit: '' },
      ],
    });
    const { markdown } = await generateShoppingList([{ recipe, targetServings: 1 }]);
    const appleIdx = markdown.indexOf('Apple');
    const zucchiniIdx = markdown.indexOf('Zucchini');
    expect(appleIdx).toBeGreaterThan(-1);
    expect(zucchiniIdx).toBeGreaterThan(appleIdx);
  });
});

describe('aggregateIngredients', () => {
  test('handles zero baseline servings gracefully', async () => {
    const recipe = makeRecipe({
      servings: 0,
      ingredients: [{ name: 'salt', quantity: 1, unit: 'tsp' }],
    });
    const result = aggregateIngredients([{ recipe, targetServings: 2 }]);
    // scale fallback 1 → quantity 1
    expect(result[0].quantity).toBe(1);
  });

  test('handles null servings (undefined baseline → 1)', async () => {
    const recipe = makeRecipe({
      servings: null,
      ingredients: [{ name: 'salt', quantity: 1, unit: 'tsp' }],
    });
    const result = aggregateIngredients([{ recipe, targetServings: 2 }]);
    expect(result[0].quantity).toBe(2);
  });

  test('accumulates rawParts for unparseable and parseable', async () => {
    const a = makeRecipe({
      id: 1,
      servings: 1,
      ingredients: [{ name: 'salt', quantity: 'a pinch', unit: '' }],
    });
    const b = makeRecipe({
      id: 2,
      servings: 1,
      ingredients: [{ name: 'salt', quantity: 'a dash', unit: '' }],
    });
    const result = aggregateIngredients([
      { recipe: a, targetServings: 1 },
      { recipe: b, targetServings: 1 },
    ]);
    expect(result[0].rawNote).toContain('a pinch');
  });

  test('collapses garlic variants across recipes into one entry', async () => {
    const a = makeRecipe({
      id: 1,
      servings: 1,
      ingredients: [{ name: '1 clove garlic (, minced)', quantity: 1, unit: 'clove' }],
    });
    const b = makeRecipe({
      id: 2,
      servings: 1,
      ingredients: [{ name: 'fresh minced garlic', quantity: 2, unit: 'cloves' }],
    });
    const c = makeRecipe({
      id: 3,
      servings: 1,
      ingredients: [{ name: 'minced garlic', quantity: 1, unit: 'clove' }],
    });
    const result = aggregateIngredients([
      { recipe: a, targetServings: 1 },
      { recipe: b, targetServings: 1 },
      { recipe: c, targetServings: 1 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(4);
    expect(result[0].unit).toBe('clove');
  });

  test('sums chicken thighs stored with lb and pounds into one entry', async () => {
    const a = makeRecipe({
      id: 1,
      servings: 1,
      ingredients: [{ name: 'chicken thighs', quantity: 1, unit: 'lb' }],
    });
    const b = makeRecipe({
      id: 2,
      servings: 1,
      ingredients: [{ name: 'Chicken Thighs', quantity: 2, unit: 'pounds' }],
    });
    const result = aggregateIngredients([
      { recipe: a, targetServings: 1 },
      { recipe: b, targetServings: 1 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
    expect(result[0].unit).toBe('lb');
  });

  test('keeps chicken thighs and chicken breasts as separate entries', async () => {
    const a = makeRecipe({
      id: 1,
      servings: 1,
      ingredients: [{ name: 'chicken thighs', quantity: 1, unit: 'lb' }],
    });
    const b = makeRecipe({
      id: 2,
      servings: 1,
      ingredients: [{ name: 'chicken breasts', quantity: 1, unit: 'lb' }],
    });
    const result = aggregateIngredients([
      { recipe: a, targetServings: 1 },
      { recipe: b, targetServings: 1 },
    ]);
    expect(result).toHaveLength(2);
  });

  test('strips parentheticals and comma prep notes when keying', async () => {
    const a = makeRecipe({
      id: 1,
      servings: 1,
      ingredients: [{ name: 'salt (, to taste)', quantity: 1, unit: 'tsp' }],
    });
    const b = makeRecipe({
      id: 2,
      servings: 1,
      ingredients: [{ name: 'kosher salt', quantity: 0.5, unit: 'teaspoons' }],
    });
    const result = aggregateIngredients([
      { recipe: a, targetServings: 1 },
      { recipe: b, targetServings: 1 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(1.5);
    expect(result[0].unit).toBe('tsp');
  });

  test('first-occurrence display name is preserved on merge', async () => {
    const a = makeRecipe({
      id: 1,
      servings: 1,
      ingredients: [{ name: 'chicken thighs (bone in + skin on)', quantity: 1, unit: 'lb' }],
    });
    const b = makeRecipe({
      id: 2,
      servings: 1,
      ingredients: [{ name: 'chicken thighs', quantity: 1, unit: 'lb' }],
    });
    const result = aggregateIngredients([
      { recipe: a, targetServings: 1 },
      { recipe: b, targetServings: 1 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('chicken thighs (bone in + skin on)');
  });
});

describe('generateShoppingList — sanitizer integration', () => {
  test('uses Gemini sanitizer output for rendering (categories, names, quantities)', async () => {
    const { GeminiService } = jest.requireMock('../../../utils/geminiService');

    // Seven recipes with messy data that the deterministic layer won't fully clean.
    const meals: RecipeWithServings[] = Array.from({ length: 7 }, (_, i) => ({
      recipe: makeRecipe({
        id: i + 1,
        name: `Recipe ${i + 1}`,
        servings: 1,
        ingredients: [
          { name: 'fresh minced garlic', quantity: 1, unit: 'clove' },
          { name: 'Dried oregano', quantity: 0.3, unit: 'tsp' },
          { name: 'cilantro (, for garnish)', quantity: 1, unit: 'bunch' },
        ],
      }),
      targetServings: 2,
    }));

    // Mock Gemini to return the cleaned, consolidated version we'd expect.
    GeminiService.sanitizeShoppingList.mockResolvedValueOnce({
      items: [
        { name: 'garlic', quantity: 7, unit: 'clove', category: 'produce' },
        { name: 'dried oregano', quantity: '2 1/4', unit: 'tsp', category: 'spices' },
        { name: 'cilantro', quantity: 7, unit: 'bunch', category: 'produce' },
      ],
      warnings: [],
    });

    const { markdown } = await generateShoppingList(meals);

    // Cilantro is in Produce, not Bakery or Other.
    expect(markdown).toContain('## Produce');
    expect(markdown.match(/cilantro/gi)?.length).toBe(1); // single entry
    expect(markdown).toContain('garlic');

    // Dried oregano lives under Spices.
    expect(markdown).toContain('## Spices');
    const oreganoMatches = markdown.match(/oregano/gi);
    expect(oreganoMatches?.length).toBe(1);

    // Awkward decimals (0.3 scaled by 2 = 0.6 across 7 recipes = 4.2 tsp) are replaced
    // with the sanitizer's fraction string "2 1/4".
    expect(markdown).toContain('2 1/4 tsp dried oregano');
    expect(markdown).not.toMatch(/0\.\d/);
  });

  test('logs sanitizer warnings at info level when present', async () => {
    const { GeminiService } = jest.requireMock('../../../utils/geminiService');
    const { logger } = jest.requireMock('../../../shared/utils/logger');
    GeminiService.sanitizeShoppingList.mockResolvedValueOnce({
      items: [{ name: 'salt', quantity: 1, unit: 'tsp', category: 'pantry' }],
      warnings: ['could not merge two variants of soy sauce'],
    });

    const meals: RecipeWithServings[] = [
      {
        recipe: makeRecipe({
          id: 1,
          servings: 1,
          ingredients: [{ name: 'salt', quantity: 1, unit: 'tsp' }],
        }),
        targetServings: 1,
      },
    ];
    await generateShoppingList(meals);
    expect(logger.info).toHaveBeenCalledWith(
      '[shoppingList] Sanitizer returned warnings',
      expect.objectContaining({ warnings: expect.any(Array) })
    );
  });

  test('falls back to deterministic aggregation when sanitizer throws, preserving all items', async () => {
    const { GeminiService } = jest.requireMock('../../../utils/geminiService');
    GeminiService.sanitizeShoppingList.mockRejectedValueOnce(new Error('network'));

    const meals: RecipeWithServings[] = [
      {
        recipe: makeRecipe({
          id: 1,
          servings: 1,
          ingredients: [
            { name: 'garlic', quantity: 2, unit: 'clove' },
            { name: 'oregano', quantity: 1, unit: 'tsp' },
          ],
        }),
        targetServings: 1,
      },
    ];
    const { markdown } = await generateShoppingList(meals);
    expect(markdown).toContain('garlic');
    expect(markdown).toContain('oregano');
  });
});
