# MealPlan Model

**Source:** `supabase/models/MealPlan.ts`
**Table:** `meal_plans`
**Schema:** `supabase/migrations/20260414000000_recipes_schema.sql`

Weekly meal plans. Exactly one active plan per guild, enforced by a partial unique index.

## Columns

| Column                | Type         | Constraints                    |
| --------------------- | ------------ | ------------------------------ |
| `id`                  | SERIAL       | PRIMARY KEY                    |
| `recipe_ids`          | INTEGER[]    | NOT NULL — length 7            |
| `servings_per_recipe` | INTEGER[]    | NOT NULL — length 7, parallel  |
| `week_start`          | DATE         | NOT NULL                       |
| `archived`            | BOOLEAN      | NOT NULL, DEFAULT FALSE        |
| `created_at`          | TIMESTAMPTZ  | NOT NULL, DEFAULT `NOW()`      |
| `updated_at`          | TIMESTAMPTZ  | NOT NULL, DEFAULT `NOW()`      |
| `user_id`             | VARCHAR(255) | NOT NULL (last-editor audit)   |
| `guild_id`            | VARCHAR(255) | NOT NULL                       |

### Indexes

- `idx_meal_plans_guild_active` — UNIQUE partial, `WHERE archived = FALSE` → guarantees one active plan per guild.
- `idx_meal_plans_guild_archived` — `(guild_id, archived, created_at DESC)` for history queries.

## Recipe Foreign References

`recipe_ids` is an INTEGER[] referencing `recipes.id`. No FK is enforced — the app resolves IDs via `Recipe.getRecipe(id, guildId)`. Ordering is semantically meaningful (slots 0..6 = 7 days of the week; `backend/commands/recipe.ts::getWeekStart()` returns the Monday of the current week).

## Static Methods

| Method | Signature | Returns |
| ------ | --------- | ------- |
| `getActivePlan` | `(guildId)` | `Promise<MealPlanRow \| null>` |
| `upsertPlan` | `({ recipeIds, servingsPerRecipe, weekStart, userId, guildId })` | `Promise<MealPlanRow>` — archives existing active plan(s) first, then inserts. |
| `swapMeal` | `(guildId, slotIndex, newRecipeId, newServings)` | `Promise<MealPlanRow \| null>` |
| `updateServings` | `(guildId, slotIndex, servings)` | `Promise<MealPlanRow \| null>` |
| `getArchivedPlans` | `(guildId, limit=10)` | `Promise<MealPlanRow[]>` (newest first) |
| `getPlanById` | `(id, guildId)` | `Promise<MealPlanRow \| null>` |

## Guild Isolation

All methods filter by `guild_id`. The partial unique index means a second `INSERT ... archived=false` from the same guild will fail; `upsertPlan` bypasses this by flipping the current row to `archived=true` in the same transactional flow before inserting.

## Example

```ts
import MealPlan from '@database/models/MealPlan';

await MealPlan.upsertPlan({
  recipeIds: [1, 2, 3, 4, 5, 6, 7],
  servingsPerRecipe: [4, 4, 2, 4, 6, 4, 4],
  weekStart: '2026-04-13', // Monday
  userId,
  guildId,
});

await MealPlan.swapMeal(guildId, 2, 99, 4);
const history = await MealPlan.getArchivedPlans(guildId, 5);
```

## Related

- Referenced recipes: [docs/backend/models/Recipe.md](./Recipe.md)
- Weekly plan UI + week-start helper: [docs/backend/commands/recipe.md](../commands/recipe.md)
