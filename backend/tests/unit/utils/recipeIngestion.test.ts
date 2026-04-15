/**
 * Unit tests for the two-pass recipe ingestion orchestrator.
 *
 * Validates:
 *  - Scrape-first path when JSON-LD provides required fields
 *  - Gemini-URL fallback path when scrape fails
 *  - Pass 2 research only targets fields that are still unknown
 *  - Researched values never overwrite source values
 *  - File ingestion path
 */

jest.mock('../../../shared/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockScrape = jest.fn();
jest.mock('../../../utils/recipeScraper', () => ({
  ...jest.requireActual('../../../utils/recipeScraper'),
  scrapeRecipeFromUrl: (...args: unknown[]) => mockScrape(...args),
}));

const mockParseUrl = jest.fn();
const mockParseFile = jest.fn();
const mockResearch = jest.fn();
jest.mock('../../../utils/geminiService', () => {
  const actual = jest.requireActual('../../../utils/geminiService');
  return {
    ...actual,
    GeminiService: {
      parseRecipeFromUrl: (...a: unknown[]) => mockParseUrl(...a),
      parseRecipeFromFile: (...a: unknown[]) => mockParseFile(...a),
      researchMissingFields: (...a: unknown[]) => mockResearch(...a),
    },
  };
});

import {
  ingestRecipeFromUrl,
  ingestRecipeFromFile,
  summarizeProvenance,
} from '../../../utils/recipeIngestion';

const completeScrapeRecipe = {
  name: 'Scraped Soup',
  ingredients: [{ name: 'chicken', quantity: '1', unit: 'lb' }],
  instructions: ['Cook it'],
  servings: 4,
  prep_time_minutes: 15,
  cook_time_minutes: 30,
  nutrition: { calories: 300, protein: 20, carbs: 20, fat: 10 },
  cuisine: 'American',
  difficulty: null,
  dietary_tags: null,
  image_url: 'https://example.com/s.jpg',
};

const completeProvenance = {
  name: 'source',
  ingredients: 'source',
  instructions: 'source',
  servings: 'source',
  prep_time_minutes: 'source',
  cook_time_minutes: 'source',
  nutrition: 'source',
  cuisine: 'source',
  image_url: 'source',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ingestRecipeFromUrl — scrape-first path', () => {
  it('uses scraped data when all required fields are present', async () => {
    mockScrape.mockResolvedValueOnce({
      recipe: completeScrapeRecipe,
      provenance: completeProvenance,
      extractor: 'jsonld',
    });
    mockResearch.mockResolvedValueOnce({
      difficulty: 'easy',
      dietary_tags: ['nut-free'],
    });

    const result = await ingestRecipeFromUrl('https://example.com/soup');

    expect(result.pass1Source).toBe('jsonld');
    expect(result.recipe.name).toBe('Scraped Soup');
    expect(result.recipe.nutrition?.calories).toBe(300);
    // Scraped fields tagged 'source'
    expect(result.provenance.name).toBe('source');
    expect(result.provenance.nutrition).toBe('source');
    // Pass 2 filled difficulty and dietary_tags → 'researched'
    expect(result.recipe.difficulty).toBe('easy');
    expect(result.provenance.difficulty).toBe('researched');
    expect(result.recipe.dietary_tags).toEqual(['nut-free']);
    expect(result.provenance.dietary_tags).toBe('researched');
    expect(result.researchRan).toBe(true);
    // Gemini URL parse NEVER called because scrape succeeded
    expect(mockParseUrl).not.toHaveBeenCalled();
  });

  it('research gaps do NOT include fields already populated from source', async () => {
    mockScrape.mockResolvedValueOnce({
      recipe: completeScrapeRecipe,
      provenance: completeProvenance,
      extractor: 'jsonld',
    });
    mockResearch.mockResolvedValueOnce({});

    await ingestRecipeFromUrl('https://example.com/soup');

    const gapsArg = mockResearch.mock.calls[0][2];
    expect(gapsArg).not.toContain('name');
    expect(gapsArg).not.toContain('nutrition');
    expect(gapsArg).not.toContain('cuisine');
    // Only truly-missing fields:
    expect(gapsArg).toEqual(expect.arrayContaining(['difficulty', 'dietary_tags']));
  });

  it('research is skipped when there are no gaps', async () => {
    mockScrape.mockResolvedValueOnce({
      recipe: {
        ...completeScrapeRecipe,
        difficulty: 'easy',
        dietary_tags: ['vegetarian'],
      },
      provenance: {
        ...completeProvenance,
        difficulty: 'source',
        dietary_tags: 'source',
      },
      extractor: 'jsonld',
    });

    const result = await ingestRecipeFromUrl('https://example.com/soup');

    expect(mockResearch).not.toHaveBeenCalled();
    expect(result.researchRan).toBe(false);
  });

  it('researched values never overwrite source values', async () => {
    mockScrape.mockResolvedValueOnce({
      recipe: completeScrapeRecipe,
      provenance: completeProvenance,
      extractor: 'jsonld',
    });
    // Adversarial: research tries to overwrite source-provided nutrition
    mockResearch.mockResolvedValueOnce({
      nutrition: { calories: 9999 },
      difficulty: 'hard',
    });

    const result = await ingestRecipeFromUrl('https://example.com/soup');

    expect(result.recipe.nutrition?.calories).toBe(300); // source wins
    expect(result.provenance.nutrition).toBe('source');
    expect(result.recipe.difficulty).toBe('hard'); // gap → researched
  });
});

describe('ingestRecipeFromUrl — Gemini fallback path', () => {
  it('falls back to Gemini URL parse when scrape is missing required fields', async () => {
    mockScrape.mockResolvedValueOnce({
      recipe: {
        name: null,
        ingredients: null,
        instructions: null,
        servings: null,
        prep_time_minutes: null,
        cook_time_minutes: null,
        nutrition: null,
        cuisine: null,
        difficulty: null,
        dietary_tags: null,
        image_url: null,
      },
      provenance: {},
      extractor: 'empty',
    });
    mockParseUrl.mockResolvedValueOnce({
      name: 'Fallback Soup',
      ingredients: [{ name: 'water', quantity: 1, unit: 'cup' }],
      instructions: ['Boil'],
      servings: 2,
      prep_time_minutes: 5,
      cook_time_minutes: 10,
      nutrition: null,
      cuisine: null,
      difficulty: null,
      image_url: null,
    });
    mockResearch.mockResolvedValueOnce({});

    const result = await ingestRecipeFromUrl('https://js-heavy.example.com/r');

    expect(result.pass1Source).toBe('gemini-url');
    expect(result.recipe.name).toBe('Fallback Soup');
    // Gemini-parsed fields are tagged 'researched' (not source)
    expect(result.provenance.name).toBe('researched');
    expect(mockParseUrl).toHaveBeenCalledWith('https://js-heavy.example.com/r');
  });

  it('returns Pass 1 result when Pass 2 research throws', async () => {
    mockScrape.mockResolvedValueOnce({
      recipe: completeScrapeRecipe,
      provenance: completeProvenance,
      extractor: 'jsonld',
    });
    mockResearch.mockRejectedValueOnce(new Error('API quota'));

    const result = await ingestRecipeFromUrl('https://example.com/soup');

    expect(result.recipe.name).toBe('Scraped Soup');
    expect(result.provenance.name).toBe('source');
    expect(result.researchRan).toBe(false);
  });
});

describe('ingestRecipeFromFile', () => {
  it('calls Gemini file parse then fills gaps via research', async () => {
    mockParseFile.mockResolvedValueOnce({
      name: 'File Recipe',
      ingredients: [{ name: 'eggs', quantity: 2, unit: '' }],
      instructions: ['Scramble'],
      servings: 2,
      prep_time_minutes: null,
      cook_time_minutes: null,
      nutrition: null,
      cuisine: null,
      difficulty: null,
      image_url: null,
    });
    mockResearch.mockResolvedValueOnce({
      prep_time_minutes: 5,
      cook_time_minutes: 5,
      cuisine: 'American',
      difficulty: 'easy',
    });

    const buffer = Buffer.from('fake');
    const result = await ingestRecipeFromFile(buffer, 'image/png', 'r.png');

    expect(result.pass1Source).toBe('gemini-file');
    expect(result.recipe.name).toBe('File Recipe');
    // File-parsed fields marked 'researched' (not source-verified)
    expect(result.provenance.name).toBe('researched');
    expect(result.recipe.prep_time_minutes).toBe(5);
    expect(result.recipe.cuisine).toBe('american'); // normalized to lowercase on ingestion
    expect(result.recipe.difficulty).toBe('easy');
  });
});

describe('summarizeProvenance', () => {
  it('counts source/researched/unknown and lists researched fields', () => {
    const prov = {
      name: 'source' as const,
      ingredients: 'source' as const,
      nutrition: 'researched' as const,
      cuisine: 'researched' as const,
      difficulty: 'unknown' as const,
    };
    const summary = summarizeProvenance(prov);
    expect(summary.sourceCount).toBe(2);
    expect(summary.researchedCount).toBe(2);
    expect(summary.unknownCount).toBe(1);
    expect(summary.researchedFields).toEqual(expect.arrayContaining(['nutrition', 'cuisine']));
  });
});
