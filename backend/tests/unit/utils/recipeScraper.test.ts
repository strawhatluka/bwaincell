/**
 * Unit tests for recipeScraper: JSON-LD / microdata / OG extraction,
 * ISO 8601 duration parsing, and ingredient string splitting.
 */

jest.mock('../../../shared/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import {
  extractStructuredRecipe,
  parseIsoDurationToMinutes,
  splitIngredientString,
  mapRecipeNode,
} from '../../../utils/recipeScraper';

describe('parseIsoDurationToMinutes', () => {
  it('parses simple minutes', () => {
    expect(parseIsoDurationToMinutes('PT30M')).toBe(30);
  });
  it('parses hours + minutes', () => {
    expect(parseIsoDurationToMinutes('PT1H15M')).toBe(75);
  });
  it('parses days + hours', () => {
    expect(parseIsoDurationToMinutes('P1DT2H')).toBe(24 * 60 + 120);
  });
  it('returns null for zero duration', () => {
    expect(parseIsoDurationToMinutes('P0D')).toBeNull();
    expect(parseIsoDurationToMinutes('PT0M')).toBeNull();
  });
  it('returns null for non-ISO strings', () => {
    expect(parseIsoDurationToMinutes('30 minutes')).toBeNull();
    expect(parseIsoDurationToMinutes('')).toBeNull();
    expect(parseIsoDurationToMinutes(null)).toBeNull();
  });
  it('rounds seconds into minutes', () => {
    expect(parseIsoDurationToMinutes('PT90S')).toBe(2); // 1.5 min → 2
  });
});

describe('splitIngredientString', () => {
  it('splits "2 cups flour" into qty/unit/name', () => {
    expect(splitIngredientString('2 cups flour')).toEqual({
      quantity: '2',
      unit: 'cups',
      name: 'flour',
    });
  });
  it('handles fractions', () => {
    expect(splitIngredientString('1/2 tsp salt')).toEqual({
      quantity: '1/2',
      unit: 'tsp',
      name: 'salt',
    });
  });
  it('handles mixed fractions', () => {
    expect(splitIngredientString('1 1/2 cups milk')).toEqual({
      quantity: '1 1/2',
      unit: 'cups',
      name: 'milk',
    });
  });
  it('leaves unknown unit in name', () => {
    expect(splitIngredientString('2 large eggs')).toEqual({
      quantity: '2',
      unit: '',
      name: 'large eggs',
    });
  });
  it('returns whole string as name when no leading quantity', () => {
    expect(splitIngredientString('salt to taste')).toEqual({
      quantity: '',
      unit: '',
      name: 'salt to taste',
    });
  });
});

describe('mapRecipeNode (JSON-LD Recipe → ScrapedRecipe)', () => {
  it('maps a full Schema.org Recipe node', () => {
    const node = {
      '@type': 'Recipe',
      name: 'Chicken Noodle Soup',
      recipeIngredient: ['1 whole chicken', '2 cups carrots', '1 tsp salt'],
      recipeInstructions: [
        { '@type': 'HowToStep', text: 'Boil the chicken.' },
        { '@type': 'HowToStep', text: 'Add vegetables.' },
      ],
      recipeYield: '6 servings',
      prepTime: 'PT15M',
      cookTime: 'PT45M',
      recipeCuisine: 'American',
      image: 'https://example.com/soup.jpg',
      nutrition: {
        calories: '320 kcal',
        proteinContent: '25 g',
        carbohydrateContent: '30 g',
        fatContent: '10 g',
        sodiumContent: '600 mg',
      },
    };
    const mapped = mapRecipeNode(node);
    expect(mapped.name).toBe('Chicken Noodle Soup');
    expect(mapped.ingredients).toHaveLength(3);
    expect(mapped.instructions).toEqual(['Boil the chicken.', 'Add vegetables.']);
    expect(mapped.servings).toBe(6);
    expect(mapped.prep_time_minutes).toBe(15);
    expect(mapped.cook_time_minutes).toBe(45);
    expect(mapped.cuisine).toBe('American');
    expect(mapped.image_url).toBe('https://example.com/soup.jpg');
    expect(mapped.nutrition?.calories).toBe(320);
    expect(mapped.nutrition?.protein).toBe(25);
    expect(mapped.nutrition?.sodium).toBe(600);
  });

  it('handles HowToSection nesting in instructions', () => {
    const node = {
      '@type': 'Recipe',
      name: 'Test',
      recipeIngredient: ['a', 'b'],
      recipeInstructions: [
        {
          '@type': 'HowToSection',
          itemListElement: [
            { '@type': 'HowToStep', text: 'Prep' },
            { '@type': 'HowToStep', text: 'Cook' },
          ],
        },
      ],
    };
    const mapped = mapRecipeNode(node);
    expect(mapped.instructions).toEqual(['Prep', 'Cook']);
  });

  it('handles image as object with url property', () => {
    const node = {
      '@type': 'Recipe',
      name: 'T',
      recipeIngredient: ['a'],
      recipeInstructions: ['Cook'],
      image: { url: 'https://example.com/x.jpg' },
    };
    expect(mapRecipeNode(node).image_url).toBe('https://example.com/x.jpg');
  });

  it('extracts yield from integer', () => {
    const node = {
      '@type': 'Recipe',
      name: 'T',
      recipeIngredient: ['a'],
      recipeInstructions: ['c'],
      recipeYield: 4,
    };
    expect(mapRecipeNode(node).servings).toBe(4);
  });

  it('nulls out missing optional fields', () => {
    const node = {
      '@type': 'Recipe',
      name: 'T',
      recipeIngredient: ['a'],
      recipeInstructions: ['c'],
    };
    const mapped = mapRecipeNode(node);
    expect(mapped.servings).toBeNull();
    expect(mapped.prep_time_minutes).toBeNull();
    expect(mapped.cook_time_minutes).toBeNull();
    expect(mapped.cuisine).toBeNull();
    expect(mapped.nutrition).toBeNull();
    expect(mapped.image_url).toBeNull();
  });
});

describe('extractStructuredRecipe', () => {
  function htmlWithJsonLd(data: unknown): string {
    return `<!DOCTYPE html><html><head><script type="application/ld+json">${JSON.stringify(data)}</script></head><body></body></html>`;
  }

  it('finds a Recipe directly in JSON-LD', () => {
    const html = htmlWithJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: 'Pancakes',
      recipeIngredient: ['1 cup flour', '2 eggs'],
      recipeInstructions: ['Mix', 'Cook'],
      recipeYield: '4',
    });
    const result = extractStructuredRecipe(html);
    expect(result.extractor).toBe('jsonld');
    expect(result.recipe.name).toBe('Pancakes');
    expect(result.recipe.ingredients).toHaveLength(2);
    expect(result.provenance.name).toBe('source');
    expect(result.provenance.ingredients).toBe('source');
    expect(result.provenance.nutrition).toBeUndefined();
  });

  it('finds a Recipe nested in @graph', () => {
    const html = htmlWithJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebPage', name: 'Page' },
        {
          '@type': 'Recipe',
          name: 'Nested Recipe',
          recipeIngredient: ['a'],
          recipeInstructions: ['c'],
        },
      ],
    });
    const result = extractStructuredRecipe(html);
    expect(result.extractor).toBe('jsonld');
    expect(result.recipe.name).toBe('Nested Recipe');
  });

  it('skips broken JSON-LD blocks and returns empty when nothing parses', () => {
    const html = `<html><head><script type="application/ld+json">{ this is not valid json</script></head></html>`;
    const result = extractStructuredRecipe(html);
    expect(result.extractor).toBe('empty');
    expect(result.recipe.name).toBeNull();
  });

  it('falls back to microdata when JSON-LD missing', () => {
    const html = `<html><body>
      <div itemscope itemtype="https://schema.org/Recipe">
        <h1 itemprop="name">Microdata Pasta</h1>
        <span itemprop="recipeIngredient">1 cup pasta</span>
        <span itemprop="recipeIngredient">1 tbsp oil</span>
        <p itemprop="recipeInstructions">Boil water, cook pasta.</p>
      </div>
    </body></html>`;
    const result = extractStructuredRecipe(html);
    expect(result.extractor).toBe('microdata');
    expect(result.recipe.name).toBe('Microdata Pasta');
    expect(result.recipe.ingredients).toHaveLength(2);
  });

  it('falls back to Open Graph when everything else missing', () => {
    const html = `<html><head>
      <meta property="og:title" content="OG Recipe">
      <meta property="og:image" content="https://example.com/og.jpg">
    </head><body></body></html>`;
    const result = extractStructuredRecipe(html);
    expect(result.extractor).toBe('og');
    expect(result.recipe.name).toBe('OG Recipe');
    expect(result.recipe.image_url).toBe('https://example.com/og.jpg');
    expect(result.recipe.ingredients).toBeNull();
  });

  it('returns empty extractor for a page with nothing useful', () => {
    const html = `<html><body><p>Just a blog post</p></body></html>`;
    const result = extractStructuredRecipe(html);
    expect(result.extractor).toBe('empty');
    expect(Object.keys(result.provenance)).toHaveLength(0);
  });

  it('provenance reflects only populated fields', () => {
    const html = htmlWithJsonLd({
      '@type': 'Recipe',
      name: 'Minimal',
      recipeIngredient: ['a'],
      recipeInstructions: ['c'],
    });
    const result = extractStructuredRecipe(html);
    expect(result.provenance.name).toBe('source');
    expect(result.provenance.ingredients).toBe('source');
    expect(result.provenance.instructions).toBe('source');
    expect(result.provenance.nutrition).toBeUndefined();
    expect(result.provenance.cuisine).toBeUndefined();
  });
});
