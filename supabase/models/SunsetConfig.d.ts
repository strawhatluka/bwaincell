import type { SunsetConfigRow } from '../types';
declare class SunsetConfig {
  /**
   * Create or update sunset configuration for a guild
   */
  static upsertConfig(
    guildId: string,
    userId: string,
    channelId: string,
    zipCode: string,
    options?: {
      advanceMinutes?: number;
      timezone?: string;
      isEnabled?: boolean;
    }
  ): Promise<SunsetConfigRow>;
  /**
   * Get sunset configuration for a guild
   */
  static getGuildConfig(guildId: string): Promise<SunsetConfigRow | null>;
  /**
   * Get all enabled sunset configurations
   */
  static getEnabledConfigs(): Promise<SunsetConfigRow[]>;
  /**
   * Enable or disable sunset announcements for a guild
   */
  static toggleEnabled(guildId: string, enabled: boolean): Promise<SunsetConfigRow | null>;
  /**
   * Update advance notice minutes for a guild
   */
  static updateAdvanceMinutes(guildId: string, minutes: number): Promise<SunsetConfigRow | null>;
  /**
   * Update last announcement timestamp
   */
  static updateLastAnnouncement(guildId: string): Promise<void>;
}
export default SunsetConfig;
//# sourceMappingURL=SunsetConfig.d.ts.map
