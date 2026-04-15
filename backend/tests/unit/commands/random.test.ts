/**
 * Unit tests for /random slash command
 *
 * Tests the Discord slash command with 8 subcommands:
 * movie, recipe, date, question, choice, number, coin, dice
 */

// Mock dependencies BEFORE imports
jest.mock('../../../shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../config/config', () => ({
  __esModule: true,
  default: {
    settings: {
      timezone: 'America/Los_Angeles',
    },
  },
}));

jest.mock('../../../utils/geminiService', () => ({
  GeminiService: {
    generateDateIdea: jest.fn(),
    generateQuestion: jest.fn(),
  },
}));

jest.mock('../../../../supabase/models/Recipe', () => ({
  __esModule: true,
  default: {
    getRandom: jest.fn(),
  },
}));

jest.mock('../../../utils/recipeData', () => ({
  movieData: {
    'The Matrix': {
      year: '1999',
      genre: 'Sci-Fi',
      rating: '8.7',
      link: 'http://imdb.com/matrix',
    },
  },
}));

import { ChatInputCommandInteraction } from 'discord.js';
import randomCommand from '../../../commands/random';
import { GeminiService } from '../../../utils/geminiService';
import { logger } from '../../../shared/utils/logger';
import Recipe from '../../../../supabase/models/Recipe';

describe('/random Slash Command', () => {
  let mockInteraction: Partial<ChatInputCommandInteraction>;
  let mathRandomSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInteraction = {
      user: { id: 'user-456', username: 'testuser' } as any,
      guild: { id: 'guild-123' } as any,
      guildId: 'guild-123',
      replied: false,
      deferred: true,
      options: {
        getString: jest.fn(),
        getInteger: jest.fn(),
        getSubcommand: jest.fn(),
      } as any,
      editReply: jest.fn().mockResolvedValue({}),
      followUp: jest.fn().mockResolvedValue({}),
      reply: jest.fn().mockResolvedValue({}),
      deferReply: jest.fn().mockResolvedValue({}),
    };
  });

  afterEach(() => {
    if (mathRandomSpy) {
      mathRandomSpy.mockRestore();
    }
  });

  describe('Command Configuration', () => {
    it('should have correct command name', () => {
      expect(randomCommand.data.name).toBe('random');
    });

    it('should have a description', () => {
      expect(randomCommand.data.description).toBe('Random generators');
    });

    it('should have 8 subcommands', () => {
      const options = (randomCommand.data as any).options;
      expect(options).toBeDefined();
      expect(options.length).toBe(8);
    });

    it('should contain all expected subcommand names', () => {
      const options = (randomCommand.data as any).options;
      const subcommandNames = options.map((opt: any) => opt.name);
      expect(subcommandNames).toEqual(
        expect.arrayContaining([
          'movie',
          'recipe',
          'date',
          'question',
          'choice',
          'number',
          'coin',
          'dice',
        ])
      );
    });
  });

  describe('Subcommand: movie', () => {
    beforeEach(() => {
      (mockInteraction.options as any).getSubcommand.mockReturnValue('movie');
      mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    });

    it('should select a movie and reply with an embed', async () => {
      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledTimes(1);
      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      expect(call.embeds).toBeDefined();
      expect(call.embeds.length).toBe(1);
    });

    it('should include movie title in embed description', async () => {
      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      expect(embed.data.description).toContain('The Matrix');
    });

    it('should include year, genre, and rating fields', async () => {
      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      const fieldNames = embed.data.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('Year');
      expect(fieldNames).toContain('Genre');
      expect(fieldNames).toContain('IMDb Rating');

      const yearField = embed.data.fields.find((f: any) => f.name === 'Year');
      expect(yearField.value).toBe('1999');
    });

    it('should include IMDb link button and reroll button', async () => {
      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      expect(call.components).toBeDefined();
      expect(call.components.length).toBe(1);

      const buttons = call.components[0].components;
      expect(buttons.length).toBe(2);
      // Link button (IMDb)
      expect(buttons[0].data.url).toBe('http://imdb.com/matrix');
      expect(buttons[0].data.label).toBe('View on IMDb');
      // Reroll button
      expect(buttons[1].data.custom_id).toBe('random_movie_reroll');
      expect(buttons[1].data.label).toBe('Pick Another');
    });
  });

  describe('Subcommand: date', () => {
    beforeEach(() => {
      (mockInteraction.options as any).getSubcommand.mockReturnValue('date');
    });

    it('should use AI-generated date idea on success', async () => {
      (GeminiService.generateDateIdea as jest.Mock).mockResolvedValue({
        activity: 'Rooftop Stargazing',
        description: 'Enjoy the night sky together',
        estimatedCost: '$20',
        timeOfDay: 'Evening',
        url: 'http://example.com/event',
      });

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(GeminiService.generateDateIdea).toHaveBeenCalled();
      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      expect(embed.data.description).toContain('Rooftop Stargazing');
      expect(embed.data.description).toContain('Enjoy the night sky together');
      expect(embed.data.footer.text).toBe('✨ Powered by AI');
    });

    it('should include cost, time, and url fields when provided by AI', async () => {
      (GeminiService.generateDateIdea as jest.Mock).mockResolvedValue({
        activity: 'Sunset Hike',
        description: 'A scenic trail',
        estimatedCost: '$0',
        timeOfDay: 'Afternoon',
        url: 'http://trails.com/sunset',
      });

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      const fieldNames = embed.data.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('💰 Cost');
      expect(fieldNames).toContain('🕐 Time');
      expect(fieldNames).toContain('🔗 Event Link');
    });

    it('should fall back to static data on AI error', async () => {
      (GeminiService.generateDateIdea as jest.Mock).mockRejectedValue(new Error('API down'));
      mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(logger.warn).toHaveBeenCalledWith(
        'Gemini API unavailable, using fallback',
        expect.objectContaining({ error: expect.any(Error) })
      );
      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      // Should use the first static date idea (Math.random returns 0)
      expect(embed.data.description).toContain('Picnic in the park');
    });

    it('should use LOCATION_ZIP_CODE env var when available', async () => {
      const originalEnv = process.env.LOCATION_ZIP_CODE;
      process.env.LOCATION_ZIP_CODE = '10001';

      (GeminiService.generateDateIdea as jest.Mock).mockResolvedValue({
        activity: 'NYC Gallery Visit',
        description: 'Explore art in Manhattan',
      });

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(GeminiService.generateDateIdea).toHaveBeenCalledWith('10001');

      process.env.LOCATION_ZIP_CODE = originalEnv;
    });

    it('should default to 90210 zip code when env var is not set', async () => {
      const originalEnv = process.env.LOCATION_ZIP_CODE;
      delete process.env.LOCATION_ZIP_CODE;

      (GeminiService.generateDateIdea as jest.Mock).mockResolvedValue({
        activity: 'Beverly Hills Stroll',
        description: 'Walk through Rodeo Drive',
      });

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(GeminiService.generateDateIdea).toHaveBeenCalledWith('90210');

      process.env.LOCATION_ZIP_CODE = originalEnv;
    });

    it('should include reroll button', async () => {
      (GeminiService.generateDateIdea as jest.Mock).mockResolvedValue({
        activity: 'Date Idea',
        description: 'A fun date',
      });

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const buttons = call.components[0].components;
      expect(buttons[0].data.custom_id).toBe('random_date_reroll');
      expect(buttons[0].data.label).toBe('Get Another Idea');
    });
  });

  describe('Subcommand: question', () => {
    beforeEach(() => {
      (mockInteraction.options as any).getSubcommand.mockReturnValue('question');
    });

    it('should use AI-generated question on success', async () => {
      (GeminiService.generateQuestion as jest.Mock).mockResolvedValue({
        question: 'What makes you feel most alive?',
        level: 2,
        levelName: 'Connection',
      });

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(GeminiService.generateQuestion).toHaveBeenCalled();
      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      expect(embed.data.description).toBe('What makes you feel most alive?');
      expect(embed.data.footer.text).toContain('Powered by AI');
    });

    it('should set level 1 color to green (0x2ecc71)', async () => {
      (GeminiService.generateQuestion as jest.Mock).mockResolvedValue({
        question: 'What is your name?',
        level: 1,
        levelName: 'Perception',
      });

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      expect(embed.data.color).toBe(0x2ecc71);
    });

    it('should set level 2 color to blue (0x3498db)', async () => {
      (GeminiService.generateQuestion as jest.Mock).mockResolvedValue({
        question: 'What makes you feel connected?',
        level: 2,
        levelName: 'Connection',
      });

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      expect(embed.data.color).toBe(0x3498db);
    });

    it('should set level 3 color to purple (0x9b59b6)', async () => {
      (GeminiService.generateQuestion as jest.Mock).mockResolvedValue({
        question: 'What is your deepest fear?',
        level: 3,
        levelName: 'Reflection',
      });

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      expect(embed.data.color).toBe(0x9b59b6);
    });

    it('should include level field in embed', async () => {
      (GeminiService.generateQuestion as jest.Mock).mockResolvedValue({
        question: 'A question',
        level: 2,
        levelName: 'Connection',
      });

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      const levelField = embed.data.fields.find((f: any) => f.name === '📊 Level');
      expect(levelField).toBeDefined();
      expect(levelField.value).toBe('Level 2: Connection');
    });

    it('should fall back to static conversation starters on AI error', async () => {
      (GeminiService.generateQuestion as jest.Mock).mockRejectedValue(new Error('API down'));
      mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(logger.warn).toHaveBeenCalledWith(
        'Gemini API unavailable for question, using fallback',
        expect.objectContaining({ error: expect.any(Error) })
      );
      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      expect(embed.data.description).toBe("What's the best advice you've ever received?");
    });

    it('should include reroll button', async () => {
      (GeminiService.generateQuestion as jest.Mock).mockResolvedValue({
        question: 'Test question',
        level: 1,
        levelName: 'Perception',
      });

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const buttons = call.components[0].components;
      expect(buttons[0].data.custom_id).toBe('random_question_reroll');
      expect(buttons[0].data.label).toBe('Next Question');
    });
  });

  describe('Subcommand: choice', () => {
    beforeEach(() => {
      (mockInteraction.options as any).getSubcommand.mockReturnValue('choice');
    });

    it('should pick one of the provided options', async () => {
      (mockInteraction.options as any).getString.mockReturnValue('pizza, pasta, salad');
      mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      // Math.floor(0.5 * 3) = 1 -> 'pasta'
      expect(embed.data.description).toContain('pasta');
      expect(embed.data.description).toContain('pizza, pasta, salad');
    });

    it('should handle two options correctly', async () => {
      (mockInteraction.options as any).getString.mockReturnValue('yes, no');
      mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      expect(embed.data.description).toContain('yes');
    });

    it('should show error when fewer than 2 options provided', async () => {
      (mockInteraction.options as any).getString.mockReturnValue('onlyone');

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Please provide at least 2 options separated by commas.',
      });
    });

    it('should show error for empty comma-separated string', async () => {
      (mockInteraction.options as any).getString.mockReturnValue(',,,');

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockInteraction.editReply).toHaveBeenCalledWith({
        content: 'Please provide at least 2 options separated by commas.',
      });
    });

    it('should trim whitespace from options', async () => {
      (mockInteraction.options as any).getString.mockReturnValue('  alpha ,  beta  , gamma  ');
      mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      expect(embed.data.description).toContain('alpha');
      // The "From" list should show trimmed values
      expect(embed.data.description).toContain('alpha, beta, gamma');
    });
  });

  describe('Subcommand: number', () => {
    beforeEach(() => {
      (mockInteraction.options as any).getSubcommand.mockReturnValue('number');
    });

    it('should generate a number between 1 and max', async () => {
      (mockInteraction.options as any).getInteger.mockReturnValue(100);
      mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      // Math.floor(0.5 * 100) + 1 = 51
      expect(embed.data.description).toContain('51');
      expect(embed.data.description).toContain('1 - 100');
    });

    it('should return 1 when Math.random returns 0', async () => {
      (mockInteraction.options as any).getInteger.mockReturnValue(10);
      mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      expect(embed.data.description).toContain('Result: **1**');
    });

    it('should return max when Math.random is close to 1', async () => {
      (mockInteraction.options as any).getInteger.mockReturnValue(6);
      mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.999);

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      expect(embed.data.description).toContain('Result: **6**');
    });
  });

  describe('Subcommand: coin', () => {
    beforeEach(() => {
      (mockInteraction.options as any).getSubcommand.mockReturnValue('coin');
    });

    it('should return Heads with crown emoji when Math.random < 0.5', async () => {
      mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.3);

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      expect(embed.data.description).toContain('Heads');
      expect(embed.data.description).toContain('\u{1F451}'); // crown emoji
    });

    it('should return Tails with lightning emoji when Math.random >= 0.5', async () => {
      mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      expect(embed.data.description).toContain('Tails');
      expect(embed.data.description).toContain('\u26A1'); // lightning emoji
    });

    it('should include flip again button', async () => {
      mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      expect(call.components).toBeDefined();
      const buttons = call.components[0].components;
      expect(buttons[0].data.custom_id).toBe('random_coin_flip');
      expect(buttons[0].data.label).toBe('Flip Again');
    });
  });

  describe('Subcommand: dice', () => {
    beforeEach(() => {
      (mockInteraction.options as any).getSubcommand.mockReturnValue('dice');
    });

    it('should roll a single die with default count of 1', async () => {
      (mockInteraction.options as any).getInteger.mockImplementation((name: string) => {
        if (name === 'sides') return 6;
        if (name === 'count') return null; // default
        return null;
      });
      mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      expect(embed.data.description).toContain('1d6');
      // Single die: shows "Result" field, not "Rolls"
      const resultField = embed.data.fields.find((f: any) => f.name === 'Result');
      expect(resultField).toBeDefined();
      // Math.floor(0.5 * 6) + 1 = 4
      expect(resultField.value).toBe('**4**');
    });

    it('should roll multiple dice and show total', async () => {
      (mockInteraction.options as any).getInteger.mockImplementation((name: string) => {
        if (name === 'sides') return 6;
        if (name === 'count') return 3;
        return null;
      });
      // Three rolls: 0.1 -> 1, 0.5 -> 4, 0.9 -> 6
      mathRandomSpy = jest
        .spyOn(Math, 'random')
        .mockReturnValueOnce(0.1)
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0.9);

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      expect(embed.data.description).toContain('3d6');

      const rollsField = embed.data.fields.find((f: any) => f.name === 'Rolls');
      expect(rollsField).toBeDefined();
      // Math.floor(0.1*6)+1=1, Math.floor(0.5*6)+1=4, Math.floor(0.9*6)+1=6
      expect(rollsField.value).toBe('1, 4, 6');

      const totalField = embed.data.fields.find((f: any) => f.name === 'Total');
      expect(totalField).toBeDefined();
      expect(totalField.value).toBe('**11**');
    });

    it('should default sides to 6 when not provided', async () => {
      (mockInteraction.options as any).getInteger.mockImplementation((name: string) => {
        if (name === 'sides') return null; // default
        if (name === 'count') return null;
        return null;
      });
      mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.3);

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      expect(embed.data.description).toContain('1d6');
      // Math.floor(0.3 * 6) + 1 = 2
      const resultField = embed.data.fields.find((f: any) => f.name === 'Result');
      expect(resultField.value).toBe('**2**');
    });

    it('should handle a 20-sided die', async () => {
      (mockInteraction.options as any).getInteger.mockImplementation((name: string) => {
        if (name === 'sides') return 20;
        if (name === 'count') return 1;
        return null;
      });
      mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.95);

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      const call = (mockInteraction.editReply as jest.Mock).mock.calls[0][0];
      const embed = call.embeds[0];
      expect(embed.data.description).toContain('1d20');
      // Math.floor(0.95 * 20) + 1 = 20
      const resultField = embed.data.fields.find((f: any) => f.name === 'Result');
      expect(resultField.value).toBe('**20**');
    });
  });

  describe('Error Handling', () => {
    it('should catch errors and reply with error message via editReply', async () => {
      (mockInteraction.options as any).getSubcommand.mockReturnValue('movie');
      // Force an error by making editReply throw on first call, then succeed
      (mockInteraction.editReply as jest.Mock)
        .mockRejectedValueOnce(new Error('Discord API error'))
        .mockResolvedValueOnce({});

      // The outer try-catch calls editReply again with error message
      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in random command',
        expect.objectContaining({
          subcommand: 'movie',
          error: 'Discord API error',
        })
      );
    });

    it('should log subcommand name in error context', async () => {
      (mockInteraction.options as any).getSubcommand.mockReturnValue('movie');
      (mockInteraction.editReply as jest.Mock)
        .mockRejectedValueOnce(new Error('embed failure'))
        .mockResolvedValueOnce({});

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in random command',
        expect.objectContaining({
          subcommand: 'movie',
          error: 'embed failure',
          stack: expect.any(String),
        })
      );
    });

    it('should handle non-Error objects in catch block', async () => {
      (mockInteraction.options as any).getSubcommand.mockReturnValue('coin');
      (mockInteraction.editReply as jest.Mock)
        .mockRejectedValueOnce('string error')
        .mockResolvedValueOnce({});

      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);

      expect(logger.error).toHaveBeenCalledWith(
        'Error in random command',
        expect.objectContaining({
          error: 'Unknown error',
          stack: undefined,
        })
      );
    });
  });

  describe('recipe subcommand', () => {
    function makeRecipe(overrides: Record<string, unknown> = {}) {
      return {
        id: 1,
        name: 'Test Recipe',
        cuisine: 'italian',
        difficulty: 'easy',
        dietary_tags: ['vegetarian'],
        servings: 4,
        prep_time_minutes: 10,
        cook_time_minutes: 20,
        ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
        image_url: null,
        ...overrides,
      };
    }

    beforeEach(() => {
      (mockInteraction.options!.getSubcommand as jest.Mock).mockReturnValue('recipe');
    });

    it('calls Recipe.getRandom with the guild id (user isolation)', async () => {
      (Recipe.getRandom as jest.Mock).mockResolvedValue(makeRecipe());
      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(Recipe.getRandom).toHaveBeenCalledWith('guild-123');
    });

    it('renders an embed with a reroll button when a recipe is found', async () => {
      (Recipe.getRandom as jest.Mock).mockResolvedValue(makeRecipe({ name: 'Spaghetti' }));
      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);
      const call = (mockInteraction.editReply as jest.Mock).mock.calls.at(-1)[0];
      expect(call.embeds[0].data.title).toContain('Spaghetti');
      expect(call.components).toHaveLength(1);
      expect(call.components[0].components[0].data.custom_id).toBe('random_recipe_reroll');
    });

    it('shows empty-state message when no recipes exist in the guild', async () => {
      (Recipe.getRandom as jest.Mock).mockResolvedValue(null);
      await randomCommand.execute(mockInteraction as ChatInputCommandInteraction);
      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('No recipes') })
      );
    });

    it('rejects use outside a guild', async () => {
      const noGuild = {
        ...mockInteraction,
        guild: null,
        guildId: null,
      } as unknown as ChatInputCommandInteraction;
      await randomCommand.execute(noGuild);
      expect(Recipe.getRandom).not.toHaveBeenCalled();
    });
  });
});
