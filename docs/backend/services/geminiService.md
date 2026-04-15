# geminiService

**Source:** `backend/utils/geminiService.ts`
**Client:** `@google/genai` — `new GoogleGenAI({ apiKey })`
**Model:** `gemini-2.5-flash` (with `tools: [{ googleSearch: {} }]` for grounding where applicable)

Centralized Gemini API client. Lazy-initialized on first use; if `GEMINI_API_KEY` is not set, `initialize()` logs a warning and leaves `genAI = null`, causing downstream calls to throw.

## Environment

| Var              | Purpose                              |
| ---------------- | ------------------------------------ |
| `GEMINI_API_KEY` | Required. Logs a warning if missing. |

## Exported Types

- `ParsedRecipe` — full recipe shape returned by URL / file parsing.
- `ResearchableField = 'nutrition' | 'cuisine' | 'difficulty' | 'prep_time_minutes' | 'cook_time_minutes' | 'servings' | 'dietary_tags' | 'image_url'`.
- `ALLOWED_GAPS` — tuple of the above field names.
- `ResearchedFields` — non-nullable variant of the researchable fields.
- `DateIdeaResponse`, `WNRSQuestionResponse` — for `/random date` and `/random question`.
- `SanitizerInputItem`, `SanitizedItem`, `SanitizedShoppingList` — for shopping-list cleanup.
- `IngredientCategory` + `INGREDIENT_CATEGORIES` — MUST match the recipe schema enum.

Supported file MIME types for `parseRecipeFromFile`: `image/png`, `image/jpeg`, `image/webp`, `application/pdf`, `text/plain`, `text/markdown`.

## Exported `GeminiService` Methods

| Method                  | Signature                                                                               | Purpose                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `generateDateIdea`      | `(zipCode: string) => Promise<DateIdeaResponse>`                                        | Used by `/random date`.                                                                            |
| `generateQuestion`      | `() => Promise<WNRSQuestionResponse>`                                                   | Used by `/random question`.                                                                        |
| `parseRecipeFromUrl`    | `(url: string) => Promise<ParsedRecipe>`                                                | YouTube detection: passes URL as `fileData` (`mimeType: 'video/*'`); else `googleSearch` grounded. |
| `parseRecipeFromFile`   | `(fileBuffer: Buffer, mimeType: string, filename: string) => Promise<ParsedRecipe>`     | Multimodal file parse. Throws on unsupported MIME type.                                            |
| `researchMissingFields` | `(partial, sourceUrl, gaps: ResearchableField[]) => Promise<Partial<ResearchedFields>>` | Fills ONLY the requested fields. Used in Pass 2 of ingestion.                                      |
| `suggestDietaryTags`    | `(ingredients: RecipeIngredient[]) => Promise<string[]>`                                | Rules-based AI heuristic for tag suggestions.                                                      |
| `sanitizeShoppingList`  | `(items: SanitizerInputItem[]) => Promise<SanitizedShoppingList>`                       | Post-aggregation dedupe + cleanup.                                                                 |

All methods throw `Error('Gemini API not configured')` when `GEMINI_API_KEY` is missing; other errors (network, malformed JSON) are logged and rethrown.

## Prompting

- Recipe parsing: uses strict JSON-only instructions; the response handler strips `` ```json ...` `` fences before `JSON.parse`.
- URL parses are YouTube-aware (video vs. web grounding).
- Research prompts restrict output fields to the requested gaps.

## Cost / Quota

All calls go to `gemini-2.5-flash`. There is no local caching layer — every `/recipe add`, `/random date`, `/random question`, and `/events` preview consumes quota. Rate limiting / backoff is not implemented; failures surface to the user.

## Example

```ts
import { GeminiService } from '@/utils/geminiService';

const parsed = await GeminiService.parseRecipeFromUrl('https://example.com/curry');
const filled = await GeminiService.researchMissingFields(
  {
    name: parsed.name,
    ingredients: parsed.ingredients,
    instructions: parsed.instructions,
    servings: parsed.servings,
  },
  'https://example.com/curry',
  ['cuisine', 'difficulty']
);
```

## Related

- [recipeIngestion.md](./recipeIngestion.md)
- [shoppingList.md](./shoppingList.md)
- [eventsService.md](./eventsService.md) (uses its own `GoogleGenAI` instance)
