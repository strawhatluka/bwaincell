// ModalHandlers Tests - REFACTORED using Work Order #010 Architecture
// Tests the actual handler implementation with external dependencies mocked

// Mock getModels before imports to avoid circular dependency
jest.mock('../../../utils/interactions/helpers/databaseHelper', () => ({
    getModels: jest.fn()
}));

// Mock the database models
jest.mock('../../../supabase/models/Task');
jest.mock('../../../supabase/models/List');

import { mockEssentials } from '../../utils/mocks/external-only';
import { taskFixtures } from '../../utils/fixtures/database-fixtures';
import { createMockModalSubmitInteraction } from '../../mocks/discord';
import { handleModalSubmit } from '../../../utils/interactions/modals/modalHandlers';
import Task from '../../../supabase/models/Task';
import List from '../../../supabase/models/List';
import { ModalSubmitInteraction, CacheType } from 'discord.js';
import { getModels } from '../../../utils/interactions/helpers/databaseHelper';

// ✅ NEW ARCHITECTURE: Mock only external dependencies
mockEssentials();

describe('ModalHandlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // ✅ NO jest.resetModules() - keeps module loading stable

        // Set up getModels to return the models for spying
        (getModels as jest.Mock).mockResolvedValue({
            Task: Task,
            List: List
        });
    });

    describe('handleModalSubmit', () => {
        describe('task_add_modal', () => {
            it('should create task with valid description', async () => {
                // Arrange
                const mockTask = { ...taskFixtures.basic, id: 42 };
                (Task.createTask as jest.Mock).mockResolvedValue(mockTask);

                const interaction = createMockModalSubmitInteraction('task_add_modal', {
                    'task_description': 'Buy groceries',
                    'task_due_date': ''
                }) as ModalSubmitInteraction<CacheType>;

                // Act
                await handleModalSubmit(interaction);

                // Assert - Verify actual Task model method is called
                expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
                expect(Task.createTask).toHaveBeenCalledWith(
                    'test-user',
                    'test-guild',
                    'Buy groceries',
                    undefined
                );
                expect(interaction.followUp).toHaveBeenCalledWith({
                    embeds: expect.any(Array),
                    components: expect.any(Array),
                    ephemeral: true
                });
            });

            it('should create task with due date', async () => {
                // Arrange
                const mockTask = { ...taskFixtures.basic, id: 42 };
                (Task.createTask as jest.Mock).mockResolvedValue(mockTask);

                const interaction = createMockModalSubmitInteraction('task_add_modal', {
                    'task_description': 'Submit report',
                    'task_due_date': '2025-12-25 14:00'
                }) as ModalSubmitInteraction<CacheType>;

                // Act
                await handleModalSubmit(interaction);

                // Assert
                expect(Task.createTask).toHaveBeenCalledWith(
                    'test-user',
                    'test-guild',
                    'Submit report',
                    expect.any(Date)
                );
            });

            it('should reject invalid date format', async () => {
                // Arrange
                const interaction = createMockModalSubmitInteraction('task_add_modal', {
                    'task_description': 'Test task',
                    'task_due_date': 'invalid-date'
                }) as ModalSubmitInteraction<CacheType>;

                // Act
                await handleModalSubmit(interaction);

                // Assert
                expect(Task.createTask).not.toHaveBeenCalled();
                expect(interaction.editReply).toHaveBeenCalledWith({
                    content: expect.stringContaining('Invalid date format')
                });
            });
        });

        describe('task_edit_modal_', () => {
            it('should update task description', async () => {
                // Arrange
                const taskId = 123;
                const mockTask = { ...taskFixtures.basic, id: taskId, description: 'Updated task' };
                (Task.editTask as jest.Mock).mockResolvedValue(mockTask);

                const interaction = createMockModalSubmitInteraction(`task_edit_modal_${taskId}`, {
                    'task_new_description': 'Updated task description'
                }) as ModalSubmitInteraction<CacheType>;

                // Act
                await handleModalSubmit(interaction);

                // Assert
                expect(Task.editTask).toHaveBeenCalledWith(
                    taskId,
                    'test-user',
                    'test-guild',
                    'Updated task description'
                );
                expect(interaction.followUp).toHaveBeenCalledWith({
                    embeds: expect.any(Array),
                    ephemeral: true
                });
            });

            it('should show error for non-existent task', async () => {
                // Arrange
                const taskId = 999;
                (Task.editTask as jest.Mock).mockResolvedValue(null);

                const interaction = createMockModalSubmitInteraction(`task_edit_modal_${taskId}`, {
                    'task_new_description': 'Updated task'
                }) as ModalSubmitInteraction<CacheType>;

                // Act
                await handleModalSubmit(interaction);

                // Assert
                expect(interaction.followUp).toHaveBeenCalledWith({
                    content: expect.stringContaining('not found'),
                    ephemeral: true
                });
            });
        });

        describe('list_add_item_modal_', () => {
            it('should add item to list', async () => {
                // Arrange
                const listName = 'Shopping';
                (List.addItem as jest.Mock).mockResolvedValue(true);

                const interaction = createMockModalSubmitInteraction(
                    `list_add_item_modal_${encodeURIComponent(listName)}`,
                    { 'list_item': 'Milk' }
                ) as ModalSubmitInteraction<CacheType>;

                // Act
                await handleModalSubmit(interaction);

                // Assert
                expect(List.addItem).toHaveBeenCalledWith(
                    'test-user',
                    'test-guild',
                    listName,
                    'Milk'
                );
                expect(interaction.editReply).toHaveBeenCalledWith({
                    content: expect.stringContaining('Added "Milk"')
                });
            });

            it('should handle special characters in list name', async () => {
                // Arrange
                const listName = 'Shopping & Groceries';
                (List.addItem as jest.Mock).mockResolvedValue(true);

                const interaction = createMockModalSubmitInteraction(
                    `list_add_item_modal_${encodeURIComponent(listName)}`,
                    { 'list_item': 'Bread' }
                ) as ModalSubmitInteraction<CacheType>;

                // Act
                await handleModalSubmit(interaction);

                // Assert
                expect(List.addItem).toHaveBeenCalledWith(
                    'test-user',
                    'test-guild',
                    listName,
                    'Bread'
                );
            });

            it('should show error when list does not exist', async () => {
                // Arrange
                const listName = 'NonExistent';
                (List.addItem as jest.Mock).mockResolvedValue(false);

                const interaction = createMockModalSubmitInteraction(
                    `list_add_item_modal_${encodeURIComponent(listName)}`,
                    { 'list_item': 'Item' }
                ) as ModalSubmitInteraction<CacheType>;

                // Act
                await handleModalSubmit(interaction);

                // Assert
                expect(interaction.editReply).toHaveBeenCalledWith({
                    content: expect.stringContaining('Could not add item')
                });
            });
        });

        describe('error handling', () => {
            it('should handle database errors gracefully', async () => {
                // Arrange
                (Task.createTask as jest.Mock).mockRejectedValue(new Error('Database error'));

                const interaction = createMockModalSubmitInteraction('task_add_modal', {
                    'task_description': 'Test task',
                    'task_due_date': ''
                }) as ModalSubmitInteraction<CacheType>;

                // Act
                await handleModalSubmit(interaction);

                // Assert - Should handle error gracefully
                expect(interaction.reply).toHaveBeenCalled();
            });
        });

        describe('guild validation', () => {
            it('should reject interactions without guild ID', async () => {
                const interaction = createMockModalSubmitInteraction('task_add_modal', {
                    'task_description': 'Test task'
                }, null) as ModalSubmitInteraction<CacheType>;

                await handleModalSubmit(interaction);

                expect(interaction.reply).toHaveBeenCalledWith({
                    content: expect.stringContaining('server'),
                    ephemeral: true
                });
            });
        });
    });
});
