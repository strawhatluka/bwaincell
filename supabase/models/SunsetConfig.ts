/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, Optional, Sequelize } from 'sequelize';
import schemas from '../schema';

interface SunsetConfigAttributes {
  id: number;
  guild_id: string;
  user_id: string;
  advance_minutes: number;
  channel_id: string;
  zip_code: string;
  timezone: string;
  is_enabled: boolean;
  last_announcement: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface SunsetConfigCreationAttributes extends Optional<
  SunsetConfigAttributes,
  | 'id'
  | 'advance_minutes'
  | 'timezone'
  | 'is_enabled'
  | 'last_announcement'
  | 'created_at'
  | 'updated_at'
> {}

const SunsetConfigBase = Model as any;
class SunsetConfig extends SunsetConfigBase<
  SunsetConfigAttributes,
  SunsetConfigCreationAttributes
> {
  static init(sequelize: Sequelize) {
    return Model.init.call(this as any, schemas.sunsetConfig, {
      sequelize,
      modelName: 'SunsetConfig',
      tableName: 'sunset_configs',
      timestamps: false,
    });
  }

  /**
   * Create or update sunset configuration for a guild
   */
  static async upsertConfig(
    guildId: string,
    userId: string,
    channelId: string,
    zipCode: string,
    options?: {
      advanceMinutes?: number;
      timezone?: string;
      isEnabled?: boolean;
    }
  ): Promise<SunsetConfig> {
    const existing = await (this as any).findOne({
      where: { guild_id: guildId },
    });

    if (existing) {
      await existing.update({
        user_id: userId,
        channel_id: channelId,
        zip_code: zipCode,
        advance_minutes: options?.advanceMinutes ?? existing.advance_minutes,
        timezone: options?.timezone ?? existing.timezone,
        is_enabled: options?.isEnabled ?? existing.is_enabled,
        updated_at: new Date(),
      });
      return existing;
    } else {
      return await (this as any).create({
        guild_id: guildId,
        user_id: userId,
        channel_id: channelId,
        zip_code: zipCode,
        advance_minutes: options?.advanceMinutes ?? 60,
        timezone: options?.timezone ?? 'America/Los_Angeles',
        is_enabled: options?.isEnabled ?? true,
      });
    }
  }

  /**
   * Get sunset configuration for a guild
   */
  static async getGuildConfig(guildId: string): Promise<SunsetConfig | null> {
    return await (this as any).findOne({
      where: { guild_id: guildId },
    });
  }

  /**
   * Get all enabled sunset configurations
   */
  static async getEnabledConfigs(): Promise<SunsetConfig[]> {
    return await (this as any).findAll({
      where: { is_enabled: true },
    });
  }

  /**
   * Enable or disable sunset announcements for a guild
   */
  static async toggleEnabled(guildId: string, enabled: boolean): Promise<SunsetConfig | null> {
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
   * Update advance notice minutes for a guild
   */
  static async updateAdvanceMinutes(
    guildId: string,
    minutes: number
  ): Promise<SunsetConfig | null> {
    const config = await (this as any).findOne({
      where: { guild_id: guildId },
    });

    if (!config) return null;

    await config.update({
      advance_minutes: minutes,
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
}

export default SunsetConfig;
