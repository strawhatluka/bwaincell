'use strict';
/**
 * Bot configuration loaded from environment variables
 *
 * Environment variables are loaded by:
 * - Development: dotenv-cli wrapper in package.json scripts
 * - Production: docker-compose env_file directive
 */
Object.defineProperty(exports, '__esModule', { value: true });
const config = {
  discord: {
    token: process.env.BOT_TOKEN || '',
    clientId: process.env.CLIENT_ID || '',
    guildId: process.env.GUILD_ID,
  },
  database: {
    path: process.env.DATABASE_PATH || './data/bwaincell.sqlite',
  },
  settings: {
    timezone: process.env.TIMEZONE || 'America/Los_Angeles',
    defaultReminderChannel: process.env.DEFAULT_REMINDER_CHANNEL,
    deleteCommandAfter: parseInt(process.env.DELETE_COMMAND_AFTER || '5000') || 5000,
  },
};
// Validation
if (!config.discord.token) {
  throw new Error('BOT_TOKEN environment variable is required');
}
if (!config.discord.clientId) {
  throw new Error('CLIENT_ID environment variable is required');
}
exports.default = config;
//# sourceMappingURL=config.js.map
