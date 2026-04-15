# recipeHandlers

**Source:** `backend/utils/interactions/handlers/recipeHandlers.ts`

Button, select-menu and modal handlers for the `/recipe plan` flow — a multi-step interactive flow that selects 7 recipes, collects servings, and produces a meal plan plus a shopping list.

## Key Constants

- `RECIPES_PER_PAGE = 25` — page size for the pick-myself select menu.

## Shared Session Helpers

Plan state lives in an in-memory map keyed by `{guildId}:{userId}` (imported from `backend/commands/recipe`):

- `planSessions`, `planSessionKey`, `getPlanSession` — session accessors.
- `getWeekStart` — returns Monday-based week anchor for meal plan records.
- `scaleIngredient` — scales a `RecipeIngredient` by desired servings / recipe servings.
- `sanitizeFilename` — strips filesystem-unsafe chars for the generated `.txt` shopping list attachment.
- `PlanSession` type — `{ selectedRecipeIds, step, mode, servings, ... }`.

Internal:

- `requireSession(interaction)` — returns `PlanSession | null`.
- `sessionError(interaction)` — emits `"Your meal plan session has expired…"` via edit or ephemeral reply.
- `truncateLabel(text, max=100)` — ellipsis-aware truncation for select menu options.

## Dependencies

`Recipe`, `MealPlan`, `RecipePreferences` models; `GeminiService` (AI recipe choice and shopping list refinement); `generateShoppingList` + `RecipeWithServings` from `../../shoppingList`.

## Exported Handlers

The file exports button, select, and modal entry-points (imported by dispatcher in `selectMenuHandlers` and the main interaction router). They handle customIds matching:

| Pattern | Surface | Purpose |
|---|---|---|
| `recipe_plan_start` | Button | Kick off plan session; present mode choice. |
| `recipe_plan_mode_pick` / `recipe_plan_mode_auto` | Buttons | "Pick Myself" vs "Bwaincell Chooses". |
| `recipe_plan_pick_{page}` | StringSelect | Multi-select from paginated recipe list (up to 7 total). `maxValues` is clamped to `max(1, min(remaining, sliceLength))`. |
| `recipe_plan_next_page_{page}` / `recipe_plan_prev_page_{page}` | Buttons | Page navigation for pick-myself. |
| `recipe_plan_confirm` | Button | Moves to servings-collection step. |
| `recipe_plan_servings_modal_{recipeId}` | Modal | Collects desired servings per selected recipe. |
| `recipe_plan_finalize` | Button | Writes `MealPlan` record, renders shopping list via `generateShoppingList`, sends TXT attachment, clears session. |
| `recipe_plan_cancel` | Button | Clears session and ends flow. |
| `recipe_view_{id}`, `recipe_edit_{id}`, `recipe_delete_{id}`, `recipe_favorite_{id}` | Buttons | Standard per-recipe actions. |
| `recipe_swap_{slot}` | Button | Swap a recipe inside an existing meal plan. |
| `recipe_week_{offset}` | Button | Navigate between weekly meal plans. |
| `recipe_history_*` | Button | History browsing. |

## Select Menu Option Construction

For pick-myself pages, each option:
- label: `(★ if favorite)name`, truncated to 100 chars
- value: `String(recipe.id)`
- description: `cuisine • difficulty` (if present)

## State Transitions

1. start → mode select → (pick | auto)
2. pick → multi-page selects until `selectedRecipeIds.length === 7`
3. auto → `GeminiService.chooseRecipes(preferences, pool)` populates selection
4. selection complete → servings modals per recipe
5. finalize → `MealPlan.create`, `generateShoppingList`, TXT attachment, session cleanup

## Error Handling

All handlers catch errors and call `sessionError` or a unified error response. Session expiry is always user-surfaced with the `/recipe plan` restart hint.
