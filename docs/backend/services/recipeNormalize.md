# recipeNormalize Service

**Source:** `backend/utils/recipeNormalize.ts`

Canonicalizes recipe metadata fields (cuisine, difficulty, dietary tags) to lowercase + trimmed strings so search matches and storage stay consistent regardless of whether values came from JSON-LD, Gemini, or hand-typed edits.

## Exported Functions

| Function               | Signature                                                      | Behavior                                                                                                                  |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `normalizeCuisine`     | `(v: string \| null \| undefined) => string \| null`           | `trim().toLowerCase()`; returns `null` for empty/whitespace.                                                              |
| `normalizeDifficulty`  | `(v: string \| null \| undefined) => RecipeDifficulty \| null` | Accepts only `'easy' \| 'medium' \| 'hard'` after lowercasing; returns `null` otherwise.                                  |
| `normalizeDietaryTags` | `(v: string[] \| null \| undefined) => string[]`               | Returns deduped, lowercased, trimmed string array. Non-string entries dropped. Never returns `null` — falls back to `[]`. |

## Unit Handling

This module does NOT normalize quantities/units. That's handled by [`ingredientCanonical`](./ingredientCanonical.md) (names + units) and [`shoppingList`](./shoppingList.md) (quantity math).

## Example

```ts
import {
  normalizeCuisine,
  normalizeDifficulty,
  normalizeDietaryTags,
} from '@/utils/recipeNormalize';

normalizeCuisine('  Italian '); // 'italian'
normalizeCuisine(''); // null
normalizeDifficulty('Hard'); // 'hard'
normalizeDifficulty('impossible'); // null
normalizeDietaryTags(['Vegan', 'vegan', ' GF ']); // ['vegan', 'gf']
```

## Related

- Consumer: [recipeIngestion.md](./recipeIngestion.md) (`normalizeResult` applies all three on the final row before returning).
