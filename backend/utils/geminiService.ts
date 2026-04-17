import { GoogleGenAI } from '@google/genai';
import { logger } from '../shared/utils/logger';
import type { RecipeIngredient, RecipeNutrition, RecipeDifficulty } from '@database/types';

/**
 * Response structure for AI-generated date ideas
 */
export interface DateIdeaResponse {
  activity: string;
  description: string;
  estimatedCost?: string;
  timeOfDay?: string;
  url?: string;
}

/**
 * Response structure for WNRS-style conversation questions
 */
export interface WNRSQuestionResponse {
  question: string;
  level: number;
  levelName: string;
}

/**
 * Fields that can be filled in by `researchMissingFields` when the source didn't provide them.
 */
export const ALLOWED_GAPS = [
  'nutrition',
  'cuisine',
  'difficulty',
  'prep_time_minutes',
  'cook_time_minutes',
  'servings',
  'dietary_tags',
  'image_url',
] as const;
export type ResearchableField = (typeof ALLOWED_GAPS)[number];

/**
 * Shape of the subset of ParsedRecipe fields that `researchMissingFields` may return.
 */
export interface ResearchedFields {
  nutrition: RecipeNutrition;
  cuisine: string;
  difficulty: RecipeDifficulty;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  dietary_tags: string[];
  image_url: string;
}

/**
 * Response structure for AI-parsed recipes
 */
export interface ParsedRecipe {
  name: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  nutrition: RecipeNutrition | null;
  cuisine: string | null;
  difficulty: RecipeDifficulty | null;
  image_url: string | null;
}

/**
 * Allowed ingredient categories (MUST match recipe schema enum)
 */
export const INGREDIENT_CATEGORIES = [
  'meats',
  'produce',
  'dairy',
  'pantry',
  'spices',
  'frozen',
  'bakery',
  'other',
] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

/**
 * Input to sanitizeShoppingList: one row of the aggregated list.
 */
export interface SanitizerInputItem {
  name: string;
  quantity: number | string | null;
  unit: string;
  category: string;
}

/**
 * Output row from sanitizeShoppingList. A single consolidated, clean ingredient.
 */
export interface SanitizedItem {
  name: string;
  quantity: number | string | null;
  unit: string;
  category: IngredientCategory;
}

export interface SanitizedShoppingList {
  items: SanitizedItem[];
  warnings: string[];
}

/**
 * Hardcoded rules-based ingredient category lookup.
 * Keys are substrings (lowercase); first match wins.
 */
const INGREDIENT_CATEGORY_RULES: Array<{ keywords: string[]; category: string }> = [
  {
    category: 'meats',
    keywords: ['chicken', 'beef', 'pork', 'turkey', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp'],
  },
  {
    category: 'produce',
    keywords: [
      'onion',
      'garlic',
      'tomato',
      'lettuce',
      'carrot',
      'potato',
      'spinach',
      'broccoli',
      'pepper',
      'apple',
      'banana',
      'lemon',
    ],
  },
  {
    category: 'dairy',
    keywords: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg'],
  },
  {
    category: 'pantry',
    keywords: ['flour', 'sugar', 'rice', 'pasta', 'oil', 'vinegar', 'salt'],
  },
  {
    category: 'spices',
    keywords: ['cumin', 'paprika', 'oregano', 'basil', 'thyme', 'cinnamon'],
  },
  {
    category: 'bakery',
    keywords: ['bread', 'tortilla', 'bun'],
  },
];

const SUPPORTED_FILE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/markdown',
];

/**
 * Service for generating AI-powered date suggestions using Google Gemini Flash 2.5
 */
export class GeminiService {
  private static genAI: GoogleGenAI | null = null;

  /**
   * Initialize the Gemini API client with API key from environment
   * @private
   */
  private static initialize(): void {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('GEMINI_API_KEY not configured - date suggestions will use fallback');
      return;
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }

  /**
   * Generate a creative date idea based on location
   * @param zipCode - ZIP code for location-aware suggestions
   * @returns Promise resolving to a DateIdeaResponse
   * @throws Error if Gemini API is not configured or API call fails
   */
  public static async generateDateIdea(zipCode: string): Promise<DateIdeaResponse> {
    this.initialize();

    if (!this.genAI) {
      throw new Error('Gemini API not configured');
    }

    try {
      // Use gemini-2.5-flash with Google Search grounding for real-time local event data
      const prompt = this.buildPrompt(zipCode);
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
      });
      const text = response.text ?? '';

      return this.parseResponse(text);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to generate date idea from Gemini', {
        zipCode,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Generate a WNRS-style conversation question
   * @returns Promise resolving to a WNRSQuestionResponse
   * @throws Error if Gemini API is not configured or API call fails
   */
  public static async generateQuestion(): Promise<WNRSQuestionResponse> {
    this.initialize();

    if (!this.genAI) {
      throw new Error('Gemini API not configured');
    }

    try {
      const prompt = this.buildQuestionPrompt();
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
      });
      const text = response.text ?? '';

      return this.parseQuestionResponse(text);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to generate question from Gemini', {
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Parse a recipe from a URL. Three branches, selected in priority order:
   *   1. YouTube URL → existing fileData video branch (imageUrls IGNORED).
   *   2. Non-YouTube + non-empty imageUrls → multimodal branch with fileData
   *      image parts (cap 3). googleSearch tool DISABLED (images already
   *      provide the visual context).
   *   3. Non-YouTube + empty/omitted imageUrls → existing text-only branch
   *      with googleSearch tool.
   *
   * Multimodal failures (e.g. Gemini rejecting a remote image URL) are
   * re-thrown — we do NOT silently fall back to the text-only branch. A
   * silent fallback would mask the Instagram image-only failure mode this
   * branch is designed to fix.
   *
   * @param url - Source URL (website or YouTube video)
   * @param imageUrls - Optional candidate image URLs from scraper. Passed
   *                    through as fileData parts (remote fetch, not base64).
   *                    Capped at 3 internally. Ignored for YouTube URLs.
   * @returns Promise resolving to a ParsedRecipe
   * @throws Error if Gemini API is not configured, request fails, or output is invalid
   */
  public static async parseRecipeFromUrl(url: string, imageUrls?: string[]): Promise<ParsedRecipe> {
    this.initialize();

    if (!this.genAI) {
      throw new Error('Gemini API not configured');
    }

    const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(url);
    const images = (imageUrls ?? []).slice(0, 3);
    const useMultimodal = !isYouTube && images.length > 0;

    try {
      const prompt = this.buildRecipeParsePrompt(
        isYouTube
          ? `a YouTube cooking video at ${url} (watch the video to extract the recipe)`
          : useMultimodal
            ? `the dish depicted in the attached image(s); the source URL was ${url} but may have little or no recipe text — rely primarily on visual analysis`
            : `the recipe at this URL: ${url}`
      );

      let response;
      if (isYouTube) {
        response = await this.genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  fileData: {
                    fileUri: url,
                    mimeType: 'video/*',
                  },
                },
              ],
            },
          ],
        });
      } else if (useMultimodal) {
        response = await this.genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                ...images.map((uri) => ({
                  fileData: {
                    fileUri: uri,
                    mimeType: 'image/*',
                  },
                })),
              ],
            },
          ],
          // NOTE: no config.tools — googleSearch is OFF in the multimodal
          // branch (ADR-2). The images are the visual context; adding web
          // grounding would cross-reference unrelated content.
        });
      } else {
        response = await this.genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { tools: [{ googleSearch: {} }] },
        });
      }

      const text = response.text ?? '';
      return this.parseRecipeResponse(text);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to parse recipe from URL', {
        url,
        isYouTube,
        imageCount: images.length,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Parse a recipe from an uploaded file (image, PDF, or text).
   *
   * @param fileBuffer - Raw file bytes
   * @param mimeType - File MIME type (image/png, image/jpeg, image/webp, application/pdf, text/plain, text/markdown)
   * @param filename - Original filename (used for context and logging)
   * @returns Promise resolving to a ParsedRecipe
   * @throws Error if the MIME type is unsupported, API is not configured, or parsing fails
   */
  public static async parseRecipeFromFile(
    fileBuffer: Buffer,
    mimeType: string,
    filename: string
  ): Promise<ParsedRecipe> {
    if (!SUPPORTED_FILE_MIME_TYPES.includes(mimeType)) {
      throw new Error(
        `Unsupported file type "${mimeType}". Supported types: ${SUPPORTED_FILE_MIME_TYPES.join(', ')}`
      );
    }

    this.initialize();

    if (!this.genAI) {
      throw new Error('Gemini API not configured');
    }

    try {
      const promptText = this.buildRecipeParsePrompt(
        `the recipe in the attached file "${filename}" (${mimeType})`
      );

      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { text: promptText },
          {
            inlineData: {
              mimeType,
              data: fileBuffer.toString('base64'),
            },
          },
        ],
      });

      const text = response.text ?? '';
      return this.parseRecipeResponse(text);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to parse recipe from file', {
        filename,
        mimeType,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Fill in specific missing recipe fields via AI research with Google Search grounding.
   * Only the fields listed in `gaps` are requested and validated; the source-provided
   * fields are passed as context so Gemini doesn't contradict them. Returns ONLY the
   * researched fields (never overwrites caller's source data).
   *
   * The sanity check on nutrition (macros × 4/4/9 kcal/g should roughly equal calories)
   * rejects blatantly hallucinated values.
   *
   * @param partial - Recipe fields already known from source (for context)
   * @param sourceUrl - Original URL (passed to the model so it can cross-reference)
   * @param gaps - Field names to research; valid values listed in ALLOWED_GAPS below
   */
  public static async researchMissingFields(
    partial: {
      name: string;
      ingredients: RecipeIngredient[];
      instructions: string[];
      servings: number | null;
    },
    sourceUrl: string | null,
    gaps: ResearchableField[]
  ): Promise<Partial<ResearchedFields>> {
    if (gaps.length === 0) return {};

    this.initialize();
    if (!this.genAI) {
      throw new Error('Gemini API not configured');
    }

    const validGaps = gaps.filter((g): g is ResearchableField =>
      (ALLOWED_GAPS as readonly string[]).includes(g)
    );
    if (validGaps.length === 0) return {};

    try {
      const prompt = this.buildResearchPrompt(partial, sourceUrl, validGaps);
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
      });
      const text = response.text ?? '';
      const cleaned = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);

      return this.validateResearchedFields(parsed, validGaps);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to research missing recipe fields', {
        gaps: validGaps,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Build the research prompt for missing fields. Each field gets a specific
   * instruction so the model knows what to return and what to ground on.
   * @private
   */
  private static buildResearchPrompt(
    partial: {
      name: string;
      ingredients: RecipeIngredient[];
      instructions: string[];
      servings: number | null;
    },
    sourceUrl: string | null,
    gaps: ResearchableField[]
  ): string {
    const ingredientLines = partial.ingredients
      .map((i) => {
        const qty = i.quantity !== undefined && i.quantity !== null ? String(i.quantity) : '';
        const unit = i.unit ? ` ${i.unit}` : '';
        return `- ${qty}${unit} ${i.name}`.trim();
      })
      .join('\n');

    const sourceContext = sourceUrl
      ? `\nOriginal source URL (consult if useful): ${sourceUrl}`
      : '';

    const fieldInstructions: Record<ResearchableField, string> = {
      nutrition:
        'Estimate per-serving macronutrients. Ground values in USDA FoodData Central via Google Search. Return object {calories, protein, carbs, fat, fiber, sugar, sodium} — calories in kcal, macros in grams, sodium in mg. Cross-check: protein*4 + carbs*4 + fat*9 should be within 25% of calories.',
      cuisine:
        'Identify the most likely cuisine (e.g., "Italian", "Mexican", "Thai", "American"). Use the recipe name and ingredient profile. Return a single string.',
      difficulty:
        'Classify as "easy", "medium", or "hard" based on ingredient count, technique complexity, and typical cook time. Return a single string.',
      prep_time_minutes:
        'Estimate preparation time in minutes based on ingredient count and typical prep work. Return an integer.',
      cook_time_minutes:
        'Estimate cook/bake/simmer time in minutes based on the instructions. Return an integer.',
      servings: 'Estimate the number of servings this recipe yields. Return an integer.',
      dietary_tags:
        'Return applicable dietary tags from this list only: vegetarian, vegan, gluten-free, dairy-free, nut-free, low-carb, keto-friendly. Return a string array.',
      image_url:
        'If a representative image URL can be confidently identified from the source, return it. Otherwise omit. Return a string.',
    };

    const requested = gaps.map((g) => `  - "${g}": ${fieldInstructions[g]}`).join('\n');

    return `You are a precise recipe research assistant. A recipe has already been extracted from a source; you are ONLY filling in specific missing fields. Do NOT invent or contradict the provided data.

Recipe name: ${partial.name}
Servings: ${partial.servings ?? 'unknown'}${sourceContext}

Ingredients:
${ingredientLines}

Instructions:
${partial.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Fields to research (return ONLY these keys in your JSON response):
${requested}

Return ONLY valid JSON (no markdown, no commentary) with exactly these keys: ${gaps.map((g) => `"${g}"`).join(', ')}.
If you cannot confidently determine a field, OMIT that key rather than guessing. Never overwrite fields not listed above.`;
  }

  /**
   * Validate researched-field values returned by Gemini. Drops any fields
   * that don't match the expected shape, and runs a macro-sanity check on
   * nutrition values to catch obvious hallucinations.
   * @private
   */
  private static validateResearchedFields(
    parsed: unknown,
    requestedGaps: ResearchableField[]
  ): Partial<ResearchedFields> {
    if (!parsed || typeof parsed !== 'object') return {};
    const input = parsed as Record<string, unknown>;
    const out: Partial<ResearchedFields> = {};
    const requested = new Set<string>(requestedGaps);

    if (requested.has('nutrition') && input.nutrition && typeof input.nutrition === 'object') {
      const n = input.nutrition as Record<string, unknown>;
      const toNum = (v: unknown): number | undefined => {
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        if (typeof v === 'string') {
          const num = parseFloat(v);
          return Number.isFinite(num) ? num : undefined;
        }
        return undefined;
      };
      const nutrition: RecipeNutrition = {
        calories: toNum(n.calories),
        protein: toNum(n.protein),
        carbs: toNum(n.carbs),
        fat: toNum(n.fat),
        fiber: toNum(n.fiber),
        sugar: toNum(n.sugar),
        sodium: toNum(n.sodium),
      };
      // Macro-calorie sanity check: protein*4 + carbs*4 + fat*9 should be within 25% of calories.
      const hasTriad =
        typeof nutrition.calories === 'number' &&
        typeof nutrition.protein === 'number' &&
        typeof nutrition.carbs === 'number' &&
        typeof nutrition.fat === 'number';
      if (hasTriad) {
        const computed =
          (nutrition.protein as number) * 4 +
          (nutrition.carbs as number) * 4 +
          (nutrition.fat as number) * 9;
        const calories = nutrition.calories as number;
        const deviation = calories > 0 ? Math.abs(computed - calories) / calories : 1;
        if (deviation > 0.25) {
          logger.warn('Researched nutrition failed macro-calorie sanity check; dropping', {
            calories,
            computed,
            deviation,
          });
        } else if (Object.values(nutrition).some((v) => v !== undefined)) {
          out.nutrition = nutrition;
        }
      } else if (Object.values(nutrition).some((v) => v !== undefined)) {
        out.nutrition = nutrition;
      }
    }

    if (requested.has('cuisine')) {
      const s = typeof input.cuisine === 'string' ? input.cuisine.trim() : '';
      if (s) out.cuisine = s;
    }

    if (requested.has('difficulty')) {
      const raw = typeof input.difficulty === 'string' ? input.difficulty.trim().toLowerCase() : '';
      if (raw === 'easy' || raw === 'medium' || raw === 'hard') {
        out.difficulty = raw as RecipeDifficulty;
      }
    }

    const toPositiveInt = (v: unknown): number | undefined => {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.round(v);
      if (typeof v === 'string') {
        const n = parseInt(v, 10);
        if (Number.isFinite(n) && n > 0) return n;
      }
      return undefined;
    };

    if (requested.has('prep_time_minutes')) {
      const n = toPositiveInt(input.prep_time_minutes);
      if (n !== undefined) out.prep_time_minutes = n;
    }
    if (requested.has('cook_time_minutes')) {
      const n = toPositiveInt(input.cook_time_minutes);
      if (n !== undefined) out.cook_time_minutes = n;
    }
    if (requested.has('servings')) {
      const n = toPositiveInt(input.servings);
      if (n !== undefined) out.servings = n;
    }

    if (requested.has('dietary_tags') && Array.isArray(input.dietary_tags)) {
      const allowed = new Set([
        'vegetarian',
        'vegan',
        'gluten-free',
        'dairy-free',
        'nut-free',
        'low-carb',
        'keto-friendly',
      ]);
      const tags: string[] = [];
      for (const item of input.dietary_tags) {
        if (typeof item === 'string' && allowed.has(item.toLowerCase())) {
          tags.push(item.toLowerCase());
        }
      }
      if (tags.length > 0) out.dietary_tags = Array.from(new Set(tags));
    }

    if (requested.has('image_url')) {
      const s = typeof input.image_url === 'string' ? input.image_url.trim() : '';
      if (/^https?:\/\//i.test(s)) out.image_url = s;
    }

    return out;
  }

  /**
   * Select exactly 7 recipes from a list to form a balanced weekly meal plan.
   *
   * @param recipes - Candidate recipes (must contain at least 7 entries)
   * @param preferences - Optional dietary restrictions and excluded cuisines
   * @returns Promise resolving to selected recipe IDs and Gemini's reasoning
   * @throws Error if fewer than 7 recipes are provided, API fails, or output is invalid
   */
  public static async selectMealsForPlan(
    recipes: Array<{
      id: number;
      name: string;
      cuisine: string | null;
      difficulty: string | null;
      dietary_tags: string[];
    }>,
    preferences?: { dietary_restrictions: string[]; excluded_cuisines: string[] }
  ): Promise<{ selectedRecipeIds: number[]; reasoning: string }> {
    if (recipes.length < 7) {
      throw new Error(
        `Need at least 7 recipes to build a weekly meal plan (got ${recipes.length}).`
      );
    }

    this.initialize();

    if (!this.genAI) {
      throw new Error('Gemini API not configured');
    }

    try {
      const prompt = this.buildMealPlanPrompt(recipes, preferences);
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const text = response.text ?? '';

      const cleaned = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed.selectedRecipeIds)) {
        throw new Error('Missing or invalid "selectedRecipeIds" array');
      }
      if (parsed.selectedRecipeIds.length !== 7) {
        throw new Error(
          `Expected exactly 7 selected recipe IDs, got ${parsed.selectedRecipeIds.length}`
        );
      }

      const validIds = new Set(recipes.map((r) => r.id));
      const selectedRecipeIds: number[] = [];
      for (const rawId of parsed.selectedRecipeIds) {
        const id = typeof rawId === 'number' ? rawId : Number(rawId);
        if (!Number.isFinite(id) || !validIds.has(id)) {
          throw new Error(`Selected recipe ID ${rawId} is not in the input recipe list`);
        }
        selectedRecipeIds.push(id);
      }

      const reasoning =
        typeof parsed.reasoning === 'string' && parsed.reasoning.trim().length > 0
          ? parsed.reasoning
          : 'No reasoning provided.';

      return { selectedRecipeIds, reasoning };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to select meals for plan', {
        recipeCount: recipes.length,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Clean up an aggregated shopping list: merge duplicates the deterministic
   * aggregator missed, correct miscategorizations, convert awkward decimals
   * to culinary fractions, strip free-text noise from names. Returns a
   * single consolidated list — all items remain on the list (the user
   * decides what's already in the pantry).
   *
   * Fails soft: the caller passes through the input unchanged if this
   * throws. Missing API key throws.
   *
   * @param items - Aggregated ingredients with best-guess categories
   * @returns Cleaned items + non-fatal warnings for logging
   */
  public static async sanitizeShoppingList(
    items: SanitizerInputItem[]
  ): Promise<SanitizedShoppingList> {
    if (items.length === 0) return { items: [], warnings: [] };

    this.initialize();
    if (!this.genAI) {
      throw new Error('Gemini API not configured');
    }

    try {
      const prompt = this.buildShoppingListSanitizePrompt(items);
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const text = response.text ?? '';
      const cleaned = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);

      return this.validateSanitizedShoppingList(parsed, items);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to sanitize shopping list', {
        inputCount: items.length,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * @private
   */
  private static buildShoppingListSanitizePrompt(items: SanitizerInputItem[]): string {
    const inputJson = JSON.stringify(
      items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        category: i.category,
      })),
      null,
      2
    );

    return `You are a recipe shopping-list cleanup assistant. Given a raw aggregated shopping list, produce a cleaned, consolidated, human-readable version. Every input item must still appear (possibly merged with others) in the output — users decide at the store what they already have; do not drop items.

Rules:
1. Merge duplicates that differ only by hyphenation, casing, adjective order, or trailing descriptors. Examples:
   - "low sodium soy sauce" + "low-sodium soy sauce" → single entry
   - "fresh minced ginger" + "fresh minced ginger root" → single entry
   - "freshly grated parmesan cheese" + "grated parmesan cheese" → single entry
   When merging, sum quantities IF units match. If units differ (e.g., "1 cup" + "2 tbsp"), keep them as a single entry with the larger unit's quantity plus a note, OR pick the dominant quantity if the second is trivial. Do not invent conversions.

2. Correct each item's category to exactly one of: "meats", "produce", "dairy", "spices", "pantry", "frozen", "bakery", "other".
   Guidance:
   - produce: fresh vegetables, fresh fruits, fresh herbs (cilantro, parsley, basil, mint, rosemary WHEN fresh), garlic, onions, citrus, peppers (fresh)
   - spices: dried herbs and seasonings (dried oregano, dried thyme, dried basil, ground cumin, paprika, cinnamon, bay leaves, black pepper, chili flakes, whole peppercorns)
   - meats: poultry, beef, pork, lamb, seafood, sausage, bacon
   - dairy: milk, cheese, yogurt, butter, cream, eggs
   - pantry: oils, vinegars, sauces (soy sauce, fish sauce, hoisin, oyster), condiments, dry goods (flour, rice, pasta, sugar, salt), broths/stocks, canned goods
   - frozen: anything labelled or commonly sold frozen (frozen dumplings, frozen vegetables)
   - bakery: bread, tortillas, buns, bagels, pizza dough
   - other: everything else (ginger root, cornstarch, specialty items like chili crisp)

3. Convert awkward decimal quantities to the nearest sensible culinary amount. Prefer common fractions: 1/8, 1/4, 1/3, 3/8, 1/2, 5/8, 2/3, 3/4, 7/8 and their mixed forms. Examples:
   - 0.57 cup → "1/2 cup" (or "2/3 cup" — pick the nearest common fraction)
   - 1.29 tbsp → "1 1/4 tbsp"
   - 0.17 cup → "3 tbsp" (unit change OK when result is cleaner)
   - 0.03 tsp → "a pinch"
   - 2.5 eggs → "3" (round up countable items)
   Never invent precision. If an input already uses a fraction string, keep it.

4. Clean up free-text noise in names:
   - Remove trailing/leading asterisks ("chicken stock*" → "chicken stock")
   - Collapse duplicate parentheses ("flour ((114g))" → "flour (114g)" or just "flour")
   - Drop decorative parentheticals like "(, to taste)", "(, or more, as needed)", "(, for serving)"
   - Preserve informative notes like "(bone-in, skin-on)", "(thinly sliced)" when a shopper needs them at the store
   - Use title-case or normal-case, not ALL-CAPS or mixed random casing

5. Keep distinct ingredients distinct:
   - "chicken thighs" vs "chicken breasts" — different cuts, never merge
   - "white onion" vs "yellow onion" — different varieties, keep separate
   - "olive oil" vs "extra virgin olive oil" — keep separate

6. Preserve unparseable quantities as-is when they're informative (e.g., "a pinch", "to taste", "1 bunch"). If an item has no quantity at all and was in the input, keep it with an empty quantity.

Input (JSON array):
${inputJson}

Return ONLY valid JSON matching this exact shape — no markdown code fences, no commentary:
{
  "items": [
    { "name": "string", "quantity": "string or number or null", "unit": "string", "category": "meats|produce|dairy|spices|pantry|frozen|bakery|other" }
  ],
  "warnings": [ "string" ]
}

Use "warnings" for any cases you couldn't confidently merge or quantify — informational only. Every input ingredient must map to at least one output item.`;
  }

  /**
   * Validate Gemini's sanitized shopping list response. Coerces invalid
   * categories to 'other' and drops output items whose names bear no
   * resemblance to any input item (anti-hallucination).
   * @private
   */
  private static validateSanitizedShoppingList(
    parsed: unknown,
    inputs: SanitizerInputItem[]
  ): SanitizedShoppingList {
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Sanitizer response is not an object');
    }
    const obj = parsed as Record<string, unknown>;
    if (!Array.isArray(obj.items)) {
      throw new Error('Sanitizer response missing "items" array');
    }

    // Build a lowercased set of input name tokens for anti-hallucination fuzzy match.
    const inputTokens = new Set<string>();
    for (const input of inputs) {
      const lower = input.name.toLowerCase();
      for (const token of lower.split(/[^a-z]+/)) {
        if (token.length >= 3) inputTokens.add(token);
      }
    }

    const validated: SanitizedItem[] = [];
    const droppedNames: string[] = [];
    for (const raw of obj.items) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as Record<string, unknown>;

      const name = typeof item.name === 'string' ? item.name.trim() : '';
      if (!name) continue;

      // Anti-hallucination: at least one 3+ char token in the output name must match an input token.
      const outputTokens = name
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((t) => t.length >= 3);
      const hasInputMatch = outputTokens.some((t) => inputTokens.has(t));
      if (!hasInputMatch && inputTokens.size > 0) {
        droppedNames.push(name);
        continue;
      }

      const unit = typeof item.unit === 'string' ? item.unit : '';
      let quantity: number | string | null = null;
      if (typeof item.quantity === 'number' && Number.isFinite(item.quantity)) {
        quantity = item.quantity;
      } else if (typeof item.quantity === 'string') {
        quantity = item.quantity;
      }

      let category: IngredientCategory = 'other';
      if (typeof item.category === 'string') {
        const c = item.category.trim().toLowerCase();
        if ((INGREDIENT_CATEGORIES as readonly string[]).includes(c)) {
          category = c as IngredientCategory;
        }
      }

      validated.push({ name, quantity, unit, category });
    }

    const warnings: string[] = [];
    if (Array.isArray(obj.warnings)) {
      for (const w of obj.warnings) {
        if (typeof w === 'string' && w.trim()) warnings.push(w.trim());
      }
    }
    if (droppedNames.length > 0) {
      warnings.push(
        `Dropped ${droppedNames.length} output item(s) with no input token match: ${droppedNames.slice(0, 3).join('; ')}`
      );
    }

    return { items: validated, warnings };
  }

  /**
   * Categorize an ingredient into a grocery aisle category.
   * Uses a fast rules-based lookup first; falls back to Gemini for unknown items.
   *
   * @param ingredientName - Ingredient name (e.g., "chicken thighs")
   * @returns Category string, one of: meats, produce, dairy, pantry, spices, frozen, bakery, other
   */
  public static async categorizeIngredient(ingredientName: string): Promise<string> {
    const normalized = ingredientName.toLowerCase();

    // Rules-based fast path — saves Gemini calls for common ingredients
    for (const rule of INGREDIENT_CATEGORY_RULES) {
      if (rule.keywords.some((kw) => normalized.includes(kw))) {
        return rule.category;
      }
    }

    this.initialize();

    if (!this.genAI) {
      // No API key — default to "other" rather than throwing for a simple lookup
      return 'other';
    }

    try {
      const prompt = `Categorize the grocery ingredient "${ingredientName}" into EXACTLY ONE of these categories: meats, produce, dairy, pantry, spices, frozen, bakery, other.

Respond with ONLY the single category word (no quotes, no punctuation, no extra text).`;

      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const raw = (response.text ?? '').trim().toLowerCase();
      const cleaned = raw.replace(/[^a-z]/g, '');

      if ((INGREDIENT_CATEGORIES as readonly string[]).includes(cleaned)) {
        return cleaned;
      }

      logger.warn('Gemini returned unknown ingredient category', {
        ingredientName,
        raw,
      });
      return 'other';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to categorize ingredient via Gemini', {
        ingredientName,
        error: errorMessage,
      });
      return 'other';
    }
  }

  /**
   * Suggest dietary tags for a recipe based on its ingredient list.
   * Uses a rules-based heuristic (no API call) for v1.
   *
   * @param ingredients - Recipe ingredient list
   * @returns Deduplicated array of applicable tags from:
   *   vegetarian, vegan, gluten-free, dairy-free, nut-free, low-carb, keto-friendly
   */
  public static async suggestDietaryTags(ingredients: RecipeIngredient[]): Promise<string[]> {
    const names = ingredients.map((i) => i.name.toLowerCase());
    const hasAny = (keywords: string[]): boolean =>
      names.some((name) => keywords.some((kw) => name.includes(kw)));

    const meatKeywords = [
      'chicken',
      'beef',
      'pork',
      'turkey',
      'lamb',
      'fish',
      'salmon',
      'tuna',
      'shrimp',
      'bacon',
      'sausage',
      'ham',
      'anchovy',
      'crab',
      'lobster',
    ];
    const animalProductKeywords = [
      'milk',
      'cheese',
      'yogurt',
      'butter',
      'cream',
      'egg',
      'honey',
      'ghee',
    ];
    const glutenKeywords = [
      'wheat',
      'barley',
      'rye',
      'flour',
      'bread',
      'pasta',
      'couscous',
      'tortilla',
      'bun',
    ];
    const dairyKeywords = ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'ghee'];
    const nutKeywords = [
      'almond',
      'walnut',
      'pecan',
      'cashew',
      'hazelnut',
      'pistachio',
      'peanut',
      'macadamia',
      'nut ', // trailing space avoids matching "nutmeg"
      ' nut',
    ];

    const tags = new Set<string>();

    const hasMeat = hasAny(meatKeywords);
    const hasAnimalProduct = hasAny(animalProductKeywords);
    const hasGluten = hasAny(glutenKeywords);
    const hasDairy = hasAny(dairyKeywords);
    const hasNut = hasAny(nutKeywords);

    if (!hasMeat) {
      tags.add('vegetarian');
    }
    if (!hasMeat && !hasAnimalProduct) {
      tags.add('vegan');
    }
    if (!hasGluten) {
      tags.add('gluten-free');
    }
    if (!hasDairy) {
      tags.add('dairy-free');
    }
    if (!hasNut) {
      tags.add('nut-free');
    }

    return Array.from(tags);
  }

  /**
   * Build the prompt for Gemini API
   * @param zipCode - ZIP code for location context
   * @returns Formatted prompt string
   * @private
   */
  private static buildPrompt(zipCode: string): string {
    return `You are a creative date planner. Search for local events and activities happening tonight or this weekend near zip code ${zipCode}, then generate ONE unique date idea for couples that incorporates what's actually going on locally.

Requirements:
- Search for real local events, shows, markets, festivals, or activities near ${zipCode}
- Build a date idea around a real local event or activity you find
- Include the specific venue name and event details
- Provide a brief description (2-3 sentences)
- Estimate cost range (Budget-friendly, Moderate, Splurge)
- Suggest time of day (Morning, Afternoon, Evening, Night)
- Include a URL link to the event page or venue website

Format your response as JSON:
{
  "activity": "Activity Name",
  "description": "Brief description incorporating the local event",
  "estimatedCost": "Budget-friendly|Moderate|Splurge",
  "timeOfDay": "Morning|Afternoon|Evening|Night",
  "url": "https://example.com/event-page"
}`;
  }

  /**
   * Parse and validate Gemini API response
   * @param text - Raw text response from Gemini
   * @returns Parsed DateIdeaResponse object
   * @throws Error if response format is invalid
   * @private
   */
  private static parseResponse(text: string): DateIdeaResponse {
    try {
      // Remove markdown code blocks if present (```json ... ```)
      const cleaned = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);

      // Validate required fields
      if (!parsed.activity || typeof parsed.activity !== 'string') {
        throw new Error('Missing or invalid "activity" field');
      }

      if (!parsed.description || typeof parsed.description !== 'string') {
        throw new Error('Missing or invalid "description" field');
      }

      return {
        activity: parsed.activity,
        description: parsed.description,
        estimatedCost: parsed.estimatedCost || undefined,
        timeOfDay: parsed.timeOfDay || undefined,
        url: parsed.url || undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown parse error';
      logger.error('Failed to parse Gemini response', {
        text: text.substring(0, 200), // Log first 200 chars only
        error: errorMessage,
      });
      throw new Error(`Invalid response format: ${errorMessage}`);
    }
  }

  /**
   * Build the prompt for WNRS-style question generation
   * @returns Formatted prompt string
   * @private
   */
  private static buildQuestionPrompt(): string {
    return `You are a conversation question generator inspired by the card game "We're Not Really Strangers" (WNRS). Generate ONE thought-provoking conversation question.

WNRS has 3 progressive levels:
- Level 1: Perception — Light, approachable questions about first impressions and surface-level observations (e.g., "What was your first impression of me?" or "What do you think I'm most passionate about?")
- Level 2: Connection — Deeper questions that build emotional intimacy and vulnerability (e.g., "What's something you're afraid to ask me?" or "When did you last cry and why?")
- Level 3: Reflection — The deepest questions about growth, gratitude, and introspection (e.g., "What's the most important lesson you've learned this year?" or "What do you wish more people knew about you?")

Requirements:
- Randomly pick ONE level (1, 2, or 3)
- Generate an original question that fits the spirit and depth of that level
- The question should be open-ended and encourage meaningful conversation
- Do NOT copy questions directly from the actual game — create original ones in the same style
- Keep the question concise (1-2 sentences max)

Format your response as JSON:
{
  "question": "Your generated question here?",
  "level": 1,
  "levelName": "Perception"
}

The levelName must match the level number: 1="Perception", 2="Connection", 3="Reflection"`;
  }

  /**
   * Parse and validate WNRS question response
   * @param text - Raw text response from Gemini
   * @returns Parsed WNRSQuestionResponse object
   * @throws Error if response format is invalid
   * @private
   */
  private static parseQuestionResponse(text: string): WNRSQuestionResponse {
    try {
      const cleaned = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);

      if (!parsed.question || typeof parsed.question !== 'string') {
        throw new Error('Missing or invalid "question" field');
      }

      if (!parsed.level || ![1, 2, 3].includes(parsed.level)) {
        throw new Error('Missing or invalid "level" field (must be 1, 2, or 3)');
      }

      const levelNames: Record<number, string> = {
        1: 'Perception',
        2: 'Connection',
        3: 'Reflection',
      };

      return {
        question: parsed.question,
        level: parsed.level,
        levelName: parsed.levelName || levelNames[parsed.level],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown parse error';
      logger.error('Failed to parse Gemini question response', {
        text: text.substring(0, 200),
        error: errorMessage,
      });
      throw new Error(`Invalid response format: ${errorMessage}`);
    }
  }

  /**
   * Build the prompt used by both URL and file recipe parsing.
   * @param sourceDescription - Free-text phrase describing where the recipe comes from
   * @returns Formatted prompt string
   * @private
   */
  private static buildRecipeParsePrompt(sourceDescription: string): string {
    return `You are a precise recipe extraction assistant. Extract a structured recipe from ${sourceDescription}.

Return ONLY valid JSON (no markdown, no commentary) matching this exact schema:
{
  "name": "Recipe Title",
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": 1.5,
      "unit": "cup",
      "category": "produce"
    }
  ],
  "instructions": ["Step 1 text", "Step 2 text"],
  "servings": 4,
  "prep_time_minutes": 15,
  "cook_time_minutes": 30,
  "nutrition": {
    "calories": 450,
    "protein": 25,
    "carbs": 40,
    "fat": 18,
    "fiber": 5,
    "sugar": 8,
    "sodium": 600
  },
  "cuisine": "Italian",
  "difficulty": "medium",
  "image_url": "https://example.com/image.jpg"
}

Rules:
- "name" (string, required): The recipe title. If the source does not provide an explicit title, SYNTHESIZE a concise descriptive name from the dish's visible ingredients, method, and style (e.g., "Creamy Tuscan Chicken Pasta", "Garlic Butter Shrimp", "Spicy Peanut Noodles"). NEVER return null or an empty string — always produce a name.
- "ingredients" (array, required, non-empty): Each item MUST include name, quantity, unit.
  - "quantity" is REQUIRED on every ingredient. Acceptable values:
    - a number (e.g. 1.5)
    - a fraction string (e.g. "1/2", "3/4", "1 1/2") — prefer common culinary fractions over decimals ("1/2" not "0.5", "1 1/2" not "1.5", "1/3" not "0.333")
    - a descriptive string when exact amounts are not specified (e.g. "to taste", "a pinch", "handful", "as needed", "for garnish")
    Never omit the quantity field.
  - "unit" is the measurement unit ("cup", "tbsp", "g", "oz", ""); use "" when unit-less.
  - "category" MUST be one of: "meats", "produce", "dairy", "pantry", "spices", "frozen", "bakery", "other".
- "instructions" (array of strings, required, non-empty): Ordered preparation steps.
- "servings" (integer or null): Number of servings this recipe yields.
- "prep_time_minutes" (integer or null): Prep time in minutes.
- "cook_time_minutes" (integer or null): Cook time in minutes.
- "nutrition" (object or null): Per-serving macros in grams (sodium in mg). Each sub-field is a number or omitted. Set the whole field to null if unavailable.
- "cuisine" (string or null): E.g., "Italian", "Mexican", "Japanese", "American".
- "difficulty" (string or null): One of "easy", "medium", "hard".
- "image_url" (string or null): Direct URL to a recipe photo if found.

If images are provided as context alongside this prompt, ANALYZE them for visual cues — plating, color, visible ingredients, cooking method, texture, portion size — and use those observations to infer the recipe, especially when a text recipe is not available at the source URL.

If any required field is genuinely unknowable from the source, still return valid JSON — but NEVER fabricate ingredients or instructions.`;
  }

  /**
   * Parse, validate, and normalize a Gemini recipe JSON response.
   * @param text - Raw text response from Gemini
   * @returns Parsed ParsedRecipe object
   * @throws Error if response format is invalid or required fields are missing
   * @private
   */
  private static parseRecipeResponse(text: string): ParsedRecipe {
    try {
      const cleaned = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);

      if (!parsed.name || typeof parsed.name !== 'string') {
        throw new Error('Missing or invalid "name" field');
      }

      if (!Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
        throw new Error('Missing or empty "ingredients" array');
      }
      const ingredients: RecipeIngredient[] = parsed.ingredients.map(
        (raw: unknown, index: number): RecipeIngredient => {
          if (!raw || typeof raw !== 'object') {
            throw new Error(`Ingredient at index ${index} is not an object`);
          }
          const ing = raw as Record<string, unknown>;
          if (typeof ing.name !== 'string' || ing.name.trim().length === 0) {
            throw new Error(`Ingredient at index ${index} is missing a valid "name"`);
          }
          // Quantity coercion (WO-001): null/undefined/empty/whitespace/non-finite
          // number/wrong type → "to taste" descriptive default. Finite numbers and
          // non-empty strings are preserved as-is. The combined invariants
          // (strict name + non-empty ingredients + non-empty instructions) keep
          // recipes substantive; a "to taste" quantity is cosmetic, not fatal.
          let quantity: number | string;
          if (
            typeof ing.quantity === 'number' &&
            Number.isFinite(ing.quantity) &&
            ing.quantity > 0
          ) {
            quantity = ing.quantity;
          } else if (typeof ing.quantity === 'string' && ing.quantity.trim().length > 0) {
            quantity = ing.quantity;
          } else {
            quantity = 'to taste';
          }
          const result: RecipeIngredient = {
            name: ing.name,
            quantity,
            unit: typeof ing.unit === 'string' ? ing.unit : '',
          };
          if (typeof ing.category === 'string' && ing.category.length > 0) {
            result.category = ing.category;
          }
          return result;
        }
      );

      if (!Array.isArray(parsed.instructions) || parsed.instructions.length === 0) {
        throw new Error('Missing or empty "instructions" array');
      }
      const instructions: string[] = parsed.instructions.map((step: unknown, index: number) => {
        if (typeof step !== 'string' || step.trim().length === 0) {
          throw new Error(`Instruction at index ${index} is not a non-empty string`);
        }
        return step;
      });

      const toIntOrNull = (v: unknown): number | null => {
        if (v === null || v === undefined) return null;
        const n = typeof v === 'number' ? v : Number(v);
        return Number.isFinite(n) ? Math.round(n) : null;
      };

      let nutrition: RecipeNutrition | null = null;
      if (parsed.nutrition && typeof parsed.nutrition === 'object') {
        const n = parsed.nutrition as Record<string, unknown>;
        const toNumOrUndef = (v: unknown): number | undefined => {
          if (v === null || v === undefined) return undefined;
          const num = typeof v === 'number' ? v : Number(v);
          return Number.isFinite(num) ? num : undefined;
        };
        nutrition = {
          calories: toNumOrUndef(n.calories),
          protein: toNumOrUndef(n.protein),
          carbs: toNumOrUndef(n.carbs),
          fat: toNumOrUndef(n.fat),
          fiber: toNumOrUndef(n.fiber),
          sugar: toNumOrUndef(n.sugar),
          sodium: toNumOrUndef(n.sodium),
        } as RecipeNutrition;
      }

      let difficulty: RecipeDifficulty | null = null;
      if (
        typeof parsed.difficulty === 'string' &&
        ['easy', 'medium', 'hard'].includes(parsed.difficulty)
      ) {
        difficulty = parsed.difficulty as RecipeDifficulty;
      }

      return {
        name: parsed.name,
        ingredients,
        instructions,
        servings: toIntOrNull(parsed.servings),
        prep_time_minutes: toIntOrNull(parsed.prep_time_minutes),
        cook_time_minutes: toIntOrNull(parsed.cook_time_minutes),
        nutrition,
        cuisine: typeof parsed.cuisine === 'string' ? parsed.cuisine : null,
        difficulty,
        image_url: typeof parsed.image_url === 'string' ? parsed.image_url : null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown parse error';
      logger.error('Failed to parse Gemini recipe response', {
        text: text.substring(0, 200),
        error: errorMessage,
      });
      throw new Error(`Invalid recipe response format: ${errorMessage}`);
    }
  }

  /**
   * Build the meal-plan selection prompt.
   * @private
   */
  private static buildMealPlanPrompt(
    recipes: Array<{
      id: number;
      name: string;
      cuisine: string | null;
      difficulty: string | null;
      dietary_tags: string[];
    }>,
    preferences?: { dietary_restrictions: string[]; excluded_cuisines: string[] }
  ): string {
    const recipeLines = recipes
      .map(
        (r) =>
          `- id=${r.id} | name="${r.name}" | cuisine=${r.cuisine ?? 'unknown'} | difficulty=${r.difficulty ?? 'unknown'} | tags=[${r.dietary_tags.join(', ')}]`
      )
      .join('\n');

    const dietary = preferences?.dietary_restrictions?.length
      ? preferences.dietary_restrictions.join(', ')
      : 'none';
    const excluded = preferences?.excluded_cuisines?.length
      ? preferences.excluded_cuisines.join(', ')
      : 'none';

    return `You are a meal-planning assistant. From the recipe list below, pick EXACTLY 7 recipes that together form a balanced weekly meal plan.

User preferences:
- Dietary restrictions (must respect): ${dietary}
- Excluded cuisines (must avoid): ${excluded}

Selection goals:
- Exactly 7 recipes total
- Variety across cuisines (avoid repeating the same cuisine more than twice)
- Mix of quick weeknight meals and 1-2 more elaborate recipes for the weekend
- Respect every listed dietary restriction
- Do NOT select any recipe whose cuisine is in the excluded list
- Every selected id MUST appear in the candidate list below

Candidate recipes:
${recipeLines}

Return ONLY valid JSON (no markdown, no commentary) in this exact shape:
{
  "selectedRecipeIds": [<7 integers from the candidate list>],
  "reasoning": "One short paragraph explaining the balance and how preferences were honored."
}`;
  }
}
