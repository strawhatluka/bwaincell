/**
 * Unit tests for recipeNormalize.
 */

import {
  normalizeCuisine,
  normalizeDifficulty,
  normalizeDietaryTags,
} from '../../../utils/recipeNormalize';

describe('normalizeCuisine', () => {
  it('lowercases and trims', () => {
    expect(normalizeCuisine('American')).toBe('american');
    expect(normalizeCuisine('  Italian  ')).toBe('italian');
    expect(normalizeCuisine('MEXICAN')).toBe('mexican');
  });
  it('returns null for null/undefined/empty/whitespace', () => {
    expect(normalizeCuisine(null)).toBeNull();
    expect(normalizeCuisine(undefined)).toBeNull();
    expect(normalizeCuisine('')).toBeNull();
    expect(normalizeCuisine('   ')).toBeNull();
  });
});

describe('normalizeDifficulty', () => {
  it('accepts valid values and lowercases', () => {
    expect(normalizeDifficulty('Easy')).toBe('easy');
    expect(normalizeDifficulty('MEDIUM')).toBe('medium');
    expect(normalizeDifficulty('  hard  ')).toBe('hard');
  });
  it('rejects invalid values', () => {
    expect(normalizeDifficulty('extreme')).toBeNull();
    expect(normalizeDifficulty('simple')).toBeNull();
  });
  it('returns null for null/undefined/empty', () => {
    expect(normalizeDifficulty(null)).toBeNull();
    expect(normalizeDifficulty(undefined)).toBeNull();
    expect(normalizeDifficulty('')).toBeNull();
  });
});

describe('normalizeDietaryTags', () => {
  it('lowercases and trims each tag', () => {
    expect(normalizeDietaryTags(['Vegan', ' GLUTEN-FREE '])).toEqual(['vegan', 'gluten-free']);
  });
  it('dedupes case-insensitively', () => {
    expect(normalizeDietaryTags(['Vegan', 'vegan', 'VEGAN'])).toEqual(['vegan']);
  });
  it('drops empty and non-string entries', () => {
    expect(
      normalizeDietaryTags(['vegan', '', '   ', null as unknown as string, 123 as unknown as string])
    ).toEqual(['vegan']);
  });
  it('returns empty array for null/undefined/non-array input', () => {
    expect(normalizeDietaryTags(null)).toEqual([]);
    expect(normalizeDietaryTags(undefined)).toEqual([]);
    expect(normalizeDietaryTags('not-an-array' as unknown as string[])).toEqual([]);
  });
});
