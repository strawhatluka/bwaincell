/**
 * Unit tests for Recipe.searchByFilters that verify the Supabase query
 * builder is invoked with case-insensitive operators (ilike) for cuisine
 * and difficulty, and that the tag filter value is lowercased before the
 * .contains() call.
 */

jest.mock('../../../shared/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// Build a mock chainable query builder that records every call.
function makeQueryBuilder() {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const record = (method: string) =>
    jest.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    });
  const builder: Record<string, jest.Mock> = {
    select: record('select'),
    eq: record('eq'),
    ilike: record('ilike'),
    contains: record('contains'),
    lte: record('lte'),
    order: record('order'),
  };
  // order should return a thenable-like result at the end of the chain
  (builder.order as jest.Mock).mockImplementation((...args: unknown[]) => {
    calls.push({ method: 'order', args });
    // First .order returns builder (chainable), second returns a promise.
    const orderCount = calls.filter((c) => c.method === 'order').length;
    if (orderCount >= 2) {
      return Promise.resolve({ data: [], error: null });
    }
    return builder;
  });
  return { builder, calls };
}

const mockQB = makeQueryBuilder();

jest.mock('@database/supabase', () => ({
  __esModule: true,
  default: {
    from: jest.fn(() => mockQB.builder),
  },
}));

import Recipe from '@database/models/Recipe';

describe('Recipe.searchByFilters — case-insensitive queries', () => {
  beforeEach(() => {
    mockQB.calls.length = 0;
  });

  it('uses ilike for cuisine (case-insensitive)', async () => {
    await Recipe.searchByFilters('g1', { cuisine: 'American' });

    const cuisineCall = mockQB.calls.find((c) => c.method === 'ilike' && c.args[0] === 'cuisine');
    expect(cuisineCall).toBeDefined();
    expect(cuisineCall?.args[1]).toBe('American');

    // Sanity: .eq should NOT have been called on cuisine
    const eqCuisineCall = mockQB.calls.find((c) => c.method === 'eq' && c.args[0] === 'cuisine');
    expect(eqCuisineCall).toBeUndefined();
  });

  it('uses ilike for difficulty (case-insensitive)', async () => {
    await Recipe.searchByFilters('g1', { difficulty: 'Easy' as 'easy' });

    const diffCall = mockQB.calls.find((c) => c.method === 'ilike' && c.args[0] === 'difficulty');
    expect(diffCall).toBeDefined();
    expect(diffCall?.args[1]).toBe('Easy');
  });

  it('lowercases the tag before .contains()', async () => {
    await Recipe.searchByFilters('g1', { tag: 'Vegan' });

    const tagCall = mockQB.calls.find(
      (c) => c.method === 'contains' && c.args[0] === 'dietary_tags'
    );
    expect(tagCall).toBeDefined();
    expect(tagCall?.args[1]).toEqual(['vegan']);
  });

  it('keyword still uses ilike with wildcards', async () => {
    await Recipe.searchByFilters('g1', { keyword: 'Pasta' });

    const kwCall = mockQB.calls.find((c) => c.method === 'ilike' && c.args[0] === 'name');
    expect(kwCall).toBeDefined();
    expect(kwCall?.args[1]).toBe('%Pasta%');
  });
});
