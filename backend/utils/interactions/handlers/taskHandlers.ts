/**
 * @module TaskHandlers
 * @description Handles all task-related Discord button interactions including
 * create, complete, edit, delete, and list operations for the task management system.
 * @requires discord.js
 * @requires database/models/Task
 */

import {
  ButtonInteraction,
  CacheType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getModels } from '../helpers/databaseHelper';
import { handleInteractionError } from '../responses/errorResponses';
import supabase from '../../../../supabase/supabase';
import type { TaskRow } from '../../../../supabase/types';

/**
 * Handles all task-related button interactions from Discord
 *
 * @param {ButtonInteraction<CacheType>} interaction - Discord button interaction
 * @returns {Promise<void>} Sends response to Discord through interaction methods
 * @throws {Error} Database errors are caught and handled gracefully
 *
 * @example
 * // Handles task completion button
 * await handleTaskButton(interaction); // where customId is 'task_done_123'
 *
 * @example
 * // Handles task creation modal
 * await handleTaskButton(interaction); // where customId is 'task_add_new'
 */
export async function handleTaskButton(interaction: ButtonInteraction<CacheType>): Promise<void> {
  const customId = interaction.customId;
  const userId = interaction.user.id;
  const guildId = interaction.guild?.id;

  if (!guildId) {
    // Check if already acknowledged before responding
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true,
      });
    } else {
      await interaction.followUp({
        content: '❌ This command can only be used in a server.',
        ephemeral: true,
      });
    }
    return;
  }

  const { Task } = await getModels();

  try {
    // Add new task modal
    if (customId === 'task_add_new') {
      const modal = new ModalBuilder().setCustomId('task_add_modal').setTitle('Create New Task');

      const descriptionInput = new TextInputBuilder()
        .setCustomId('task_description')
        .setLabel('Task Description')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(200);

      const dateInput = new TextInputBuilder()
        .setCustomId('task_due_date')
        .setLabel('Due Date (MM-DD-YYYY)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('10-03-2025');

      const timeInput = new TextInputBuilder()
        .setCustomId('task_due_time')
        .setLabel('Due Time (hh:mm AM/PM)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('2:30 PM');

      const descRow = new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput);
      const dateRow = new ActionRowBuilder<TextInputBuilder>().addComponents(dateInput);
      const timeRow = new ActionRowBuilder<TextInputBuilder>().addComponents(timeInput);

      modal.addComponents(descRow, dateRow, timeRow);
      await interaction.showModal(modal);
      return;
    }

    // Quick complete task select menu
    if (customId === 'task_quick_complete') {
      const tasks = await Task.getUserTasks(guildId, 'pending');
      if (!tasks || tasks.length === 0) {
        // Check if already acknowledged before responding
        if (!interaction.deferred && !interaction.replied) {
          await interaction.reply({ content: '❌ No pending tasks to complete!', ephemeral: true });
        } else {
          await interaction.followUp({
            content: '❌ No pending tasks to complete!',
            ephemeral: true,
          });
        }
        return;
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('task_complete_select')
        .setPlaceholder('Select a task to complete')
        .addOptions(
          tasks.slice(0, 25).map((task) => ({
            label: `#${task.id} - ${task.description.substring(0, 50)}`,
            description: task.due_date
              ? `Due: ${new Date(task.due_date).toLocaleDateString()}`
              : 'No due date',
            value: `${task.id}`,
          }))
        );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
      // Check if already acknowledged before responding
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({
          content: '✅ Select a task to mark as complete:',
          components: [row],
          ephemeral: true,
        });
      } else {
        await interaction.followUp({
          content: '✅ Select a task to mark as complete:',
          components: [row],
          ephemeral: true,
        });
      }
      return;
    }

    // Complete task
    if (customId.startsWith('task_done_')) {
      const taskId = parseInt(customId.split('_')[2]);
      const task = await Task.completeTask(taskId, guildId);
      // Check if already acknowledged before responding
      if (!interaction.deferred && !interaction.replied) {
        if (task) {
          await interaction.reply({
            content: `✅ Task #${taskId}: "${task.description}" marked as complete!`,
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: `❌ Task #${taskId} not found.`,
            ephemeral: true,
          });
        }
      } else {
        if (task) {
          await interaction.followUp({
            content: `✅ Task #${taskId}: "${task.description}" marked as complete!`,
            ephemeral: true,
          });
        } else {
          await interaction.followUp({
            content: `❌ Task #${taskId} not found.`,
            ephemeral: true,
          });
        }
      }
      return;
    }

    // Edit task modal
    if (customId.startsWith('task_edit_')) {
      const taskId = parseInt(customId.split('_')[2]);
      const { data: task } = (await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .eq('guild_id', guildId)
        .single()) as { data: TaskRow | null };

      if (!task) {
        // Check if already acknowledged before responding
        if (!interaction.deferred && !interaction.replied) {
          await interaction.reply({
            content: `❌ Task #${taskId} not found.`,
            ephemeral: true,
          });
        } else {
          await interaction.followUp({
            content: `❌ Task #${taskId} not found.`,
            ephemeral: true,
          });
        }
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId(`task_edit_modal_${taskId}`)
        .setTitle(`Edit Task #${taskId}`);

      const newDescriptionInput = new TextInputBuilder()
        .setCustomId('task_new_description')
        .setLabel('New Task Description')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(task.description)
        .setRequired(true)
        .setMaxLength(200);

      // Format existing due date if available
      let dateValue = '';
      let timeValue = '';
      if (task.due_date) {
        const date = new Date(task.due_date);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear();
        dateValue = `${month}-${day}-${year}`;

        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const period = hours >= 12 ? 'PM' : 'AM';
        if (hours === 0) hours = 12;
        else if (hours > 12) hours -= 12;
        timeValue = `${hours}:${minutes} ${period}`;
      }

      const dateInput = new TextInputBuilder()
        .setCustomId('task_due_date')
        .setLabel('Due Date (MM-DD-YYYY)')
        .setStyle(TextInputStyle.Short)
        .setValue(dateValue)
        .setRequired(false)
        .setPlaceholder('10-03-2025');

      const timeInput = new TextInputBuilder()
        .setCustomId('task_due_time')
        .setLabel('Due Time (hh:mm AM/PM)')
        .setStyle(TextInputStyle.Short)
        .setValue(timeValue)
        .setRequired(false)
        .setPlaceholder('2:30 PM');

      const descRow = new ActionRowBuilder<TextInputBuilder>().addComponents(newDescriptionInput);
      const dateRow = new ActionRowBuilder<TextInputBuilder>().addComponents(dateInput);
      const timeRow = new ActionRowBuilder<TextInputBuilder>().addComponents(timeInput);

      modal.addComponents(descRow, dateRow, timeRow);
      await interaction.showModal(modal);
      return;
    }

    // Delete task
    if (customId.startsWith('task_delete_')) {
      const taskId = parseInt(customId.split('_')[2]);
      const deleted = await Task.deleteTask(taskId, guildId);
      // Check if already acknowledged before responding
      if (!interaction.deferred && !interaction.replied) {
        if (deleted) {
          await interaction.reply({
            content: `🗑️ Task #${taskId} has been deleted.`,
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: `❌ Task #${taskId} not found.`,
            ephemeral: true,
          });
        }
      } else {
        if (deleted) {
          await interaction.followUp({
            content: `🗑️ Task #${taskId} has been deleted.`,
            ephemeral: true,
          });
        } else {
          await interaction.followUp({
            content: `❌ Task #${taskId} not found.`,
            ephemeral: true,
          });
        }
      }
      return;
    }

    // List tasks
    if (
      customId === 'task_list_all' ||
      customId === 'task_list_pending' ||
      customId === 'task_refresh'
    ) {
      const filter = customId === 'task_list_pending' ? 'pending' : 'all';

      const tasks = await Task.getUserTasks(guildId, filter);

      if (tasks.length === 0) {
        const emptyEmbed = new EmbedBuilder()
          .setTitle(`📋 No ${filter === 'pending' ? 'Pending ' : ''}Tasks`)
          .setDescription(`You don't have any ${filter === 'pending' ? 'pending ' : ''}tasks.`)
          .setColor(0xffff00)
          .setTimestamp();

        await interaction.editReply({ embeds: [emptyEmbed], components: [] });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`📋 Your ${filter === 'pending' ? 'Pending ' : ''}Tasks`)
        .setColor(0x0099ff)
        .setTimestamp()
        .setFooter({ text: `Total: ${tasks.length} tasks` });

      const taskList = tasks
        .slice(0, 25)
        .map((task) => {
          const status = task.completed ? '✅' : '⏳';
          let description = `${status} **#${task.id}** - ${task.description}`;
          if (task.due_date) {
            const dueDate = new Date(task.due_date);
            description += `\n📅 Due: ${dueDate.toLocaleString()}`;
          }
          return description;
        })
        .join('\n\n');

      embed.setDescription(taskList);

      if (tasks.length > 25) {
        embed.addFields({ name: '📌 Note', value: `Showing 25 of ${tasks.length} tasks` });
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('task_list_all')
          .setLabel('All Tasks')
          .setStyle(filter === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji('📋'),
        new ButtonBuilder()
          .setCustomId('task_list_pending')
          .setLabel('Pending')
          .setStyle(filter === 'pending' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setEmoji('⏳'),
        new ButtonBuilder()
          .setCustomId('task_refresh')
          .setLabel('Refresh')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔄')
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
      return;
    }
  } catch (error) {
    await handleInteractionError(interaction, error, 'task button handler');
  }
}
