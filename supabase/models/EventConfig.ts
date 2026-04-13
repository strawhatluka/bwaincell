/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, Optional, Sequelize } from 'sequelize';
import schemas from '../schema';
import { DateTime } from 'luxon';

// Define attributes interface matching the schema
interface EventConfigAttributes {
  id: number;
  guild_id: string;
  user_id: string;
  location: string;
  announcement_channel_id: string;
  schedule_day: number; // 0-6 (Sunday-Saturday)
  schedule_hour: number; // 0-23
  schedule_minute: number; // 0-59
  timezone: string;
  is_enabled: boolean;
  last_announcement: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Creation attributes (id and timestamps are optional during creation)
interface EventConfigCreationAttributes
  extends Optional<
    EventConfigAttributes,
    | 'id'
    | 'schedule_day'
    | 'schedule_hour'
    | 'schedule_minute'
    | 'timezone'
    | 'is_enabled'
    | 'last_announcement'
    | 'created_at'
    | 'updated_at'
  > {}

const EventConfigBase = Model as any;
class EventConfig extends EventConfigBase<EventConfigAttributes, EventConfigCreationAttributes> {
  // Class fields commented out to avoid shadowing Sequelize's attribute getters
  // public id!: number;
  // public guild_id!: string;
  // public user_id!: string;
  // public location!: string;
  // public announcement_channel_id!: string;
  // public schedule_day!: number;
  // public schedule_hour!: number;
  // public schedule_minute!: number;
  // public timezone!: string;
  // public is_enabled!: boolean;
  // public last_announcement!: Date | null;
  // public created_at!: Date;
  // public updated_at!: Date;

  static init(sequelize: Sequelize) {
    return Model.init.call(this as any, schemas.eventConfig, {
      sequelize,
      modelName: 'EventConfig',
      tableName: 'event_configs',
      timestamps: false,
    });
  }

  /**
   * Create or update event configuration for a guild
   */
  static async upsertConfig(
    guildId: string,
    userId: string,
    location: string,
    channelId: string,
    options?: {
      scheduleDay?: number;
      scheduleHour?: number;
      scheduleMinute?: number;
      timezone?: string;
      isEnabled?: boolean;
    }
  ): Promise<EventConfig> {
    const existing = await (this as any).findOne({
      where: { guild_id: guildId },
    });

    if (existing) {
      // Update existing configuration
      await existing.update({
        user_id: userId,
        location,
        announcement_channel_id: channelId,
        schedule_day: options?.scheduleDay ?? existing.schedule_day,
        schedule_hour: options?.scheduleHour ?? existing.schedule_hour,
        schedule_minute: options?.scheduleMinute ?? existing.schedule_minute,
        timezone: options?.timezone ?? existing.timezone,
        is_enabled: options?.isEnabled ?? existing.is_enabled,
        updated_at: new Date(),
      });
      return existing;
    } else {
      // Create new configuration
      return await (this as any).create({
        guild_id: guildId,
        user_id: userId,
        location,
        announcement_channel_id: channelId,
        schedule_day: options?.scheduleDay ?? 1, // Monday
        schedule_hour: options?.scheduleHour ?? 12, // Noon
        schedule_minute: options?.scheduleMinute ?? 0,
        timezone: options?.timezone ?? 'America/Los_Angeles',
        is_enabled: options?.isEnabled ?? true,
      });
    }
  }

  /**
   * Get event configuration for a guild
   */
  static async getGuildConfig(guildId: string): Promise<EventConfig | null> {
    return await (this as any).findOne({
      where: { guild_id: guildId },
    });
  }

  /**
   * Get all enabled event configurations
   */
  static async getEnabledConfigs(): Promise<EventConfig[]> {
    return await (this as any).findAll({
      where: { is_enabled: true },
    });
  }

  /**
   * Update schedule for a guild
   */
  static async updateSchedule(
    guildId: string,
    scheduleDay: number,
    scheduleHour: number,
    scheduleMinute: number
  ): Promise<EventConfig | null> {
    const config = await (this as any).findOne({
      where: { guild_id: guildId },
    });

    if (!config) return null;

    await config.update({
      schedule_day: scheduleDay,
      schedule_hour: scheduleHour,
      schedule_minute: scheduleMinute,
      updated_at: new Date(),
    });

    return config;
  }

  /**
   * Enable or disable event announcements for a guild
   */
  static async toggleEnabled(guildId: string, enabled: boolean): Promise<EventConfig | null> {
    const config = await (this as any).findOne({
      where: { guild_id: guildId },
    });

    if (!config) return null;

    await config.update({
      is_enabled: enabled,
      updated_at: new Date(),
    });

    return config;
  }

  /**
   * Update last announcement timestamp
   */
  static async updateLastAnnouncement(guildId: string): Promise<void> {
    const config = await (this as any).findOne({
      where: { guild_id: guildId },
    });

    if (config) {
      await config.update({
        last_announcement: new Date(),
        updated_at: new Date(),
      });
    }
  }

  /**
   * Get next scheduled run time in the guild's timezone
   */
  getNextRunTime(): Date {
    const now = DateTime.now().setZone(this.timezone);
    const targetDay = this.schedule_day;
    const targetHour = this.schedule_hour;
    const targetMinute = this.schedule_minute;

    let next = now.set({
      hour: targetHour,
      minute: targetMinute,
      second: 0,
      millisecond: 0,
    });

    // If target time today has passed, or target day is not today, advance to next occurrence
    const currentDayOfWeek = now.weekday % 7; // Convert to 0-6 (Sunday-Saturday)

    if (currentDayOfWeek === targetDay && next > now) {
      // Target day is today and time hasn't passed yet
      return next.toJSDate();
    }

    // Find next occurrence of target day
    let daysUntilTarget = (targetDay - currentDayOfWeek + 7) % 7;
    if (daysUntilTarget === 0) {
      daysUntilTarget = 7; // Next week
    }

    next = next.plus({ days: daysUntilTarget });
    return next.toJSDate();
  }

  /**
   * Format schedule for human-readable display
   */
  formatSchedule(): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[this.schedule_day];
    const hour =
      this.schedule_hour === 0
        ? 12
        : this.schedule_hour > 12
          ? this.schedule_hour - 12
          : this.schedule_hour;
    const ampm = this.schedule_hour < 12 ? 'AM' : 'PM';
    const minute = this.schedule_minute.toString().padStart(2, '0');

    return `${dayName}s at ${hour}:${minute} ${ampm} (${this.timezone})`;
  }
}

export default EventConfig;
