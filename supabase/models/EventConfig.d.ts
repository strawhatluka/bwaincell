import type { EventConfigRow } from '../types';
declare class EventConfig {
  /**
   * Create or update event configuration for a guild
   */
  static upsertConfig(
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
  ): Promise<EventConfigRow>;
  /**
   * Get event configuration for a guild
   */
  static getGuildConfig(guildId: string): Promise<EventConfigRow | null>;
  /**
   * Get all enabled event configurations
   */
  static getEnabledConfigs(): Promise<EventConfigRow[]>;
  /**
   * Update schedule for a guild
   */
  static updateSchedule(
    guildId: string,
    scheduleDay: number,
    scheduleHour: number,
    scheduleMinute: number
  ): Promise<EventConfigRow | null>;
  /**
   * Enable or disable event announcements for a guild
   */
  static toggleEnabled(guildId: string, enabled: boolean): Promise<EventConfigRow | null>;
  /**
   * Update last announcement timestamp
   */
  static updateLastAnnouncement(guildId: string): Promise<void>;
  /**
   * Get next scheduled run time in the guild's timezone
   */
  static getNextRunTime(config: EventConfigRow): Date;
  /**
   * Format schedule for human-readable display
   */
  static formatSchedule(config: EventConfigRow): string;
}
export default EventConfig;
//# sourceMappingURL=EventConfig.d.ts.map
