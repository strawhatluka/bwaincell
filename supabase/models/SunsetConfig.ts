import supabase from '../supabase';
import type { SunsetConfigRow, SunsetConfigInsert } from '../types';

class SunsetConfig {
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
  ): Promise<SunsetConfigRow> {
    const upsertData: SunsetConfigInsert = {
      guild_id: guildId,
      user_id: userId,
      channel_id: channelId,
      zip_code: zipCode,
      advance_minutes: options?.advanceMinutes ?? 60,
      timezone: options?.timezone ?? 'America/Los_Angeles',
      is_enabled: options?.isEnabled ?? true,
    };

    const { data, error } = await supabase
      .from('sunset_configs')
      .upsert(upsertData, { onConflict: 'guild_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get sunset configuration for a guild
   */
  static async getGuildConfig(guildId: string): Promise<SunsetConfigRow | null> {
    const { data, error } = await supabase
      .from('sunset_configs')
      .select('*')
      .eq('guild_id', guildId)
      .single();

    if (error && error.code === 'PGRST116') return null; // No rows found
    if (error) throw error;
    return data;
  }

  /**
   * Get all enabled sunset configurations
   */
  static async getEnabledConfigs(): Promise<SunsetConfigRow[]> {
    const { data, error } = await supabase
      .from('sunset_configs')
      .select('*')
      .eq('is_enabled', true);

    if (error) throw error;
    return data || [];
  }

  /**
   * Enable or disable sunset announcements for a guild
   */
  static async toggleEnabled(guildId: string, enabled: boolean): Promise<SunsetConfigRow | null> {
    const { data, error } = await supabase
      .from('sunset_configs')
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
   * Update advance notice minutes for a guild
   */
  static async updateAdvanceMinutes(
    guildId: string,
    minutes: number
  ): Promise<SunsetConfigRow | null> {
    const { data, error } = await supabase
      .from('sunset_configs')
      .update({
        advance_minutes: minutes,
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
      .from('sunset_configs')
      .update({
        last_announcement: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('guild_id', guildId);

    if (error) throw error;
  }
}

export default SunsetConfig;
