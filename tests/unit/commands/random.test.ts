// Random Command Tests - REFACTORED using Work Order #010 Architecture
// Tests the actual command implementation with external dependencies mocked

import { createMockInteraction } from '../../utils/helpers/test-interaction';
import { mockEssentials } from '../../utils/mocks/external-only';
import randomCommand from '../../../commands/random';

// ✅ NEW ARCHITECTURE: Mock only external dependencies
mockEssentials();

describe('Random Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // ✅ NO jest.resetModules() - keeps module loading stable
  });

  describe('Command Structure', () => {
    it('should have correct command data', () => {
      // ✅ Static import - no dynamic loading needed
      expect(randomCommand.data).toBeDefined();
      expect(randomCommand.data.name).toBe('random');
      expect(randomCommand.data.description).toContain('Random');
    });

    it('should have all required subcommands', () => {
      const commandData = randomCommand.data.toJSON();
      const subcommandNames = commandData.options?.map((opt: any) => opt.name) || [];

      expect(subcommandNames).toContain('movie');
      expect(subcommandNames).toContain('dinner');
      expect(subcommandNames).toContain('date');
      expect(subcommandNames).toContain('question');
      expect(subcommandNames).toContain('choice');
      expect(subcommandNames).toContain('number');
      expect(subcommandNames).toContain('coin');
      expect(subcommandNames).toContain('dice');
    });

    it('should have execute function', () => {
      expect(typeof randomCommand.execute).toBe('function');
    });
  });

  describe('Number Subcommand', () => {
    it('should generate random number with specified range', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'random',
        subcommand: 'number',
        options: {
          min: 1,
          max: 10,
        },
      });

      // Act - Execute actual command
      await randomCommand.execute(interaction);

      // Assert - Verify actual behavior
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: '🔢 Random Number',
              }),
            }),
          ]),
        })
      );
    });

    it('should use default values when no range provided', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'random',
        subcommand: 'number',
        // No min/max options provided
      });

      // Act
      await randomCommand.execute(interaction);

      // Assert - Should use default range 1-100
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                description: expect.stringContaining('Range: 1 - 100'),
              }),
            }),
          ]),
        })
      );
    });

    it('should handle invalid range (min >= max)', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'random',
        subcommand: 'number',
        options: {
          min: 10,
          max: 5, // Invalid: max < min
        },
      });

      // Act
      await randomCommand.execute(interaction);

      // Assert - Should show error message
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: 'Minimum must be less than maximum.',
      });
    });
  });

  describe('Choice Subcommand', () => {
    it('should pick from provided options', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'random',
        subcommand: 'choice',
        options: {
          options: 'apple,banana,cherry,date',
        },
      });

      // Act
      await randomCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: '🎲 Random Choice',
              }),
            }),
          ]),
        })
      );
    });

    it('should handle insufficient options', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'random',
        subcommand: 'choice',
        options: {
          options: 'only-one-option', // Less than 2 options
        },
      });

      // Act
      await randomCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: 'Please provide at least 2 options separated by commas.',
      });
    });
  });

  describe('Coin Subcommand', () => {
    it('should flip a coin', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'random',
        subcommand: 'coin',
      });

      // Act
      await randomCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: '🪙 Coin Flip',
              }),
            }),
          ]),
        })
      );
    });
  });

  describe('Dice Subcommand', () => {
    it('should roll dice with default settings', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'random',
        subcommand: 'dice',
        // No sides or count provided - should use defaults
      });

      // Act
      await randomCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: '🎲 Dice Roll',
                description: 'Rolling 1d6',
              }),
            }),
          ]),
        })
      );
    });

    it('should roll multiple dice with custom sides', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'random',
        subcommand: 'dice',
        options: {
          sides: 20,
          count: 3,
        },
      });

      // Act
      await randomCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: '🎲 Dice Roll',
                description: 'Rolling 3d20',
              }),
            }),
          ]),
        })
      );
    });
  });

  describe('Date Subcommand', () => {
    it('should generate a random date idea', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'random',
        subcommand: 'date',
      });

      // Act
      await randomCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: '💑 Random Date Idea',
              }),
            }),
          ]),
          components: expect.arrayContaining([
            expect.objectContaining({
              components: expect.arrayContaining([
                expect.objectContaining({
                  data: expect.objectContaining({
                    custom_id: 'random_date_reroll',
                  }),
                }),
              ]),
            }),
          ]),
        })
      );
    });
  });

  describe('Question Subcommand', () => {
    it('should generate a conversation starter', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'random',
        subcommand: 'question',
      });

      // Act
      await randomCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: '💭 Conversation Starter',
              }),
            }),
          ]),
          components: expect.arrayContaining([
            expect.objectContaining({
              components: expect.arrayContaining([
                expect.objectContaining({
                  data: expect.objectContaining({
                    custom_id: 'random_question_reroll',
                  }),
                }),
              ]),
            }),
          ]),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle command errors gracefully', async () => {
      // Arrange - Use a subcommand that doesn't depend on external data
      const interaction = createMockInteraction({
        commandName: 'random',
        subcommand: 'number',
        options: {
          min: 1,
          max: 10,
        },
      });

      // Mock interaction.editReply to throw error on first call, succeed on second
      const mockError = new Error('Discord API error');
      interaction.editReply = jest
        .fn()
        .mockRejectedValueOnce(mockError) // First call throws
        .mockResolvedValueOnce(undefined); // Second call succeeds

      // Act
      await randomCommand.execute(interaction);

      // Assert - Should handle error gracefully by calling editReply twice
      expect(interaction.editReply).toHaveBeenCalledTimes(2);
      expect(interaction.editReply).toHaveBeenLastCalledWith({
        content: 'An error occurred while processing your request.',
      });
    });
  });
});
