# Recipe Model

**Source:** `supabase/models/Recipe.ts`
**Table:** `recipes`
**Schema:** `supabase/migrations/20260414000000_recipes_schema.sql`

Guild-scoped recipes ingested from URLs/videos/manual entries with structured ingredients, instructions, nutrition, and provenance-aware metadata.

## Columns

| Column              | Type                 | Constraints                     |
| ------------------- | -------------------- | ------------------------------- |
| `id`                | SERIAL               | PRIMARY KEY                     |
| `name`              | VARCHAR(255)         | NOT NULL                        |
| `source_url`        | TEXT                 | nullable                        |
| `source_type`       | `recipe_source_type` | NOT NULL, DEFAULT `'manual'`    |
| `ingredients`       | JSONB                | NOT NULL — `RecipeIngredient[]` |
| `instructions`      | JSONB                | NOT NULL — `string[]`           |
| `servings`          | INTEGER              | nullable                        |
| `prep_time_minutes` | INTEGER              | nullable                        |
| `cook_time_minutes` | INTEGER              | nullable                        |
| `nutrition`         | JSONB                | nullable — `RecipeNutrition`    |
| `cuisine`           | VARCHAR(100)         | nullable                        |
| `difficulty`        | `recipe_difficulty`  | nullable (`easy\|medium\|hard`) |
| `dietary_tags`      | JSONB                | NOT NULL, DEFAULT `'[]'::jsonb` |
| `image_url`         | TEXT                 | nullable                        |
| `notes`             | TEXT                 | nullable                        |
| `is_favorite`       | BOOLEAN              | NOT NULL, DEFAULT FALSE         |
| `created_at`        | TIMESTAMPTZ          | NOT NULL, DEFAULT `NOW()`       |
| `updated_at`        | TIMESTAMPTZ          | NOT NULL, DEFAULT `NOW()`       |
| `user_id`           | VARCHAR(255)         | NOT NULL (audit trail)          |
| `guild_id`          | VARCHAR(255)         | NOT NULL                        |

Enums:

- `recipe_source_type`: `website | video | file | manual`
- `recipe_difficulty`: `easy | medium | hard`

Indexes: `idx_recipes_guild_id`, `idx_recipes_guild_favorite` (composite), `idx_recipes_cuisine`, `idx_recipes_difficulty`.

## JSONB Shapes

```ts
interface RecipeIngredient {
  name: string;
  quantity: number | string | null;
  unit: string | null;
  category?: string; // 'meats' | 'produce' | 'dairy' | 'pantry' | 'spices' | 'frozen' | 'bakery' | 'other'
}

interface RecipeNutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}
```

## Scraping Provenance

Provenance is NOT persisted on the row. It is computed during ingestion (see [recipeIngestion.md](../services/recipeIngestion.md)) and surfaced in the embed only. On-disk fields mirror the final merged values (source wins, research fills gaps).

## Static Methods

| Method            | Signature                                                            | Returns                                                 |
| ----------------- | -------------------------------------------------------------------- | ------------------------------------------------------- |
| `createRecipe`    | `(data: RecipeInsert)`                                               | `Promise<RecipeRow>`                                    |
| `getRecipes`      | `(guildId)`                                                          | `Promise<RecipeRow[]>` (favorites first, then name ASC) |
| `getRecipe`       | `(id, guildId)`                                                      | `Promise<RecipeRow \| null>`                            |
| `updateRecipe`    | `(id, guildId, data: RecipeUpdate)`                                  | `Promise<RecipeRow \| null>` (bumps `updated_at`)       |
| `deleteRecipe`    | `(id, guildId)`                                                      | `Promise<boolean>`                                      |
| `searchByName`    | `(guildId, query)`                                                   | `Promise<RecipeRow[]>` — ILIKE                          |
| `searchByFilters` | `(guildId, { cuisine?, difficulty?, tag?, keyword?, maxPrepTime? })` | `Promise<RecipeRow[]>` — `tag` uses JSONB `contains`    |
| `toggleFavorite`  | `(id, guildId)`                                                      | `Promise<RecipeRow \| null>`                            |
| `getFavorites`    | `(guildId)`                                                          | `Promise<RecipeRow[]>`                                  |
| `getRandom`       | `(guildId)`                                                          | `Promise<RecipeRow \| null>` (random selection in JS)   |

## Relationships

- Referenced by `meal_plans.recipe_ids INTEGER[]` (no FK — integer array stores the slot order). See [MealPlan.md](./MealPlan.md).
- Guild-level preferences stored in `recipe_preferences`; no row-level FK. See [RecipePreferences.md](./RecipePreferences.md).

## Example

```ts
import Recipe from '@database/models/Recipe';

await Recipe.createRecipe({
  guild_id: guildId,
  user_id: userId,
  name: 'Chicken Curry',
  source_url: 'https://example.com/curry',
  source_type: 'website',
  ingredients: [{ name: 'chicken breast', quantity: 1, unit: 'lb' }],
  instructions: ['Brown chicken', 'Simmer sauce'],
  servings: 4,
  prep_time_minutes: 15,
  cook_time_minutes: 30,
  dietary_tags: ['gluten-free'],
});

const vegan = await Recipe.searchByFilters(guildId, { tag: 'vegan', maxPrepTime: 30 });
await Recipe.toggleFavorite(recipeId, guildId);
```

## Related

- Command: [docs/api/discord-commands.md#9-recipe-management---recipe](../../api/discord-commands.md#9-recipe-management---recipe)
- Ingestion pipeline: [docs/backend/services/recipeIngestion.md](../services/recipeIngestion.md)
- Meal plans: [docs/backend/models/MealPlan.md](./MealPlan.md)
- Preferences: [docs/backend/models/RecipePreferences.md](./RecipePreferences.md)
