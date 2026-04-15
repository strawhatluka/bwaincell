/* eslint-disable no-undef */
/**
 * @module recipeScraper
 * @description Deterministic recipe extraction from URLs. Fetches HTML
 * server-side and pulls structured data from JSON-LD (Schema.org Recipe),
 * microdata, and Open Graph tags. Used as Pass 1 of the two-pass ingestion
 * pipeline — Pass 2 (AI research) only fills fields this pass couldn't find.
 */

import { parse as parseHtml, HTMLElement } from 'node-html-parser';
import { logger } from '../shared/utils/logger';
import type { RecipeIngredient, RecipeNutrition, RecipeDifficulty } from '../../supabase/types';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const USER_AGENT = 'Mozilla/5.0 (compatible; Bwaincell/1.0; +https://github.com/bwaincell)';

/**
 * Output of Pass 1 scraping. Every field is nullable — unset means the source
 * did not provide it and Pass 2 should consider filling it.
 */
export interface ScrapedRecipe {
  name: string | null;
  ingredients: RecipeIngredient[] | null;
  instructions: string[] | null;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  nutrition: RecipeNutrition | null;
  cuisine: string | null;
  difficulty: RecipeDifficulty | null;
  dietary_tags: string[] | null;
  image_url: string | null;
}

/**
 * Which fields were filled from the source vs. still missing after Pass 1.
 * Keys are ScrapedRecipe fields; value is the provenance tag.
 */
export type Provenance = Partial<Record<keyof ScrapedRecipe, 'source'>>;

export interface ScrapeResult {
  recipe: ScrapedRecipe;
  provenance: Provenance;
  /** Which extractor path produced the data: jsonld | microdata | og | empty */
  extractor: 'jsonld' | 'microdata' | 'og' | 'empty';
}

/**
 * Parse an ISO 8601 duration (e.g., "PT1H30M", "PT45M", "P0D") to minutes.
 * Returns null for invalid or zero durations.
 */
export function parseIsoDurationToMinutes(input: unknown): number | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Matches PT[#H][#M][#S] and P[#D]T... — we only care about days/hours/minutes.
  const match = trimmed.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!match) return null;

  const days = match[1] ? parseInt(match[1], 10) : 0;
  const hours = match[2] ? parseInt(match[2], 10) : 0;
  const minutes = match[3] ? parseInt(match[3], 10) : 0;
  const seconds = match[4] ? parseFloat(match[4]) : 0;

  const total = days * 24 * 60 + hours * 60 + minutes + seconds / 60;
  const rounded = Math.round(total);
  return rounded > 0 ? rounded : null;
}

/**
 * Fetch the HTML body of a URL with timeout, size cap, and redirect handling.
 * Throws on network error, non-2xx status, or non-HTML content-type.
 */
export async function fetchRecipeHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('html') && !contentType.includes('xml')) {
      throw new Error(`Non-HTML content-type: ${contentType}`);
    }

    // Stream with a byte cap so we don't blow memory on a huge page.
    const reader = response.body?.getReader();
    if (!reader) {
      return await response.text();
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    let done = false;
    while (!done) {
      const chunk = await reader.read();
      done = chunk.done;
      if (chunk.done) break;
      total += chunk.value.length;
      if (total > MAX_BYTES) {
        reader.cancel().catch(() => undefined);
        throw new Error(`Response exceeds ${MAX_BYTES} bytes`);
      }
      chunks.push(chunk.value);
    }
    const concat = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      concat.set(chunk, offset);
      offset += chunk.length;
    }
    return new TextDecoder('utf-8').decode(concat);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Extract a Schema.org Recipe from a JSON-LD blob. JSON-LD can be an object,
 * an array of objects, or wrapped in @graph. Returns the first matching
 * Recipe node, or null.
 */
function findRecipeNode(jsonld: unknown): Record<string, unknown> | null {
  if (!jsonld || typeof jsonld !== 'object') return null;

  const isRecipeType = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') return false;
    const t = (node as Record<string, unknown>)['@type'];
    if (typeof t === 'string') return t === 'Recipe';
    if (Array.isArray(t)) return t.includes('Recipe');
    return false;
  };

  if (isRecipeType(jsonld)) return jsonld as Record<string, unknown>;

  if (Array.isArray(jsonld)) {
    for (const item of jsonld) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }

  const obj = jsonld as Record<string, unknown>;
  if (obj['@graph'] && Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph']) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
  }
  return null;
}

function asString(v: unknown): string | null {
  if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  return null;
}

function asStringArray(v: unknown): string[] | null {
  if (!v) return null;
  if (typeof v === 'string') {
    const trimmed = v.trim();
    return trimmed ? [trimmed] : null;
  }
  if (Array.isArray(v)) {
    const out: string[] = [];
    for (const item of v) {
      const s = asString(item);
      if (s) out.push(s);
    }
    return out.length > 0 ? out : null;
  }
  return null;
}

function extractImageUrl(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v.trim() || null;
  if (Array.isArray(v)) {
    for (const item of v) {
      const url = extractImageUrl(item);
      if (url) return url;
    }
    return null;
  }
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    if (typeof obj.url === 'string') return obj.url;
    if (typeof obj['@id'] === 'string') return obj['@id'] as string;
  }
  return null;
}

function extractServings(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
  if (typeof v === 'string') {
    const m = v.match(/\d+/);
    if (m) {
      const n = parseInt(m[0], 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    return null;
  }
  if (Array.isArray(v) && v.length > 0) return extractServings(v[0]);
  return null;
}

function extractInstructions(v: unknown): string[] | null {
  if (!v) return null;
  if (typeof v === 'string') {
    // Some sites give a single paragraph. Split on sentence-like boundaries, ignore very short fragments.
    const lines = v
      .split(/\r?\n|(?<=\.)\s+(?=[A-Z])/)
      .map((l) => l.trim())
      .filter((l) => l.length > 5);
    return lines.length > 0 ? lines : null;
  }
  if (Array.isArray(v)) {
    const out: string[] = [];
    for (const item of v) {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed) out.push(trimmed);
      } else if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const t = obj['@type'];
        // HowToSection has itemListElement (array of HowToStep); HowToStep has text/name
        if (t === 'HowToSection' && Array.isArray(obj.itemListElement)) {
          const nested = extractInstructions(obj.itemListElement);
          if (nested) out.push(...nested);
        } else {
          const text = asString(obj.text) || asString(obj.name);
          if (text) out.push(text);
        }
      }
    }
    return out.length > 0 ? out : null;
  }
  return null;
}

function extractIngredients(v: unknown): RecipeIngredient[] | null {
  const raw = asStringArray(v);
  if (!raw) return null;
  // JSON-LD recipeIngredient is an array of free-text strings ("2 cups flour").
  // We don't try to parse quantity/unit here — that's Pass 2's job (or a later
  // refinement). Store each as name with empty quantity/unit so the recipe
  // schema is satisfied; downstream parseQuantity in recipe.ts handles strings.
  return raw.map((text) => {
    const { quantity, unit, name } = splitIngredientString(text);
    return { name, quantity, unit };
  });
}

/**
 * Best-effort split of a free-form ingredient string into quantity/unit/name.
 * Defensive: if it can't parse, returns the whole string as `name` with
 * empty quantity/unit so the rest of the pipeline still has useful data.
 */
export function splitIngredientString(raw: string): {
  quantity: number | string;
  unit: string;
  name: string;
} {
  const trimmed = raw.trim();
  // Match leading quantity: integer, decimal, fraction, or mixed fraction.
  // Examples: "2", "2.5", "1/2", "1 1/2"
  const qtyMatch = trimmed.match(/^((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?)\s+(.*)$/);
  if (!qtyMatch) {
    return { quantity: '', unit: '', name: trimmed };
  }
  const qtyRaw = qtyMatch[1];
  const rest = qtyMatch[2].trim();

  const knownUnits = new Set([
    'cup',
    'cups',
    'tbsp',
    'tablespoon',
    'tablespoons',
    'tsp',
    'teaspoon',
    'teaspoons',
    'oz',
    'ounce',
    'ounces',
    'lb',
    'lbs',
    'pound',
    'pounds',
    'g',
    'gram',
    'grams',
    'kg',
    'kilogram',
    'ml',
    'l',
    'liter',
    'liters',
    'pinch',
    'dash',
    'clove',
    'cloves',
    'can',
    'cans',
    'package',
    'packages',
  ]);
  const unitMatch = rest.match(/^([a-zA-Z]+\.?)\s+(.*)$/);
  if (unitMatch) {
    const candidate = unitMatch[1].toLowerCase().replace(/\.$/, '');
    if (knownUnits.has(candidate)) {
      return { quantity: qtyRaw, unit: candidate, name: unitMatch[2].trim() };
    }
  }
  return { quantity: qtyRaw, unit: '', name: rest };
}

function extractNutrition(v: unknown): RecipeNutrition | null {
  if (!v || typeof v !== 'object') return null;
  const n = v as Record<string, unknown>;
  const pickNumber = (field: unknown): number | undefined => {
    if (typeof field === 'number' && Number.isFinite(field)) return field;
    if (typeof field === 'string') {
      const m = field.match(/[\d.]+/);
      if (m) {
        const num = parseFloat(m[0]);
        return Number.isFinite(num) ? num : undefined;
      }
    }
    return undefined;
  };

  const nutrition: RecipeNutrition = {
    calories: pickNumber(n.calories),
    protein: pickNumber(n.proteinContent),
    carbs: pickNumber(n.carbohydrateContent),
    fat: pickNumber(n.fatContent),
    fiber: pickNumber(n.fiberContent),
    sugar: pickNumber(n.sugarContent),
    sodium: pickNumber(n.sodiumContent),
  };

  // Consider "empty" if every field is undefined
  const hasAny = Object.values(nutrition).some((x) => x !== undefined);
  return hasAny ? nutrition : null;
}

function extractDifficulty(v: unknown): RecipeDifficulty | null {
  const s = asString(v);
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower.includes('easy') || lower.includes('simple')) return 'easy';
  if (lower.includes('medium') || lower.includes('intermediate')) return 'medium';
  if (lower.includes('hard') || lower.includes('difficult') || lower.includes('advanced'))
    return 'hard';
  return null;
}

function extractDietaryTags(v: unknown): string[] | null {
  if (!v) return null;
  const raw = asStringArray(v);
  if (!raw) return null;
  // suitableForDiet values are Schema.org URIs like http://schema.org/VegetarianDiet
  const tags: string[] = [];
  for (const item of raw) {
    const m = item.match(/([A-Za-z]+)Diet/i);
    if (m) {
      tags.push(m[1].toLowerCase());
    } else if (!/^https?:/i.test(item)) {
      tags.push(item.toLowerCase());
    }
  }
  return tags.length > 0 ? tags : null;
}

/**
 * Map a Schema.org Recipe node to our ScrapedRecipe shape, setting fields to
 * null when the source doesn't provide them.
 */
export function mapRecipeNode(node: Record<string, unknown>): ScrapedRecipe {
  return {
    name: asString(node.name) ?? asString(node.headline),
    ingredients: extractIngredients(node.recipeIngredient ?? node.ingredients),
    instructions: extractInstructions(node.recipeInstructions),
    servings: extractServings(node.recipeYield ?? node.yield),
    prep_time_minutes: parseIsoDurationToMinutes(node.prepTime),
    cook_time_minutes: parseIsoDurationToMinutes(node.cookTime),
    nutrition: extractNutrition(node.nutrition),
    cuisine: asString(node.recipeCuisine),
    difficulty: extractDifficulty(node.recipeCategory),
    dietary_tags: extractDietaryTags(node.suitableForDiet),
    image_url: extractImageUrl(node.image),
  };
}

function emptyRecipe(): ScrapedRecipe {
  return {
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
  };
}

function computeProvenance(recipe: ScrapedRecipe): Provenance {
  const prov: Provenance = {};
  (Object.keys(recipe) as (keyof ScrapedRecipe)[]).forEach((key) => {
    const val = recipe[key];
    if (val !== null && !(Array.isArray(val) && val.length === 0)) {
      prov[key] = 'source';
    }
  });
  return prov;
}

/**
 * Walk every `<script type="application/ld+json">` tag and try to find a
 * Recipe node. Returns the first one found, or null.
 */
function extractFromJsonLd(root: HTMLElement): Record<string, unknown> | null {
  const scripts = root.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    const text = script.textContent?.trim();
    if (!text) continue;
    try {
      const parsed = JSON.parse(text);
      const recipe = findRecipeNode(parsed);
      if (recipe) return recipe;
    } catch {
      // Some sites have broken JSON-LD; skip and try the next one.
    }
  }
  return null;
}

/**
 * Fallback: microdata via itemprop attributes. Much more fragile than JSON-LD.
 * We only extract name, ingredients, instructions, and image — the rest is
 * rarely marked up with microdata in practice.
 */
function extractFromMicrodata(root: HTMLElement): ScrapedRecipe | null {
  const scope = root.querySelector('[itemtype*="Recipe"]');
  if (!scope) return null;

  const recipe = emptyRecipe();

  const nameEl = scope.querySelector('[itemprop="name"]');
  if (nameEl) recipe.name = nameEl.textContent.trim() || null;

  const ingEls = scope.querySelectorAll('[itemprop="recipeIngredient"], [itemprop="ingredients"]');
  if (ingEls.length > 0) {
    const texts = ingEls.map((e) => e.textContent.trim()).filter((t) => t.length > 0);
    recipe.ingredients = texts.map((text) => {
      const { quantity, unit, name } = splitIngredientString(text);
      return { name, quantity, unit };
    });
  }

  const stepEls = scope.querySelectorAll('[itemprop="recipeInstructions"]');
  if (stepEls.length > 0) {
    const texts = stepEls.map((e) => e.textContent.trim()).filter((t) => t.length > 0);
    if (texts.length > 0) recipe.instructions = texts;
  }

  const imgEl = scope.querySelector('[itemprop="image"]');
  if (imgEl) {
    recipe.image_url =
      imgEl.getAttribute('src') || imgEl.getAttribute('content') || recipe.image_url;
  }

  const anyPopulated = Object.values(recipe).some((v) => v !== null);
  return anyPopulated ? recipe : null;
}

/**
 * Last-ditch: Open Graph tags. Gives us only title and image.
 */
function extractFromOpenGraph(root: HTMLElement): ScrapedRecipe | null {
  const recipe = emptyRecipe();
  const ogTitle = root.querySelector('meta[property="og:title"]');
  const ogImage = root.querySelector('meta[property="og:image"]');

  if (ogTitle) recipe.name = ogTitle.getAttribute('content') || null;
  if (ogImage) recipe.image_url = ogImage.getAttribute('content') || null;

  const hasSomething = recipe.name !== null || recipe.image_url !== null;
  return hasSomething ? recipe : null;
}

/**
 * Extract structured recipe data from raw HTML. Tries JSON-LD, then
 * microdata, then Open Graph, in that order. Returns an empty shell if
 * nothing matches — Pass 2 will have everything to do.
 */
export function extractStructuredRecipe(html: string): ScrapeResult {
  const root = parseHtml(html);

  const jsonldNode = extractFromJsonLd(root);
  if (jsonldNode) {
    const recipe = mapRecipeNode(jsonldNode);
    return { recipe, provenance: computeProvenance(recipe), extractor: 'jsonld' };
  }

  const microdata = extractFromMicrodata(root);
  if (microdata) {
    return { recipe: microdata, provenance: computeProvenance(microdata), extractor: 'microdata' };
  }

  const og = extractFromOpenGraph(root);
  if (og) {
    return { recipe: og, provenance: computeProvenance(og), extractor: 'og' };
  }

  return { recipe: emptyRecipe(), provenance: {}, extractor: 'empty' };
}

/**
 * Convenience: fetch + extract in one call. Errors on fetch are caught and
 * returned as an empty result so the orchestrator can fall back to Gemini-only.
 */
export async function scrapeRecipeFromUrl(url: string): Promise<ScrapeResult> {
  try {
    const html = await fetchRecipeHtml(url);
    return extractStructuredRecipe(html);
  } catch (error) {
    logger.warn('[recipeScraper] Fetch/extract failed; returning empty result', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { recipe: emptyRecipe(), provenance: {}, extractor: 'empty' };
  }
}
