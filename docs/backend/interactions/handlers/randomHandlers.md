# randomHandlers

**Source:** `backend/utils/interactions/handlers/randomHandlers.ts`

Button handlers for rerolls emitted by the `/random` command.

## Exported

`async handleRandomButton(interaction: ButtonInteraction<CacheType>): Promise<void>`

## Static Fallback Data

Locally redefined (same values as in `backend/commands/random.ts`):

- `dateIdeas` — 16 fallback activities.
- `conversationStarters` — 15 fallback prompts.

## Dependencies

- `movieData` from `../../recipeData`.
- `GeminiService` — AI generation for date ideas and questions.
- `Recipe` model (imported from `@database/models/Recipe`) and `formatQuantity` for `/random recipe` rerolls.
- `RecipeIngredient` type from `@database/types` for typed ingredient iteration.

```ts
import Recipe from '@database/models/Recipe';
import type { RecipeIngredient } from '@database/types';
```

## Guild Guard

Non-guild interactions reply ephemeral `"❌ This command can only be used in a server."`

## customId Patterns

| customId                 | Action                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `random_movie_reroll`    | Random `movieData` pick; re-renders embed with IMDb link and reroll button.                                                  |
| `random_recipe_reroll`   | `Recipe.getRandom(guildId)` — same embed shape as `/random recipe`.                                                          |
| `random_date_reroll`     | `GeminiService.generateDateIdea(zip)` with `process.env.LOCATION_ZIP_CODE ?? '90210'`; falls back to `dateIdeas` on failure. |
| `random_question_reroll` | `GeminiService.generateQuestion()`; level colors: 1=green, 2=blue, 3=purple; fallback to `conversationStarters`.             |
| `random_coin_flip`       | `Math.random() < 0.5 ? 'Heads' : 'Tails'`.                                                                                   |

## Error Handling

Top-level `try/catch` routes to `handleInteractionError`. AI calls fall back silently to static data, and the fallback branch is logged via `logger.warn`.
