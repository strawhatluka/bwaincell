import {
  ButtonInteraction,
  CacheType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from 'discord.js';
import { getModels } from '../helpers/databaseHelper';
import { handleInteractionError } from '../responses/errorResponses';

export async function handleListButton(interaction: ButtonInteraction<CacheType>): Promise<void> {
  const customId = interaction.customId;
  const userId = interaction.user.id;
  const guildId = interaction.guild?.id;

  if (!guildId) {
    // Check if already acknowledged before responding
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        flags: 64,
      });
    } else {
      await interaction.followUp({
        content: '❌ This command can only be used in a server.',
        flags: 64,
      });
    }
    return;
  }

  const { List } = await getModels();

  try {
    // Add item to list modal
    if (customId.startsWith('list_add_')) {
      const listName = customId.replace('list_add_', '');
      const modal = new ModalBuilder()
        .setCustomId(`list_add_item_modal_${encodeURIComponent(listName)}`)
        .setTitle(`Add Item to ${listName}`);

      const itemInput = new TextInputBuilder()
        .setCustomId('list_item')
        .setLabel('Item to add')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(itemInput);
      modal.addComponents(row);
      await interaction.showModal(modal);
      return;
    }

    // View list
    if (customId.startsWith('list_view_')) {
      const listName = customId.replace('list_view_', '');
      const list = await List.getList(guildId, listName);

      if (!list) {
        // Check if already acknowledged before responding
        if (!interaction.deferred && !interaction.replied) {
          await interaction.reply({
            content: `❌ List "${listName}" not found.`,
            flags: 64,
          });
        } else {
          await interaction.followUp({
            content: `❌ List "${listName}" not found.`,
            flags: 64,
          });
        }
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`📝 ${list.name}`)
        .setColor(0x0099ff)
        .setTimestamp();

      if (!list.items || list.items.length === 0) {
        embed.setDescription('This list is empty. Add some items to get started!');
      } else {
        const itemsList = list.items
          .map((item) => {
            const status = item.completed ? '✅' : '☐';
            return `${status} ${item.text}`;
          })
          .join('\n');
        embed.setDescription(itemsList);
        const completed = list.items.filter((i) => i.completed).length;
        embed.setFooter({ text: `${completed}/${list.items.length} completed` });
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`list_add_${listName}`)
          .setLabel('Add Item')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('➕'),
        new ButtonBuilder()
          .setCustomId(`list_mark_complete_${listName}`)
          .setLabel('Mark Complete')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅')
          .setDisabled(
            !list.items || list.items.length === 0 || list.items.every((item) => item.completed)
          ),
        new ButtonBuilder()
          .setCustomId(`list_clear_completed_${listName}`)
          .setLabel('Clear Completed')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🧹')
          .setDisabled(!list.items || !list.items.some((i) => i.completed))
      );

      // Check if already acknowledged before responding
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
      } else {
        await interaction.followUp({ embeds: [embed], components: [row], flags: 64 });
      }
      return;
    }

    // Mark item complete - show select menu
    if (customId.startsWith('list_mark_complete_')) {
      const listName = customId.replace('list_mark_complete_', '');
      const list = await List.getList(guildId, listName);

      if (!list) {
        if (!interaction.deferred && !interaction.replied) {
          await interaction.reply({
            content: `❌ List "${listName}" not found.`,
            flags: 64,
          });
        } else {
          await interaction.followUp({
            content: `❌ List "${listName}" not found.`,
            flags: 64,
          });
        }
        return;
      }

      // Get incomplete items
      const incompleteItems = list.items.filter((item) => !item.completed);

      if (incompleteItems.length === 0) {
        if (interaction.deferred) {
          await interaction.editReply({
            content: '✅ All items are already completed!',
          });
        } else {
          await interaction.reply({
            content: '✅ All items are already completed!',
            flags: 64,
          });
        }
        return;
      }

      // Build select menu with incomplete items (max 25 options)
      const options = incompleteItems.slice(0, 25).map((item, index) => ({
        label: item.text.substring(0, 100), // Discord max label length
        value: `${index}`,
        description: `Mark "${item.text.substring(0, 50)}" as complete`,
      }));

      const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`list_complete_select_${listName}`)
          .setPlaceholder('Select an item to mark as complete')
          .addOptions(options)
      );

      if (interaction.deferred) {
        await interaction.editReply({
          content: `Select an item from "${listName}" to mark as complete:`,
          components: [selectMenu],
        });
      } else {
        await interaction.reply({
          content: `Select an item from "${listName}" to mark as complete:`,
          components: [selectMenu],
          flags: 64,
        });
      }
      return;
    }

    // Toggle individual item completion
    if (customId.startsWith('list_toggle_item_')) {
      // Parse: list_toggle_item_{listName}_{itemIndex}
      const parts = customId.replace('list_toggle_item_', '').split('_');
      const itemIndex = parseInt(parts[parts.length - 1], 10);
      const listName = parts.slice(0, -1).join('_');

      const list = await List.getList(guildId, listName);

      if (!list || !list.items || !list.items[itemIndex]) {
        if (interaction.deferred) {
          await interaction.editReply({
            content: `❌ List "${listName}" or item not found.`,
          });
        } else {
          await interaction.reply({
            content: `❌ List "${listName}" or item not found.`,
            flags: 64,
          });
        }
        return;
      }

      // Toggle the item
      const item = list.items[itemIndex];
      const itemText = item.text;
      const wasCompleted = item.completed;

      // Use the existing toggleItem method
      await List.toggleItem(guildId, listName, itemText);

      // Refresh the list display
      const updatedList = await List.getList(guildId, listName);

      if (!updatedList) {
        if (interaction.deferred) {
          await interaction.editReply({
            content: `❌ Error refreshing list.`,
          });
        } else {
          await interaction.reply({
            content: `❌ Error refreshing list.`,
            flags: 64,
          });
        }
        return;
      }

      // Rebuild the embed and components
      const embed = new EmbedBuilder()
        .setTitle(`📝 ${updatedList.name}`)
        .setColor(0x0099ff)
        .setTimestamp();

      const itemsList = updatedList.items
        .map((item) => {
          const status = item.completed ? '✅' : '☐';
          return `${status} ${item.text}`;
        })
        .join('\n');

      embed.setDescription(itemsList);
      const completed = updatedList.items.filter((i) => i.completed).length;
      embed.setFooter({ text: `${completed}/${updatedList.items.length} completed` });

      // Rebuild button components
      const components: ActionRowBuilder<ButtonBuilder>[] = [];
      const MAX_ITEMS_FOR_BUTTONS = 20;

      if (updatedList.items.length > 0 && updatedList.items.length <= MAX_ITEMS_FOR_BUTTONS) {
        const itemsPerRow = 5;
        for (let i = 0; i < updatedList.items.length; i += itemsPerRow) {
          const rowItems = updatedList.items.slice(
            i,
            Math.min(i + itemsPerRow, updatedList.items.length)
          );
          const row = new ActionRowBuilder<ButtonBuilder>();

          rowItems.forEach((item, index) => {
            const globalIndex = i + index;
            const buttonStyle = item.completed ? ButtonStyle.Success : ButtonStyle.Secondary;

            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`list_toggle_item_${listName}_${globalIndex}`)
                .setLabel(`${globalIndex + 1}`)
                .setStyle(buttonStyle)
            );
          });

          components.push(row);
        }
      }

      // Add action buttons row
      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`list_add_${listName}`)
          .setLabel('Add Item')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('➕')
      );

      if (updatedList.items.length > MAX_ITEMS_FOR_BUTTONS) {
        actionRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`list_mark_complete_${listName}`)
            .setLabel('Mark Complete')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅')
            .setDisabled(
              updatedList.items.length === 0 || updatedList.items.every((item) => item.completed)
            )
        );
      }

      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`list_clear_completed_${listName}`)
          .setLabel('Clear Completed')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🧹')
          .setDisabled(!updatedList.items || !updatedList.items.some((i) => i.completed))
      );

      components.push(actionRow);

      // Update the message
      if (interaction.deferred) {
        await interaction.editReply({
          content: `${wasCompleted ? '☐' : '✅'} "${itemText}" marked as ${wasCompleted ? 'incomplete' : 'complete'}`,
          embeds: [embed],
          components,
        });
      } else {
        await interaction.update({
          content: `${wasCompleted ? '☐' : '✅'} "${itemText}" marked as ${wasCompleted ? 'incomplete' : 'complete'}`,
          embeds: [embed],
          components,
        });
      }
      return;
    }

    // Clear completed items
    if (customId.startsWith('list_clear_completed_')) {
      const listName = customId.replace('list_clear_completed_', '');
      const list = await List.clearCompleted(guildId, listName);

      if (!list) {
        if (interaction.deferred) {
          await interaction.editReply({
            content: `❌ List "${listName}" not found.`,
          });
        } else {
          await interaction.reply({
            content: `❌ List "${listName}" not found.`,
            flags: 64,
          });
        }
        return;
      }

      if (interaction.deferred) {
        await interaction.editReply({
          content: `🧹 Cleared all completed items from "${listName}".`,
        });
      } else {
        await interaction.reply({
          content: `🧹 Cleared all completed items from "${listName}".`,
          flags: 64,
        });
      }
      return;
    }

    // Delete list confirmation
    if (customId.startsWith('list_delete_confirm_')) {
      const listName = customId.replace('list_delete_confirm_', '');
      const deleted = await List.deleteList(guildId, listName);

      if (deleted) {
        if (interaction.deferred) {
          await interaction.editReply({
            content: `🗑️ List "${listName}" has been deleted.`,
            components: [],
          });
        } else {
          await interaction.reply({
            content: `🗑️ List "${listName}" has been deleted.`,
            components: [],
            flags: 64,
          });
        }
      } else {
        if (interaction.deferred) {
          await interaction.editReply({
            content: `❌ List "${listName}" not found.`,
            components: [],
          });
        } else {
          await interaction.reply({
            content: `❌ List "${listName}" not found.`,
            components: [],
            flags: 64,
          });
        }
      }
      return;
    }

    // Cancel delete
    if (customId === 'list_delete_cancel') {
      if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ Delete cancelled.',
          components: [],
        });
      } else {
        await interaction.reply({
          content: '❌ Delete cancelled.',
          components: [],
          flags: 64,
        });
      }
      return;
    }
  } catch (error) {
    await handleInteractionError(interaction, error, 'list button handler');
  }
}
