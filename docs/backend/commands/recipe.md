# `/recipe` Command Reference

**Source:** `backend/commands/recipe.ts`
**Interaction handlers:** `backend/utils/interactions/handlers/recipeHandlers.ts`

Recipe ingestion, search, favorites, AI meal planning, and shopping-list generation.

## Subcommands

| Subcommand | Options | Purpose |
| ---------- | ------- | ------- |
| `add` | `link` (string, required) | Ingest a recipe via [recipeIngestion](../services/recipeIngestion.md) — scrape → AI fill → persist. |
| `view` | `recipe` (string, required, autocomplete); `servings` (integer, required, 1..50) | Display the recipe scaled to the given serving count using `scaleIngredient()`. |
| `delete` | `recipe` (string, required, autocomplete) | Delete the recipe via `Recipe.deleteRecipe`. |
| `edit` | `recipe` (string, required, autocomplete) | Enter the recipe edit interaction flow. |
| `search` | `cuisine`, `difficulty` (`easy`/`medium`/`hard`), `tag`, `keyword`, `max_prep_time` — all optional | Calls `Recipe.searchByFilters` then renders results. |
| `favorite` | `recipe` (string, required, autocomplete) | `Recipe.toggleFavorite(id, guildId)`. |
| `plan` | — | Start the interactive meal-plan builder. |
| `swap` | `slot` (integer, required, 1..7) | `MealPlan.swapMeal(...)` on the active plan. |
| `week` | — | Show the active `MealPlan.getActivePlan(guildId)`. |
| `history` | — | `MealPlan.getArchivedPlans(guildId, 10)`. |
| `preferences` | `action` (`view`, `add_restriction`, `remove_restriction`, `add_exclusion`, `remove_exclusion`, `clear`); `value` (string, optional) | Delegates to `RecipePreferences` methods. |

## Autocomplete

The `recipe` option on `view`, `delete`, `edit`, `favorite` autocompletes against `Recipe.getRecipes(guildId)`, sorted favorites-first and alpha. Names prefixed with `★` for favorites. Max 25 results (Discord limit).

## Session State (`plan`)

In-memory session keyed by `${guildId}:${userId}`:

```ts
interface PlanSession {
  userId: string;
  guildId: string;
  mode: 'pick' | 'ai';
  selectedRecipeIds: number[];
  aiSuggestions?: number[];
  stage: 'picking' | 'confirming' | 'servings';
  servingsCollected: number[];
  currentPage: number;
  createdAt: number;
}
```

Stored in `planSessions: Map<string, PlanSession>` with a 15-minute TTL (purged on access). Exports `planSessionKey`, `getPlanSession`, `planSessions`, `getWeekStart`.

## Custom IDs (handled in `recipeHandlers.ts`)

- `recipe_view_full_<id>` — expand recipe detail embed after add.
- `recipe_plan_*` — plan-builder buttons and select menus.

## Data Flow

```
/recipe add → ingestRecipeFromUrl → Recipe.createRecipe
/recipe plan → in-memory PlanSession → MealPlan.upsertPlan
/recipe week → MealPlan.getActivePlan → Recipe.getRecipe (each slot)
/recipe swap → MealPlan.swapMeal
/recipe preferences → RecipePreferences.{upsert,add*,remove*}Preferences
```

Shopping-list generation (triggered from plan/week handlers) uses [shoppingList.md](../services/shoppingList.md) → [geminiService.md](../services/geminiService.md).

## Embed Formatting

- Badges: cuisine, difficulty (each with provenance glyph: `🔍` source, `🤖` researched).
- Fields: Servings, Prep Time, Cook Time, Dietary tags, Ingredients count, Nutrition, Preview (first 5 ingredients formatted via `formatQuantity`).
- Footer: `Source: <type> • Pass 1: <JSON-LD|microdata|OpenGraph|AI URL parse|AI file parse> • [AI research filled gaps] • <truncated source URL>`.

## Helper Exports (for tests)

`scaleIngredient(ingredient, scale) => string`, `sanitizeFilename(name) => string`.

## Errors

- `❌ This command can only be used in a server.` — no `guildId`.
- `❌ Failed to parse recipe: <msg>. You can add it manually with /recipe edit after creation, or try a different source.` — when `ingestRecipeFromUrl` throws.
- Name deduping: `resolveUniqueName()` appends ` (2)`, ` (3)`, ... on case-insensitive collisions.

## Models

- [Recipe](../models/Recipe.md)
- [MealPlan](../models/MealPlan.md)
- [RecipePreferences](../models/RecipePreferences.md)
