import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { DateTime } from 'luxon';
import { logger } from '../shared/utils/logger';
import SunsetConfig from '../../supabase/models/SunsetConfig';
import { getScheduler } from '../utils/scheduler';
import { getCoordinatesFromZip, getSunsetTime } from '../utils/sunsetService';
import config from '../config/config';

export default {
  data: new SlashCommandBuilder()
    .setName('sunset')
    .setDescription('Manage daily sunset announcements')
    .addSubcommand((subcommand) =>
      subcommand.setName('enable').setDescription('Enable daily sunset announcements')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('disable').setDescription('Disable sunset announcements')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set')
        .setDescription('Set how many minutes before sunset to announce')
        .addIntegerOption((option) =>
          option
            .setName('minutes')
            .setDescription('Minutes before sunset (1-120)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(120)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('status').setDescription('Show current sunset config and next sunset time')
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild?.id;

    if (!guildId) {
      await interaction.editReply({
        content: '❌ This command can only be used in a server.',
      });
      return;
    }

    const channelId = process.env.DEFAULT_REMINDER_CHANNEL;
    const zipCode = process.env.LOCATION_ZIP_CODE;
    const timezone = config.settings.timezone;

    try {
      switch (subcommand) {
        case 'enable': {
          if (!zipCode) {
            await interaction.editReply({
              content:
                '❌ No location configured. Set `LOCATION_ZIP_CODE` in environment variables.',
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

          // Validate ZIP code by attempting coordinate lookup
          try {
            await getCoordinatesFromZip(zipCode);
          } catch {
            await interaction.editReply({
              content: `❌ Invalid ZIP code: ${zipCode}. Check your \`LOCATION_ZIP_CODE\` setting.`,
            });
            return;
          }

          await SunsetConfig.upsertConfig(guildId, userId, channelId, zipCode, {
            timezone,
            isEnabled: true,
          });

          // Add to scheduler
          const scheduler = getScheduler();
          if (scheduler) {
            await scheduler.addSunsetConfig(guildId);
          }

          const embed = new EmbedBuilder()
            .setTitle('🌅 Sunset Announcements Enabled')
            .setDescription(
              'You will receive daily sunset announcements in the configured channel.'
            )
            .addFields(
              { name: '📍 ZIP Code', value: zipCode, inline: true },
              { name: '🕐 Advance Notice', value: '60 minutes', inline: true },
              { name: '📺 Channel', value: `<#${channelId}>`, inline: true }
            )
            .setColor(0xff6b35)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });

          logger.info('Sunset announcements enabled', { guildId, userId, zipCode });
          break;
        }

        case 'disable': {
          const result = await SunsetConfig.toggleEnabled(guildId, false);

          if (!result) {
            await interaction.editReply({
              content: '❌ No sunset configuration found. Use `/sunset enable` first.',
            });
            return;
          }

          // Remove from scheduler
          const scheduler = getScheduler();
          if (scheduler) {
            scheduler.removeSunsetConfig(guildId);
          }

          const embed = new EmbedBuilder()
            .setTitle('🌅 Sunset Announcements Disabled')
            .setDescription('Daily sunset announcements have been turned off.')
            .setColor(0xff0000)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });

          logger.info('Sunset announcements disabled', { guildId, userId });
          break;
        }

        case 'set': {
          const minutes = interaction.options.getInteger('minutes', true);

          const result = await SunsetConfig.updateAdvanceMinutes(guildId, minutes);

          if (!result) {
            await interaction.editReply({
              content: '❌ No sunset configuration found. Use `/sunset enable` first.',
            });
            return;
          }

          // Refresh scheduler with new config
          const scheduler = getScheduler();
          if (scheduler) {
            await scheduler.addSunsetConfig(guildId);
          }

          const embed = new EmbedBuilder()
            .setTitle('🌅 Sunset Advance Notice Updated')
            .setDescription(`Announcements will now be sent **${minutes} minutes** before sunset.`)
            .setColor(0xff6b35)
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });

          logger.info('Sunset advance minutes updated', { guildId, userId, minutes });
          break;
        }

        case 'status': {
          const existingConfig = await SunsetConfig.getGuildConfig(guildId);

          if (!existingConfig) {
            await interaction.editReply({
              content: '❌ No sunset configuration found. Use `/sunset enable` to get started.',
            });
            return;
          }

          const configData = existingConfig.get({ plain: true });

          // Try to fetch today's sunset time
          let sunsetDisplay = 'Unable to fetch';
          let countdownDisplay = 'N/A';

          try {
            const coords = await getCoordinatesFromZip(configData.zip_code);
            const sunsetTime = await getSunsetTime(coords.lat, coords.lng);
            const sunsetLocal = DateTime.fromJSDate(sunsetTime).setZone(configData.timezone);
            sunsetDisplay = sunsetLocal.toFormat('h:mm a');

            const now = DateTime.now().setZone(configData.timezone);
            const diff = sunsetLocal.diff(now, ['hours', 'minutes']);

            if (diff.hours >= 0 && diff.minutes >= 0) {
              const h = Math.floor(diff.hours);
              const m = Math.floor(diff.minutes);
              countdownDisplay = h > 0 ? `${h}h ${m}m` : `${m}m`;
            } else {
              countdownDisplay = 'Already passed today';
            }
          } catch {
            logger.warn('Could not fetch sunset time for status command', {
              guildId,
              zipCode: configData.zip_code,
            });
          }

          const embed = new EmbedBuilder()
            .setTitle('🌅 Sunset Configuration')
            .addFields(
              {
                name: '📊 Status',
                value: configData.is_enabled ? '✅ Enabled' : '❌ Disabled',
                inline: true,
              },
              {
                name: '📍 ZIP Code',
                value: configData.zip_code,
                inline: true,
              },
              {
                name: '🕐 Advance Notice',
                value: `${configData.advance_minutes} minutes`,
                inline: true,
              },
              {
                name: "🌅 Today's Sunset",
                value: sunsetDisplay,
                inline: true,
              },
              {
                name: '⏱️ Countdown',
                value: countdownDisplay,
                inline: true,
              },
              {
                name: '📺 Channel',
                value: `<#${configData.channel_id}>`,
                inline: true,
              }
            )
            .setColor(configData.is_enabled ? 0xff6b35 : 0x808080)
            .setTimestamp();

          if (configData.last_announcement) {
            const lastAnnounceDt = DateTime.fromJSDate(
              new Date(configData.last_announcement)
            ).setZone(configData.timezone);
            embed.addFields({
              name: '📅 Last Announcement',
              value: lastAnnounceDt.toLocaleString(DateTime.DATETIME_FULL),
            });
          }

          await interaction.editReply({ embeds: [embed] });
          break;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('Error in sunset command', {
        command: interaction.commandName,
        subcommand,
        error: errorMessage,
        stack: errorStack,
        userId: interaction.user.id,
        guildId: interaction.guild?.id,
      });

      const replyMessage = {
        content: '❌ An error occurred while processing your request.',
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyMessage);
      } else {
        await interaction.editReply(replyMessage);
      }
    }
  },
};
