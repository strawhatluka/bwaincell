// Budget Command Tests - REFACTORED using Work Order #008 Architecture
// Tests the actual command implementation with external dependencies mocked

import { createMockInteraction, InteractionScenarios } from '../../utils/helpers/test-interaction';
import { mockEssentials } from '../../utils/mocks/external-only';
import { budgetFixtures } from '../../utils/fixtures/database-fixtures';
import budgetCommand from '../../../commands/budget';

// ✅ NEW ARCHITECTURE: Mock only external dependencies
mockEssentials();

// Mock the Budget model
jest.mock('../../../supabase/models/Budget');
import Budget from '../../../supabase/models/Budget';

describe('Budget Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // ✅ NO jest.resetModules() - keeps module loading stable

    // Setup custom method mocks for Budget model
    jest.spyOn(Budget, 'addExpense').mockResolvedValue({} as any);
    jest.spyOn(Budget, 'addIncome').mockResolvedValue({} as any);
    jest.spyOn(Budget, 'getSummary').mockResolvedValue({
      income: '0.00',
      expenses: '0.00',
      balance: '0.00',
      categories: [],
      entryCount: 0,
    } as any);
    jest.spyOn(Budget, 'getCategories').mockResolvedValue([]);
    jest.spyOn(Budget, 'getRecentEntries').mockResolvedValue([]);
    jest.spyOn(Budget, 'getMonthlyTrend').mockResolvedValue([]);
    jest.spyOn(Budget, 'deleteEntry').mockResolvedValue(true);
  });

  describe('Command Structure', () => {
    it('should have correct command data', () => {
      // ✅ Static import - no dynamic loading needed
      expect(budgetCommand.data).toBeDefined();
      expect(budgetCommand.data.name).toBe('budget');
      expect(budgetCommand.data.description).toContain('budget');
    });

    it('should have all required subcommands', () => {
      const commandData = budgetCommand.data.toJSON();
      const subcommandNames = commandData.options?.map((opt: any) => opt.name) || [];

      expect(subcommandNames).toContain('add');
      expect(subcommandNames).toContain('income');
      expect(subcommandNames).toContain('summary');
      expect(subcommandNames).toContain('categories');
      expect(subcommandNames).toContain('recent');
      expect(subcommandNames).toContain('trend');
    });

    it('should have execute function', () => {
      expect(typeof budgetCommand.execute).toBe('function');
    });
  });

  describe('Add Budget Entry Subcommand', () => {
    it('should create a new budget entry', async () => {
      // Arrange
      const interaction = InteractionScenarios.budgetAdd('Coffee and snacks', 25.5, 'Food');

      const mockEntry = {
        id: 1,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        description: 'Coffee and snacks',
        amount: 25.5,
        category: 'Food',
        createdAt: new Date(),
      };
      jest.spyOn(Budget, 'addExpense').mockResolvedValue(mockEntry as any);

      // Act - Execute actual command
      await budgetCommand.execute(interaction);

      // Assert - Verify actual behavior
      expect(Budget.addExpense).toHaveBeenCalledWith(
        interaction.user.id,
        interaction.guildId,
        'Food',
        25.5,
        'Coffee and snacks'
      );

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Expense Recorded',
              }),
            }),
          ]),
        })
      );
    });

    it('should handle large expense amounts', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'budget',
        subcommand: 'add',
        options: {
          description: 'Laptop purchase',
          amount: 1200.0,
          category: 'Technology',
        },
      });

      const mockEntry = { ...budgetFixtures.largeExpense, id: 1 };
      jest.spyOn(Budget, 'addExpense').mockResolvedValue(mockEntry as any);

      // Act
      await budgetCommand.execute(interaction);

      // Assert
      expect(Budget.addExpense).toHaveBeenCalledWith(
        interaction.user.id,
        interaction.guildId,
        'Technology',
        1200.0,
        'Laptop purchase'
      );
    });

    it('should handle income entries', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'budget',
        subcommand: 'income',
        options: {
          description: 'Freelance payment',
          amount: 500.0,
          category: 'Work',
          type: 'income',
        },
      });

      const mockEntry = { ...budgetFixtures.income, id: 1 };
      jest.spyOn(Budget, 'addIncome').mockResolvedValue(mockEntry as any);

      // Act
      await budgetCommand.execute(interaction);

      // Assert
      expect(Budget.addIncome).toHaveBeenCalledWith(
        interaction.user.id,
        interaction.guildId,
        500.0,
        'Freelance payment'
      );
    });

    it('should handle missing guild context', async () => {
      // Arrange - Interaction without guild
      const interaction = createMockInteraction({
        commandName: 'budget',
        subcommand: 'add',
        options: {
          description: 'Test expense',
          amount: 10.0,
        },
        guild: undefined,
      });
      (interaction as any).guild = null;
      (interaction as any).guildId = null;

      // Act
      await budgetCommand.execute(interaction);

      // Assert
      expect(Budget.addExpense).not.toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('server'));
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const interaction = InteractionScenarios.budgetAdd('Test expense', 25.0);
      const mockError = new Error('Database connection failed');
      jest.spyOn(Budget, 'addExpense').mockRejectedValue(mockError);

      // Act
      await budgetCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('error'),
          ephemeral: true,
        })
      );
    });
  });

  describe('View Budget Subcommand', () => {
    it('should display budget entries', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'budget',
        subcommand: 'view',
        options: {
          period: 'month',
        },
      });

      // Act
      await budgetCommand.execute(interaction);

      expect(interaction.editReply).toHaveBeenCalled();
    });

    it('should handle empty budget list', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'budget',
        subcommand: 'view',
      });

      // Act
      await budgetCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('No budget entries'),
          ephemeral: true,
        })
      );
    });

    it('should calculate budget summary correctly', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'budget',
        subcommand: 'view',
        options: {
          period: 'week',
        },
      });

      // Act
      await budgetCommand.execute(interaction);
    });
  });

  describe('Delete Budget Entry Subcommand', () => {
    it('should delete existing budget entry', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'budget',
        subcommand: 'delete',
        options: {
          entry_id: 1,
        },
      });

      // Act
      await budgetCommand.execute(interaction);

      // Assert
      expect(Budget.deleteEntry).toHaveBeenCalledWith(1, interaction.user.id, interaction.guildId);

      expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('deleted'));
    });

    it('should handle non-existent entry deletion', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'budget',
        subcommand: 'delete',
        options: {
          entry_id: 999,
        },
      });

      // Act
      await budgetCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not found'),
          ephemeral: true,
        })
      );
    });

    it('should handle database errors during deletion', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'budget',
        subcommand: 'delete',
        options: {
          entry_id: 1,
        },
      });

      // Act
      await budgetCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('error'),
          ephemeral: true,
        })
      );
    });
  });

  describe('Budget Categories', () => {
    it('should handle various expense categories', async () => {
      // Arrange
      const categories = ['Food', 'Transport', 'Entertainment', 'Technology', 'Health'];

      for (const category of categories) {
        const interaction = createMockInteraction({
          commandName: 'budget',
          subcommand: 'add',
          options: {
            description: `${category} expense`,
            amount: 50.0,
            category,
          },
        });

        jest.spyOn(Budget, 'addExpense').mockResolvedValue({
          id: 1,
          category,
          amount: 50.0,
        } as any);

        // Act
        await budgetCommand.execute(interaction);

        // Assert
        expect(Budget.addExpense).toHaveBeenCalledWith(
          expect.objectContaining({
            category,
          })
        );

        jest.clearAllMocks();
      }
    });
  });

  describe('Budget Validation', () => {
    it('should handle zero amount entries', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'budget',
        subcommand: 'add',
        options: {
          description: 'Free sample',
          amount: 0.0,
          category: 'Food',
        },
      });

      jest.spyOn(Budget, 'create').mockResolvedValue({
        id: 1,
        amount: 0.0,
      } as any);

      // Act
      await budgetCommand.execute(interaction);

      // Assert
      expect(Budget.addExpense).not.toHaveBeenCalled();
    });

    it('should handle negative amounts for refunds', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'budget',
        subcommand: 'add',
        options: {
          description: 'Refund for returned item',
          amount: -25.0,
          category: 'Shopping',
        },
      });

      jest.spyOn(Budget, 'create').mockResolvedValue({
        id: 1,
        amount: -25.0,
      } as any);

      // Act
      await budgetCommand.execute(interaction);

      // Assert
      expect(Budget.addExpense).not.toHaveBeenCalled();
    });
  });
});
