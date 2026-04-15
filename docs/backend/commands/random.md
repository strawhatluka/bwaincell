# /random Command

**Source:** `backend/commands/random.ts`
**Handler:** `backend/utils/interactions/handlers/randomHandlers.ts`
**Depends on:** `backend/utils/geminiService` (`GeminiService`), `backend/utils/recipeData` (`movieData`), `backend/utils/fractionFormat` (`formatQuantity`), `supabase/models/Recipe`, `supabase/types` (`RecipeIngredient`).

Various random generators.

## Subcommands

| Subcommand | Options | Behavior |
|---|---|---|
| `movie` | — | Random title from `movieData`. Embed includes year, genre, IMDb rating, link button + `random_movie_reroll`. |
| `recipe` | — | `Recipe.getRandom(guildId)`. Shows cuisine/difficulty/dietary tags, servings, prep/cook time, first 5 ingredients. Requires guild. |
| `date` | — | Calls `GeminiService.generateDateIdea(zip)` where zip = `process.env.LOCATION_ZIP_CODE ?? '90210'`. On failure falls back to `dateIdeas` array. |
| `question` | — | Calls `GeminiService.generateQuestion()` returning `{question, level, levelName}`. Level colors: 1=green, 2=blue, 3=purple. Fallback uses `conversationStarters`. |
| `choice` | `options` (required, comma-separated, ≥2) | Random pick among options. |
| `number` | `max` (integer ≥2) | `Math.floor(Math.random()*max)+1`. |
| `coin` | — | "Heads"/"Tails" via `Math.random() < 0.5`. |
| `dice` | `sides` (2–100), `count` (1–10, default 1) | Rolls each die, reports individual rolls and total. |

## Static Data

`dateIdeas` (16 fallback activities) and `conversationStarters` (15 fallback questions) are declared inside the command module.

## Interactive Components

`random_movie_reroll`, `random_recipe_reroll`, `random_date_reroll`, `random_question_reroll`, `random_coin_flip` — all handled by `randomHandlers.ts`.

## Error Handling

Top-level try/catch logs `{ subcommand, error, stack }` and responds "An error occurred while processing your request." AI failures fall back silently to static data.
