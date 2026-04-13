import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from 'discord.js';
import { DateTime } from 'luxon';
import { logger } from '../shared/utils/logger';
import Schedule from '../../supabase/models/Schedule';
import config from '../config/config';

interface ScheduleEvent {
  id: number;
  user_id: string;
  guild_id: string;
  event: string;
  date: string; // DATEONLY format (MM-DD-YYYY)
  time: string; // HH:MM format
  description?: string | null;
  created_at: Date;
}

interface CountdownResult {
  event: Schedule;
  timeLeft: string;
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

// Convert YYYY-MM-DD format to MM-DD-YYYY for display
function formatDateForDisplay(dateStr: string): string {
  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${month.padStart(2, '0')}-${day.padStart(2, '0')}-${year}`;
  }
  return dateStr; // Return as-is if format is unexpected
}

export default {
  data: new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Manage your schedule')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Schedule an event')
        .addStringOption((option) =>
          option.setName('event').setDescription('Event name').setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('date').setDescription('Date (MM-DD-YYYY)').setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('time')
            .setDescription('Time (12-hour format, e.g., 2:30 PM)')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('description').setDescription('Event description').setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('Show events')
        .addStringOption((option) =>
          option
            .setName('filter')
            .setDescription('Filter events')
            .setRequired(false)
            .addChoices(
              { name: 'Upcoming', value: 'upcoming' },
              { name: 'Past', value: 'past' },
              { name: 'All', value: 'all' }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('delete')
        .setDescription('Remove an event')
        .addIntegerOption((option) =>
          option.setName('event_id').setDescription('Event ID to delete').setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('countdown')
        .setDescription('Show countdown to an event')
        .addStringOption((option) =>
          option
            .setName('event')
            .setDescription('Event name (partial match)')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('today').setDescription("Show today's events")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('week').setDescription("Show this week's events")
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // Note: Interaction is already deferred by bot.js for immediate acknowledgment

    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild?.id;

    if (!guildId) {
      await interaction.editReply({
        content: 'This command can only be used in a server.',
      });
      return;
    }

    try {
      switch (subcommand) {
        case 'add': {
          const event = interaction.options.getString('event', true);
          const dateInput = interaction.options.getString('date', true);
          const timeStr = interaction.options.getString('time', true);
          const description = interaction.options.getString('description');

          // Parse MM-DD-YYYY format
          const dateMatch = dateInput.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
          if (!dateMatch) {
            await interaction.editReply({
              content: '❌ Invalid date format. Use MM-DD-YYYY (e.g., 01-20-2026).',
            });
            return;
          }

          const [, month, day, year] = dateMatch;

          // Validate date components
          const monthNum = parseInt(month);
          const dayNum = parseInt(day);

          if (monthNum < 1 || monthNum > 12) {
            await interaction.editReply({
              content: '❌ Invalid month. Must be between 1 and 12.',
            });
            return;
          }

          if (dayNum < 1 || dayNum > 31) {
            await interaction.editReply({
              content: '❌ Invalid day. Must be between 1 and 31.',
            });
            return;
          }

          // Convert to YYYY-MM-DD for database storage (for proper sorting)
          const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

          const time24 = parseTimeToMilitaryFormat(timeStr);
          if (!time24) {
            await interaction.editReply({
              content: '❌ Invalid time format. Use 12-hour format (e.g., 2:30 PM).',
            });
            return;
          }

          const eventDate = new Date(`${dateStr} ${time24}`);
          if (isNaN(eventDate.getTime())) {
            await interaction.editReply({
              content: 'Invalid date or time.',
            });
            return;
          }

          await Schedule.addEvent(guildId, event, dateStr, time24, description, userId);

          const embed = new EmbedBuilder()
            .setTitle('Event Scheduled')
            .setDescription(`📅 **${event}**`)
            .addFields(
              { name: 'Date', value: dateInput, inline: true },
              { name: 'Time', value: timeStr, inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

          if (description) {
            embed.addFields({ name: 'Description', value: description });
          }

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'list': {
          const filter = interaction.options.getString('filter') || 'upcoming';
          const events = await Schedule.getEvents(guildId, filter as 'upcoming' | 'past' | 'all');

          if (events.length === 0) {
            await interaction.editReply({
              content: `No ${filter} events found.`,
            });
            return;
          }

          const embed = new EmbedBuilder()
            .setTitle(`Your ${filter.charAt(0).toUpperCase() + filter.slice(1)} Events`)
            .setColor(0x0099ff)
            .setTimestamp();

          const eventList = events
            .slice(0, 10)
            .map((event) => {
              const desc = event.description ? `\n   📝 ${event.description}` : '';
              return `**#${event.id}** - ${event.event}\n   📅 ${formatDateForDisplay(event.date)} at ${formatTimeTo12Hour(event.time)}${desc}`;
            })
            .join('\n\n');

          embed.setDescription(eventList);

          if (events.length > 10) {
            embed.setFooter({ text: `Showing 10 of ${events.length} events` });
          }

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'delete': {
          const eventId = interaction.options.getInteger('event_id', true);
          const deleted: boolean = await Schedule.deleteEvent(eventId, guildId);

          if (!deleted) {
            await interaction.editReply({
              content: `Event #${eventId} not found or doesn't belong to you.`,
            });
            return;
          }

          await interaction.editReply({
            content: `Event #${eventId} has been deleted.`,
          });
          break;
        }

        case 'countdown': {
          const eventName = interaction.options.getString('event', true);
          const result: CountdownResult | null = await Schedule.getCountdown(guildId, eventName);

          if (!result) {
            await interaction.editReply({
              content: `No event found matching "${eventName}".`,
            });
            return;
          }

          const embed = new EmbedBuilder()
            .setTitle('⏳ Countdown')
            .setDescription(`**${result.event.event}**`)
            .addFields(
              { name: 'Date', value: formatDateForDisplay(result.event.date), inline: true },
              { name: 'Time', value: formatTimeTo12Hour(result.event.time), inline: true },
              { name: 'Time Remaining', value: result.timeLeft }
            )
            .setColor(0x9932cc)
            .setTimestamp();

          if (result.event.description) {
            embed.addFields({ name: 'Description', value: result.event.description });
          }

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'today': {
          const events = await Schedule.getTodaysEvents(guildId);

          if (events.length === 0) {
            await interaction.editReply({
              content: 'No events scheduled for today.',
            });
            return;
          }

          const embed = new EmbedBuilder()
            .setTitle("Today's Events")
            .setColor(0x0099ff)
            .setTimestamp();

          const eventList = events
            .map((event) => {
              const desc = event.description ? `\n   📝 ${event.description}` : '';
              return `⏰ **${formatTimeTo12Hour(event.time)}** - ${event.event}${desc}`;
            })
            .join('\n\n');

          embed.setDescription(eventList);
          embed.setFooter({ text: `${events.length} event(s) today` });

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'week': {
          const events = await Schedule.getUpcomingEvents(guildId, 7);

          if (events.length === 0) {
            await interaction.editReply({
              content: 'No events scheduled for the next 7 days.',
            });
            return;
          }

          const embed = new EmbedBuilder()
            .setTitle("This Week's Events")
            .setColor(0x0099ff)
            .setTimestamp();

          const eventsByDate: Record<string, ScheduleEvent[]> = {};
          events.forEach((event) => {
            if (!eventsByDate[event.date]) {
              eventsByDate[event.date] = [];
            }
            eventsByDate[event.date].push(event);
          });

          const eventList = Object.entries(eventsByDate)
            .map(([date, dayEvents]) => {
              // Parse date in configured timezone to get correct day of week
              const dateObj = DateTime.fromISO(date, { zone: config.settings.timezone });
              const dayName = dateObj.toFormat('EEEE'); // Full weekday name
              const eventDetails = dayEvents
                .map((e) => `  • ${formatTimeTo12Hour(e.time)} - ${e.event}`)
                .join('\n');
              return `**${dayName}, ${formatDateForDisplay(date)}**\n${eventDetails}`;
            })
            .join('\n\n');

          embed.setDescription(eventList);
          embed.setFooter({ text: `${events.length} event(s) this week` });

          await interaction.editReply({ embeds: [embed] });
          break;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('Error in schedule command', {
        command: interaction.commandName,
        subcommand,
        error: errorMessage,
        stack: errorStack,
        userId: interaction.user.id,
        guildId: interaction.guild?.id,
      });

      const replyMessage = {
        content: 'An error occurred while processing your request.',
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyMessage);
      } else {
        await interaction.editReply(replyMessage);
      }
    }
  },

  async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const guildId = interaction.guild?.id;

    if (!guildId) {
      await interaction.respond([]);
      return;
    }

    try {
      if (focused.name === 'event') {
        // Get all upcoming events for autocomplete
        const events = await Schedule.getEvents(guildId, 'upcoming');

        // Create choices with event names
        const choices = events
          .slice(0, 25) // Discord limits to 25 choices
          .map((event) => ({
            name: `${event.event} (${formatDateForDisplay(event.date)} at ${formatTimeTo12Hour(event.time)})`,
            value: event.event,
          }));

        // Filter based on what user typed
        const filtered = choices.filter((choice) =>
          choice.value.toLowerCase().includes(focused.value.toLowerCase())
        );

        await interaction.respond(filtered);
      }
    } catch (error) {
      logger.error('Error in schedule autocomplete', {
        error: error instanceof Error ? error.message : 'Unknown error',
        guildId,
      });
      await interaction.respond([]);
    }
  },
};
