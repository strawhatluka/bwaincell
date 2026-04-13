"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = __importDefault(require("../supabase"));
class SunsetConfig {
    /**
     * Create or update sunset configuration for a guild
     */
    static async upsertConfig(guildId, userId, channelId, zipCode, options) {
        const upsertData = {
            guild_id: guildId,
            user_id: userId,
            channel_id: channelId,
            zip_code: zipCode,
            advance_minutes: options?.advanceMinutes ?? 60,
            timezone: options?.timezone ?? 'America/Los_Angeles',
            is_enabled: options?.isEnabled ?? true,
        };
        const { data, error } = await supabase_1.default
            .from('sunset_configs')
            .upsert(upsertData, { onConflict: 'guild_id' })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    /**
     * Get sunset configuration for a guild
     */
    static async getGuildConfig(guildId) {
        const { data, error } = await supabase_1.default
            .from('sunset_configs')
            .select('*')
            .eq('guild_id', guildId)
            .single();
        if (error && error.code === 'PGRST116')
            return null; // No rows found
        if (error)
            throw error;
        return data;
    }
    /**
     * Get all enabled sunset configurations
     */
    static async getEnabledConfigs() {
        const { data, error } = await supabase_1.default
            .from('sunset_configs')
            .select('*')
            .eq('is_enabled', true);
        if (error)
            throw error;
        return data || [];
    }
    /**
     * Enable or disable sunset announcements for a guild
     */
    static async toggleEnabled(guildId, enabled) {
        const { data, error } = await supabase_1.default
            .from('sunset_configs')
            .update({
            is_enabled: enabled,
            updated_at: new Date().toISOString(),
        })
            .eq('guild_id', guildId)
            .select()
            .single();
        if (error && error.code === 'PGRST116')
            return null; // No rows found
        if (error)
            throw error;
        return data;
    }
    /**
     * Update advance notice minutes for a guild
     */
    static async updateAdvanceMinutes(guildId, minutes) {
        const { data, error } = await supabase_1.default
            .from('sunset_configs')
            .update({
            advance_minutes: minutes,
            updated_at: new Date().toISOString(),
        })
            .eq('guild_id', guildId)
            .select()
            .single();
        if (error && error.code === 'PGRST116')
            return null; // No rows found
        if (error)
            throw error;
        return data;
    }
    /**
     * Update last announcement timestamp
     */
    static async updateLastAnnouncement(guildId) {
        const { error } = await supabase_1.default
            .from('sunset_configs')
            .update({
            last_announcement: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq('guild_id', guildId);
        if (error)
            throw error;
    }
}
exports.default = SunsetConfig;
//# sourceMappingURL=SunsetConfig.js.map