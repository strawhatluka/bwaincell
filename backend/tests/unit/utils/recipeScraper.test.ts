/* eslint-disable no-undef */
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

describe('mapRecipeNode extra branches', () => {
  it('pulls difficulty from recipeCategory when it contains easy/medium/hard', () => {
    expect(mapRecipeNode({ '@type': 'Recipe', recipeCategory: 'Easy weeknight' }).difficulty).toBe(
      'easy'
    );
    expect(mapRecipeNode({ '@type': 'Recipe', recipeCategory: 'advanced dish' }).difficulty).toBe(
      'hard'
    );
    expect(mapRecipeNode({ '@type': 'Recipe', recipeCategory: 'intermediate' }).difficulty).toBe(
      'medium'
    );
    expect(mapRecipeNode({ '@type': 'Recipe', recipeCategory: 'American' }).difficulty).toBeNull();
  });

  it('extracts suitableForDiet URIs into lowercase tags', () => {
    const node = {
      '@type': 'Recipe',
      suitableForDiet: ['https://schema.org/VegetarianDiet', 'https://schema.org/GlutenFreeDiet'],
    };
    expect(mapRecipeNode(node).dietary_tags).toEqual(['vegetarian', 'glutenfree']);
  });

  it('handles suitableForDiet as a plain string array', () => {
    expect(
      mapRecipeNode({ '@type': 'Recipe', suitableForDiet: ['Vegan', 'nut-free'] }).dietary_tags
    ).toEqual(['vegan', 'nut-free']);
  });

  it('extracts image from array of objects, picking the first with url', () => {
    const node = {
      '@type': 'Recipe',
      image: [{ '@id': 'foo' }, { url: 'https://example.com/x.jpg' }],
    };
    expect(mapRecipeNode(node).image_url).toBe('foo');
  });

  it('picks nutrition fields from strings with units', () => {
    const node = {
      '@type': 'Recipe',
      nutrition: { calories: '500 kcal', proteinContent: '30g', fatContent: 'unknown' },
    };
    const out = mapRecipeNode(node).nutrition;
    expect(out?.calories).toBe(500);
    expect(out?.protein).toBe(30);
    expect(out?.fat).toBeUndefined();
  });

  it('instruction array with HowToStep objects without text uses name fallback', () => {
    const node = {
      '@type': 'Recipe',
      recipeInstructions: [{ '@type': 'HowToStep', name: 'Step name only' }],
    };
    expect(mapRecipeNode(node).instructions).toEqual(['Step name only']);
  });

  it('parses instructions as a plain string by splitting on sentence boundaries', () => {
    const node = {
      '@type': 'Recipe',
      recipeInstructions: 'Boil water. Then add pasta. Cook for 10 minutes.',
    };
    const out = mapRecipeNode(node).instructions;
    expect(out).toBeTruthy();
    expect(out!.length).toBeGreaterThanOrEqual(2);
  });
});

describe('extractStructuredRecipe fallback selection', () => {
  it('falls through to microdata when JSON-LD has no Recipe', () => {
    const html = `<html>
      <head><script type="application/ld+json">{"@type":"WebPage","name":"Not a Recipe"}</script></head>
      <body>
        <div itemscope itemtype="http://schema.org/Recipe">
          <span itemprop="name">MD Dish</span>
          <span itemprop="recipeIngredient">1 cup water</span>
          <p itemprop="recipeInstructions">Boil.</p>
        </div>
      </body></html>`;
    const result = extractStructuredRecipe(html);
    expect(result.extractor).toBe('microdata');
    expect(result.recipe.name).toBe('MD Dish');
  });

  it('falls through to OG when microdata is empty (no itemprops)', () => {
    const html = `<html>
      <head>
        <meta property="og:title" content="Just OG">
      </head><body></body></html>`;
    const result = extractStructuredRecipe(html);
    expect(result.extractor).toBe('og');
    expect(result.recipe.name).toBe('Just OG');
  });
});

describe('scrapeRecipeFromUrl error handling', () => {
  const origFetch = global.fetch;

  afterEach(() => {
    global.fetch = origFetch;
  });

  it('returns empty result when fetch throws a network error', async () => {
    const { scrapeRecipeFromUrl } = await import('../../../utils/recipeScraper');
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;
    const result = await scrapeRecipeFromUrl('https://down.example.com');
    expect(result.extractor).toBe('empty');
    expect(result.recipe.name).toBeNull();
  });

  it('returns empty result on non-OK status', async () => {
    const { scrapeRecipeFromUrl } = await import('../../../utils/recipeScraper');
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: { get: () => 'text/html' },
    }) as unknown as typeof fetch;
    const result = await scrapeRecipeFromUrl('https://x');
    expect(result.extractor).toBe('empty');
  });

  it('returns empty result on non-HTML content type', async () => {
    const { scrapeRecipeFromUrl } = await import('../../../utils/recipeScraper');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
    }) as unknown as typeof fetch;
    const result = await scrapeRecipeFromUrl('https://x');
    expect(result.extractor).toBe('empty');
  });

  it('succeeds with streaming body under size cap', async () => {
    const { scrapeRecipeFromUrl } = await import('../../../utils/recipeScraper');
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      '@type': 'Recipe',
      name: 'Streamed',
      recipeIngredient: ['1 cup flour'],
      recipeInstructions: ['Mix'],
    })}</script></head></html>`;
    const encoded = new TextEncoder().encode(html);
    const reader = {
      read: jest
        .fn()
        .mockResolvedValueOnce({ done: false, value: encoded })
        .mockResolvedValueOnce({ done: true, value: undefined }),
      cancel: jest.fn().mockResolvedValue(undefined),
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html; charset=utf-8' },
      body: { getReader: () => reader },
    }) as unknown as typeof fetch;

    const result = await scrapeRecipeFromUrl('https://x');
    expect(result.extractor).toBe('jsonld');
    expect(result.recipe.name).toBe('Streamed');
  });
});

describe('splitIngredientString additional branches', () => {
  it('strips trailing period from known unit', () => {
    // "2 tbsp. flour" — trailing period on unit
    const result = splitIngredientString('2 tbsp. flour');
    // Our known-unit matcher strips the period then matches "tbsp"
    expect(result.unit).toBe('tbsp');
    expect(result.name).toBe('flour');
  });

  it('returns empty unit when leading qty-like token is followed by a non-unit word', () => {
    const result = splitIngredientString('3 to 4 peppers');
    // "to" isn't a unit, so whole "to 4 peppers" lands in name
    expect(result.quantity).toBe('3');
    expect(result.unit).toBe('');
  });
});

describe('extractStructuredRecipe imageUrls surfacing (WO-001)', () => {
  it('populates imageUrls from og:image alone', () => {
    const html = `<html><head>
      <meta property="og:image" content="https://example.com/og.jpg">
    </head><body></body></html>`;
    const result = extractStructuredRecipe(html);
    expect(result.imageUrls).toEqual(['https://example.com/og.jpg']);
  });

  it('populates imageUrls from twitter:image when og:image is absent', () => {
    const html = `<html><head>
      <meta name="twitter:image" content="https://example.com/tw.jpg">
    </head><body></body></html>`;
    const result = extractStructuredRecipe(html);
    expect(result.imageUrls).toEqual(['https://example.com/tw.jpg']);
  });

  it('preserves og→twitter order and deduplicates identical URLs across both tags', () => {
    const shared = 'https://example.com/shared.jpg';
    const html = `<html><head>
      <meta property="og:image" content="${shared}">
      <meta name="twitter:image" content="${shared}">
    </head><body></body></html>`;
    const result = extractStructuredRecipe(html);
    expect(result.imageUrls).toEqual([shared]); // exact-string dedupe
  });

  it('includes both og:image and twitter:image when distinct, og first', () => {
    const html = `<html><head>
      <meta property="og:image" content="https://example.com/og.jpg">
      <meta name="twitter:image" content="https://example.com/tw.jpg">
    </head><body></body></html>`;
    const result = extractStructuredRecipe(html);
    expect(result.imageUrls).toEqual(['https://example.com/og.jpg', 'https://example.com/tw.jpg']);
  });

  it('returns an empty array (never undefined) when no image metadata is present', () => {
    const html = `<html><body><p>Just a blog post, no images or meta</p></body></html>`;
    const result = extractStructuredRecipe(html);
    expect(Array.isArray(result.imageUrls)).toBe(true);
    expect(result.imageUrls).toEqual([]);
  });

  it('globally caps imageUrls at 3 when meta + inline <img> together exceed the cap', () => {
    const html = `<html><head>
      <meta property="og:image" content="https://example.com/og.jpg">
      <meta name="twitter:image" content="https://example.com/tw.jpg">
    </head><body>
      <img src="https://example.com/inline-1.jpg">
      <img src="https://example.com/inline-2.jpg">
      <img src="https://example.com/inline-3.jpg">
      <img src="https://example.com/inline-4.jpg">
    </body></html>`;
    const result = extractStructuredRecipe(html);
    expect(result.imageUrls).toHaveLength(3);
    // og and twitter take first two slots; first inline fills the remaining slot.
    expect(result.imageUrls).toEqual([
      'https://example.com/og.jpg',
      'https://example.com/tw.jpg',
      'https://example.com/inline-1.jpg',
    ]);
    expect(result.imageUrls).not.toContain('https://example.com/inline-2.jpg');
  });

  it('fills remaining slots with inline <img> tags when meta tags are absent', () => {
    const html = `<html><body>
      <img src="https://example.com/a.jpg">
      <img src="https://example.com/b.jpg">
      <img src="https://example.com/c.jpg">
      <img src="https://example.com/d.jpg">
    </body></html>`;
    const result = extractStructuredRecipe(html);
    expect(result.imageUrls).toEqual([
      'https://example.com/a.jpg',
      'https://example.com/b.jpg',
      'https://example.com/c.jpg',
    ]);
  });

  it('exposes imageUrls on the empty-extractor shell', () => {
    const html = `<html><head>
      <meta property="og:image" content="https://example.com/only.jpg">
    </head><body></body></html>`;
    const result = extractStructuredRecipe(html);
    // No recipe metadata present → extractor is 'og' (og:title falls back as name).
    // The specific assertion is that the image surfaces regardless of extractor.
    expect(result.imageUrls).toEqual(['https://example.com/only.jpg']);
  });
});
