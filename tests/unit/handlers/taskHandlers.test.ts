// TaskHandlers Tests - REFACTORED using Work Order #010 Architecture
// Tests the actual handler implementation with external dependencies mocked

// Mock getModels before imports to avoid circular dependency
jest.mock('../../../utils/interactions/helpers/databaseHelper', () => ({
  getModels: jest.fn(),
}));

// Mock the Task model
jest.mock('../../../supabase/models/Task');

import { mockEssentials } from '../../utils/mocks/external-only';
import { taskFixtures } from '../../utils/fixtures/database-fixtures';
import { createMockButtonInteraction } from '../../mocks/discord';
import { handleTaskButton } from '../../../utils/interactions/handlers/taskHandlers';
import Task from '../../../supabase/models/Task';
import { ButtonInteraction, CacheType } from 'discord.js';
import { getModels } from '../../../utils/interactions/helpers/databaseHelper';

// ✅ NEW ARCHITECTURE: Mock only external dependencies
mockEssentials();

describe('TaskHandlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // ✅ NO jest.resetModules() - keeps module loading stable

    // Set up getModels to return the Task model for spying
    (getModels as jest.Mock).mockResolvedValue({
      Task: Task,
    });
  });

  describe('handleTaskButton', () => {
    describe('task_add_new', () => {
      it('should show modal for adding new task', async () => {
        // Arrange
        const interaction = createMockButtonInteraction(
          'task_add_new'
        ) as ButtonInteraction<CacheType>;

        // Act - Test actual handler implementation
        await handleTaskButton(interaction);

        // Assert - Verify actual behavior
        expect(interaction.showModal).toHaveBeenCalledTimes(1);
        const modalCall = (interaction.showModal as jest.Mock).mock.calls[0][0];
        expect(modalCall.data.custom_id).toBe('task_add_modal');
        expect(modalCall.data.title).toBe('Create New Task');
      });
    });

    describe('task_done_', () => {
      it('should mark task as complete for valid task ID', async () => {
        // Arrange
        const taskId = 123;
        const mockTask = { ...taskFixtures.basic, id: taskId };
        (Task.completeTask as jest.Mock).mockResolvedValue(mockTask);

        const interaction = createMockButtonInteraction(
          `task_done_${taskId}`
        ) as ButtonInteraction<CacheType>;

        // Act
        await handleTaskButton(interaction);

        // Assert - Verify actual Task model method is called
        expect(Task.completeTask).toHaveBeenCalledWith(taskId, interaction.user.id, 'test-guild');
        expect(interaction.reply).toHaveBeenCalledWith({
          content: expect.stringContaining(`Task #${taskId}`),
          ephemeral: true,
        });
      });

      it('should return error for non-existent task', async () => {
        // Arrange
        const taskId = 999;
        (Task.completeTask as jest.Mock).mockResolvedValue(null);

        const interaction = createMockButtonInteraction(
          `task_done_${taskId}`
        ) as ButtonInteraction<CacheType>;

        // Act
        await handleTaskButton(interaction);

        // Assert
        expect(Task.completeTask).toHaveBeenCalledWith(taskId, interaction.user.id, 'test-guild');
        expect(interaction.reply).toHaveBeenCalledWith({
          content: expect.stringContaining('not found'),
          ephemeral: true,
        });
      });
    });

    describe('task_edit_', () => {
      it('should show edit modal for existing task', async () => {
        // Arrange
        const taskId = 123;
        const mockTask = { ...taskFixtures.basic, id: taskId };
        (Task.findOne as jest.Mock).mockResolvedValue(mockTask);

        const interaction = createMockButtonInteraction(
          `task_edit_${taskId}`
        ) as ButtonInteraction<CacheType>;

        // Act
        await handleTaskButton(interaction);

        // Assert
        expect(Task.findOne).toHaveBeenCalledWith({
          where: { id: taskId, user_id: 'test-user', guild_id: 'test-guild' },
        });
        expect(interaction.showModal).toHaveBeenCalledTimes(1);
      });

      it('should show error for non-existent task', async () => {
        // Arrange
        const taskId = 999;
        (Task.findOne as jest.Mock).mockResolvedValue(null);

        const interaction = createMockButtonInteraction(
          `task_edit_${taskId}`
        ) as ButtonInteraction<CacheType>;

        // Act
        await handleTaskButton(interaction);

        // Assert
        expect(interaction.reply).toHaveBeenCalledWith({
          content: expect.stringContaining('not found'),
          ephemeral: true,
        });
      });
    });

    describe('task_delete_', () => {
      it('should delete task successfully', async () => {
        // Arrange
        const taskId = 123;
        (Task.deleteTask as jest.Mock).mockResolvedValue(true);

        const interaction = createMockButtonInteraction(
          `task_delete_${taskId}`
        ) as ButtonInteraction<CacheType>;

        // Act
        await handleTaskButton(interaction);

        // Assert
        expect(Task.deleteTask).toHaveBeenCalledWith(taskId, interaction.user.id, 'test-guild');
        expect(interaction.reply).toHaveBeenCalledWith({
          content: expect.stringContaining('deleted'),
          ephemeral: true,
        });
      });

      it('should show error for failed deletion', async () => {
        // Arrange
        const taskId = 999;
        (Task.deleteTask as jest.Mock).mockResolvedValue(false);

        const interaction = createMockButtonInteraction(
          `task_delete_${taskId}`
        ) as ButtonInteraction<CacheType>;

        // Act
        await handleTaskButton(interaction);

        // Assert
        expect(Task.deleteTask).toHaveBeenCalledWith(taskId, 'test-user', 'test-guild');
        expect(interaction.reply).toHaveBeenCalledWith({
          content: expect.stringContaining('not found'),
          ephemeral: true,
        });
      });
    });

    describe('task_quick_complete', () => {
      it('should show select menu with pending tasks', async () => {
        // Arrange
        const mockTasks = [
          { ...taskFixtures.basic, id: 1 },
          { ...taskFixtures.urgent, id: 2 },
        ];
        (Task.getUserTasks as jest.Mock).mockResolvedValue(mockTasks);

        const interaction = createMockButtonInteraction(
          'task_quick_complete'
        ) as ButtonInteraction<CacheType>;

        // Act
        await handleTaskButton(interaction);

        // Assert
        expect(Task.getUserTasks).toHaveBeenCalledWith('test-user', 'test-guild', 'pending');
        expect(interaction.reply).toHaveBeenCalledWith({
          content: expect.stringContaining('Select a task'),
          components: expect.any(Array),
          ephemeral: true,
        });
      });

      it('should show error when no pending tasks', async () => {
        // Arrange
        (Task.getUserTasks as jest.Mock).mockResolvedValue([]);

        const interaction = createMockButtonInteraction(
          'task_quick_complete'
        ) as ButtonInteraction<CacheType>;

        // Act
        await handleTaskButton(interaction);

        // Assert
        expect(interaction.reply).toHaveBeenCalledWith({
          content: expect.stringContaining('No pending tasks'),
          ephemeral: true,
        });
      });
    });

    describe('error handling', () => {
      it('should handle database errors gracefully', async () => {
        // Arrange
        (Task.completeTask as jest.Mock).mockRejectedValue(new Error('Database error'));

        const interaction = createMockButtonInteraction(
          'task_done_123'
        ) as ButtonInteraction<CacheType>;

        // Act
        await handleTaskButton(interaction);

        // Assert - Should handle error gracefully
        expect(interaction.reply).toHaveBeenCalled();
      });
    });

    describe('guild validation', () => {
      it('should reject interactions without guild ID', async () => {
        // Arrange - Interaction without guild
        const interaction = createMockButtonInteraction(
          'task_add_new',
          'test-user',
          null
        ) as ButtonInteraction<CacheType>;

        // Act
        await handleTaskButton(interaction);

        // Assert
        expect(interaction.reply).toHaveBeenCalledWith({
          content: expect.stringContaining('server'),
          ephemeral: true,
        });
      });
    });
  });
});
