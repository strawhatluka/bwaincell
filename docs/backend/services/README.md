# Backend Services

Utility / service modules under `backend/utils/`. APO-2 covers the recipe / shopping-list / AI / scheduling stack. Remaining utilities (validators, dateHelpers, fractionFormat, googleServices, githubService, imageService, releaseAnnouncer, interaction handlers) are owned by APO-3.

## Index (APO-2 scope)

| Service               | Doc                                                | Summary                                                                                           |
| --------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `recipeScraper`       | [recipeScraper.md](./recipeScraper.md)             | Pass 1 deterministic HTML extraction (JSON-LD / microdata / OG).                                  |
| `recipeIngestion`     | [recipeIngestion.md](./recipeIngestion.md)         | Two-pass pipeline: scrape → AI fill → normalize.                                                  |
| `recipeNormalize`     | [recipeNormalize.md](./recipeNormalize.md)         | Cuisine / difficulty / dietary-tag canonicalization.                                              |
| `recipeData`          | [recipeData.md](./recipeData.md)                   | In-memory movie dataset for `/random movie` (not a recipe CRUD).                                  |
| `ingredientCanonical` | [ingredientCanonical.md](./ingredientCanonical.md) | Stable `(name, unit)` keys for shopping-list aggregation.                                         |
| `shoppingList`        | [shoppingList.md](./shoppingList.md)               | Cross-recipe aggregation, unit/quantity math, category inference.                                 |
| `geminiService`       | [geminiService.md](./geminiService.md)             | Central Gemini client: recipe parse, research, shopping-list cleanup, date ideas, WNRS questions. |
| `sunsetService`       | [sunsetService.md](./sunsetService.md)             | ZIP → coords, sunset time fetch, embed formatter.                                                 |
| `scheduler`           | [scheduler.md](./scheduler.md)                     | Central singleton for reminders + event + sunset cron jobs.                                       |
| `eventsService`       | [eventsService.md](./eventsService.md)             | AI event discovery + Discord embed formatting.                                                    |

## APO-3 Scope (placeholder)

The following services will be documented by APO-3:

- `dateHelpers.ts` (`parseDayName`, `buildCronExpression`, `getEventWindow`, ...)
- `fractionFormat.ts` (`formatQuantity` mixed-fraction renderer)
- `validators.ts`
- `googleServices.ts`
- `githubService.ts`
- `imageService.ts` (skia-canvas quote renderer)
- `releaseAnnouncer.ts`
- `interactions/handlers/*`
