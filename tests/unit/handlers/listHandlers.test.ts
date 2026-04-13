// ListHandlers Tests - REFACTORED using Work Order #010 Architecture
// Tests the actual handler implementation with external dependencies mocked

// Mock getModels before imports to avoid circular dependency
jest.mock('../../../utils/interactions/helpers/databaseHelper', () => ({
    getModels: jest.fn()
}));

// Mock the List model
jest.mock('../../../supabase/models/List');

import { mockEssentials } from '../../utils/mocks/external-only';
import { listFixtures } from '../../utils/fixtures/database-fixtures';
import { createMockButtonInteraction } from '../../mocks/discord';
import { handleListButton } from '../../../utils/interactions/handlers/listHandlers';
import List from '../../../supabase/models/List';
import { ButtonInteraction, CacheType } from 'discord.js';
import { getModels } from '../../../utils/interactions/helpers/databaseHelper';

// ✅ NEW ARCHITECTURE: Mock only external dependencies
mockEssentials();

describe('ListHandlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // ✅ NO jest.resetModules() - keeps module loading stable

        // Set up getModels to return the List model for spying
        (getModels as jest.Mock).mockResolvedValue({
            List: List
        });
    });

    describe('handleListButton', () => {
        describe('list_add_', () => {
            it('should show modal for adding item to list', async () => {
                const listName = 'Shopping';
                const interaction = createMockButtonInteraction(`list_add_${listName}`) as ButtonInteraction<CacheType>;

                await handleListButton(interaction);

                expect(interaction.showModal).toHaveBeenCalledTimes(1);
                const modalCall = (interaction.showModal as jest.Mock).mock.calls[0][0];
                expect(modalCall.data.custom_id).toBe(`list_add_item_modal_${encodeURIComponent(listName)}`);
                expect(modalCall.data.title).toBe(`Add Item to ${listName}`);
            });
        });

        describe('list_view_', () => {
            it('should display list with items', async () => {
                // Arrange
                const listName = 'Shopping';
                const mockList = {
                    ...listFixtures.groceries,
                    name: listName,
                    items: [
                        { text: 'Milk', completed: false },
                        { text: 'Bread', completed: true },
                        { text: 'Eggs', completed: false }
                    ]
                };
                (List.findOne as jest.Mock).mockResolvedValue(mockList);

                const interaction = createMockButtonInteraction(`list_view_${listName}`) as ButtonInteraction<CacheType>;

                // Act
                await handleListButton(interaction);

                // Assert - Verify actual List model method is called
                expect(List.findOne).toHaveBeenCalledWith({
                    where: { user_id: 'test-user', guild_id: 'test-guild', name: listName }
                });
                expect(interaction.reply).toHaveBeenCalledWith({
                    embeds: expect.any(Array),
                    components: expect.any(Array),
                    ephemeral: true
                });

                const embedCall = (interaction.reply as jest.Mock).mock.calls[0][0];
                expect(embedCall.embeds[0].data.title).toContain(listName);
                expect(embedCall.embeds[0].data.footer.text).toContain('1/3 completed');
            });

            it('should display empty list message', async () => {
                // Arrange
                const listName = 'Shopping';
                const mockList = {
                    ...listFixtures.groceries,
                    name: listName,
                    items: []
                };
                (List.findOne as jest.Mock).mockResolvedValue(mockList);

                const interaction = createMockButtonInteraction(`list_view_${listName}`) as ButtonInteraction<CacheType>;

                // Act
                await handleListButton(interaction);

                // Assert
                const embedCall = (interaction.reply as jest.Mock).mock.calls[0][0];
                expect(embedCall.embeds[0].data.description).toContain('empty');
            });

            it('should show error for non-existent list', async () => {
                // Arrange
                const listName = 'NonExistent';
                (List.findOne as jest.Mock).mockResolvedValue(null);

                const interaction = createMockButtonInteraction(`list_view_${listName}`) as ButtonInteraction<CacheType>;

                // Act
                await handleListButton(interaction);

                // Assert
                expect(interaction.reply).toHaveBeenCalledWith({
                    content: expect.stringContaining('not found'),
                    ephemeral: true
                });
            });
        });

        describe('list_clear_', () => {
            it('should clear completed items from list', async () => {
                // Arrange
                const listName = 'Shopping';
                const mockList = {
                    ...listFixtures.groceries,
                    name: listName,
                    items: [
                        { text: 'Milk', completed: false },
                        { text: 'Bread', completed: true },
                        { text: 'Eggs', completed: true }
                    ],
                    save: jest.fn()
                };
                (List.findOne as jest.Mock).mockResolvedValue(mockList);

                const interaction = createMockButtonInteraction(`list_clear_${listName}`) as ButtonInteraction<CacheType>;

                // Act
                await handleListButton(interaction);

                // Assert
                expect(mockList.save).toHaveBeenCalled();
                expect(mockList.items).toHaveLength(1);
                expect(mockList.items[0].text).toBe('Milk');
                expect(interaction.reply).toHaveBeenCalledWith({
                    content: expect.stringContaining('Cleared 2'),
                    ephemeral: true
                });
            });

            it('should handle empty list', async () => {
                // Arrange
                const listName = 'Shopping';
                const mockList = {
                    ...listFixtures.groceries,
                    name: listName,
                    items: [],
                    save: jest.fn()
                };
                (List.findOne as jest.Mock).mockResolvedValue(mockList);

                const interaction = createMockButtonInteraction(`list_clear_${listName}`) as ButtonInteraction<CacheType>;

                // Act
                await handleListButton(interaction);

                // Assert
                expect(interaction.reply).toHaveBeenCalledWith({
                    content: expect.stringContaining('Cleared 0'),
                    ephemeral: true
                });
            });
        });

        describe('list_refresh_', () => {
            it('should refresh list view by calling command', async () => {
                const listName = 'Shopping';
                const mockCommand = { execute: jest.fn(), data: {} };
                const interaction = createMockButtonInteraction(`list_refresh_${listName}`) as ButtonInteraction<CacheType>;
                interaction.client.commands.set('list', mockCommand);

                await handleListButton(interaction);

                expect(mockCommand.execute).toHaveBeenCalledWith(
                    expect.objectContaining({
                        options: expect.objectContaining({
                            getSubcommand: expect.any(Function),
                            getString: expect.any(Function)
                        })
                    })
                );
            });
        });

        describe('error handling', () => {
            it('should handle database errors gracefully', async () => {
                // Arrange
                (List.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

                const interaction = createMockButtonInteraction('list_view_Shopping') as ButtonInteraction<CacheType>;

                // Act
                await handleListButton(interaction);

                // Assert - Should handle error gracefully
                expect(interaction.reply).toHaveBeenCalled();
            });
        });

        describe('guild validation', () => {
            it('should reject interactions without guild ID', async () => {
                const interaction = createMockButtonInteraction('list_add_Shopping', 'test-user', null) as ButtonInteraction<CacheType>;

                await handleListButton(interaction);

                expect(interaction.reply).toHaveBeenCalledWith({
                    content: expect.stringContaining('server'),
                    ephemeral: true
                });
            });
        });
    });
});
