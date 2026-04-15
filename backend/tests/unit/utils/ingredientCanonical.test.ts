/**
 * Unit tests for ingredient canonicalization.
 */

import {
  canonicalizeName,
  canonicalizeIngredient,
  normalizeUnit,
} from '../../../utils/ingredientCanonical';

describe('normalizeUnit', () => {
  it('collapses weight synonyms', () => {
    expect(normalizeUnit('pound')).toBe('lb');
    expect(normalizeUnit('pounds')).toBe('lb');
    expect(normalizeUnit('lb')).toBe('lb');
    expect(normalizeUnit('lbs')).toBe('lb');
    expect(normalizeUnit('Lbs.')).toBe('lb');
  });

  it('collapses volume synonyms', () => {
    expect(normalizeUnit('teaspoon')).toBe('tsp');
    expect(normalizeUnit('teaspoons')).toBe('tsp');
    expect(normalizeUnit('TSP')).toBe('tsp');
    expect(normalizeUnit('tablespoon')).toBe('tbsp');
    expect(normalizeUnit('tablespoons')).toBe('tbsp');
    expect(normalizeUnit('Tbsp')).toBe('tbsp');
    expect(normalizeUnit('cup')).toBe('cup');
    expect(normalizeUnit('cups')).toBe('cup');
    expect(normalizeUnit('Cups')).toBe('cup');
  });

  it('collapses count-ish units', () => {
    expect(normalizeUnit('clove')).toBe('clove');
    expect(normalizeUnit('cloves')).toBe('clove');
    expect(normalizeUnit('piece')).toBe('piece');
    expect(normalizeUnit('pieces')).toBe('piece');
    expect(normalizeUnit('each')).toBe('piece');
  });

  it('passes unknown units through lowercased', () => {
    expect(normalizeUnit('bunch')).toBe('bunch');
    expect(normalizeUnit('Handful')).toBe('handful');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(normalizeUnit(null)).toBe('');
    expect(normalizeUnit(undefined)).toBe('');
    expect(normalizeUnit('')).toBe('');
    expect(normalizeUnit('   ')).toBe('');
  });
});

describe('canonicalizeName', () => {
  it('lowercases and trims', () => {
    expect(canonicalizeName('Flour')).toBe('flour');
    expect(canonicalizeName('  Honey  ')).toBe('honey');
  });

  it('strips parentheticals', () => {
    expect(canonicalizeName('salt (, to taste)')).toBe('salt');
    expect(canonicalizeName('chicken broth (or vegetable broth)')).toBe('chicken broth');
    expect(canonicalizeName('flour ((114g))')).toBe('flour');
  });

  it('strips trailing comma phrases (prep notes)', () => {
    expect(canonicalizeName('bell pepper, thinly sliced')).toBe('bell pepper');
    expect(canonicalizeName('chicken breasts, cubed')).toBe('chicken breast');
    expect(canonicalizeName('onion, roughly chopped')).toBe('onion');
  });

  it('strips leading prep adjectives', () => {
    expect(canonicalizeName('fresh basil')).toBe('basil');
    expect(canonicalizeName('dried oregano')).toBe('oregano');
    expect(canonicalizeName('minced garlic')).toBe('garlic');
    expect(canonicalizeName('kosher salt')).toBe('salt');
    expect(canonicalizeName('fresh minced ginger')).toBe('ginger');
    expect(canonicalizeName('large cloves garlic')).toBe('clove garlic');
  });

  it('singularizes common plurals', () => {
    expect(canonicalizeName('tomatoes')).toBe('tomato');
    expect(canonicalizeName('carrots')).toBe('carrot');
    expect(canonicalizeName('onions')).toBe('onion');
    expect(canonicalizeName('potatoes')).toBe('potato');
    expect(canonicalizeName('cloves')).toBe('clove');
  });

  it('does not singularize short words', () => {
    expect(canonicalizeName('gas')).toBe('gas');
  });

  it('does not singularize words ending in ss/us/is', () => {
    expect(canonicalizeName('swiss')).toBe('swiss');
    expect(canonicalizeName('bus')).toBe('bus');
  });

  it('keeps combo names intact (and-joined)', () => {
    expect(canonicalizeName('salt and pepper')).toBe('salt and pepper');
    expect(canonicalizeName('Salt and Pepper')).toBe('salt and pepper');
  });

  it('collapses multiple spaces produced by paren removal', () => {
    expect(canonicalizeName('chicken  broth  (optional)')).toBe('chicken broth');
  });

  it('returns lowercased original if canonicalization produces an empty result', () => {
    expect(canonicalizeName('a')).toBe('a');
    expect(canonicalizeName('()')).toBe('()');
  });

  it('returns empty for null/undefined/empty', () => {
    expect(canonicalizeName(null)).toBe('');
    expect(canonicalizeName(undefined)).toBe('');
    expect(canonicalizeName('')).toBe('');
  });

  it('treats distinct base nouns as distinct (thighs vs breasts)', () => {
    expect(canonicalizeName('chicken thighs (bone in + skin on)')).toBe('chicken thigh');
    expect(canonicalizeName('chicken breasts')).toBe('chicken breast');
  });

  it('collapses the real-world garlic variants to "garlic"', () => {
    // Leading quantity/unit noise that leaked into the name is stripped,
    // then prep adjectives, then singularized.
    expect(canonicalizeName('1 clove garlic (, minced)')).toBe('garlic');
    expect(canonicalizeName('2 cloves garlic')).toBe('garlic');
    expect(canonicalizeName('fresh minced garlic')).toBe('garlic');
    expect(canonicalizeName('minced garlic')).toBe('garlic');
    // Leading-qty stripper isn't invoked without a number, so this still keeps "clove":
    expect(canonicalizeName('Garlic Clove')).toBe('garlic clove');
  });
});

describe('canonicalizeIngredient', () => {
  it('bundles name and unit canonicalization', () => {
    expect(canonicalizeIngredient('Fresh Minced Garlic', 'Tbsp')).toEqual({
      canonicalName: 'garlic',
      canonicalUnit: 'tbsp',
    });
  });

  it('merges pound vs lb for the same ingredient', () => {
    const a = canonicalizeIngredient('chicken thighs', 'lb');
    const b = canonicalizeIngredient('Chicken Thighs', 'pounds');
    expect(`${a.canonicalName}|${a.canonicalUnit}`).toBe(`${b.canonicalName}|${b.canonicalUnit}`);
  });

  it('keeps chicken thighs separate from chicken breasts', () => {
    const a = canonicalizeIngredient('chicken thighs', 'lb');
    const b = canonicalizeIngredient('chicken breasts', 'lb');
    expect(a.canonicalName).not.toBe(b.canonicalName);
  });
});
