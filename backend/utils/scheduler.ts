/* eslint-disable @typescript-eslint/no-explicit-any */
import * as cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';
import { logger } from '../shared/utils/logger';

interface SchedulerJob {
  id: string;
  task: cron.ScheduledTask;
}

class Scheduler {
  private static instance: Scheduler | null = null;
  private jobs: Map<string, SchedulerJob> = new Map();
  private client: Client;

  private constructor(client: Client) {
    this.client = client;
  }

  static getInstance(client?: Client): Scheduler | null {
    if (!Scheduler.instance && client) {
      Scheduler.instance = new Scheduler(client);
    }
    return Scheduler.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Dynamically import models to avoid initialization issues
      const { Reminder, EventConfig, SunsetConfig } = await import('../../supabase');

      await this.loadReminders(Reminder);
      await this.loadEventConfigs(EventConfig);
      await this.scheduleDailyQuestions(EventConfig);
      await this.loadSunsetConfigs(SunsetConfig);
      logger.info('Scheduler initialized successfully');
    } catch (error) {
      logger.error('Scheduler initialization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  private async loadReminders(Reminder: any): Promise<void> {
    if (!Reminder || !Reminder.getActiveReminders) {
      logger.warn('Reminder model not properly initialized, skipping scheduler setup');
      return;
    }

    try {
      const reminders = await Reminder.getActiveReminders();
      for (const reminder of reminders) {
        this.scheduleReminder(reminder, Reminder);
      }
    } catch (error) {
      logger.error('Failed to load reminders', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private scheduleReminder(reminder: any, Reminder: any): void {
    // Handle one-time reminders differently
    if (reminder.frequency === 'once') {
      this.scheduleOneTimeReminder(reminder, Reminder);
      return;
    }

    const cronExpression = this.getCronExpression(reminder);
    if (!cronExpression) return;

    const task = cron.schedule(cronExpression, async () => {
      await this.executeReminder(reminder, Reminder);
    });

    this.jobs.set(`reminder_${reminder.id}`, {
      id: `reminder_${reminder.id}`,
      task,
    });

    logger.info('Reminder scheduled', {
      reminderId: reminder.id,
      cronExpression,
      message: reminder.message,
      time: reminder.time,
      frequency: reminder.frequency,
    });
  }

  private scheduleOneTimeReminder(reminder: any, Reminder: any): void {
    if (!reminder.time || !reminder.next_trigger) {
      logger.warn('One-time reminder missing time or next_trigger', { reminderId: reminder.id });
      return;
    }

    const now = new Date();
    const triggerTime = new Date(reminder.next_trigger);
    const delay = triggerTime.getTime() - now.getTime();

    if (delay <= 0) {
      logger.warn('One-time reminder trigger time has already passed', {
        reminderId: reminder.id,
        triggerTime: triggerTime.toISOString(),
        now: now.toISOString(),
      });
      return;
    }

    // Schedule a one-time timeout
    const timeoutId = setTimeout(async () => {
      await this.executeReminder(reminder, Reminder);

      // Delete the reminder after execution since it's one-time
      if (Reminder && Reminder.deleteReminder) {
        await Reminder.deleteReminder(reminder.id, reminder.guild_id);
        logger.info('One-time reminder deleted after execution', {
          reminderId: reminder.id,
          message: reminder.message,
        });
      }

      // Remove from jobs map
      this.jobs.delete(`reminder_${reminder.id}`);
    }, delay);

    // Store the timeout so we can cancel it if needed
    this.jobs.set(`reminder_${reminder.id}`, {
      id: `reminder_${reminder.id}`,
      task: {
        stop: () => clearTimeout(timeoutId),
      } as any,
    });

    logger.info('One-time reminder scheduled', {
      reminderId: reminder.id,
      message: reminder.message,
      triggerTime: triggerTime.toISOString(),
      delayMs: delay,
    });
  }

  // Public method to add a new reminder to the scheduler
  async addReminder(reminderId: number): Promise<void> {
    try {
      const { Reminder, supabase } = await import('../../supabase');
      const { data: reminder } = (await supabase
        .from('reminders')
        .select('*')
        .eq('id', reminderId)
        .single()) as { data: any };

      if (reminder) {
        this.scheduleReminder(reminder, Reminder);
      }
    } catch (error) {
      logger.error('Failed to add reminder to scheduler', {
        reminderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private getCronExpression(reminder: any): string | null {
    if (!reminder.time) {
      logger.warn('Reminder has no time set', { reminderId: reminder.id });
      return null;
    }

    const [hours, minutes] = reminder.time.split(':');

    switch (reminder.frequency) {
      case 'daily':
        return `${minutes} ${hours} * * *`;
      case 'weekly':
        return `${minutes} ${hours} * * ${reminder.day_of_week}`;
      case 'monthly':
        if (reminder.day_of_month) {
          return `${minutes} ${hours} ${reminder.day_of_month} * *`;
        }
        return null;
      case 'yearly':
        if (reminder.month && reminder.day_of_month) {
          return `${minutes} ${hours} ${reminder.day_of_month} ${reminder.month} *`;
        }
        return null;
      case 'once':
        return null; // Handle differently
      default:
        return null;
    }
  }

  private async executeReminder(reminder: any, Reminder: any): Promise<void> {
    try {
      logger.info('Attempting to execute reminder', {
        reminderId: reminder.id,
        channelId: reminder.channel_id,
        userId: reminder.user_id,
        message: reminder.message,
      });

      const channel = await this.client.channels.fetch(reminder.channel_id);

      logger.info('Channel fetched', {
        reminderId: reminder.id,
        channelId: reminder.channel_id,
        channelType: channel?.type,
        isTextChannel: channel instanceof TextChannel,
      });

      if (channel && channel instanceof TextChannel) {
        await channel.send(`<@${reminder.user_id}> ⏰ Reminder: **${reminder.message}**`);
        logger.info('Reminder executed successfully', {
          reminderId: reminder.id,
          userId: reminder.user_id,
          message: reminder.message,
          channelId: reminder.channel_id,
        });
      } else {
        logger.warn('Reminder channel not found or not a text channel', {
          reminderId: reminder.id,
          channelId: reminder.channel_id,
          channelType: channel?.type,
          channelExists: !!channel,
        });
      }

      if (Reminder && Reminder.updateNextTrigger && reminder.frequency !== 'once') {
        await Reminder.updateNextTrigger(reminder.id);
      }
    } catch (error) {
      logger.error('Failed to execute reminder', {
        reminderId: reminder.id,
        channelId: reminder.channel_id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  // ============================================================================
  // Event Announcement Scheduling
  // ============================================================================

  private async loadEventConfigs(EventConfig: any): Promise<void> {
    if (!EventConfig || !EventConfig.getEnabledConfigs) {
      logger.warn('EventConfig model not properly initialized, skipping event scheduler setup');
      return;
    }

    try {
      const configs = await EventConfig.getEnabledConfigs();
      for (const config of configs) {
        this.scheduleEventAnnouncement(config);
      }
      logger.info('Event announcements scheduled', { count: configs.length });
    } catch (error) {
      logger.error('Failed to load event configurations', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private scheduleEventAnnouncement(config: any): void {
    try {
      // Dynamically import to avoid circular dependencies
      const { buildCronExpression } = require('./dateHelpers');

      const cronExpression = buildCronExpression(
        config.schedule_minute,
        config.schedule_hour,
        config.schedule_day
      );

      const task = cron.schedule(
        cronExpression,
        async () => {
          await this.executeEventAnnouncement(config.guild_id);
        },
        {
          timezone: config.timezone,
        }
      );

      this.jobs.set(`events_${config.guild_id}`, {
        id: `events_${config.guild_id}`,
        task,
      });

      logger.info('Event announcement scheduled', {
        guildId: config.guild_id,
        cronExpression,
        timezone: config.timezone,
        location: config.location,
      });
    } catch (error) {
      logger.error('Failed to schedule event announcement', {
        guildId: config.guild_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async executeEventAnnouncement(guildId: string): Promise<void> {
    try {
      // Dynamically import to avoid circular dependencies
      const { EventConfig } = await import('../../supabase');
      const eventsService = (await import('./eventsService')).default;
      const { getEventWindow } = await import('./dateHelpers');

      logger.info('Executing event announcement', { guildId });

      // Fetch current configuration
      const config = await EventConfig.getGuildConfig(guildId);

      if (!config || !config.is_enabled) {
        logger.warn('Event config not found or disabled', { guildId });
        return;
      }

      // Calculate event window
      const { start, end } = getEventWindow(config.timezone);

      // Discover events
      const events = await eventsService.discoverLocalEvents(config.location, start, end);

      // Format embed
      const embed = await eventsService.formatEventsForDiscord(events, config.location);

      // Fetch channel and send
      const channel = await this.client.channels.fetch(config.announcement_channel_id);

      if (channel && 'send' in channel) {
        await channel.send({ embeds: [embed] });

        // Update last announcement timestamp
        await EventConfig.updateLastAnnouncement(guildId);

        logger.info('Event announcement sent successfully', {
          guildId,
          location: config.location,
          eventCount: events.length,
          channelId: config.announcement_channel_id,
        });
      } else {
        logger.warn('Event announcement channel not found or invalid', {
          guildId,
          channelId: config.announcement_channel_id,
        });
      }
    } catch (error) {
      logger.error('Failed to execute event announcement', {
        guildId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  // Public method to add a new event config to the scheduler
  async addEventConfig(guildId: string): Promise<void> {
    try {
      const { EventConfig } = await import('../../supabase');
      const config = await EventConfig.getGuildConfig(guildId);

      if (config && config.is_enabled) {
        // Remove existing job if present
        this.removeEventConfig(guildId);

        // Schedule new job
        this.scheduleEventAnnouncement(config);
      }
    } catch (error) {
      logger.error('Failed to add event config to scheduler', {
        guildId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Public method to remove an event config from scheduler
  removeEventConfig(guildId: string): void {
    const jobId = `events_${guildId}`;
    const job = this.jobs.get(jobId);

    if (job) {
      job.task.stop();
      this.jobs.delete(jobId);
      logger.info('Event config removed from scheduler', { guildId });
    }
  }

  // ============================================================================
  // Daily Question Scheduling
  // ============================================================================

  private async scheduleDailyQuestions(EventConfig: any): Promise<void> {
    if (!EventConfig || !EventConfig.getEnabledConfigs) {
      logger.warn('EventConfig model not properly initialized, skipping daily question setup');
      return;
    }

    try {
      const configs = await EventConfig.getEnabledConfigs();
      let count = 0;
      for (const config of configs) {
        if (config.announcement_channel_id) {
          this.scheduleDailyQuestion(config);
          count++;
        }
      }
      logger.info('Daily questions scheduled', { count });
    } catch (error) {
      logger.error('Failed to schedule daily questions', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private scheduleDailyQuestion(config: any): void {
    try {
      const cronExpression = '0 17 * * *'; // 5:00 PM daily

      const task = cron.schedule(
        cronExpression,
        async () => {
          await this.executeDailyQuestion(config.guild_id);
        },
        {
          timezone: config.timezone,
        }
      );

      this.jobs.set(`daily_question_${config.guild_id}`, {
        id: `daily_question_${config.guild_id}`,
        task,
      });

      logger.info('Daily question scheduled', {
        guildId: config.guild_id,
        cronExpression,
        timezone: config.timezone,
        channelId: config.announcement_channel_id,
      });
    } catch (error) {
      logger.error('Failed to schedule daily question', {
        guildId: config.guild_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async executeDailyQuestion(guildId: string): Promise<void> {
    try {
      const { EventConfig } = await import('../../supabase');
      const { GeminiService } = await import('./geminiService');
      const { EmbedBuilder } = await import('discord.js');

      logger.info('Executing daily question', { guildId });

      const config = await EventConfig.getGuildConfig(guildId);

      if (!config || !config.is_enabled || !config.announcement_channel_id) {
        logger.warn('Event config not found, disabled, or missing channel for daily question', {
          guildId,
        });
        return;
      }

      const levelColors: Record<number, number> = {
        1: 0x2ecc71,
        2: 0x3498db,
        3: 0x9b59b6,
      };

      let questionText: string;
      let footerText: string;
      let embedColor: number = 0x9932cc;
      const fields: Array<{ name: string; value: string; inline: boolean }> = [];

      try {
        const wnrsResponse = await GeminiService.generateQuestion();
        questionText = wnrsResponse.question;
        footerText = "✨ Inspired by We're Not Really Strangers • Powered by AI";
        embedColor = levelColors[wnrsResponse.level] || 0x9932cc;
        fields.push({
          name: '📊 Level',
          value: `Level ${wnrsResponse.level}: ${wnrsResponse.levelName}`,
          inline: true,
        });
      } catch (error) {
        logger.warn('Gemini API unavailable for daily question, skipping', {
          guildId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('💭 Question of the Day')
        .setDescription(questionText)
        .setColor(embedColor)
        .setTimestamp()
        .setFooter({ text: footerText });

      for (const field of fields) {
        embed.addFields(field);
      }

      const channel = await this.client.channels.fetch(config.announcement_channel_id);

      if (channel && 'send' in channel) {
        await channel.send({ embeds: [embed] });
        logger.info('Daily question sent successfully', {
          guildId,
          channelId: config.announcement_channel_id,
        });
      } else {
        logger.warn('Daily question channel not found or invalid', {
          guildId,
          channelId: config.announcement_channel_id,
        });
      }
    } catch (error) {
      logger.error('Failed to execute daily question', {
        guildId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  // ============================================================================
  // Sunset Announcement Scheduling
  // ============================================================================

  private async loadSunsetConfigs(SunsetConfig: any): Promise<void> {
    if (!SunsetConfig || !SunsetConfig.getEnabledConfigs) {
      logger.warn('SunsetConfig model not properly initialized, skipping sunset scheduler setup');
      return;
    }

    try {
      const configs = await SunsetConfig.getEnabledConfigs();
      for (const config of configs) {
        this.scheduleSunsetDailyCheck(config);
      }
      logger.info('Sunset announcements scheduled', { count: configs.length });
    } catch (error) {
      logger.error('Failed to load sunset configurations', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private scheduleSunsetDailyCheck(config: any): void {
    try {
      // Run daily at 00:05 to fetch today's sunset and schedule the announcement
      const cronExpression = '5 0 * * *';

      const task = cron.schedule(
        cronExpression,
        async () => {
          await this.executeSunsetCheck(config.guild_id);
        },
        {
          timezone: config.timezone,
        }
      );

      this.jobs.set(`sunset_daily_${config.guild_id}`, {
        id: `sunset_daily_${config.guild_id}`,
        task,
      });

      logger.info('Sunset daily check scheduled', {
        guildId: config.guild_id,
        cronExpression,
        timezone: config.timezone,
        advanceMinutes: config.advance_minutes,
      });

      // Also run an immediate check on startup to handle today's sunset
      this.executeSunsetCheck(config.guild_id);
    } catch (error) {
      logger.error('Failed to schedule sunset daily check', {
        guildId: config.guild_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async executeSunsetCheck(guildId: string): Promise<void> {
    try {
      const { SunsetConfig } = await import('../../supabase');
      const { getCoordinatesFromZip, getSunsetTime } = await import('./sunsetService');

      const config = await SunsetConfig.getGuildConfig(guildId);

      if (!config || !config.is_enabled) {
        logger.warn('Sunset config not found or disabled', { guildId });
        return;
      }

      // Fetch today's sunset time
      const coords = await getCoordinatesFromZip(config.zip_code);
      const sunsetTime = await getSunsetTime(coords.lat, coords.lng);

      // Calculate announcement time = sunset - advance_minutes
      const announceTime = new Date(sunsetTime.getTime() - config.advance_minutes * 60 * 1000);
      const now = new Date();
      const delay = announceTime.getTime() - now.getTime();

      if (delay <= 0) {
        logger.info('Sunset announcement time already passed for today', {
          guildId,
          sunsetTime: sunsetTime.toISOString(),
          announceTime: announceTime.toISOString(),
        });
        return;
      }

      // Cancel any existing announcement timeout for this guild
      const existingJob = this.jobs.get(`sunset_announce_${guildId}`);
      if (existingJob) {
        existingJob.task.stop();
        this.jobs.delete(`sunset_announce_${guildId}`);
      }

      // Schedule the announcement
      const timeoutId = setTimeout(async () => {
        await this.executeSunsetAnnouncement(guildId, sunsetTime);
        this.jobs.delete(`sunset_announce_${guildId}`);
      }, delay);

      this.jobs.set(`sunset_announce_${guildId}`, {
        id: `sunset_announce_${guildId}`,
        task: {
          stop: () => clearTimeout(timeoutId),
        } as any,
      });

      logger.info('Sunset announcement scheduled for today', {
        guildId,
        sunsetTime: sunsetTime.toISOString(),
        announceTime: announceTime.toISOString(),
        delayMs: delay,
        advanceMinutes: config.advance_minutes,
      });
    } catch (error) {
      logger.error('Failed to execute sunset check', {
        guildId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  private async executeSunsetAnnouncement(guildId: string, sunsetTime: Date): Promise<void> {
    try {
      const { SunsetConfig } = await import('../../supabase');
      const { formatSunsetEmbed } = await import('./sunsetService');

      logger.info('Executing sunset announcement', { guildId });

      const config = await SunsetConfig.getGuildConfig(guildId);

      if (!config || !config.is_enabled) {
        logger.warn('Sunset config not found or disabled at announcement time', { guildId });
        return;
      }

      const embed = formatSunsetEmbed(sunsetTime, config.timezone);

      const channel = await this.client.channels.fetch(config.channel_id);

      if (channel && 'send' in channel) {
        await channel.send({ embeds: [embed] });

        await SunsetConfig.updateLastAnnouncement(guildId);

        logger.info('Sunset announcement sent successfully', {
          guildId,
          sunsetTime: sunsetTime.toISOString(),
          channelId: config.channel_id,
        });
      } else {
        logger.warn('Sunset announcement channel not found or invalid', {
          guildId,
          channelId: config.channel_id,
        });
      }
    } catch (error) {
      logger.error('Failed to execute sunset announcement', {
        guildId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  // Public method to add a new sunset config to the scheduler
  async addSunsetConfig(guildId: string): Promise<void> {
    try {
      const { SunsetConfig } = await import('../../supabase');
      const config = await SunsetConfig.getGuildConfig(guildId);

      if (config && config.is_enabled) {
        // Remove existing jobs if present
        this.removeSunsetConfig(guildId);

        // Schedule new daily check
        this.scheduleSunsetDailyCheck(config);
      }
    } catch (error) {
      logger.error('Failed to add sunset config to scheduler', {
        guildId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Public method to remove a sunset config from scheduler
  removeSunsetConfig(guildId: string): void {
    const dailyJobId = `sunset_daily_${guildId}`;
    const announceJobId = `sunset_announce_${guildId}`;

    const dailyJob = this.jobs.get(dailyJobId);
    if (dailyJob) {
      dailyJob.task.stop();
      this.jobs.delete(dailyJobId);
    }

    const announceJob = this.jobs.get(announceJobId);
    if (announceJob) {
      announceJob.task.stop();
      this.jobs.delete(announceJobId);
    }

    logger.info('Sunset config removed from scheduler', { guildId });
  }

  stop(): void {
    this.jobs.forEach((job) => job.task.stop());
    this.jobs.clear();
  }
}

export function startScheduler(client: Client): void {
  const scheduler = Scheduler.getInstance(client);
  if (scheduler) {
    scheduler.initialize();
  }
}

export function getScheduler(): Scheduler | null {
  return Scheduler.getInstance();
}
