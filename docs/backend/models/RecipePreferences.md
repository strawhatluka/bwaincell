# RecipePreferences Model

**Source:** `supabase/models/RecipePreferences.ts`
**Table:** `recipe_preferences`
**Schema:** `supabase/migrations/20260414000000_recipes_schema.sql`

One row per guild storing household-level dietary restrictions and excluded cuisines used by the AI meal planner and recipe filtering.

## Columns

| Column                 | Type         | Constraints                     |
| ---------------------- | ------------ | ------------------------------- |
| `id`                   | SERIAL       | PRIMARY KEY                     |
| `guild_id`             | VARCHAR(255) | NOT NULL, UNIQUE                |
| `dietary_restrictions` | JSONB        | NOT NULL, DEFAULT `'[]'::jsonb` |
| `excluded_cuisines`    | JSONB        | NOT NULL, DEFAULT `'[]'::jsonb` |
| `created_at`           | TIMESTAMPTZ  | NOT NULL, DEFAULT `NOW()`       |
| `updated_at`           | TIMESTAMPTZ  | NOT NULL, DEFAULT `NOW()`       |
| `user_id`              | VARCHAR(255) | NOT NULL (audit trail)          |

`dietary_restrictions` examples: `["vegetarian", "gluten-free"]`.
`excluded_cuisines` examples: `["thai", "indian"]`.

## Static Methods

| Method | Signature | Returns |
| ------ | --------- | ------- |
| `getPreferences` | `(guildId)` | `Promise<RecipePreferencesRow \| null>` |
| `upsertPreferences` | `(guildId, userId, { dietary_restrictions?, excluded_cuisines? })` | `Promise<RecipePreferencesRow>` — upsert on `guild_id` |
| `addDietaryRestriction` | `(guildId, userId, restriction)` | `Promise<RecipePreferencesRow>` (dedupes) |
| `removeDietaryRestriction` | `(guildId, userId, restriction)` | `Promise<RecipePreferencesRow>` |
| `addExcludedCuisine` | `(guildId, userId, cuisine)` | `Promise<RecipePreferencesRow>` |
| `removeExcludedCuisine` | `(guildId, userId, cuisine)` | `Promise<RecipePreferencesRow>` |

Each add/remove helper reads current state, mutates the array, and calls `upsertPreferences`.

## Example

```ts
import RecipePreferences from '@database/models/RecipePreferences';

await RecipePreferences.addDietaryRestriction(guildId, userId, 'vegetarian');
await RecipePreferences.addExcludedCuisine(guildId, userId, 'thai');
const prefs = await RecipePreferences.getPreferences(guildId);
// prefs.dietary_restrictions => ['vegetarian']
```

## Related

- Command: `/recipe preferences` — see [docs/api/discord-commands.md#9-recipe-management---recipe](../../api/discord-commands.md#9-recipe-management---recipe)
- Used by AI meal-plan suggestion flow in [docs/backend/commands/recipe.md](../commands/recipe.md)
