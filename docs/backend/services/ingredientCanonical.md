# ingredientCanonical Service

**Source:** `backend/utils/ingredientCanonical.ts`
**Role:** Produce a stable canonical `(name, unit)` key so the shopping-list aggregator can collapse duplicates across recipes.

Free-text ingredient names from JSON-LD or Gemini carry a lot of noise (parentheticals, prep adjectives, trailing comma phrases, inconsistent casing, inconsistent plurals). This module strips all of it to produce a stable aggregation key, without mutating the user-facing display name (which is preserved separately by the shopping-list aggregator).

## Exported Functions

| Function                 | Signature                                          | Purpose                                                                                             |
| ------------------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `normalizeUnit`          | `(unit: string \| null \| undefined) => string`    | Lowercase + trim + strip trailing period + map via `UNIT_SYNONYMS`. Returns `''` for nullish/empty. |
| `canonicalizeName`       | `(name: string \| null \| undefined) => string`    | Multi-pass name canonicalization (see below).                                                       |
| `canonicalizeIngredient` | `(name, unit) => { canonicalName, canonicalUnit }` | Convenience wrapper used by the shopping-list aggregator.                                           |

## Unit Synonyms (abridged)

- Weight: `pound/pounds/lb/lbs → lb`; `ounce/ounces/oz → oz`; `gram/grams/g → g`; `kilogram/kilograms/kg → kg`.
- Volume: `teaspoon/teaspoons/tsp → tsp`; `tablespoon/tablespoons/tbsp/t → tbsp`; `cup/cups/c → cup`; `milliliter/milliliters/ml → ml`; `liter/liters/l → l`.
- Count-ish: `clove/cloves → clove`; `piece/pieces/item/items/each → piece`; `whole → whole`; `pinch/pinches → pinch`; `dash/dashes → dash`; `can/cans → can`; `package/packages → package`.

Unknown units pass through lowercased + trimmed.

## `canonicalizeName` Pipeline

1. Trim + lowercase.
2. Strip parentheticals (nested, looped until stable) and stray parens/asterisks.
3. Drop trailing comma phrases (first comma onward — prep notes).
4. Strip leading quantity/unit noise that leaked into the name (e.g., `"1 clove garlic"` → `"garlic"`).
5. Drop leading prep adjectives (`fresh`, `dried`, `minced`, `chopped`, `diced`, `sliced`, `grated`, `ground`, `shredded`, `boneless`, `skinless`, `large`, `small`, `medium`, `whole`, `kosher`, `sea`, `cooked`, `raw`, `frozen`, `ripe`, `fine`, `coarse`). Loops until no match.
6. Singularize each remaining word via `IRREGULAR_PLURALS` table plus trailing-s stripping guarded against `ss`, `us`, `is` endings.
7. Collapse whitespace.

Falls back to the lowercased original if canonicalization produces an empty or too-short result.

## Feeds Shopping-List Consolidation

The shopping-list aggregator (`aggregateIngredients` in `shoppingList.ts`) keys its map by `${canonicalName}|${canonicalUnit}`. See [shoppingList.md](./shoppingList.md).

## Example

```ts
import { canonicalizeIngredient } from '@/utils/ingredientCanonical';

canonicalizeIngredient('  Fresh chopped Onion, finely diced ', 'cup');
// { canonicalName: 'onion', canonicalUnit: 'cup' }

canonicalizeIngredient('Tomatoes (ripe)', 'lbs');
// { canonicalName: 'tomato', canonicalUnit: 'lb' }
```
