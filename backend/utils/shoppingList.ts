import type { RecipeRow, RecipeIngredient } from '../../supabase/types';
import { formatQuantity as formatQtyAsFraction } from './fractionFormat';
import { canonicalizeIngredient } from './ingredientCanonical';

export interface RecipeWithServings {
  recipe: RecipeRow;
  targetServings: number;
}

export interface WeeklyNutrition {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
}

export interface AggregatedIngredient {
  name: string;
  quantity: number | null;
  unit: string;
  category: string;
  /** If any ingredient in the aggregate had an unparseable quantity, keep raw note. */
  rawNote?: string;
}

const CATEGORIES = [
  'meats',
  'produce',
  'dairy',
  'pantry',
  'spices',
  'frozen',
  'bakery',
  'other',
] as const;

const COUNTABLE_UNITS = new Set([
  '',
  'whole',
  'piece',
  'pieces',
  'each',
  'item',
  'items',
  'clove',
  'cloves',
]);

const COUNTABLE_ITEMS = new Set([
  'egg',
  'eggs',
  'onion',
  'onions',
  'apple',
  'apples',
  'banana',
  'bananas',
  'lemon',
  'lemons',
  'lime',
  'limes',
  'tomato',
  'tomatoes',
  'potato',
  'potatoes',
  'avocado',
  'avocados',
  'carrot',
  'carrots',
  'pepper',
  'peppers',
  'tortilla',
  'tortillas',
  'bun',
  'buns',
  'bagel',
  'bagels',
]);

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  meats: [
    'chicken',
    'beef',
    'pork',
    'turkey',
    'fish',
    'salmon',
    'tuna',
    'shrimp',
    'lamb',
    'bacon',
    'sausage',
  ],
  produce: [
    'onion',
    'garlic',
    'tomato',
    'lettuce',
    'carrot',
    'potato',
    'spinach',
    'broccoli',
    'pepper',
    'apple',
    'banana',
    'lemon',
    'lime',
    'avocado',
    'celery',
    'cucumber',
  ],
  dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg'],
  pantry: [
    'flour',
    'sugar',
    'rice',
    'pasta',
    'oil',
    'vinegar',
    'salt',
    'honey',
    'broth',
    'stock',
    'sauce',
  ],
  spices: ['cumin', 'paprika', 'oregano', 'basil', 'thyme', 'cinnamon', 'cayenne', 'pepper'],
  bakery: ['bread', 'tortilla', 'bun', 'bagel'],
};

/**
 * Parse a quantity value that may be a number, a mixed fraction like "1 1/2",
 * a simple fraction like "1/2", or a decimal string. Returns null if unparseable.
 */
export function parseQuantity(qty: string | number): number | null {
  if (typeof qty === 'number') {
    return isNaN(qty) ? null : qty;
  }
  const str = String(qty).trim();
  if (!str) return null;

  const mixed = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const denom = parseInt(mixed[3], 10);
    if (denom === 0) return null;
    return parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / denom;
  }

  const frac = str.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const denom = parseInt(frac[2], 10);
    if (denom === 0) return null;
    return parseInt(frac[1], 10) / denom;
  }

  const num = parseFloat(str);
  if (!isNaN(num) && /^-?\d*\.?\d+/.test(str)) {
    return num;
  }
  return null;
}

/**
 * Categorize an ingredient using its explicit category, or infer from the name.
 */
export function categorizeIngredient(ingredient: {
  name: string;
  category?: string | null;
}): string {
  const explicit = ingredient.category;
  if (explicit && CATEGORIES.includes(explicit as (typeof CATEGORIES)[number])) {
    return explicit;
  }

  const name = ingredient.name.toLowerCase();

  if (name.includes('frozen')) return 'frozen';

  for (const cat of ['meats', 'bakery', 'dairy', 'produce', 'spices', 'pantry'] as const) {
    const keywords = CATEGORY_KEYWORDS[cat];
    for (const kw of keywords) {
      if (name.includes(kw)) return cat;
    }
  }
  return 'other';
}

function isCountable(name: string, unit: string): boolean {
  const u = unit.trim().toLowerCase();
  if (COUNTABLE_UNITS.has(u)) return true;
  const lowerName = name.toLowerCase();
  for (const item of COUNTABLE_ITEMS) {
    if (lowerName.includes(item)) return true;
  }
  return false;
}

function roundQuantity(qty: number, name: string, unit: string): number {
  if (isCountable(name, unit)) {
    return Math.ceil(qty);
  }
  return Math.round(qty * 100) / 100;
}

/**
 * Aggregate ingredients across meals, scaling per target servings.
 * Returns a list of aggregated ingredients with computed quantities/categories.
 */
export function aggregateIngredients(meals: RecipeWithServings[]): AggregatedIngredient[] {
  const map = new Map<
    string,
    {
      name: string;
      unit: string;
      category: string;
      quantity: number | null;
      rawParts: string[];
    }
  >();

  for (const { recipe, targetServings } of meals) {
    const baselineServings = recipe.servings ?? 1;
    const scale = baselineServings > 0 ? targetServings / baselineServings : 1;

    const ingredients: RecipeIngredient[] = recipe.ingredients ?? [];
    for (const ing of ingredients) {
      const canon = canonicalizeIngredient(ing.name, ing.unit ?? '');
      const key = `${canon.canonicalName}|${canon.canonicalUnit}`;
      const parsed = parseQuantity(ing.quantity);
      const scaledQty = parsed !== null ? parsed * scale : null;

      const existing = map.get(key);
      if (existing) {
        if (scaledQty !== null) {
          existing.quantity = (existing.quantity ?? 0) + scaledQty;
        } else {
          existing.rawParts.push(String(ing.quantity));
        }
      } else {
        // First occurrence wins for display name; canonical unit on display for consistency.
        map.set(key, {
          name: ing.name,
          unit: canon.canonicalUnit,
          category: categorizeIngredient(ing),
          quantity: scaledQty,
          rawParts: scaledQty === null ? [String(ing.quantity)] : [],
        });
      }
    }
  }

  const result: AggregatedIngredient[] = [];
  for (const entry of map.values()) {
    const roundedQty =
      entry.quantity !== null ? roundQuantity(entry.quantity, entry.name, entry.unit) : null;
    result.push({
      name: entry.name,
      quantity: roundedQty,
      unit: entry.unit,
      category: entry.category,
      rawNote: entry.rawParts.length > 0 ? entry.rawParts.join(', ') : undefined,
    });
  }
  return result;
}

function formatIngredientLine(ing: AggregatedIngredient): string {
  const parts: string[] = [];
  if (ing.quantity !== null && ing.quantity !== undefined) {
    parts.push(formatQtyAsFraction(ing.quantity));
  } else if (ing.rawNote) {
    parts.push(ing.rawNote);
  }
  if (ing.unit && ing.unit.trim()) {
    parts.push(ing.unit);
  }
  parts.push(ing.name);
  const body = parts.join(' ').replace(/\s+/g, ' ').trim();
  return body ? `- [ ] ${body}` : `- [ ] ${ing.name}`;
}

const CATEGORY_TITLES: Record<string, string> = {
  meats: 'Meats',
  produce: 'Produce',
  dairy: 'Dairy',
  spices: 'Spices',
  pantry: 'Pantry',
  frozen: 'Frozen',
  bakery: 'Bakery',
  other: 'Other',
};

const CATEGORY_ORDER: string[] = [
  'meats',
  'produce',
  'dairy',
  'spices',
  'pantry',
  'frozen',
  'bakery',
  'other',
];

/**
 * Build a shopping list markdown + weekly nutrition totals from the provided meals.
 */
export function generateShoppingList(meals: RecipeWithServings[]): {
  markdown: string;
  nutrition: WeeklyNutrition;
} {
  const aggregated = aggregateIngredients(meals);

  // Group by category
  const grouped: Record<string, AggregatedIngredient[]> = {};
  for (const ing of aggregated) {
    const cat = ing.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(ing);
  }

  // Nutrition
  const nutrition: WeeklyNutrition = {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    totalFiber: 0,
  };
  let missingNutritionCount = 0;
  // Nutrition is per-person: sum per-serving macros across meals, regardless
  // of how many people each meal serves. Each person eats one serving per meal.
  for (const { recipe } of meals) {
    const n = recipe.nutrition;
    if (!n) {
      missingNutritionCount++;
      continue;
    }
    nutrition.totalCalories += n.calories ?? 0;
    nutrition.totalProtein += n.protein ?? 0;
    nutrition.totalCarbs += n.carbs ?? 0;
    nutrition.totalFat += n.fat ?? 0;
    nutrition.totalFiber += n.fiber ?? 0;
  }

  const totalPeople = meals.reduce((sum, m) => sum + m.targetServings, 0);

  const lines: string[] = [];
  lines.push('# Shopping List');
  lines.push('');
  lines.push(`_Generated for ${meals.length} meals • ${totalPeople} total servings_`);
  lines.push('');

  for (const cat of CATEGORY_ORDER) {
    const items = grouped[cat];
    if (!items || items.length === 0) continue;
    lines.push(`## ${CATEGORY_TITLES[cat]}`);
    // Sort items alphabetically by name for stable output
    const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
    for (const ing of sorted) {
      lines.push(formatIngredientLine(ing));
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Meals This Week');
  lines.push('');
  meals.forEach((m, idx) => {
    lines.push(`${idx + 1}. ${m.recipe.name} — ${m.targetServings} servings`);
  });

  if (missingNutritionCount > 0) {
    lines.push('');
    lines.push(
      `_Note: Nutrition data missing for ${missingNutritionCount} recipes; totals may be incomplete._`
    );
  }

  return {
    markdown: lines.join('\n'),
    nutrition,
  };
}
