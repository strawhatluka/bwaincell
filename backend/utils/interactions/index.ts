/**
 * @module InteractionHandlers
 * @description Main interaction routing system for Discord button, select menu, and modal interactions.
 * Provides a modular architecture with middleware chain for handling all user interactions with
 * proper error handling, logging, validation, rate limiting, and deferral management.
 * @requires discord.js
 * @requires @shared/utils/logger
 */

import { ButtonInteraction, CacheType, Interaction } from 'discord.js';
import { logger } from '@shared/utils/logger';

// Import middleware system
import { MiddlewareRunner } from './middleware';
import { loggingMiddleware } from './middleware/loggingMiddleware';
import { validationMiddleware } from './middleware/validationMiddleware';
import { rateLimitMiddleware } from './middleware/rateLimitMiddleware';
import { errorMiddleware } from './middleware/errorMiddleware';

// Import handlers
import { handleTaskButton } from './handlers/taskHandlers';
import { handleListButton } from './handlers/listHandlers';
import { handleReminderButton } from './handlers/reminderHandlers';
import { handleRandomButton } from './handlers/randomHandlers';
import { handleRecipeButton } from './handlers/recipeHandlers';
import { handleSelectMenuInteraction } from './handlers/selectMenuHandlers';
import { handleModalSubmit } from './modals/modalHandlers';

// Initialize middleware chain
const middleware = new MiddlewareRunner();
middleware.use(loggingMiddleware);
middleware.use(validationMiddleware);
middleware.use(rateLimitMiddleware);
middleware.use(errorMiddleware);

/**
 * Main interaction handler that processes all Discord interactions through the middleware chain
 * and routes them to appropriate specialized handlers.
 *
 * @param {Interaction} interaction - Discord interaction object (button, select menu, modal, etc.)
 * @returns {Promise<void>} Responds through Discord interaction response methods
 * @throws Will be handled by error middleware
 *
 * @example
 * // This function is called automatically by Discord.js client
 * client.on('interactionCreate', async (interaction) => {
 *     await handleInteraction(interaction);
 * });
 */
export async function handleInteraction(interaction: Interaction): Promise<void> {
  await middleware.run(interaction, async () => {
    // Route to appropriate handler based on interaction type
    if (interaction.isButton()) {
      await handleButtonInteractionInternal(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelectMenuInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
    }
    // Other interaction types can be added here
  });
}

/**
 * Internal button interaction router (legacy function maintained for compatibility)
 * Processes Discord button interactions and routes them to specialized handlers.
 *
 * @param {ButtonInteraction<CacheType>} interaction - Discord button interaction object
 * @returns {Promise<void>} Responds through Discord interaction response methods
 * @throws Will log errors but not throw them to prevent bot crashes
 */
export async function handleButtonInteraction(
  interaction: ButtonInteraction<CacheType>
): Promise<void> {
  // For backward compatibility, also run through middleware
  await handleInteraction(interaction);
}

/**
 * Internal button interaction handler (without middleware - used by main handler)
 */
async function handleButtonInteractionInternal(
  interaction: ButtonInteraction<CacheType>
): Promise<void> {
  const customId = interaction.customId;
  const userId = interaction.user.id;
  const guildId = interaction.guild?.id;

  if (!guildId) {
    logger.warn('Button interaction attempted outside of guild', { userId, customId });
    await interaction.followUp({
      content: '❌ This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }

  // Note: Interaction already deferred by bot.js - no need to defer here
  // (bot.js handles immediate acknowledgment for all button interactions)

  try {
    // Route to appropriate handler based on prefix
    if (customId.startsWith('task_')) {
      await handleTaskButton(interaction);
    } else if (customId.startsWith('list_')) {
      await handleListButton(interaction);
    } else if (customId.startsWith('reminder_')) {
      await handleReminderButton(interaction);
    } else if (customId.startsWith('random_') || customId.startsWith('save_dinner_')) {
      await handleRandomButton(interaction);
    } else if (customId.startsWith('recipe_plan_')) {
      await handleRecipeButton(interaction);
    } else if (
      customId === 'schedule_add_new' ||
      customId === 'budget_add_new' ||
      customId === 'tracker_add_new' ||
      customId === 'note_add_new'
    ) {
      // Generic handler for other command types
      const commandName = customId.split('_')[0];
      await interaction.followUp({
        content: `📝 Use \`/${commandName} add\` to create a new ${commandName} entry!`,
        ephemeral: true,
      });
    } else {
      logger.warn('Unknown button customId', { customId, userId, guildId });
      await interaction.followUp({
        content: '❌ Unknown button action.',
        ephemeral: true,
      });
    }
  } catch (error) {
    logger.error('Button interaction error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      customId,
      userId,
      guildId,
    });

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while processing this button.',
          ephemeral: true,
        });
      } else {
        await interaction.followUp({
          content: '❌ An error occurred while processing this button.',
          ephemeral: true,
        });
      }
    } catch {
      // Failed to send error message
    }
  }
}

// Re-export handlers and main interaction handler for use in bot.ts
export { handleSelectMenuInteraction, handleModalSubmit };
