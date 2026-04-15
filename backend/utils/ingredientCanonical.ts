/**
 * @module ingredientCanonical
 * @description Normalize ingredient names and units to canonical forms so
 * the shopping-list aggregator can collapse duplicates across recipes.
 *
 * Names coming out of JSON-LD / Gemini are free-text and carry a lot of
 * noise: parenthetical notes, prep adjectives, trailing comma phrases,
 * inconsistent casing, inconsistent plurals. This module strips all that
 * to produce a stable key, without destroying the user-facing display name
 * (which is preserved separately in the aggregator).
 */

/**
 * Synonymous units map to a single canonical token. Unknown units pass
 * through lowercased and trimmed.
 */
const UNIT_SYNONYMS: Record<string, string> = {
  // Weight
  pound: 'lb',
  pounds: 'lb',
  lb: 'lb',
  lbs: 'lb',
  ounce: 'oz',
  ounces: 'oz',
  oz: 'oz',
  gram: 'g',
  grams: 'g',
  g: 'g',
  kilogram: 'kg',
  kilograms: 'kg',
  kg: 'kg',
  // Volume
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tsp: 'tsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tbsp: 'tbsp',
  t: 'tbsp',
  cup: 'cup',
  cups: 'cup',
  c: 'cup',
  milliliter: 'ml',
  milliliters: 'ml',
  ml: 'ml',
  liter: 'l',
  liters: 'l',
  l: 'l',
  // Count-ish
  clove: 'clove',
  cloves: 'clove',
  piece: 'piece',
  pieces: 'piece',
  item: 'piece',
  items: 'piece',
  each: 'piece',
  whole: 'whole',
  pinch: 'pinch',
  pinches: 'pinch',
  dash: 'dash',
  dashes: 'dash',
  can: 'can',
  cans: 'can',
  package: 'package',
  packages: 'package',
};

export function normalizeUnit(unit: string | null | undefined): string {
  if (!unit) return '';
  const trimmed = unit.trim().toLowerCase().replace(/\.$/, '');
  if (!trimmed) return '';
  return UNIT_SYNONYMS[trimmed] ?? trimmed;
}

/**
 * Leading prep adjectives stripped from the front of an ingredient name
 * to reveal the base noun.
 *
 * Intentionally excludes "extra-virgin" (olive oil is different from
 * extra-virgin olive oil at the store) and "dark" (dark brown sugar vs
 * brown sugar).
 */
const PREP_ADJECTIVES = new Set([
  'fresh',
  'dried',
  'minced',
  'chopped',
  'diced',
  'sliced',
  'grated',
  'ground',
  'shredded',
  'boneless',
  'skinless',
  'large',
  'small',
  'medium',
  'whole',
  'kosher',
  'sea',
  'cooked',
  'raw',
  'frozen',
  'ripe',
  'fine',
  'coarse',
]);

/**
 * Irregular plurals that can't be handled by a trailing-s strip.
 */
const IRREGULAR_PLURALS: Record<string, string> = {
  tomatoes: 'tomato',
  potatoes: 'potato',
  leaves: 'leaf',
  knives: 'knife',
  wolves: 'wolf',
  berries: 'berry',
  cherries: 'cherry',
  strawberries: 'strawberry',
  blueberries: 'blueberry',
};

/**
 * Singularize a single word using a small irregular-plural table plus
 * simple trailing-s stripping (with guards against dropping meaningful
 * endings like "ss", "us", "is").
 */
function singularizeWord(word: string): string {
  const lower = word.toLowerCase();
  if (IRREGULAR_PLURALS[lower]) return IRREGULAR_PLURALS[lower];
  if (lower.length < 4) return lower;
  if (lower.endsWith('ss') || lower.endsWith('us') || lower.endsWith('is')) return lower;
  if (lower.endsWith('s')) return lower.slice(0, -1);
  return lower;
}

/**
 * Canonicalize an ingredient name.
 *
 *  1. lowercase + trim
 *  2. strip parentheticals entirely
 *  3. strip trailing comma phrases (prep notes)
 *  4. strip leading prep adjectives (one at a time until none match)
 *  5. singularize each remaining word
 *  6. collapse whitespace
 *
 * Falls back to the lowercased original if canonicalization produces an
 * empty or too-short result.
 */
export function canonicalizeName(name: string | null | undefined): string {
  if (!name) return '';
  const original = name.trim().toLowerCase();
  if (!original) return '';

  // 1. strip parentheticals (they can nest, so loop until stable)
  let work = original;
  let prev: string;
  do {
    prev = work;
    work = work.replace(/\s*\([^()]*\)/g, ' ');
  } while (work !== prev);
  // After nested paren strip, also drop any remaining stray parens/asterisks.
  work = work.replace(/[()*]+/g, ' ');

  // 2. strip trailing comma phrases — the first comma marks the start of prep notes
  const commaIdx = work.indexOf(',');
  if (commaIdx !== -1) {
    work = work.slice(0, commaIdx);
  }

  // 3. strip leading quantity/unit noise that leaked into the name field
  // (e.g., "1 clove garlic" → "garlic"; "2 cups flour" → "flour"). This is
  // defensive — normally quantity+unit are split into their own fields by the
  // scraper, but Gemini fallback or bad JSON-LD can leave them in the name.
  work = work.replace(/^(?:\d+(?:\s+\d+)?\s*\/\s*\d+|\d+(?:\.\d+)?)\s+(?:[a-z]+\.?\s+)?/, '');

  // 4. collapse whitespace for tokenization
  work = work.replace(/\s+/g, ' ').trim();
  if (!work) return original;

  // 5. strip leading prep adjectives
  const tokens = work.split(' ');
  while (tokens.length > 1 && PREP_ADJECTIVES.has(tokens[0])) {
    tokens.shift();
  }

  // 5. singularize each remaining word
  const singularized = tokens.map(singularizeWord);

  // 6. collapse whitespace (already done by join)
  const canonical = singularized.join(' ').trim();

  if (!canonical || canonical.length < 2) return original;
  return canonical;
}

export interface CanonicalIngredient {
  canonicalName: string;
  canonicalUnit: string;
}

export function canonicalizeIngredient(
  name: string | null | undefined,
  unit: string | null | undefined
): CanonicalIngredient {
  return {
    canonicalName: canonicalizeName(name),
    canonicalUnit: normalizeUnit(unit),
  };
}
