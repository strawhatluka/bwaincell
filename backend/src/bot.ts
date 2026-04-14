/* eslint-disable @typescript-eslint/no-explicit-any */
// Set Node.js timezone to match configured timezone
// This must be set before any Date objects are created
// See: https://nodejs.org/api/process.html#process_process_env
process.env.TZ = process.env.TIMEZONE || 'America/Los_Angeles';

// MUST BE FIRST LINE - Module alias setup
import 'module-alias/register';

import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { validateEnv } from '@shared/validation/env';
import { logger, logBotEvent, logError } from '@shared/utils/logger';
import {
  handleButtonInteraction,
  handleSelectMenuInteraction,
  handleModalSubmit,
} from '../utils/interactions';
// Import the properly configured database with all models
import { verifyConnection } from '../../supabase';
// Import API server
import { createApiServer } from './api/server';
import { announceRelease } from '../utils/releaseAnnouncer';
import type { Server } from 'http';

// Detect test environment
const isTestEnvironment = process.env.NODE_ENV === 'test';

// Validate environment variables first
let env: ReturnType<typeof validateEnv>;
try {
  env = validateEnv();
} catch (error) {
  if (!isTestEnvironment) {
    logError(error as Error, { context: 'Environment validation failed' });
    process.exit(1);
  }
  // In test mode, use defaults or re-throw for test to handle
  env = {
    BOT_TOKEN: process.env.BOT_TOKEN || 'test-token',
    CLIENT_ID: process.env.CLIENT_ID || 'test-client-id',
  } as ReturnType<typeof validateEnv>;
}

// Create client variable but don't initialize in test mode
let client: (Client & { commands?: Collection<any, any> }) | undefined;

function createClient() {
  const newClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
  }) as Client & { commands?: Collection<any, any> };
  newClient.commands = new Collection();
  return newClient;
}

// Only initialize immediately if not in test mode
if (!isTestEnvironment) {
  client = createClient();
}

async function loadModels() {
  // Verify Supabase connection is working
  try {
    await verifyConnection();
    logger.info('Database connection verified successfully');
  } catch (error) {
    logger.error('Failed to verify database connection', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function loadCommands() {
  // Ensure client is initialized
  if (!client) {
    client = createClient();
  }

  // Support both development (ts-node-dev) and production (compiled) environments
  // In development: __dirname is like /path/to/Bwaincell/src
  // In production: __dirname is like /app/dist/src (compiled code)
  const isDevelopment = !__dirname.includes('dist');
  const commandsPath = path.join(__dirname, '..', 'commands');

  // Check if commands directory exists
  if (!existsSync(commandsPath)) {
    logger.error(`Commands directory not found: ${commandsPath}`);
    return;
  }

  // Filter for appropriate file type based on environment
  const fileExtension = isDevelopment ? '.ts' : '.js';
  const commandFiles = (await fs.readdir(commandsPath)).filter(
    (file) =>
      file.endsWith(fileExtension) &&
      !file.endsWith('.d.ts') &&
      !file.includes('.backup') &&
      !file.includes('.map')
  );

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    // Handle both default and module.exports
    const commandModule = command.default || command;

    if ('data' in commandModule && 'execute' in commandModule) {
      client!.commands!.set(commandModule.data.name, commandModule);
      logger.info(`Loaded command: ${commandModule.data.name}`);
    } else {
      logger.error(`Failed to load command from ${file}: Missing data or execute`);
    }
  }

  logger.info(`Total commands loaded: ${client!.commands.size}`);
}

async function setupScheduler() {
  // Ensure client is initialized
  if (!client) {
    client = createClient();
  }

  try {
    // Try TypeScript first (dev mode), fallback to compiled JS (production)
    const { startScheduler } = await import('../utils/scheduler');
    startScheduler(client);
    logger.info('Scheduler initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize scheduler', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

// Duplicate interaction prevention
const processedInteractions = new Set();

// Function to set up event handlers (called when client is initialized)
function setupEventHandlers() {
  if (!client) {
    throw new Error('Client must be initialized before setting up event handlers');
  }

  client!.once('clientReady', async () => {
    logger.info(`Bot logged in as ${client!.user?.tag}`);
    logBotEvent('clientReady', {
      username: client!.user?.username,
      id: client!.user?.id,
      guilds: client!.guilds.cache.size,
    });

    // Announce new version if this is a fresh deployment
    await announceRelease(client!);
  });

  client!.on('interactionCreate', async (interaction) => {
    try {
      // Prevent duplicate processing
      if (processedInteractions.has(interaction.id)) {
        logger.debug('Duplicate interaction detected', { interactionId: interaction.id });
        return;
      }
      processedInteractions.add(interaction.id);

      // Clean up after 15 minutes (Discord token validity period)
      setTimeout(() => processedInteractions.delete(interaction.id), 15 * 60 * 1000);

      // IMMEDIATE ACKNOWLEDGMENT - FIRST LINE
      // This prevents 90% of "Unknown interaction" errors by acknowledging within 100ms
      if (
        interaction.isChatInputCommand() ||
        interaction.isButton() ||
        interaction.isModalSubmit() ||
        interaction.isStringSelectMenu()
      ) {
        try {
          if (!interaction.replied && !interaction.deferred) {
            if (interaction.isButton() && interaction.customId) {
              // Buttons that open modals should NOT be deferred (modals require non-deferred interactions)
              const modalButtons = [
                'list_add_',
                'task_edit_',
                'task_add_new',
                'reminder_edit_',
                'reminder_create_',
                'recipe_plan_servings_',
              ];
              const opensModal = modalButtons.some(
                (prefix) =>
                  interaction.customId.startsWith(prefix) || interaction.customId === prefix
              );

              if (!opensModal) {
                // Button interactions need deferUpdate to avoid "Interaction failed" messages
                await interaction.deferUpdate();
                logger.debug('Button interaction deferred', { customId: interaction.customId });
              }
            } else if (interaction.isStringSelectMenu()) {
              // Select menus that open a modal must NOT be deferred (modals require non-deferred interactions)
              const modalSelectMenus = ['recipe_edit_field_'];
              const selectOpensModal = modalSelectMenus.some((prefix) =>
                interaction.customId.startsWith(prefix)
              );

              if (!selectOpensModal) {
                // Select menus use deferUpdate to keep the message intact
                await interaction.deferUpdate();
                logger.debug('Select menu interaction deferred', {
                  customId: interaction.customId,
                });
              }
            } else {
              // Commands and modals use deferReply
              await interaction.deferReply();
              logger.debug('Interaction deferred', {
                type: interaction.type,
                command: interaction.isChatInputCommand() ? interaction.commandName : undefined,
              });
            }
          }
        } catch (error) {
          // If acknowledgment fails, interaction is already invalid - don't process further
          logger.warn('Failed to acknowledge interaction', {
            error: error instanceof Error ? error.message : 'Unknown error',
            interactionId: interaction.id,
            type: interaction.type,
          });
          return;
        }
      }

      if (interaction.isChatInputCommand()) {
        const command = client!.commands.get(interaction.commandName);

        if (!command) {
          logger.warn(`Unknown command: ${interaction.commandName}`, {
            userId: interaction.user.id,
            guildId: interaction.guildId,
          });
          // For unknown commands, send error response
          try {
            await interaction.editReply({
              content: 'Unknown command. Please try again or contact support.',
            });
          } catch {
            // Silent fail if interaction is invalid
          }
          return;
        }

        try {
          await command.execute(interaction);
          logger.info('Command executed successfully', {
            command: interaction.commandName,
            userId: interaction.user.id,
            guildId: interaction.guildId,
          });
        } catch (error) {
          logger.error('Error executing command', {
            command: interaction.commandName,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            userId: interaction.user.id,
            guildId: interaction.guildId,
          });

          // Enhanced error recovery - check specific error codes
          const errorCode = (error as any)?.code;
          if (errorCode === 10062) {
            // Unknown interaction
            logger.warn('Interaction expired before processing');
            return; // Don't attempt any response
          }

          // For already-deferred interactions, use editReply
          try {
            if (interaction.deferred) {
              await interaction.editReply({
                content: 'An error occurred while processing your request.',
              });
            } else if (interaction.replied) {
              await interaction.followUp({
                content: 'An error occurred while processing your request.',
                ephemeral: true,
              });
            }
          } catch {
            // Silent fail - interaction is invalid
          }
        }
      } else if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
      } else if (interaction.isStringSelectMenu()) {
        await handleSelectMenuInteraction(interaction);
      } else if (interaction.isModalSubmit()) {
        await handleModalSubmit(interaction);
      } else if (interaction.isAutocomplete()) {
        // Autocomplete doesn't need deferral - handle directly
        const command = client!.commands.get(interaction.commandName);

        if (!command) {
          logger.warn(`No command found for autocomplete: ${interaction.commandName}`);
          return;
        }

        if (!command.autocomplete) {
          logger.warn(`Command ${interaction.commandName} doesn't have autocomplete`);
          return;
        }

        try {
          await command.autocomplete(interaction);
        } catch (error) {
          logger.error('Error handling autocomplete', {
            command: interaction.commandName,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          });
        }
      }
    } catch (error) {
      logError(error as Error, {
        interactionType: interaction.type,
        userId: interaction.user?.id,
        guildId: interaction.guildId,
      });
    }
  });

  client!.on('error', (error) => {
    logError(error, { context: 'Discord client error' });
  });

  client!.on('warn', (info) => {
    logger.warn('Discord client warning', { info });
  });
}

// Set up event handlers if client was created during module initialization
if (!isTestEnvironment && client) {
  setupEventHandlers();
}

// HTTP server reference for graceful shutdown
let httpServer: Server | null = null;

async function init() {
  try {
    logger.info('Initializing Bwaincell Bot...');

    // Ensure client is initialized
    if (!client) {
      client = createClient();
      setupEventHandlers();
    }

    await loadModels();
    await loadCommands();
    await setupScheduler();
    await client!.login(env.BOT_TOKEN);

    // Start API HTTP server
    const app = createApiServer();
    const apiPort = parseInt(process.env.API_PORT || '3000', 10);

    httpServer = app.listen(apiPort, () => {
      logger.info('[API] HTTP server listening', {
        port: apiPort,
        environment: process.env.NODE_ENV || 'development',
        pwaUrl: process.env.PWA_URL || 'http://localhost:3001',
      });
    });

    // Handle HTTP server errors
    httpServer.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error('[API] Port already in use', { port: apiPort });
      } else {
        logger.error('[API] HTTP server error', {
          error: error.message,
          code: error.code,
        });
      }
    });

    logger.info('Bot and API initialization complete', {
      discordBot: 'running',
      httpApi: 'running',
      apiPort: apiPort,
    });
  } catch (error) {
    logError(error as Error, { context: 'Bot initialization failed' });

    // Only exit in production - in tests, throw the error
    if (!isTestEnvironment) {
      process.exit(1);
    } else {
      throw error; // Let test framework catch and handle
    }
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');

  // Close HTTP server
  if (httpServer) {
    httpServer.close(() => {
      logger.info('[API] HTTP server closed');
    });
  }

  // Destroy Discord client
  if (client) {
    await client.destroy();
    logger.info('[BOT] Discord client disconnected');
  }

  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');

  // Close HTTP server
  if (httpServer) {
    httpServer.close(() => {
      logger.info('[API] HTTP server closed');
    });
  }

  // Destroy Discord client
  if (client) {
    await client.destroy();
    logger.info('[BOT] Discord client disconnected');
  }

  process.exit(0);
});

// Only auto-initialize if not in test mode
if (!isTestEnvironment) {
  // Start the bot in production mode (wrapped in async IIFE to await)
  (async () => {
    try {
      await init();
    } catch (error) {
      console.error('Fatal error during initialization:', error);
      process.exit(1);
    }
  })();
}

// Export testable components for testing
export {
  client, // Discord client instance
  init, // Initialization function
  loadCommands, // Command loading function
  loadModels, // Database sync function
  createClient, // Client factory for testing
};
