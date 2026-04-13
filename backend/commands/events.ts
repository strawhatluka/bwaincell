import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { logger } from '../shared/utils/logger';
import eventsService from '../utils/eventsService';
import EventConfig from '../../supabase/models/EventConfig';
import { getScheduler } from '../utils/scheduler';
import { getEventWindow, parseDayName } from '../utils/dateHelpers';
import config from '../config/config';

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

export default {
  data: new SlashCommandBuilder()
    .setName('events')
    .setDescription('Preview local events or change the weekly announcement schedule')
    .addStringOption((option) =>
      option
        .setName('day')
        .setDescription('Change announcement day (e.g., "Monday", "Friday")')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('time')
        .setDescription('Time (12-hour format, e.g., 2:30 PM)')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const userId = interaction.user.id;
    const guildId = interaction.guild?.id;

    if (!guildId) {
      await interaction.editReply({
        content: '❌ This command can only be used in a server.',
      });
      return;
    }

    const location = process.env.LOCATION_ZIP_CODE;
    const channelId = process.env.DEFAULT_REMINDER_CHANNEL;
    const timezone = config.settings.timezone;

    if (!location) {
      await interaction.editReply({
        content: '❌ No location configured. Set `LOCATION_ZIP_CODE` in environment variables.',
      });
      return;
    }

    if (!channelId) {
      await interaction.editReply({
        content:
          '❌ No announcement channel configured. Set `DEFAULT_REMINDER_CHANNEL` in environment variables.',
      });
      return;
    }

    const dayStr = interaction.options.getString('day');
    const timeStr = interaction.options.getString('time');

    try {
      // If day or time provided, update the schedule
      if (dayStr || timeStr) {
        // Validate inputs before touching DB
        let dayOfWeek: number | undefined;
        let hour: number | undefined;
        let minute: number | undefined;

        if (dayStr) {
          try {
            dayOfWeek = parseDayName(dayStr);
          } catch {
            await interaction.editReply({
              content: `❌ Invalid day: "${dayStr}". Use day names like "Monday", "Friday", etc.`,
            });
            return;
          }
        }

        if (timeStr) {
          const time24 = parseTimeToMilitaryFormat(timeStr);
          if (!time24) {
            await interaction.editReply({
              content: '❌ Invalid time format. Use 12-hour format (e.g., 2:30 PM).',
            });
            return;
          }
          const [h, m] = time24.split(':');
          hour = parseInt(h);
          minute = parseInt(m);
        }

        // Upsert config to database
        const updatedConfig = await EventConfig.upsertConfig(guildId, userId, location, channelId, {
          scheduleDay: dayOfWeek,
          scheduleHour: hour,
          scheduleMinute: minute,
          timezone,
          isEnabled: true,
        });

        // Update scheduler with new config
        const scheduler = getScheduler();
        if (scheduler) {
          await scheduler.addEventConfig(guildId);
        }

        // Build confirmation message from saved config
        // Use .get() to bypass Sequelize class field shadowing
        const configData = updatedConfig.get({ plain: true });
        const dayNames = [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ];
        const savedHour = configData.schedule_hour;
        const savedMinute = configData.schedule_minute;
        const displayHour = savedHour === 0 ? 12 : savedHour > 12 ? savedHour - 12 : savedHour;
        const displayPeriod = savedHour < 12 ? 'AM' : 'PM';
        const displayMinute = savedMinute.toString().padStart(2, '0');
        const scheduleDisplay = `${dayNames[configData.schedule_day]}s at ${displayHour}:${displayMinute} ${displayPeriod}`;
        const scheduleMsg = `✅ Schedule updated: ${scheduleDisplay}`;

        logger.info('Events schedule updated', { guildId, userId, dayStr, timeStr });

        await interaction.editReply({ content: scheduleMsg });
        return;
      }

      // No options provided - preview upcoming events
      await interaction.editReply({
        content: '🔍 Searching for local events... This may take a moment.',
      });

      const { start, end } = getEventWindow(timezone);
      const events = await eventsService.discoverLocalEvents(location, start, end);
      const embed = await eventsService.formatEventsForDiscord(events, location);

      embed.setFooter({
        text: `📍 ${location} | Powered by AI`,
      });

      await interaction.editReply({
        content: '',
        embeds: [embed],
      });

      logger.info('Events preview generated', {
        guildId,
        userId,
        location,
        eventCount: events.length,
      });
    } catch (error) {
      logger.error('Error executing /events command', {
        guildId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await interaction.editReply({
        content: '❌ Failed to fetch events. Please try again later.',
      });
    }
  },
};
