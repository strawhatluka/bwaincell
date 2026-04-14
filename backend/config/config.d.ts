/**
 * Bot configuration loaded from environment variables
 *
 * Environment variables are loaded by:
 * - Development: dotenv-cli wrapper in package.json scripts
 * - Production: docker-compose env_file directive
 */
export interface DiscordConfig {
  token: string;
  clientId: string;
  guildId?: string;
}
export interface DatabaseConfig {
  path: string;
}
export interface SettingsConfig {
  timezone: string;
  defaultReminderChannel?: string;
  deleteCommandAfter: number;
}
export interface BotConfig {
  discord: DiscordConfig;
  database: DatabaseConfig;
  settings: SettingsConfig;
}
declare const config: BotConfig;
export default config;
//# sourceMappingURL=config.d.ts.map
