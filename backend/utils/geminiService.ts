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
const INGREDIENT_CATEGORIES = [
  'meats',
  'produce',
  'dairy',
  'pantry',
  'spices',
  'frozen',
  'bakery',
  'other',
] as const;

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
   * Parse a recipe from a URL. Detects YouTube links and passes them as fileData
   * so Gemini can watch the video; other URLs are grounded via googleSearch.
   *
   * @param url - Source URL (website or YouTube video)
   * @returns Promise resolving to a ParsedRecipe
   * @throws Error if Gemini API is not configured, request fails, or output is invalid
   */
  public static async parseRecipeFromUrl(url: string): Promise<ParsedRecipe> {
    this.initialize();

    if (!this.genAI) {
      throw new Error('Gemini API not configured');
    }

    const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(url);

    try {
      const prompt = this.buildRecipeParsePrompt(
        isYouTube
          ? `a YouTube cooking video at ${url} (watch the video to extract the recipe)`
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
- "name" (string, required): The recipe title.
- "ingredients" (array, required, non-empty): Each item MUST include name, quantity, unit.
  - "quantity" may be a number (e.g. 1.5) or a fraction string (e.g. "1/2", "3/4").
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
          if (
            ing.quantity === undefined ||
            ing.quantity === null ||
            (typeof ing.quantity !== 'number' && typeof ing.quantity !== 'string')
          ) {
            throw new Error(
              `Ingredient at index ${index} is missing a valid "quantity" (number or string)`
            );
          }
          const result: RecipeIngredient = {
            name: ing.name,
            quantity: ing.quantity as number | string,
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
