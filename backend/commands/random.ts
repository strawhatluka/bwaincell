import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
} from 'discord.js';
import { logger } from '../shared/utils/logger';
import { GeminiService } from '../utils/geminiService';
import Recipe from '@database/models/Recipe';
import { formatQuantity } from '../utils/fractionFormat';
import type { RecipeIngredient } from '@database/types';

// Import recipe data (will need to type this properly later)
const { movieData } = require('../utils/recipeData');

interface MovieDetails {
  year: string;
  genre: string;
  rating: string;
  link: string;
}

const dateIdeas: string[] = [
  'Picnic in the park',
  'Movie night at home',
  'Visit a museum',
  'Go bowling',
  'Wine tasting',
  'Beach walk at sunset',
  'Cooking class together',
  'Escape room',
  'Mini golf',
  'Board game night',
  'Stargazing',
  'Visit a farmers market',
  'Go to a concert',
  'Take a dance class',
  'Visit an aquarium',
  'Go hiking',
];

const conversationStarters: string[] = [
  "What's the best advice you've ever received?",
  'If you could have dinner with anyone, dead or alive, who would it be?',
  "What's your favorite childhood memory?",
  'What skill would you love to learn and why?',
  'If you could live anywhere in the world, where would it be?',
  "What's the most interesting place you've ever visited?",
  "What's something you've always wanted to try but haven't yet?",
  "If you won the lottery tomorrow, what's the first thing you'd do?",
  "What's your biggest pet peeve?",
  "What's the best compliment you've ever received?",
  'If you could time travel, would you go to the past or future?',
  "What's your hidden talent?",
  "What's the most spontaneous thing you've ever done?",
  'If your life was a movie, what would it be called?',
  "What's your favorite way to spend a weekend?",
];

export default {
  data: new SlashCommandBuilder()
    .setName('random')
    .setDescription('Random generators')
    .addSubcommand((subcommand) =>
      subcommand.setName('movie').setDescription('Pick a random movie')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('recipe').setDescription('Pick a random recipe from your saved recipes')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('date').setDescription('Generate a random date idea')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('question').setDescription('Get a conversation starter')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('choice')
        .setDescription('Pick from provided options')
        .addStringOption((option) =>
          option
            .setName('options')
            .setDescription('Comma-separated options (e.g., "option1,option2,option3")')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('number')
        .setDescription('Generate a random number between 1 and max')
        .addIntegerOption((option) =>
          option.setName('max').setDescription('Maximum value').setRequired(true).setMinValue(2)
        )
    )
    .addSubcommand((subcommand) => subcommand.setName('coin').setDescription('Flip a coin'))
    .addSubcommand((subcommand) =>
      subcommand
        .setName('dice')
        .setDescription('Roll dice')
        .addIntegerOption((option) =>
          option
            .setName('sides')
            .setDescription('Number of sides')
            .setRequired(true)
            .setMinValue(2)
            .setMaxValue(100)
        )
        .addIntegerOption((option) =>
          option
            .setName('count')
            .setDescription('Number of dice (default: 1)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(10)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // Note: Interaction is already deferred by bot.js for immediate acknowledgment

    const subcommand = interaction.options.getSubcommand();

    try {
      const embed = new EmbedBuilder().setColor(0x9932cc).setTimestamp();

      switch (subcommand) {
        case 'movie': {
          const movieTitles = Object.keys(movieData);
          const movie = movieTitles[Math.floor(Math.random() * movieTitles.length)];
          const details: MovieDetails = movieData[movie];

          embed
            .setTitle('🎬 Random Movie Pick')
            .setDescription(`**${movie}**`)
            .addFields(
              { name: 'Year', value: details.year, inline: true },
              { name: 'Genre', value: details.genre, inline: true },
              { name: 'IMDb Rating', value: `⭐ ${details.rating}/10`, inline: true }
            )
            .setFooter({ text: 'Click the button below for more info' });

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel('View on IMDb')
              .setURL(details.link)
              .setStyle(ButtonStyle.Link)
              .setEmoji('🎥'),
            new ButtonBuilder()
              .setCustomId('random_movie_reroll')
              .setLabel('Pick Another')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('🎲')
          );

          await interaction.editReply({ embeds: [embed], components: [row] });
          break;
        }

        case 'recipe': {
          const guildId = interaction.guild?.id;
          if (!guildId) {
            await interaction.editReply({
              content: '❌ This command can only be used in a server.',
            });
            return;
          }

          const recipe = await Recipe.getRandom(guildId);
          if (!recipe) {
            await interaction.editReply({
              content: '❌ No recipes yet. Add some with `/recipe add`.',
            });
            return;
          }

          const descParts: string[] = [];
          if (recipe.cuisine) descParts.push(`🍽️ ${recipe.cuisine}`);
          if (recipe.difficulty) descParts.push(`⚙️ ${recipe.difficulty}`);
          if (recipe.dietary_tags && recipe.dietary_tags.length > 0) {
            descParts.push(`🥗 ${recipe.dietary_tags.join(', ')}`);
          }

          embed.setTitle(`🎲 Bwaincell Picks: ${recipe.name}`).setColor(0x9b59b6);
          if (descParts.length > 0) embed.setDescription(descParts.join(' • '));
          if (recipe.image_url) embed.setImage(recipe.image_url);
          embed.addFields(
            {
              name: '🍽️ Servings',
              value: recipe.servings !== null ? String(recipe.servings) : '?',
              inline: true,
            },
            {
              name: '⏱️ Prep Time',
              value: recipe.prep_time_minutes !== null ? `${recipe.prep_time_minutes} min` : '?',
              inline: true,
            },
            {
              name: '🔥 Cook Time',
              value: recipe.cook_time_minutes !== null ? `${recipe.cook_time_minutes} min` : '?',
              inline: true,
            }
          );

          const firstFive = recipe.ingredients
            .slice(0, 5)
            .map((ing: RecipeIngredient) => {
              const qty = formatQuantity(ing.quantity);
              const unit = ing.unit ? ` ${ing.unit}` : '';
              const prefix = qty ? `${qty}${unit} ` : '';
              return `- ${prefix}${ing.name}`.trim();
            })
            .join('\n');
          if (firstFive.length > 0) {
            embed.addFields({
              name: `🧂 Ingredients (${recipe.ingredients.length})`,
              value: `\`\`\`\n${firstFive}\n\`\`\``,
            });
          }
          embed.setFooter({ text: 'Use /recipe view to cook this' });

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('random_recipe_reroll')
              .setLabel('Pick Another')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('🎲')
          );

          await interaction.editReply({ embeds: [embed], components: [row] });
          break;
        }

        case 'date': {
          let dateIdea: string;
          let description: string = 'Make it special by adding your personal touch!';
          let footerText: string = '💡 Tip';

          // Try to use AI-powered suggestions
          try {
            const zipCode = process.env.LOCATION_ZIP_CODE || '90210';
            const geminiResponse = await GeminiService.generateDateIdea(zipCode);

            dateIdea = geminiResponse.activity;
            description = geminiResponse.description;
            footerText = '✨ Powered by AI';

            // Add cost and time fields if available
            if (geminiResponse.estimatedCost) {
              embed.addFields({
                name: '💰 Cost',
                value: geminiResponse.estimatedCost,
                inline: true,
              });
            }

            if (geminiResponse.timeOfDay) {
              embed.addFields({
                name: '🕐 Time',
                value: geminiResponse.timeOfDay,
                inline: true,
              });
            }

            if (geminiResponse.url) {
              embed.addFields({
                name: '🔗 Event Link',
                value: `[More Info](${geminiResponse.url})`,
                inline: false,
              });
            }

            logger.info('Generated AI date idea', { zipCode, activity: dateIdea });
          } catch (error) {
            // Fallback to static date ideas on any error
            logger.warn('Gemini API unavailable, using fallback', { error });
            dateIdea = dateIdeas[Math.floor(Math.random() * dateIdeas.length)];
          }

          embed
            .setTitle('💑 Random Date Idea')
            .setDescription(`**${dateIdea}**\n\n${description}`)
            .setFooter({ text: footerText });

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('random_date_reroll')
              .setLabel('Get Another Idea')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('💝')
          );

          await interaction.editReply({ embeds: [embed], components: [row] });
          break;
        }

        case 'question': {
          const levelColors: Record<number, number> = {
            1: 0x2ecc71, // Green - Perception
            2: 0x3498db, // Blue - Connection
            3: 0x9b59b6, // Purple - Reflection
          };

          let questionText: string;
          let footerText: string = '💡 Tip';

          try {
            const wnrsResponse = await GeminiService.generateQuestion();

            questionText = wnrsResponse.question;
            footerText = "✨ Inspired by We're Not Really Strangers • Powered by AI";
            embed.setColor(levelColors[wnrsResponse.level] || 0x9932cc);
            embed.addFields({
              name: '📊 Level',
              value: `Level ${wnrsResponse.level}: ${wnrsResponse.levelName}`,
              inline: true,
            });

            logger.info('Generated AI question', {
              level: wnrsResponse.level,
              levelName: wnrsResponse.levelName,
            });
          } catch (error) {
            logger.warn('Gemini API unavailable for question, using fallback', { error });
            questionText =
              conversationStarters[Math.floor(Math.random() * conversationStarters.length)];
          }

          embed
            .setTitle('💭 Conversation Starter')
            .setDescription(questionText)
            .setFooter({ text: footerText });

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('random_question_reroll')
              .setLabel('Next Question')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('💬')
          );

          await interaction.editReply({ embeds: [embed], components: [row] });
          break;
        }

        case 'choice': {
          const optionsString = interaction.options.getString('options', true);
          const options = optionsString
            .split(',')
            .map((opt) => opt.trim())
            .filter((opt) => opt.length > 0);

          if (options.length < 2) {
            await interaction.editReply({
              content: 'Please provide at least 2 options separated by commas.',
            });
            return;
          }

          const choice = options[Math.floor(Math.random() * options.length)];
          embed
            .setTitle('🎲 Random Choice')
            .setDescription(`From: ${options.join(', ')}\n\nI choose: **${choice}**`);

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'number': {
          const max = interaction.options.getInteger('max', true);

          const number = Math.floor(Math.random() * max) + 1;
          embed
            .setTitle('🔢 Random Number')
            .setDescription(`Range: 1 - ${max}\n\nResult: **${number}**`);

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'coin': {
          const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
          const emoji = result === 'Heads' ? '👑' : '⚡';
          embed.setTitle('🪙 Coin Flip').setDescription(`${emoji} **${result}**`);

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('random_coin_flip')
              .setLabel('Flip Again')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('🪙')
          );

          await interaction.editReply({ embeds: [embed], components: [row] });
          break;
        }

        case 'dice': {
          const sides = interaction.options.getInteger('sides') || 6;
          const count = interaction.options.getInteger('count') || 1;
          const rolls: number[] = [];
          let total = 0;

          for (let i = 0; i < count; i++) {
            const roll = Math.floor(Math.random() * sides) + 1;
            rolls.push(roll);
            total += roll;
          }

          embed.setTitle('🎲 Dice Roll').setDescription(`Rolling ${count}d${sides}`);

          if (count === 1) {
            embed.addFields({ name: 'Result', value: `**${rolls[0]}**` });
          } else {
            embed.addFields(
              { name: 'Rolls', value: rolls.join(', ') },
              { name: 'Total', value: `**${total}**` }
            );
          }

          await interaction.editReply({ embeds: [embed] });
          break;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('Error in random command', {
        subcommand,
        error: errorMessage,
        stack: errorStack,
      });

      await interaction.editReply({
        content: 'An error occurred while processing your request.',
      });
    }
  },
};
