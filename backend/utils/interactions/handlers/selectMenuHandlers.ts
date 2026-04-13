import {
  StringSelectMenuInteraction,
  CacheType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getModels } from '../helpers/databaseHelper';
import { handleInteractionError } from '../responses/errorResponses';
import { logger } from '@shared/utils/logger';
import supabase from '../../../../supabase/supabase';
import type { TaskRow, ListRow } from '../../../../supabase/types';

export async function handleSelectMenuInteraction(
  interaction: StringSelectMenuInteraction<CacheType>
): Promise<void> {
  const customId = interaction.customId;
  const userId = interaction.user.id;
  const guildId = interaction.guild?.id;

  if (!guildId) {
    logger.warn('Select menu interaction attempted outside of guild', { userId, customId });
    if (interaction.deferred) {
      await interaction.editReply({ content: '❌ This command can only be used in a server.' });
    } else {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        flags: 64,
      });
    }
    return;
  }

  const { Task, List, Reminder } = await getModels();

  try {
    // Task quick action
    if (customId === 'task_quick_action') {
      const taskId = parseInt(interaction.values[0]);
      const { data: task } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('guild_id', guildId)
        .single() as { data: TaskRow | null };

      if (!task) {
        await interaction.editReply({
          content: '❌ Task not found.',
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`📋 Task #${task.id}`)
        .setDescription(task.description)
        .setColor(task.completed ? 0x00ff00 : 0x0099ff)
        .setTimestamp();

      if (task.due_date) {
        embed.addFields({
          name: '📅 Due Date',
          value: new Date(task.due_date).toLocaleString(),
        });
      }

      if (task.completed) {
        embed.addFields({
          name: '✅ Status',
          value: 'Completed',
        });
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`task_done_${task.id}`)
          .setLabel('Mark as Done')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅')
          .setDisabled(task.completed),
        new ButtonBuilder()
          .setCustomId(`task_edit_${task.id}`)
          .setLabel('Edit')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('✏️'),
        new ButtonBuilder()
          .setCustomId(`task_delete_${task.id}`)
          .setLabel('Delete')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️')
      );

      await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
      return;
    }

    // Task complete select
    if (customId === 'task_complete_select') {
      const taskId = parseInt(interaction.values[0]);
      const task = await Task.completeTask(taskId, guildId);
      if (task) {
        await interaction.editReply({
          content: `✅ Task #${taskId}: "${task.description}" marked as complete!`,
        });
      } else {
        await interaction.editReply({
          content: `❌ Task #${taskId} not found.`,
        });
      }
      return;
    }

    // Reminder quick delete
    if (customId === 'reminder_quick_delete') {
      const reminderId = parseInt(interaction.values[0]);
      const deleted = await Reminder.deleteReminder(reminderId, guildId);
      if (deleted) {
        await interaction.editReply({
          content: `🗑️ Reminder #${reminderId} has been cancelled.`,
        });
      } else {
        await interaction.editReply({
          content: `❌ Reminder #${reminderId} not found.`,
        });
      }
      return;
    }

    // List complete select - mark item as complete
    if (customId.startsWith('list_complete_select_')) {
      const listName = customId.replace('list_complete_select_', '');
      const selectedIndex = parseInt(interaction.values[0]);

      const list = await List.getList(guildId, listName);

      if (!list) {
        await interaction.editReply({
          content: `❌ List "${listName}" not found.`,
          components: [],
        });
        return;
      }

      const incompleteItems = list.items.filter((item) => !item.completed);

      if (selectedIndex >= incompleteItems.length) {
        await interaction.editReply({
          content: '❌ Selected item not found.',
          components: [],
        });
        return;
      }

      const selectedItem = incompleteItems[selectedIndex];

      // Toggle the item by finding it in the full list
      const result = await List.toggleItem(guildId, listName, selectedItem.text);

      if (result) {
        // Refresh the list to show updated status
        const updatedList = await List.getList(guildId, listName);

        if (!updatedList) {
          await interaction.editReply({
            content: `✅ Marked "${selectedItem.text}" as complete!`,
            components: [],
          });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle(`List: ${listName}`)
          .setColor(0x0099ff)
          .setTimestamp();

        if (updatedList.items.length === 0) {
          embed.setDescription('This list is empty.');
        } else {
          const itemsList = updatedList.items
            .map((item, index) => {
              const status = item.completed ? '✅' : '⬜';
              return `${status} ${index + 1}. ${item.text}`;
            })
            .join('\n');

          embed.setDescription(itemsList);

          const completed = updatedList.items.filter((item) => item.completed).length;
          embed.setFooter({ text: `${completed}/${updatedList.items.length} completed` });
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
              updatedList.items.length === 0 || updatedList.items.every((item) => item.completed)
            ),
          new ButtonBuilder()
            .setCustomId(`list_clear_completed_${listName}`)
            .setLabel('Clear Completed')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🧹')
            .setDisabled(!updatedList.items || !updatedList.items.some((item) => item.completed))
        );

        await interaction.editReply({
          content: `✅ Marked "${selectedItem.text}" as complete!`,
          embeds: [embed],
          components: [row],
        });
      } else {
        await interaction.editReply({
          content: '❌ Failed to mark item as complete.',
          components: [],
        });
      }
      return;
    }

    // List select view
    if (customId === 'list_select_view') {
      // Value format: "listName_index"
      const value = interaction.values[0];
      const listName = value.substring(0, value.lastIndexOf('_'));
      const list = await List.getList(guildId, listName);

      if (!list) {
        await interaction.editReply({
          content: '❌ List not found.',
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`📝 ${list.name}`)
        .setColor(0x0099ff)
        .setTimestamp()
        .setFooter({ text: `${list.items ? list.items.length : 0} items total` });

      if (!list.items || list.items.length === 0) {
        embed.setDescription('This list is empty. Add some items to get started!');
      } else {
        const itemList = list.items
          .slice(0, 20)
          .map((item) => {
            const checkbox = item.completed ? '☑️' : '⬜';
            return `${checkbox} ${item.text}`;
          })
          .join('\n');
        embed.setDescription(itemList);

        if (list.items.length > 20) {
          embed.addFields({
            name: '📌 Note',
            value: `Showing first 20 of ${list.items.length} items`,
          });
        }
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`list_add_${list.name}`)
          .setLabel('Add Item')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('➕'),
        new ButtonBuilder()
          .setCustomId(`list_clear_${list.name}`)
          .setLabel('Clear Completed')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🧹')
          .setDisabled(!list.items || !list.items.some((i) => i.completed))
      );

      await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
      return;
    }

    // List quick select
    if (customId === 'list_quick_select') {
      const listId = parseInt(interaction.values[0]);
      const { data: list } = await supabase
        .from('lists')
        .select('*')
        .eq('id', listId)
        .eq('guild_id', guildId)
        .single() as { data: ListRow | null };

      if (!list) {
        await interaction.editReply({
          content: '❌ List not found.',
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`📝 ${list.name}`)
        .setColor(0x0099ff)
        .setTimestamp()
        .setFooter({ text: `${list.items ? list.items.length : 0} items total` });

      if (!list.items || list.items.length === 0) {
        embed.setDescription('This list is empty. Add some items to get started!');
      } else {
        const itemList = list.items
          .slice(0, 20)
          .map((item) => {
            const checkbox = item.completed ? '☑️' : '⬜';
            return `${checkbox} ${item.text}`;
          })
          .join('\n');
        embed.setDescription(itemList);

        if (list.items.length > 20) {
          embed.addFields({
            name: '📌 Note',
            value: `Showing first 20 of ${list.items.length} items`,
          });
        }
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`list_add_${list.name}`)
          .setLabel('Add Item')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('➕'),
        new ButtonBuilder()
          .setCustomId(`list_clear_${list.name}`)
          .setLabel('Clear Completed')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🧹')
          .setDisabled(!list.items || !list.items.some((i) => i.completed))
      );

      await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
      return;
    }
  } catch (error) {
    await handleInteractionError(interaction, error, 'select menu handler');
  }
}
