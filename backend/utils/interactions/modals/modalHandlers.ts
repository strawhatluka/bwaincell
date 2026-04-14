import {
  ModalSubmitInteraction,
  CacheType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { getModels } from '../helpers/databaseHelper';
import { handleInteractionError } from '../responses/errorResponses';
import { logger } from '@shared/utils/logger';
import { getScheduler } from '../../scheduler';
import { handleRecipeModal } from '../handlers/recipeHandlers';

// Parse date in MM-DD-YYYY hh:mm AM/PM format
function parseDateString(dateStr: string): Date | null {
  // Match MM-DD-YYYY hh:mm AM/PM format
  const match = dateStr
    .trim()
    .match(/^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);

  if (!match) return null;

  const month = parseInt(match[1]);
  const day = parseInt(match[2]);
  const year = parseInt(match[3]);
  let hours = parseInt(match[4]);
  const minutes = parseInt(match[5]);
  const period = match[6].toUpperCase();

  // Validate ranges
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (hours < 1 || hours > 12) return null;
  if (minutes < 0 || minutes > 59) return null;

  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  const date = new Date(year, month - 1, day, hours, minutes);

  // Check if date is valid
  if (isNaN(date.getTime())) return null;

  return date;
}

// Convert 12-hour time format to 24-hour format
function parseTimeToMilitaryFormat(timeStr: string): string | null {
  const time = timeStr.trim();

  // Check for 12-hour format (e.g., "2:30 PM", "2:30PM", "2:30 pm")
  const twelveHourMatch = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (twelveHourMatch) {
    let hours = parseInt(twelveHourMatch[1]);
    const minutes = twelveHourMatch[2];
    const period = twelveHourMatch[3].toUpperCase();

    if (hours < 1 || hours > 12) return null;
    if (parseInt(minutes) < 0 || parseInt(minutes) > 59) return null;

    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  return null;
}

// Convert 24-hour time format to 12-hour format for display
function formatTimeTo12Hour(time24: string): string {
  const [hoursStr, minutes] = time24.split(':');
  let hours = parseInt(hoursStr);
  const period = hours >= 12 ? 'PM' : 'AM';

  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours -= 12;
  }

  return `${hours}:${minutes} ${period}`;
}

export async function handleModalSubmit(
  interaction: ModalSubmitInteraction<CacheType>
): Promise<void> {
  const customId = interaction.customId;
  const userId = interaction.user.id;
  const guildId = interaction.guild?.id;

  if (!guildId) {
    logger.warn('Modal submit attempted outside of guild', { userId, customId });
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }

  // Note: Interaction already deferred by bot.js - no need to defer here

  // Route recipe plan modals to dedicated handler
  if (customId.startsWith('recipe_plan_')) {
    try {
      await handleRecipeModal(interaction);
    } catch (error) {
      return handleInteractionError(interaction, error, 'recipe modal');
    }
    return;
  }

  const { Task, List, Reminder } = await getModels();

  // Import config to get default reminder channel
  const config = await import('../../../config/config');
  // Use configured announcement channel, fall back to interaction channel if not set
  const channelId = config.default.settings.defaultReminderChannel || interaction.channel?.id;

  try {
    // Add task modal
    if (customId === 'task_add_modal') {
      const description = interaction.fields.getTextInputValue('task_description');
      const dateStr = interaction.fields.getTextInputValue('task_due_date');
      const timeStr = interaction.fields.getTextInputValue('task_due_time');
      let dueDate: Date | undefined = undefined;

      // If both date and time are provided, combine them
      if (dateStr && dateStr.trim() && timeStr && timeStr.trim()) {
        const combined = `${dateStr.trim()} ${timeStr.trim()}`;
        const parsed = parseDateString(combined);
        if (!parsed) {
          await interaction.editReply({
            content:
              '❌ Invalid date/time format. Use MM-DD-YYYY for date and hh:mm AM/PM for time.',
          });
          return;
        }
        dueDate = parsed;
      } else if (dateStr && dateStr.trim()) {
        // Only date provided - error
        await interaction.editReply({
          content: '❌ Please provide both date and time, or leave both empty.',
        });
        return;
      } else if (timeStr && timeStr.trim()) {
        // Only time provided - error
        await interaction.editReply({
          content: '❌ Please provide both date and time, or leave both empty.',
        });
        return;
      }

      const task = await Task.createTask(guildId, description, dueDate, userId);

      const embed = new EmbedBuilder()
        .setTitle('✨ Task Created')
        .setDescription(`Task #${task.id}: ${task.description}`)
        .setColor(0x00ff00)
        .setTimestamp();

      if (dueDate) {
        embed.addFields({
          name: '📅 Due Date',
          value: dueDate.toLocaleString(),
        });
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`task_done_${task.id}`)
          .setLabel('Mark as Done')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId('task_list_all')
          .setLabel('View All Tasks')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📋')
      );

      await interaction.followUp({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });
      return;
    }

    // Edit task modal
    if (customId.startsWith('task_edit_modal_')) {
      const taskId = parseInt(customId.split('_')[3]);
      const newDescription = interaction.fields.getTextInputValue('task_new_description');
      const dateStr = interaction.fields.getTextInputValue('task_due_date');
      const timeStr = interaction.fields.getTextInputValue('task_due_time');

      let dueDate: Date | null | undefined = undefined;

      // If both date and time are provided, combine them
      if (dateStr && dateStr.trim() && timeStr && timeStr.trim()) {
        const combined = `${dateStr.trim()} ${timeStr.trim()}`;
        dueDate = parseDateString(combined);
        if (!dueDate) {
          await interaction.editReply({
            content:
              '❌ Invalid date/time format. Use MM-DD-YYYY for date and hh:mm AM/PM for time.',
          });
          return;
        }
      } else if (dateStr && dateStr.trim()) {
        // Only date provided - error
        await interaction.editReply({
          content: '❌ Please provide both date and time, or leave both empty.',
        });
        return;
      } else if (timeStr && timeStr.trim()) {
        // Only time provided - error
        await interaction.editReply({
          content: '❌ Please provide both date and time, or leave both empty.',
        });
        return;
      } else {
        // Both empty - clear the due date
        dueDate = null;
      }

      const task = await Task.editTask(taskId, guildId, newDescription, dueDate);

      if (task) {
        const embed = new EmbedBuilder()
          .setTitle('✏️ Task Updated')
          .setDescription(`Task #${task.id}: ${task.description}`)
          .setColor(0x0099ff)
          .setTimestamp();

        if (task.due_date) {
          embed.addFields({
            name: '📅 Due Date',
            value: new Date(task.due_date).toLocaleString(),
            inline: true,
          });
        }

        await interaction.followUp({
          embeds: [embed],
          ephemeral: true,
        });
      } else {
        await interaction.followUp({
          content: `❌ Task #${taskId} not found or doesn't belong to you.`,
          ephemeral: true,
        });
      }
      return;
    }

    // Add list item modal
    if (customId.startsWith('list_add_item_modal_')) {
      const listName = decodeURIComponent(customId.replace('list_add_item_modal_', ''));
      const item = interaction.fields.getTextInputValue('list_item');

      const updated = await List.addItem(guildId, listName, item);

      if (updated) {
        await interaction.editReply({
          content: `✅ Added "${item}" to "${listName}"!`,
        });
      } else {
        await interaction.editReply({
          content: `❌ Could not add item. List "${listName}" may not exist.`,
        });
      }
      return;
    }

    // Daily reminder modal
    if (customId === 'modal_reminder_daily') {
      if (!channelId) {
        await interaction.editReply({ content: '❌ Unable to determine channel ID.' });
        return;
      }

      const message = interaction.fields.getTextInputValue('reminder_message');
      const timeInput = interaction.fields.getTextInputValue('reminder_time');

      const time = parseTimeToMilitaryFormat(timeInput);
      if (!time) {
        await interaction.editReply({
          content: '❌ Invalid time format. Use 12-hour format (e.g., 2:30 PM).',
        });
        return;
      }

      const reminder = await Reminder.createReminder(
        guildId,
        channelId,
        message,
        time,
        'daily',
        null,
        userId
      );

      // Add reminder to scheduler
      const scheduler = getScheduler();
      if (scheduler) {
        await scheduler.addReminder(reminder.id);
      }

      const embed = new EmbedBuilder()
        .setTitle('⏰ Daily Reminder Set')
        .setDescription(`I'll remind you daily: **"${message}"**`)
        .addFields(
          { name: '🕐 Time', value: formatTimeTo12Hour(time), inline: true },
          { name: '🔄 Frequency', value: 'Daily', inline: true },
          { name: '⏱️ Next Trigger', value: reminder.next_trigger?.toLocaleString() || 'N/A' }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Weekly reminder modal
    if (customId === 'modal_reminder_weekly') {
      if (!channelId) {
        await interaction.editReply({ content: '❌ Unable to determine channel ID.' });
        return;
      }

      const message = interaction.fields.getTextInputValue('reminder_message');
      const dayStr = interaction.fields.getTextInputValue('reminder_day');
      const timeInput = interaction.fields.getTextInputValue('reminder_time');

      const dayOfWeek = parseInt(dayStr);
      if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        await interaction.editReply({ content: '❌ Invalid day. Use 0-6 (0=Sunday, 6=Saturday).' });
        return;
      }

      const time = parseTimeToMilitaryFormat(timeInput);
      if (!time) {
        await interaction.editReply({
          content: '❌ Invalid time format. Use 12-hour format (e.g., 2:30 PM).',
        });
        return;
      }

      const reminder = await Reminder.createReminder(
        guildId,
        channelId,
        message,
        time,
        'weekly',
        dayOfWeek,
        userId
      );

      // Add reminder to scheduler
      const scheduler = getScheduler();
      if (scheduler) {
        await scheduler.addReminder(reminder.id);
      }

      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      const embed = new EmbedBuilder()
        .setTitle('⏰ Weekly Reminder Set')
        .setDescription(`I'll remind you weekly: **"${message}"**`)
        .addFields(
          { name: '📅 Day', value: dayNames[dayOfWeek], inline: true },
          { name: '🕐 Time', value: formatTimeTo12Hour(time), inline: true },
          { name: '🔄 Frequency', value: 'Weekly', inline: true },
          { name: '⏱️ Next Trigger', value: reminder.next_trigger?.toLocaleString() || 'N/A' }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // One-time reminder modal
    if (customId === 'modal_reminder_once') {
      if (!channelId) {
        await interaction.editReply({ content: '❌ Unable to determine channel ID.' });
        return;
      }

      const message = interaction.fields.getTextInputValue('reminder_message');
      const timeInput = interaction.fields.getTextInputValue('reminder_time');

      const time = parseTimeToMilitaryFormat(timeInput);
      if (!time) {
        await interaction.editReply({
          content: '❌ Invalid time format. Use 12-hour format (e.g., 2:30 PM).',
        });
        return;
      }

      const reminder = await Reminder.createReminder(
        guildId,
        channelId,
        message,
        time,
        'once',
        null,
        userId
      );

      // Add reminder to scheduler
      const scheduler = getScheduler();
      if (scheduler) {
        await scheduler.addReminder(reminder.id);
      }

      const embed = new EmbedBuilder()
        .setTitle('⏰ One-Time Reminder Set')
        .setDescription(`I'll remind you once: **"${message}"**`)
        .addFields(
          { name: '🕐 Time', value: formatTimeTo12Hour(time), inline: true },
          { name: '🔄 Frequency', value: 'Once', inline: true },
          { name: '⏱️ Trigger Time', value: reminder.next_trigger?.toLocaleString() || 'N/A' }
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }
  } catch (error) {
    await handleInteractionError(interaction, error, 'modal submit handler');
  }
}
