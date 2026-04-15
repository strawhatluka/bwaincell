// Mock the logger BEFORE importing GeminiService
jest.mock('../../../shared/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock the Google GenAI SDK
const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

import { GeminiService } from '../../../utils/geminiService';
import { GoogleGenAI } from '@google/genai';
import { logger } from '../../../shared/utils/logger';

describe('GeminiService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
    // Reset the static genAI property
    (GeminiService as any).genAI = null;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('initialization', () => {
    it('should initialize with valid API key', async () => {
      process.env.GEMINI_API_KEY = 'test-api-key';

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          activity: 'Test Activity',
          description: 'Test description',
          estimatedCost: 'Moderate',
          timeOfDay: 'Evening',
        }),
      });

      const result = await GeminiService.generateDateIdea('90210');

      expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
      expect(result.activity).toBe('Test Activity');
    });

    it('should log warning when API key is missing', async () => {
      delete process.env.GEMINI_API_KEY;

      await expect(GeminiService.generateDateIdea('90210')).rejects.toThrow(
        'Gemini API not configured'
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'GEMINI_API_KEY not configured - date suggestions will use fallback'
      );
    });
  });

  describe('generateDateIdea', () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'test-api-key';
    });

    it('should generate valid DateIdeaResponse with all fields', async () => {
      const expectedResponse = {
        activity: 'Sunset Beach Walk',
        description: 'Stroll along the beach at golden hour',
        estimatedCost: 'Budget-friendly',
        timeOfDay: 'Evening',
        url: 'https://example.com/sunset-walk',
      };

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(expectedResponse),
      });

      const result = await GeminiService.generateDateIdea('90210');

      expect(result).toEqual(expectedResponse);
    });

    it('should pass googleSearch tool in config', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          activity: 'Test',
          description: 'Test',
        }),
      });

      await GeminiService.generateDateIdea('90210');

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.5-flash',
          config: expect.objectContaining({
            tools: [{ googleSearch: {} }],
          }),
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('API Error'));

      await expect(GeminiService.generateDateIdea('90210')).rejects.toThrow('API Error');

      expect(logger.error).toHaveBeenCalledWith('Failed to generate date idea from Gemini', {
        zipCode: '90210',
        error: 'API Error',
      });
    });
  });

  describe('parseResponse', () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'test-api-key';
    });

    it('should parse clean JSON correctly', async () => {
      const expectedResponse = {
        activity: 'Museum Visit',
        description: 'Explore local art and history',
        estimatedCost: 'Moderate',
        timeOfDay: 'Afternoon',
      };

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(expectedResponse),
      });

      const result = await GeminiService.generateDateIdea('90210');

      expect(result).toEqual(expectedResponse);
    });

    it('should handle markdown-wrapped JSON', async () => {
      const expectedResponse = {
        activity: 'Wine Tasting',
        description: 'Visit a local vineyard',
        estimatedCost: 'Splurge',
        timeOfDay: 'Evening',
      };

      const markdownWrapped = `\`\`\`json
${JSON.stringify(expectedResponse)}
\`\`\``;

      mockGenerateContent.mockResolvedValueOnce({
        text: markdownWrapped,
      });

      const result = await GeminiService.generateDateIdea('90210');

      expect(result).toEqual(expectedResponse);
    });

    it('should handle optional fields being undefined', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          activity: 'Coffee Shop',
          description: 'Cozy coffee date',
          // estimatedCost and timeOfDay omitted
        }),
      });

      const result = await GeminiService.generateDateIdea('90210');

      expect(result.activity).toBe('Coffee Shop');
      expect(result.description).toBe('Cozy coffee date');
      expect(result.estimatedCost).toBeUndefined();
      expect(result.timeOfDay).toBeUndefined();
      expect(result.url).toBeUndefined();
    });

    it('should throw on invalid JSON', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'This is not JSON',
      });

      await expect(GeminiService.generateDateIdea('90210')).rejects.toThrow(
        'Invalid response format'
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to parse Gemini response',
        expect.objectContaining({
          text: expect.any(String),
          error: expect.any(String),
        })
      );
    });

    it('should throw on missing required fields', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          // Missing activity
          description: 'Test description',
        }),
      });

      await expect(GeminiService.generateDateIdea('90210')).rejects.toThrow(
        'Invalid response format'
      );
    });
  });

  describe('prompt building', () => {
    it('should include ZIP code in prompt', async () => {
      process.env.GEMINI_API_KEY = 'test-api-key';

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          activity: 'Test',
          description: 'Test',
        }),
      });

      await GeminiService.generateDateIdea('90210');

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.stringContaining('90210'),
        })
      );
    });
  });

  describe('generateQuestion', () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'test-api-key';
    });

    it('should return valid WNRSQuestionResponse with all fields', async () => {
      const expectedResponse = {
        question: 'What do you think is my biggest strength?',
        level: 1,
        levelName: 'Perception',
      };

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(expectedResponse),
      });

      const result = await GeminiService.generateQuestion();

      expect(result).toEqual(expectedResponse);
    });

    it('should pass googleSearch tool in config', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          question: 'Test question?',
          level: 2,
          levelName: 'Connection',
        }),
      });

      await GeminiService.generateQuestion();

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.5-flash',
          config: expect.objectContaining({
            tools: [{ googleSearch: {} }],
          }),
        })
      );
    });

    it('should include WNRS level structure in prompt', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          question: 'Test?',
          level: 1,
          levelName: 'Perception',
        }),
      });

      await GeminiService.generateQuestion();

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.stringContaining('Perception'),
        })
      );
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.stringContaining('Connection'),
        })
      );
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.stringContaining('Reflection'),
        })
      );
    });

    it('should throw when API key not configured', async () => {
      delete process.env.GEMINI_API_KEY;

      await expect(GeminiService.generateQuestion()).rejects.toThrow('Gemini API not configured');
    });

    it('should throw on invalid response format (missing question field)', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          level: 2,
          levelName: 'Connection',
        }),
      });

      await expect(GeminiService.generateQuestion()).rejects.toThrow('Invalid response format');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to parse Gemini question response',
        expect.objectContaining({
          text: expect.any(String),
          error: expect.stringContaining('question'),
        })
      );
    });

    it('should handle markdown code blocks in response', async () => {
      const expectedResponse = {
        question: 'What is the bravest thing you have ever done?',
        level: 3,
        levelName: 'Reflection',
      };

      const markdownWrapped = `\`\`\`json
${JSON.stringify(expectedResponse)}
\`\`\``;

      mockGenerateContent.mockResolvedValueOnce({
        text: markdownWrapped,
      });

      const result = await GeminiService.generateQuestion();

      expect(result).toEqual(expectedResponse);
    });

    it('should fall back on levelName lookup when levelName is missing', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          question: 'What would you change about your past?',
          level: 3,
          // levelName omitted
        }),
      });

      const result = await GeminiService.generateQuestion();

      expect(result.question).toBe('What would you change about your past?');
      expect(result.level).toBe(3);
      expect(result.levelName).toBe('Reflection');
    });

    it('should throw on invalid level value', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          question: 'Test?',
          level: 5,
          levelName: 'Invalid',
        }),
      });

      await expect(GeminiService.generateQuestion()).rejects.toThrow('Invalid response format');
    });

    it('should handle API errors gracefully', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('API quota exceeded'));

      await expect(GeminiService.generateQuestion()).rejects.toThrow('API quota exceeded');

      expect(logger.error).toHaveBeenCalledWith('Failed to generate question from Gemini', {
        error: 'API quota exceeded',
      });
    });
  });

  describe('researchMissingFields', () => {
    const basePartial = {
      name: 'Test Soup',
      ingredients: [
        { name: 'chicken', quantity: 1, unit: 'lb' },
        { name: 'carrot', quantity: 2, unit: '' },
      ],
      instructions: ['Boil water', 'Add ingredients'],
      servings: 4,
    };

    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'test-key';
      (GeminiService as unknown as { genAI: unknown }).genAI = null;
    });

    it('returns {} when gaps is empty without calling the API', async () => {
      const result = await GeminiService.researchMissingFields(basePartial, null, []);
      expect(result).toEqual({});
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('requests ONLY the fields listed in gaps and returns them', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          cuisine: 'American',
          difficulty: 'easy',
        }),
      });
      const result = await GeminiService.researchMissingFields(
        basePartial,
        'https://example.com/soup',
        ['cuisine', 'difficulty']
      );
      expect(result.cuisine).toBe('American');
      expect(result.difficulty).toBe('easy');
      const promptArg = mockGenerateContent.mock.calls[0][0].contents;
      expect(promptArg).toContain('"cuisine"');
      expect(promptArg).toContain('"difficulty"');
      expect(promptArg).not.toContain('"nutrition"');
    });

    it('drops fields not in the requested gaps even if the model returns them', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          cuisine: 'Italian',
          nutrition: { calories: 500, protein: 20, carbs: 30, fat: 25 },
        }),
      });
      const result = await GeminiService.researchMissingFields(basePartial, null, ['cuisine']);
      expect(result.cuisine).toBe('Italian');
      expect(result.nutrition).toBeUndefined();
    });

    it('accepts researched nutrition when macros sanity-check passes', async () => {
      // 25g*4 + 30g*4 + 15g*9 = 100 + 120 + 135 = 355 kcal → well within 25% of 350
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          nutrition: { calories: 350, protein: 25, carbs: 30, fat: 15 },
        }),
      });
      const result = await GeminiService.researchMissingFields(basePartial, null, ['nutrition']);
      expect(result.nutrition).toEqual(
        expect.objectContaining({ calories: 350, protein: 25, carbs: 30, fat: 15 })
      );
    });

    it('drops hallucinated nutrition where macros disagree with calories by >25%', async () => {
      // 10g*4 + 10g*4 + 5g*9 = 125 kcal; reported 1000 → ~700% off
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          nutrition: { calories: 1000, protein: 10, carbs: 10, fat: 5 },
        }),
      });
      const result = await GeminiService.researchMissingFields(basePartial, null, ['nutrition']);
      expect(result.nutrition).toBeUndefined();
    });

    it('rejects invalid difficulty values', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ difficulty: 'extreme' }),
      });
      const result = await GeminiService.researchMissingFields(basePartial, null, ['difficulty']);
      expect(result.difficulty).toBeUndefined();
    });

    it('filters dietary_tags to the allowed list only', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          dietary_tags: ['vegetarian', 'paleo', 'keto-friendly', 'INVALID'],
        }),
      });
      const result = await GeminiService.researchMissingFields(basePartial, null, ['dietary_tags']);
      expect(result.dietary_tags).toEqual(expect.arrayContaining(['vegetarian', 'keto-friendly']));
      expect(result.dietary_tags).not.toContain('paleo');
      expect(result.dietary_tags).not.toContain('INVALID');
    });

    it('parses prep_time_minutes/cook_time_minutes as positive integers', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          prep_time_minutes: 15,
          cook_time_minutes: 30,
        }),
      });
      const result = await GeminiService.researchMissingFields(basePartial, null, [
        'prep_time_minutes',
        'cook_time_minutes',
      ]);
      expect(result.prep_time_minutes).toBe(15);
      expect(result.cook_time_minutes).toBe(30);
    });

    it('uses Google Search grounding in the request config', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: '{}' });
      await GeminiService.researchMissingFields(basePartial, null, ['cuisine']);
      const callArg = mockGenerateContent.mock.calls[0][0];
      expect(callArg.config?.tools).toEqual(expect.arrayContaining([{ googleSearch: {} }]));
    });
  });

  describe('sanitizeShoppingList', () => {
    const aggregated = [
      { name: 'garlic', quantity: 3, unit: 'clove', category: 'produce' },
      { name: 'Dried oregano', quantity: 1, unit: 'tsp', category: 'spices' },
      { name: 'cilantro', quantity: 1, unit: 'bunch', category: 'bakery' }, // miscategorized
    ];

    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'test-key';
      (GeminiService as unknown as { genAI: unknown }).genAI = null;
    });

    it('returns empty output for empty input without calling Gemini', async () => {
      const result = await GeminiService.sanitizeShoppingList([]);
      expect(result).toEqual({ items: [], warnings: [] });
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('parses a valid response and coerces invalid categories to "other"', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          items: [
            { name: 'garlic', quantity: 3, unit: 'clove', category: 'produce' },
            { name: 'dried oregano', quantity: 1, unit: 'tsp', category: 'produce' }, // valid category but wrong-ish
            { name: 'cilantro', quantity: 1, unit: 'bunch', category: 'unrecognized-cat' },
          ],
          warnings: [],
        }),
      });
      const result = await GeminiService.sanitizeShoppingList(aggregated);
      expect(result.items).toHaveLength(3);
      expect(result.items.find((i) => i.name === 'cilantro')?.category).toBe('other');
      expect(result.items.find((i) => i.name === 'garlic')?.category).toBe('produce');
    });

    it('drops hallucinated items whose names have no input-token match', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          items: [
            { name: 'garlic', quantity: 3, unit: 'clove', category: 'produce' },
            { name: 'unicorn horn shavings', quantity: 1, unit: 'tsp', category: 'spices' },
          ],
          warnings: [],
        }),
      });
      const result = await GeminiService.sanitizeShoppingList(aggregated);
      expect(result.items.map((i) => i.name)).toEqual(['garlic']);
      expect(result.warnings.join(' ')).toContain('unicorn horn shavings');
    });

    it('throws when API key is missing', async () => {
      delete process.env.GEMINI_API_KEY;
      (GeminiService as unknown as { genAI: unknown }).genAI = null;
      await expect(GeminiService.sanitizeShoppingList(aggregated)).rejects.toThrow(
        'not configured'
      );
    });

    it('propagates errors from the model call', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('quota exceeded'));
      await expect(GeminiService.sanitizeShoppingList(aggregated)).rejects.toThrow(
        'quota exceeded'
      );
    });

    it('throws on malformed response (non-object)', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: '"just a string"' });
      await expect(GeminiService.sanitizeShoppingList(aggregated)).rejects.toThrow();
    });

    it('throws when items array is missing', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ warnings: [] }),
      });
      await expect(GeminiService.sanitizeShoppingList(aggregated)).rejects.toThrow('items');
    });

    it('strips markdown code fences', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: '```json\n{"items":[{"name":"garlic","quantity":3,"unit":"clove","category":"produce"}],"warnings":[]}\n```',
      });
      const result = await GeminiService.sanitizeShoppingList(aggregated);
      expect(result.items).toHaveLength(1);
    });

    it('echoes string warnings from the model in the result', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          items: [{ name: 'garlic', quantity: 3, unit: 'clove', category: 'produce' }],
          warnings: ['Could not confidently merge two oregano variants', ' '],
        }),
      });
      const result = await GeminiService.sanitizeShoppingList(aggregated);
      expect(result.warnings).toContain('Could not confidently merge two oregano variants');
    });
  });

  describe('parseRecipeFromUrl error paths', () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'test-key';
      (GeminiService as unknown as { genAI: unknown }).genAI = null;
    });

    it('throws on missing name', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ ingredients: [{ name: 'x', quantity: 1, unit: '' }], instructions: ['a'] }),
      });
      await expect(GeminiService.parseRecipeFromUrl('https://x')).rejects.toThrow('Invalid recipe');
    });

    it('throws on empty ingredients array', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ name: 'X', ingredients: [], instructions: ['a'] }),
      });
      await expect(GeminiService.parseRecipeFromUrl('https://x')).rejects.toThrow(
        'Invalid recipe'
      );
    });

    it('throws when an ingredient lacks a name', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          name: 'X',
          ingredients: [{ quantity: 1, unit: '' }],
          instructions: ['a'],
        }),
      });
      await expect(GeminiService.parseRecipeFromUrl('https://x')).rejects.toThrow();
    });

    it('throws when an ingredient lacks a quantity', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          name: 'X',
          ingredients: [{ name: 'flour', unit: 'cup' }],
          instructions: ['a'],
        }),
      });
      await expect(GeminiService.parseRecipeFromUrl('https://x')).rejects.toThrow();
    });

    it('throws on non-string instruction entry', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          name: 'X',
          ingredients: [{ name: 'a', quantity: 1, unit: '' }],
          instructions: [123],
        }),
      });
      await expect(GeminiService.parseRecipeFromUrl('https://x')).rejects.toThrow();
    });

    it('passes through a valid parsed recipe', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          name: 'Pasta',
          ingredients: [
            { name: 'flour', quantity: 1, unit: 'cup', category: 'pantry' },
            { name: 'egg', quantity: '2', unit: '' },
          ],
          instructions: ['Mix', 'Cook'],
          servings: '4 people',
          prep_time_minutes: 10,
          cook_time_minutes: 20,
          nutrition: { calories: 500, protein: 20 },
          cuisine: 'italian',
          difficulty: 'mediocre', // invalid → coerces to null
          image_url: 'https://example.com/img.jpg',
        }),
      });
      const result = await GeminiService.parseRecipeFromUrl('https://r');
      expect(result.name).toBe('Pasta');
      expect(result.difficulty).toBeNull();
      expect(result.nutrition?.calories).toBe(500);
    });

    it('handles YouTube URLs via fileData path', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          name: 'YT Recipe',
          ingredients: [{ name: 'x', quantity: 1, unit: '' }],
          instructions: ['a'],
        }),
      });
      await GeminiService.parseRecipeFromUrl('https://youtube.com/watch?v=abc');
      const args = mockGenerateContent.mock.calls[0][0];
      // Video URLs go through a different code path: contents is an array.
      expect(Array.isArray(args.contents)).toBe(true);
    });
  });

  describe('parseRecipeFromFile error paths', () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'test-key';
      (GeminiService as unknown as { genAI: unknown }).genAI = null;
    });

    it('rejects unsupported mime type', async () => {
      await expect(
        GeminiService.parseRecipeFromFile(Buffer.from('x'), 'application/exe', 'r.exe')
      ).rejects.toThrow('Unsupported');
    });

    it('parses a valid file response', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          name: 'From File',
          ingredients: [{ name: 'x', quantity: 1, unit: '' }],
          instructions: ['a'],
        }),
      });
      const result = await GeminiService.parseRecipeFromFile(
        Buffer.from('fake'),
        'image/png',
        'r.png'
      );
      expect(result.name).toBe('From File');
    });
  });

  describe('selectMealsForPlan error paths', () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'test-key';
      (GeminiService as unknown as { genAI: unknown }).genAI = null;
    });

    const makeRecipes = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        id: i + 1,
        name: `R${i}`,
        cuisine: null,
        difficulty: null,
        dietary_tags: [],
      }));

    it('throws when fewer than 7 recipes provided', async () => {
      await expect(GeminiService.selectMealsForPlan(makeRecipes(3))).rejects.toThrow(
        'at least 7 recipes'
      );
    });

    it('throws when selectedRecipeIds is missing', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ reasoning: 'no ids here' }),
      });
      await expect(GeminiService.selectMealsForPlan(makeRecipes(7))).rejects.toThrow();
    });

    it('throws when selectedRecipeIds length !== 7', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({ selectedRecipeIds: [1, 2, 3], reasoning: 'partial' }),
      });
      await expect(GeminiService.selectMealsForPlan(makeRecipes(7))).rejects.toThrow(
        'exactly 7'
      );
    });

    it('throws when selected id is not in input list', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          selectedRecipeIds: [1, 2, 3, 4, 5, 6, 999],
          reasoning: 'bogus',
        }),
      });
      await expect(GeminiService.selectMealsForPlan(makeRecipes(7))).rejects.toThrow(
        'not in the input'
      );
    });

    it('parses successful response with preferences', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          selectedRecipeIds: [1, 2, 3, 4, 5, 6, 7],
          reasoning: 'balanced',
        }),
      });
      const result = await GeminiService.selectMealsForPlan(makeRecipes(7), {
        dietary_restrictions: ['vegan'],
        excluded_cuisines: ['french'],
      });
      expect(result.selectedRecipeIds).toHaveLength(7);
      expect(result.reasoning).toBe('balanced');
    });

    it('falls back to default reasoning when model returns empty string', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          selectedRecipeIds: [1, 2, 3, 4, 5, 6, 7],
          reasoning: '   ',
        }),
      });
      const result = await GeminiService.selectMealsForPlan(makeRecipes(7));
      expect(result.reasoning).toMatch(/No reasoning/i);
    });
  });

  describe('categorizeIngredient Gemini fallback', () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'test-key';
      (GeminiService as unknown as { genAI: unknown }).genAI = null;
    });

    it('returns rules-based match without calling Gemini', async () => {
      const before = mockGenerateContent.mock.calls.length;
      const result = await GeminiService.categorizeIngredient('chicken thighs');
      expect(result).toBe('meats');
      expect(mockGenerateContent.mock.calls.length).toBe(before);
    });

    it('calls Gemini when no rule matches and returns valid category', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: 'produce' });
      const result = await GeminiService.categorizeIngredient('dragonfruit');
      expect(result).toBe('produce');
    });

    it('returns "other" when Gemini returns an invalid category', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: 'mystery-aisle' });
      const result = await GeminiService.categorizeIngredient('dragonfruit');
      expect(result).toBe('other');
    });

    it('returns "other" when Gemini throws', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('network'));
      const result = await GeminiService.categorizeIngredient('dragonfruit');
      expect(result).toBe('other');
    });

    it('returns "other" when no API key and no rule match', async () => {
      delete process.env.GEMINI_API_KEY;
      (GeminiService as unknown as { genAI: unknown }).genAI = null;
      const result = await GeminiService.categorizeIngredient('dragonfruit');
      expect(result).toBe('other');
    });
  });

  describe('researchMissingFields additional branches', () => {
    const basePartial = {
      name: 'Soup',
      ingredients: [{ name: 'water', quantity: 1, unit: 'cup' }],
      instructions: ['Boil'],
      servings: 2,
    };

    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'test-key';
      (GeminiService as unknown as { genAI: unknown }).genAI = null;
    });

    it('filters gaps to allowed fields only', async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: '{}' });
      const result = await GeminiService.researchMissingFields(
        basePartial,
        null,
        ['cuisine', 'not-a-real-field' as 'cuisine']
      );
      expect(result).toEqual({});
    });

    it('returns {} when all filtered gaps are invalid', async () => {
      const result = await GeminiService.researchMissingFields(
        basePartial,
        null,
        ['bogus' as 'cuisine']
      );
      expect(result).toEqual({});
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('drops nutrition when calories is 0 but macros are non-zero (sanity-fail)', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          nutrition: { calories: 0, protein: 10, carbs: 10, fat: 10 },
        }),
      });
      const result = await GeminiService.researchMissingFields(basePartial, null, ['nutrition']);
      // When all 4 macro fields are present but calories is 0, deviation is forced
      // to 1 (100%) which exceeds the 25% threshold → dropped.
      expect(result.nutrition).toBeUndefined();
    });

    it('accepts nutrition without full macro triad (sanity check skipped)', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          nutrition: { calories: 500 }, // calories-only, no macros to cross-check
        }),
      });
      const result = await GeminiService.researchMissingFields(basePartial, null, ['nutrition']);
      expect(result.nutrition?.calories).toBe(500);
    });
  });
});
