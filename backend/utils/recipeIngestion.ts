/**
 * @module recipeIngestion
 * @description Two-pass recipe ingestion pipeline.
 *
 * Pass 1 — Deterministic source extraction:
 *   - URL input: fetch HTML, extract JSON-LD/microdata/OG via recipeScraper
 *   - File input: run Gemini's multimodal file parse (no reliable deterministic alternative)
 *
 * Pass 2 — Targeted AI research:
 *   - For every required field still missing after Pass 1, ask Gemini with Google Search
 *     grounding to research ONLY that field. Source-provided fields are NEVER overwritten.
 *
 * Each field's provenance ('source' vs 'researched' vs 'unknown') is returned so the
 * caller can display which values were verified from the source and which were inferred.
 */

import { logger } from '../shared/utils/logger';
import type { RecipeNutrition, RecipeDifficulty } from '@database/types';
import {
  scrapeRecipeFromUrl,
  ScrapedRecipe,
  Provenance as ScrapeProvenance,
} from './recipeScraper';
import { GeminiService, ParsedRecipe, ResearchableField, ALLOWED_GAPS } from './geminiService';
import { normalizeCuisine, normalizeDifficulty, normalizeDietaryTags } from './recipeNormalize';

/**
 * Provenance for every field in the final ingested recipe.
 * 'source' = scraped from the URL/file
 * 'researched' = filled in by AI research
 * 'unknown' = source didn't provide and research didn't find/returned invalid data
 */
export type FieldProvenance = 'source' | 'researched' | 'unknown';

export interface IngestedRecipe extends ParsedRecipe {
  dietary_tags: string[];
}

export interface IngestionResult {
  recipe: IngestedRecipe;
  provenance: Record<string, FieldProvenance>;
  /** How Pass 1 ran: 'jsonld'/'microdata'/'og' for URL scrape, 'gemini-url'/'gemini-file' for AI fallback, 'empty' for total failure */
  pass1Source: string;
  /** Gemini was called during Pass 2 to fill at least one gap */
  researchRan: boolean;
}

/**
 * Merge a ScrapedRecipe (Pass 1) with a ParsedRecipe fallback (Gemini-only Pass 1).
 * Source fields always win. Used when URL scrape only got partial data AND we also
 * have a Gemini fallback parse — but in practice we don't run both: if scrape got
 * ANY fields, we trust those and fill remaining gaps via research, not Gemini-URL.
 */

const REQUIRED_FOR_SAVE: readonly (keyof ScrapedRecipe)[] = [
  'name',
  'ingredients',
  'instructions',
] as const;

function isEmptyField(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((v) => v === undefined || v === null)
  ) {
    return true;
  }
  return false;
}

function hasAllRequired(scraped: ScrapedRecipe): boolean {
  for (const f of REQUIRED_FOR_SAVE) {
    if (isEmptyField(scraped[f])) return false;
  }
  return true;
}

function scrapedToParsed(scraped: ScrapedRecipe): ParsedRecipe {
  return {
    name: scraped.name ?? '',
    ingredients: scraped.ingredients ?? [],
    instructions: scraped.instructions ?? [],
    servings: scraped.servings,
    prep_time_minutes: scraped.prep_time_minutes,
    cook_time_minutes: scraped.cook_time_minutes,
    nutrition: scraped.nutrition,
    cuisine: scraped.cuisine,
    difficulty: scraped.difficulty,
    image_url: scraped.image_url,
  };
}

/**
 * Apply researched values to a base recipe. Never overwrites existing source values.
 * Returns the merged recipe plus the provenance map.
 */
function mergeResearched(
  base: ParsedRecipe,
  baseProvenance: Record<string, FieldProvenance>,
  researched: Partial<{
    nutrition: RecipeNutrition;
    cuisine: string;
    difficulty: RecipeDifficulty;
    prep_time_minutes: number;
    cook_time_minutes: number;
    servings: number;
    dietary_tags: string[];
    image_url: string;
  }>,
  existingDietaryTags: string[]
): { recipe: IngestedRecipe; provenance: Record<string, FieldProvenance> } {
  const recipe: IngestedRecipe = {
    ...base,
    dietary_tags: existingDietaryTags,
  };
  const provenance = { ...baseProvenance };

  const apply = <K extends keyof IngestedRecipe>(
    key: K,
    value: IngestedRecipe[K] | undefined
  ): void => {
    if (value === undefined) return;
    if (provenance[key as string] === 'source') return; // Never overwrite source
    recipe[key] = value;
    provenance[key as string] = 'researched';
  };

  if (researched.nutrition !== undefined) apply('nutrition', researched.nutrition);
  if (researched.cuisine !== undefined) apply('cuisine', researched.cuisine);
  if (researched.difficulty !== undefined) apply('difficulty', researched.difficulty);
  if (researched.prep_time_minutes !== undefined)
    apply('prep_time_minutes', researched.prep_time_minutes);
  if (researched.cook_time_minutes !== undefined)
    apply('cook_time_minutes', researched.cook_time_minutes);
  if (researched.servings !== undefined) apply('servings', researched.servings);
  if (researched.image_url !== undefined) apply('image_url', researched.image_url);
  if (researched.dietary_tags !== undefined) {
    if (provenance.dietary_tags !== 'source') {
      recipe.dietary_tags = researched.dietary_tags;
      provenance.dietary_tags = 'researched';
    }
  }

  return { recipe, provenance };
}

/**
 * Lowercase+trim cuisine/difficulty/dietary_tags on an IngestionResult so
 * stored and queried values are consistently cased.
 */
function normalizeResult(result: IngestionResult): IngestionResult {
  const recipe: IngestedRecipe = {
    ...result.recipe,
    cuisine: normalizeCuisine(result.recipe.cuisine),
    difficulty: normalizeDifficulty(result.recipe.difficulty),
    dietary_tags: normalizeDietaryTags(result.recipe.dietary_tags),
  };
  return { ...result, recipe };
}

function buildProvenance(
  scrapedProv: ScrapeProvenance,
  allFields: readonly string[]
): Record<string, FieldProvenance> {
  const prov: Record<string, FieldProvenance> = {};
  for (const field of allFields) {
    prov[field] =
      (scrapedProv as Record<string, unknown>)[field] === 'source' ? 'source' : 'unknown';
  }
  return prov;
}

const TRACKED_FIELDS = [
  'name',
  'ingredients',
  'instructions',
  'servings',
  'prep_time_minutes',
  'cook_time_minutes',
  'nutrition',
  'cuisine',
  'difficulty',
  'dietary_tags',
  'image_url',
] as const;

/**
 * Two-pass URL ingestion:
 *   1. Scrape source deterministically.
 *   2. If required fields are missing, fall back to Gemini URL parse.
 *   3. For optional fields still missing, call Gemini research with Google Search grounding.
 *
 * Always returns a result — individual field failures don't abort the whole flow.
 */
export async function ingestRecipeFromUrl(url: string): Promise<IngestionResult> {
  const scrapeResult = await scrapeRecipeFromUrl(url);
  let pass1Source: string = scrapeResult.extractor;
  let base: ParsedRecipe;
  let provenance: Record<string, FieldProvenance>;
  let sourceDietaryTags: string[] = scrapeResult.recipe.dietary_tags ?? [];

  if (hasAllRequired(scrapeResult.recipe)) {
    base = scrapedToParsed(scrapeResult.recipe);
    provenance = buildProvenance(scrapeResult.provenance, TRACKED_FIELDS);
  } else {
    // Pass 1 fallback: full Gemini URL parse
    logger.info('[recipeIngestion] Scrape incomplete; falling back to Gemini URL parse', {
      url,
      scrapedExtractor: scrapeResult.extractor,
    });
    try {
      base = await GeminiService.parseRecipeFromUrl(url);
      pass1Source = 'gemini-url';
      provenance = {};
      for (const field of TRACKED_FIELDS) {
        const v = (base as unknown as Record<string, unknown>)[field];
        provenance[field] = isEmptyField(v) ? 'unknown' : 'researched';
      }
    } catch (error) {
      logger.error('[recipeIngestion] Gemini URL fallback failed', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Pass 2: research remaining gaps (only for ALLOWED_GAPS fields with 'unknown' provenance)
  const gaps: ResearchableField[] = ALLOWED_GAPS.filter((field) => provenance[field] === 'unknown');

  let researchRan = false;
  if (gaps.length > 0 && base.ingredients.length > 0 && base.instructions.length > 0) {
    try {
      const researched = await GeminiService.researchMissingFields(
        {
          name: base.name,
          ingredients: base.ingredients,
          instructions: base.instructions,
          servings: base.servings,
        },
        url,
        gaps
      );
      researchRan = true;
      const merged = mergeResearched(base, provenance, researched, sourceDietaryTags);
      return normalizeResult({
        recipe: merged.recipe,
        provenance: merged.provenance,
        pass1Source,
        researchRan,
      });
    } catch (error) {
      logger.warn('[recipeIngestion] Pass 2 research failed; returning Pass 1 only', {
        url,
        gaps,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return normalizeResult({
    recipe: { ...base, dietary_tags: sourceDietaryTags },
    provenance,
    pass1Source,
    researchRan,
  });
}

/**
 * Two-pass file ingestion. Pass 1 is Gemini's multimodal file parse (no deterministic
 * alternative for images/PDFs). Pass 2 fills any remaining gaps via targeted research.
 */
export async function ingestRecipeFromFile(
  fileBuffer: Buffer,
  mimeType: string,
  filename: string
): Promise<IngestionResult> {
  const base = await GeminiService.parseRecipeFromFile(fileBuffer, mimeType, filename);
  const provenance: Record<string, FieldProvenance> = {};
  for (const field of TRACKED_FIELDS) {
    const v = (base as unknown as Record<string, unknown>)[field];
    provenance[field] = isEmptyField(v) ? 'unknown' : 'researched';
  }

  const gaps: ResearchableField[] = ALLOWED_GAPS.filter((field) => provenance[field] === 'unknown');

  let researchRan = false;
  if (gaps.length > 0 && base.ingredients.length > 0 && base.instructions.length > 0) {
    try {
      const researched = await GeminiService.researchMissingFields(
        {
          name: base.name,
          ingredients: base.ingredients,
          instructions: base.instructions,
          servings: base.servings,
        },
        null,
        gaps
      );
      researchRan = true;
      const merged = mergeResearched(base, provenance, researched, []);
      return normalizeResult({
        recipe: merged.recipe,
        provenance: merged.provenance,
        pass1Source: 'gemini-file',
        researchRan,
      });
    } catch (error) {
      logger.warn('[recipeIngestion] File Pass 2 research failed; returning Pass 1 only', {
        filename,
        gaps,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return normalizeResult({
    recipe: { ...base, dietary_tags: [] },
    provenance,
    pass1Source: 'gemini-file',
    researchRan,
  });
}

/**
 * Summarize provenance for display: `🔍 Source: 6 • 🤖 Researched: 3 • ❓ Unknown: 2`
 */
export function summarizeProvenance(provenance: Record<string, FieldProvenance>): {
  sourceCount: number;
  researchedCount: number;
  unknownCount: number;
  researchedFields: string[];
} {
  let sourceCount = 0;
  let researchedCount = 0;
  let unknownCount = 0;
  const researchedFields: string[] = [];
  for (const [field, prov] of Object.entries(provenance)) {
    if (prov === 'source') sourceCount++;
    else if (prov === 'researched') {
      researchedCount++;
      researchedFields.push(field);
    } else unknownCount++;
  }
  return { sourceCount, researchedCount, unknownCount, researchedFields };
}
