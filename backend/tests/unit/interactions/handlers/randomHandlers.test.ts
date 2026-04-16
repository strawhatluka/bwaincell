/**
 * Unit Tests: Random Button Handlers
 *
 * Tests random-related button interactions: movie reroll, recipe reroll,
 * date reroll, question reroll, and coin flip.
 * Coverage target: 80%
 */

// Mock logger BEFORE imports
jest.mock('../../../../shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock recipeData
jest.mock('../../../../utils/recipeData', () => ({
  __esModule: true,
  movieData: {
    'The Matrix': {
      year: '1999',
      genre: 'Sci-Fi',
      rating: '8.7',
      link: 'https://imdb.com/the-matrix',
    },
    Inception: {
      year: '2010',
      genre: 'Sci-Fi',
      rating: '8.8',
      link: 'https://imdb.com/inception',
    },
  },
}));

// Mock GeminiService
jest.mock('../../../../utils/geminiService', () => ({
  __esModule: true,
  GeminiService: {
    generateQuestion: jest.fn(),
  },
}));

// Mock Recipe model
const mockRecipe = {
  getRandom: jest.fn(),
};
jest.mock('@database/models/Recipe', () => ({
  __esModule: true,
  default: mockRecipe,
}));

// Mock error responses
jest.mock('../../../../utils/interactions/responses/errorResponses', () => ({
  __esModule: true,
  handleInteractionError: jest.fn(),
}));

import { handleRandomButton } from '../../../../utils/interactions/handlers/randomHandlers';
import { handleInteractionError } from '../../../../utils/interactions/responses/errorResponses';
import { GeminiService } from '../../../../utils/geminiService';

describe('Random Button Handlers', () => {
  function createMockInteraction(overrides: Record<string, unknown> = {}) {
    return {
      customId: 'random_coin_flip',
      user: { id: 'user-456' },
      guild: { id: 'guild-123' },
      replied: false,
      deferred: false,
      update: jest.fn().mockResolvedValue(undefined),
      reply: jest.fn().mockResolvedValue(undefined),
      editReply: jest.fn().mockResolvedValue(undefined),
      deferUpdate: jest.fn().mockResolvedValue(undefined),
      followUp: jest.fn().mockResolvedValue(undefined),
      showModal: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    } as any;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Guild Validation', () => {
    it('should reply with error when guild is not present', async () => {
      const interaction = createMockInteraction({ guild: null });

      await handleRandomButton(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('This command can only be used in a server'),
          ephemeral: true,
        })
      );
    });

    it('should use followUp when already replied and no guild', async () => {
      const interaction = createMockInteraction({ guild: null, replied: true });

      await handleRandomButton(interaction);

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('This command can only be used in a server'),
          ephemeral: true,
        })
      );
    });
  });

  describe('random_movie_reroll', () => {
    it('should pick a random movie and display embed', async () => {
      const interaction = createMockInteraction({ customId: 'random_movie_reroll' });

      await handleRandomButton(interaction);

      expect(interaction.deferUpdate).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
        })
      );
    });

    it('should skip deferUpdate when already deferred', async () => {
      const interaction = createMockInteraction({
        customId: 'random_movie_reroll',
        deferred: true,
      });

      await handleRandomButton(interaction);

      expect(interaction.deferUpdate).not.toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalled();
    });
  });

  describe('random_date_reroll', () => {
    it('should pick a random date idea and display embed', async () => {
      const interaction = createMockInteraction({ customId: 'random_date_reroll' });

      await handleRandomButton(interaction);

      expect(interaction.deferUpdate).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
        })
      );
    });
  });

  describe('random_question_reroll', () => {
    it('should display Gemini-generated question when available', async () => {
      (GeminiService.generateQuestion as jest.Mock).mockResolvedValue({
        question: 'What is your greatest fear?',
        level: 2,
        levelName: 'Connection',
      });

      const interaction = createMockInteraction({ customId: 'random_question_reroll' });

      await handleRandomButton(interaction);

      expect(GeminiService.generateQuestion).toHaveBeenCalled();
      expect(interaction.deferUpdate).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
        })
      );
    });

    it('should fall back to static questions when Gemini fails', async () => {
      (GeminiService.generateQuestion as jest.Mock).mockRejectedValue(new Error('API unavailable'));

      const interaction = createMockInteraction({ customId: 'random_question_reroll' });

      await handleRandomButton(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
        })
      );
    });

    it('should handle different Gemini levels with appropriate colors', async () => {
      (GeminiService.generateQuestion as jest.Mock).mockResolvedValue({
        question: 'How do you perceive the world?',
        level: 1,
        levelName: 'Perception',
      });

      const interaction = createMockInteraction({ customId: 'random_question_reroll' });

      await handleRandomButton(interaction);

      expect(interaction.editReply).toHaveBeenCalledTimes(1);
    });
  });

  describe('random_coin_flip', () => {
    it('should flip a coin and display result', async () => {
      const interaction = createMockInteraction({ customId: 'random_coin_flip' });

      await handleRandomButton(interaction);

      expect(interaction.deferUpdate).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining('Coin Flip'),
              }),
            }),
          ]),
          components: expect.any(Array),
        })
      );
    });

    it('should skip deferUpdate when already deferred', async () => {
      const interaction = createMockInteraction({
        customId: 'random_coin_flip',
        deferred: true,
      });

      await handleRandomButton(interaction);

      expect(interaction.deferUpdate).not.toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should call handleInteractionError on error', async () => {
      const error = new Error('Unexpected error');
      mockRecipe.getRandom.mockRejectedValueOnce(error);

      const interaction = createMockInteraction({
        customId: 'random_recipe_reroll',
      });

      await handleRandomButton(interaction);

      expect(handleInteractionError).toHaveBeenCalledWith(
        interaction,
        error,
        'random button handler'
      );
    });
  });

  describe('random_recipe_reroll', () => {
    function makeRecipeRow(overrides: Record<string, unknown> = {}) {
      return {
        id: 1,
        name: 'Test Recipe',
        cuisine: 'italian',
        difficulty: 'easy',
        dietary_tags: [],
        servings: 4,
        prep_time_minutes: 10,
        cook_time_minutes: 20,
        ingredients: [{ name: 'flour', quantity: 1, unit: 'cup' }],
        image_url: null,
        ...overrides,
      };
    }

    it('picks a fresh random recipe and editReplies with a reroll button', async () => {
      mockRecipe.getRandom.mockResolvedValueOnce(makeRecipeRow({ name: 'Soup' }));
      const interaction = createMockInteraction({
        customId: 'random_recipe_reroll',
        deferred: true,
      });

      await handleRandomButton(interaction);

      expect(mockRecipe.getRandom).toHaveBeenCalledWith('guild-123');
      const call = interaction.editReply.mock.calls.at(-1)[0];
      expect(call.embeds[0].data.title).toContain('Soup');
      expect(call.components[0].components[0].data.custom_id).toBe('random_recipe_reroll');
    });

    it('handles empty guild state gracefully', async () => {
      mockRecipe.getRandom.mockResolvedValueOnce(null);
      const interaction = createMockInteraction({
        customId: 'random_recipe_reroll',
        deferred: true,
      });

      await handleRandomButton(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('No recipes') })
      );
    });
  });
});
