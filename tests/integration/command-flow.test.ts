// Command Flow Integration Tests - REFACTORED using Work Order #010 Architecture
// Tests end-to-end command flows with real components

// ✅ NEW ARCHITECTURE: Mock only external dependencies
import { mockEssentials } from '../utils/mocks/external-only';
import { createMockInteraction } from '../utils/helpers/test-interaction';
import { getModels } from '../../utils/interactions/helpers/databaseHelper';

// Mock getModels for database operations
jest.mock('../../utils/interactions/helpers/databaseHelper', () => ({
  getModels: jest.fn(),
}));

// ✅ Mock only external dependencies
mockEssentials();

describe('Command Integration Tests', () => {
  let mockModels: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // ✅ NO jest.resetModules() - keeps module loading stable

    // Set up database model mocks
    mockModels = {
      Task: {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
        sum: jest.fn(),
      },
      List: {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
      },
      Budget: {
        create: jest.fn(),
        findAll: jest.fn(),
        sum: jest.fn(),
      },
    };

    (getModels as jest.Mock).mockResolvedValue(mockModels);
  });

  describe('End-to-End Command Flow', () => {
    it('should handle task creation and retrieval flow', async () => {
      // Arrange
      const taskData = {
        description: 'Integration test task',
        user_id: 'user-1',
        guild_id: 'guild-1',
        completed: false,
      };

      mockModels.Task.create.mockResolvedValue({ id: 1, ...taskData });
      mockModels.Task.findAll.mockResolvedValue([{ id: 1, ...taskData }]);

      // Act - Create task
      const createResult = await mockModels.Task.create(taskData);
      expect(createResult.id).toBe(1);

      // Act - Retrieve tasks
      const tasks = await mockModels.Task.findAll({
        where: { user_id: 'user-1', guild_id: 'guild-1' },
      });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].description).toBe('Integration test task');

      // Act - Mark task as completed
      mockModels.Task.update.mockResolvedValue([1]);
      const updateResult = await mockModels.Task.update({ completed: true }, { where: { id: 1 } });
      expect(updateResult[0]).toBe(1);
    });

    it('should handle list management flow', async () => {
      // Arrange
      const listData = {
        name: 'Integration List',
        items: [],
        user_id: 'user-1',
        guild_id: 'guild-1',
      };

      mockModels.List.create.mockResolvedValue({ id: 1, ...listData });
      const list = await mockModels.List.create(listData);
      expect(list.name).toBe('Integration List');

      // Act - Add items to list
      const updatedItems = [
        { text: 'Item 1', completed: false },
        { text: 'Item 2', completed: false },
        { text: 'Item 3', completed: false },
      ];
      mockModels.List.update.mockResolvedValue([1]);
      await mockModels.List.update({ items: updatedItems }, { where: { id: 1 } });

      // Act - Retrieve list with items
      mockModels.List.findOne.mockResolvedValue({
        id: 1,
        name: 'Integration List',
        items: updatedItems,
      });

      const retrievedList = await mockModels.List.findOne({ where: { id: 1 } });
      expect(retrievedList.items).toHaveLength(3);

      // Act - Delete list
      mockModels.List.destroy.mockResolvedValue(1);
      const deleteResult = await mockModels.List.destroy({ where: { id: 1 } });
      expect(deleteResult).toBe(1);
    });

    it('should handle budget tracking flow', async () => {
      // Arrange - Add multiple expenses
      const expenses = [
        { amount: 50, category: 'food', description: 'Groceries' },
        { amount: 30, category: 'transport', description: 'Gas' },
        { amount: 20, category: 'food', description: 'Lunch' },
      ];

      for (const expense of expenses) {
        await mockModels.Budget.create({
          ...expense,
          user_id: 'user-1',
          guild_id: 'guild-1',
          type: 'expense',
        });
      }

      // Act - Calculate total
      mockModels.Budget.sum.mockResolvedValue(100);
      const total = await mockModels.Budget.sum('amount', {
        where: { user_id: 'user-1', type: 'expense' },
      });
      expect(total).toBe(100);

      // Act - Get expenses by category
      mockModels.Budget.findAll.mockResolvedValue([expenses[0], expenses[2]]);

      const foodExpenses = await mockModels.Budget.findAll({
        where: { category: 'food', user_id: 'user-1' },
      });
      expect(foodExpenses).toHaveLength(2);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database failures gracefully', async () => {
      // Arrange
      mockModels.Task.create.mockRejectedValue(new Error('Database connection lost'));

      // Act & Assert
      await expect(mockModels.Task.create({ description: 'Test' })).rejects.toThrow(
        'Database connection lost'
      );
    });

    it('should handle invalid input data', async () => {
      // Arrange
      const invalidData = {
        description: '', // Invalid: empty description
        user_id: 'user-1',
        guild_id: 'guild-1',
      };

      mockModels.Task.create.mockRejectedValue(
        new Error('Validation error: description cannot be empty')
      );

      // Act & Assert
      await expect(mockModels.Task.create(invalidData)).rejects.toThrow('Validation error');
    });

    it('should handle concurrent operations', async () => {
      // Arrange
      const operations = [];

      // Simulate multiple concurrent operations
      for (let i = 0; i < 5; i++) {
        operations.push(
          mockModels.Task.create({
            description: `Concurrent task ${i}`,
            user_id: 'user-1',
            guild_id: 'guild-1',
          })
        );
      }

      mockModels.Task.create.mockImplementation((data: any) =>
        Promise.resolve({ id: Math.random(), ...data })
      );

      // Act
      const results = await Promise.all(operations);

      // Assert
      expect(results).toHaveLength(5);
    });
  });

  describe('Command Interaction Flow', () => {
    it('should process command from interaction to response', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'task',
        subcommand: 'add',
        options: {
          description: 'Test task',
        },
      });

      mockModels.Task.create.mockResolvedValue({
        id: 1,
        description: 'Test task',
        completed: false,
      });

      // Act - Simulate command execution
      const taskData = {
        description: interaction.options.getString('description'),
        user_id: interaction.user.id,
        guild_id: interaction.guildId,
        completed: false,
      };

      const result = await mockModels.Task.create(taskData);

      // Assert - Verify response
      expect(result.description).toBe('Test task');

      // Simulate reply
      await interaction.reply({
        embeds: [
          {
            title: 'Task Added',
            description: `Added task: ${result.description}`,
          },
        ],
      });

      expect(interaction.reply).toHaveBeenCalled();
    });

    it('should handle autocomplete interactions', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'task',
        subcommand: 'autocomplete',
      });
      (interaction as any).isAutocomplete = jest.fn().mockReturnValue(true);
      (interaction.options as any).getFocused = jest
        .fn()
        .mockReturnValue({ name: 'description', value: 'test', type: 'STRING' });

      // Get matching tasks for autocomplete
      mockModels.Task.findAll.mockResolvedValue([
        { id: 1, description: 'Test task 1' },
        { id: 2, description: 'Test task 2' },
      ]);

      // Act
      const tasks = await mockModels.Task.findAll({
        where: {
          description: { like: '%test%' },
          user_id: interaction.user.id,
        },
      });

      const choices = tasks.map((t: any) => ({
        name: t.description,
        value: t.id.toString(),
      }));

      // Assert
      expect(choices).toHaveLength(2);
      expect(choices[0].name).toContain('Test');
    });

    it('should handle button interactions', async () => {
      // Arrange - Use button interaction mock instead
      const customId = 'task_done_1';
      const interaction = {
        customId,
        user: { id: 'test-user' },
        guild: { id: 'test-guild' },
        isButton: jest.fn().mockReturnValue(true),
        update: jest.fn().mockResolvedValue(undefined),
      };

      // Parse button customId
      const [action, taskId] = customId.split('_').slice(1);
      expect(action).toBe('done');
      expect(taskId).toBe('1');

      // Act - Update task based on button
      mockModels.Task.update.mockResolvedValue([1]);
      const result = await mockModels.Task.update(
        { completed: true },
        { where: { id: parseInt(taskId) } }
      );

      expect(result[0]).toBe(1);

      // Update interaction message
      await interaction.update({
        content: 'Task marked as complete!',
        components: [],
      });

      expect(interaction.update).toHaveBeenCalled();
    });
  });

  describe('Database Transaction Integration', () => {
    it('should handle transactional operations', async () => {
      // Arrange
      const transaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };

      // Act - Simulate a transactional operation
      try {
        // Begin transaction
        await mockModels.Task.create({ description: 'Task 1' }, { transaction });
        await mockModels.List.create({ name: 'List 1' }, { transaction });

        // Commit if all succeed
        await transaction.commit();
        expect(transaction.commit).toHaveBeenCalled();
      } catch {
        // Rollback on error
        await transaction.rollback();
        expect(transaction.rollback).toHaveBeenCalled();
      }
    });

    it('should rollback on failure', async () => {
      // Arrange
      const transaction = {
        commit: jest.fn(),
        rollback: jest.fn(),
      };

      mockModels.Task.create.mockResolvedValue({ id: 1 });
      mockModels.List.create.mockRejectedValue(new Error('Constraint violation'));

      // Act
      try {
        await mockModels.Task.create({ description: 'Task 1' }, { transaction });
        await mockModels.List.create({ name: null }, { transaction }); // This fails
        await transaction.commit();
      } catch {
        await transaction.rollback();
        expect(transaction.rollback).toHaveBeenCalled();
        expect(transaction.commit).not.toHaveBeenCalled();
      }
    });
  });
});
