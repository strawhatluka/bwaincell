import { DateTime } from 'luxon';
import supabase from '../supabase';
import type { EventConfigRow, EventConfigInsert } from '../types';

class EventConfig {
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
  ): Promise<EventConfigRow> {
    const upsertData: EventConfigInsert = {
      guild_id: guildId,
      user_id: userId,
      location,
      announcement_channel_id: channelId,
      schedule_day: options?.scheduleDay ?? 1, // Monday
      schedule_hour: options?.scheduleHour ?? 12, // Noon
      schedule_minute: options?.scheduleMinute ?? 0,
      timezone: options?.timezone ?? 'America/Los_Angeles',
      is_enabled: options?.isEnabled ?? true,
    };

    const { data, error } = await supabase
      .from('event_configs')
      .upsert(upsertData, { onConflict: 'guild_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get event configuration for a guild
   */
  static async getGuildConfig(guildId: string): Promise<EventConfigRow | null> {
    const { data, error } = await supabase
      .from('event_configs')
      .select('*')
      .eq('guild_id', guildId)
      .single();

    if (error && error.code === 'PGRST116') return null; // No rows found
    if (error) throw error;
    return data;
  }

  /**
   * Get all enabled event configurations
   */
  static async getEnabledConfigs(): Promise<EventConfigRow[]> {
    const { data, error } = await supabase.from('event_configs').select('*').eq('is_enabled', true);

    if (error) throw error;
    return data || [];
  }

  /**
   * Update schedule for a guild
   */
  static async updateSchedule(
    guildId: string,
    scheduleDay: number,
    scheduleHour: number,
    scheduleMinute: number
  ): Promise<EventConfigRow | null> {
    const { data, error } = await supabase
      .from('event_configs')
      .update({
        schedule_day: scheduleDay,
        schedule_hour: scheduleHour,
        schedule_minute: scheduleMinute,
        updated_at: new Date().toISOString(),
      })
      .eq('guild_id', guildId)
      .select()
      .single();

    if (error && error.code === 'PGRST116') return null; // No rows found
    if (error) throw error;
    return data;
  }

  /**
   * Enable or disable event announcements for a guild
   */
  static async toggleEnabled(guildId: string, enabled: boolean): Promise<EventConfigRow | null> {
    const { data, error } = await supabase
      .from('event_configs')
      .update({
        is_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('guild_id', guildId)
      .select()
      .single();

    if (error && error.code === 'PGRST116') return null; // No rows found
    if (error) throw error;
    return data;
  }

  /**
   * Update last announcement timestamp
   */
  static async updateLastAnnouncement(guildId: string): Promise<void> {
    const { error } = await supabase
      .from('event_configs')
      .update({
        last_announcement: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('guild_id', guildId);

    if (error) throw error;
  }

  /**
   * Get next scheduled run time in the guild's timezone
   */
  static getNextRunTime(config: EventConfigRow): Date {
    const now = DateTime.now().setZone(config.timezone);
    const targetDay = config.schedule_day;
    const targetHour = config.schedule_hour;
    const targetMinute = config.schedule_minute;

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
  static formatSchedule(config: EventConfigRow): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[config.schedule_day];
    const hour =
      config.schedule_hour === 0
        ? 12
        : config.schedule_hour > 12
          ? config.schedule_hour - 12
          : config.schedule_hour;
    const ampm = config.schedule_hour < 12 ? 'AM' : 'PM';
    const minute = config.schedule_minute.toString().padStart(2, '0');

    return `${dayName}s at ${hour}:${minute} ${ampm} (${config.timezone})`;
  }
}

export default EventConfig;
