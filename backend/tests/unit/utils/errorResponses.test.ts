/**
 * Unit Tests: Error Responses
 *
 * Tests interaction error handling and error embed sending
 * Coverage target: 90%
 */

// Mock logger BEFORE imports
jest.mock('../../../shared/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

import {
  handleInteractionError,
  sendErrorEmbed,
} from '../../../utils/interactions/responses/errorResponses';
import { logger } from '../../../shared/utils/logger';

function createMockInteraction(overrides: Record<string, unknown> = {}) {
  return {
    replied: false,
    deferred: false,
    reply: jest.fn().mockResolvedValue(undefined),
    followUp: jest.fn().mockResolvedValue(undefined),
    user: { id: '123456' },
    guildId: '789012',
    type: 2,
    customId: 'test-custom-id',
    ...overrides,
  } as any;
}

describe('Error Responses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleInteractionError()', () => {
    test('should call reply when not replied or deferred', async () => {
      const interaction = createMockInteraction();
      await handleInteractionError(interaction, new Error('fail'), 'test-context');

      expect(interaction.reply).toHaveBeenCalledWith({
        content: expect.any(String),
        ephemeral: true,
      });
      expect(interaction.followUp).not.toHaveBeenCalled();
    });

    test('should call followUp when deferred', async () => {
      const interaction = createMockInteraction({ deferred: true });
      await handleInteractionError(interaction, new Error('fail'), 'test-context');

      expect(interaction.followUp).toHaveBeenCalledWith({
        content: expect.any(String),
        ephemeral: true,
      });
      expect(interaction.reply).not.toHaveBeenCalled();
    });

    test('should call followUp when already replied', async () => {
      const interaction = createMockInteraction({ replied: true });
      await handleInteractionError(interaction, new Error('fail'), 'test-context');

      expect(interaction.followUp).toHaveBeenCalled();
      expect(interaction.reply).not.toHaveBeenCalled();
    });

    test('should log error with Error instance details', async () => {
      const interaction = createMockInteraction();
      const error = new Error('Something broke');
      await handleInteractionError(interaction, error, 'my-context');

      expect(logger.error).toHaveBeenCalledWith(
        'Error in my-context',
        expect.objectContaining({
          error: 'Something broke',
          stack: expect.any(String),
          userId: '123456',
          guildId: '789012',
        })
      );
    });

    test('should handle string error', async () => {
      const interaction = createMockInteraction();
      await handleInteractionError(interaction, 'string error', 'ctx');

      expect(logger.error).toHaveBeenCalledWith(
        'Error in ctx',
        expect.objectContaining({
          error: 'Unknown error',
          stack: undefined,
        })
      );
    });

    test('should log secondary error when reply throws', async () => {
      const interaction = createMockInteraction({
        reply: jest.fn().mockRejectedValue(new Error('reply failed')),
      });

      await handleInteractionError(interaction, new Error('original'), 'ctx');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send error message to user',
        expect.objectContaining({
          replyError: 'reply failed',
        })
      );
    });
  });

  describe('sendErrorEmbed()', () => {
    test('should call reply with embed when not replied', async () => {
      const interaction = createMockInteraction();
      await sendErrorEmbed(interaction, 'Error Title', 'Error description');

      expect(interaction.reply).toHaveBeenCalledWith({
        embeds: [
          expect.objectContaining({
            color: 0xff0000,
            title: '❌ Error Title',
            description: 'Error description',
          }),
        ],
        ephemeral: true,
      });
    });

    test('should call followUp when deferred', async () => {
      const interaction = createMockInteraction({ deferred: true });
      await sendErrorEmbed(interaction, 'Title', 'Desc');

      expect(interaction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          ephemeral: true,
        })
      );
      expect(interaction.reply).not.toHaveBeenCalled();
    });

    test('should call followUp when already replied', async () => {
      const interaction = createMockInteraction({ replied: true });
      await sendErrorEmbed(interaction, 'Title', 'Desc');

      expect(interaction.followUp).toHaveBeenCalled();
    });

    test('should log error when reply throws', async () => {
      const interaction = createMockInteraction({
        reply: jest.fn().mockRejectedValue(new Error('send failed')),
      });
      await sendErrorEmbed(interaction, 'Title', 'Desc');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to send error embed',
        expect.objectContaining({
          error: 'send failed',
        })
      );
    });
  });
});
