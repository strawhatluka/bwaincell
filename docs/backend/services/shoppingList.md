# shoppingList Service

**Source:** `backend/utils/shoppingList.ts`
**Role:** Aggregate ingredients across a weekly meal plan into a consolidated, categorized shopping list.

## Exported Types

```ts
interface RecipeWithServings {
  recipe: RecipeRow;
  targetServings: number;
}

interface AggregatedIngredient {
  name: string;
  quantity: number | null;
  unit: string;
  category: string;
  rawNote?: string; // Present if any source ingredient had an unparseable quantity
}

interface WeeklyNutrition {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
}
```

## Categories

`CATEGORIES = ['meats', 'produce', 'dairy', 'pantry', 'spices', 'frozen', 'bakery', 'other']`.

Category is taken from the ingredient's explicit `category` field if valid; otherwise inferred from the name via `CATEGORY_KEYWORDS` (substring match, first-cat-wins order: `meats → bakery → dairy → produce → spices → pantry`). Names containing `"frozen"` short-circuit to `'frozen'`.

## Exported Functions

| Function | Signature | Purpose |
| -------- | --------- | ------- |
| `parseQuantity` | `(qty: string \| number) => number \| null` | Parses numbers, mixed fractions (`"1 1/2"`), simple fractions (`"1/2"`), and decimal strings. |
| `categorizeIngredient` | `(ingredient: { name, category? }) => string` | See Categories above. |
| `aggregateIngredients` | `(meals: RecipeWithServings[]) => AggregatedIngredient[]` | Core aggregator. |
| `calculateWeeklyNutrition` | `(meals: RecipeWithServings[]) => WeeklyNutrition` | Scales each recipe's `nutrition` to target servings and sums. |

## Aggregation Algorithm

For each `(recipe, targetServings)` pair:
1. `scale = targetServings / recipe.servings` (defaults to `1` if `servings` is 0 or null).
2. For every ingredient: `key = ${canonicalName}|${canonicalUnit}` via `canonicalizeIngredient()`.
3. Parse quantity via `parseQuantity`; multiply by `scale`.
4. If the key already exists and the scaled quantity is numeric, sum; if unparseable, append a raw note.
5. Final pass: round via `roundQuantity(qty, name, unit)` — countable items (`egg`, `onion`, etc., or countable units like `piece`) round UP; others round to 2 decimals.

First occurrence "wins" for the display name; canonical unit is used for display so `"lb"` is consistent even if sources wrote `"pounds"`.

## AI Sanitization (Gemini)

After aggregation, `GeminiService.sanitizeShoppingList(items: SanitizerInputItem[])` may be called to collapse remaining near-duplicates (e.g., `"olive oil"` + `"extra-virgin olive oil"` → kept separate; `"tomato"` + `"tomatoes"` → merged). Returns `{ items: SanitizedItem[], warnings: string[] }`. See [geminiService.md](./geminiService.md).

## Example

```ts
import { aggregateIngredients, calculateWeeklyNutrition } from '@/utils/shoppingList';

const meals = [
  { recipe: curryRecipe, targetServings: 4 },
  { recipe: saladRecipe, targetServings: 2 },
];

const list = aggregateIngredients(meals);
// [{ name: 'chicken breast', quantity: 2, unit: 'lb', category: 'meats' }, ...]

const nutrition = calculateWeeklyNutrition(meals);
// { totalCalories, totalProtein, ... }
```

## Related

- [ingredientCanonical.md](./ingredientCanonical.md) — key normalization.
- [geminiService.md](./geminiService.md) — post-aggregation AI cleanup.
- [fractionFormat.ts] — `formatQuantity` used for display (delegated to `fractionFormat` module).
