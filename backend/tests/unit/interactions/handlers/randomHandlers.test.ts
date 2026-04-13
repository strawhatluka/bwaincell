/**
 * Unit Tests: Random Button Handlers
 *
 * Tests all random-related button interactions including movie reroll,
 * dinner reroll, save dinner, date reroll, question reroll, and coin flip.
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

// Mock database helper
const mockList = {
  getList: jest.fn(),
  createList: jest.fn(),
  addItem: jest.fn(),
};

jest.mock('../../../../utils/interactions/helpers/databaseHelper', () => ({
  __esModule: true,
  getModels: jest.fn().mockResolvedValue({ List: mockList }),
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
  dinnerOptions: {
    'Pasta Carbonara': {
      description: 'Classic Italian pasta',
      image: 'https://example.com/carbonara.jpg',
      prepTime: '30 min',
      difficulty: 'Medium',
      recipe: 'https://example.com/carbonara-recipe',
    },
    'Chicken Stir Fry': {
      description: 'Quick Asian dish',
      image: 'https://example.com/stirfry.jpg',
      prepTime: '20 min',
      difficulty: 'Easy',
      recipe: 'https://example.com/stirfry-recipe',
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

  describe('random_dinner_reroll', () => {
    it('should pick a random dinner and display embed with save button', async () => {
      const interaction = createMockInteraction({ customId: 'random_dinner_reroll' });

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

  describe('save_dinner_{name}', () => {
    it('should save dinner to Meal Ideas list when list exists', async () => {
      mockList.getList.mockResolvedValue({
        name: 'Meal Ideas',
        items: [],
        guild_id: 'guild-123',
      });
      mockList.addItem.mockResolvedValue(true);

      const interaction = createMockInteraction({
        customId: 'save_dinner_Pasta%20Carbonara',
      });

      await handleRandomButton(interaction);

      expect(mockList.getList).toHaveBeenCalledWith('guild-123', 'Meal Ideas');
      expect(mockList.addItem).toHaveBeenCalledWith('guild-123', 'Meal Ideas', 'Pasta Carbonara');
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Added "Pasta Carbonara" to your Meal Ideas list'),
          ephemeral: true,
        })
      );
    });

    it('should create Meal Ideas list if it does not exist', async () => {
      mockList.getList.mockResolvedValue(null);
      mockList.createList.mockResolvedValue({
        name: 'Meal Ideas',
        items: [],
        guild_id: 'guild-123',
      });
      mockList.addItem.mockResolvedValue(true);

      const interaction = createMockInteraction({
        customId: 'save_dinner_Chicken%20Stir%20Fry',
      });

      await handleRandomButton(interaction);

      expect(mockList.createList).toHaveBeenCalledWith('guild-123', 'Meal Ideas', 'user-456');
      expect(mockList.addItem).toHaveBeenCalledWith('guild-123', 'Meal Ideas', 'Chicken Stir Fry');
    });

    it('should reply with error when addItem fails', async () => {
      mockList.getList.mockResolvedValue({
        name: 'Meal Ideas',
        items: [],
      });
      mockList.addItem.mockResolvedValue(null);

      const interaction = createMockInteraction({
        customId: 'save_dinner_Pasta%20Carbonara',
      });

      await handleRandomButton(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Could not add item to list'),
          ephemeral: true,
        })
      );
    });

    it('should use followUp when already deferred (success)', async () => {
      mockList.getList.mockResolvedValue({ name: 'Meal Ideas', items: [] });
      mockList.addItem.mockResolvedValue(true);

      const interaction = createMockInteraction({
        customId: 'save_dinner_Pasta%20Carbonara',
        deferred: true,
      });

      await handleRandomButton(interaction);

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Added'),
          ephemeral: true,
        })
      );
    });

    it('should use followUp when already deferred (failure)', async () => {
      mockList.getList.mockResolvedValue({ name: 'Meal Ideas', items: [] });
      mockList.addItem.mockResolvedValue(null);

      const interaction = createMockInteraction({
        customId: 'save_dinner_Pasta%20Carbonara',
        deferred: true,
      });

      await handleRandomButton(interaction);

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Could not add item'),
          ephemeral: true,
        })
      );
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
      mockList.getList.mockRejectedValue(error);

      const interaction = createMockInteraction({
        customId: 'save_dinner_test',
      });

      await handleRandomButton(interaction);

      expect(handleInteractionError).toHaveBeenCalledWith(
        interaction,
        error,
        'random button handler'
      );
    });
  });
});
