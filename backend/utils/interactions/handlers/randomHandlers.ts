import {
  ButtonInteraction,
  CacheType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { movieData } from '../../recipeData';
import { handleInteractionError } from '../responses/errorResponses';
import { GeminiService } from '../../geminiService';
import { logger } from '../../../shared/utils/logger';
import Recipe from '../../../../supabase/models/Recipe';
import { formatQuantity } from '../../fractionFormat';
import type { RecipeIngredient } from '../../../../supabase/types';

const dateIdeas = [
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

const conversationStarters = [
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

export async function handleRandomButton(interaction: ButtonInteraction<CacheType>): Promise<void> {
  const customId = interaction.customId;
  const guildId = interaction.guild?.id;

  if (!guildId) {
    // Check if already acknowledged before responding
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply({
        content: '❌ This command can only be used in a server.',
        ephemeral: true,
      });
    } else {
      await interaction.followUp({
        content: '❌ This command can only be used in a server.',
        ephemeral: true,
      });
    }
    return;
  }

  try {
    // Movie reroll
    if (customId === 'random_movie_reroll') {
      const movieTitles = Object.keys(movieData);
      const movie = movieTitles[Math.floor(Math.random() * movieTitles.length)];
      const details = movieData[movie as keyof typeof movieData];

      const embed = new EmbedBuilder()
        .setTitle('🎬 Random Movie Pick')
        .setDescription(`**${movie}**`)
        .addFields(
          { name: 'Year', value: details.year, inline: true },
          { name: 'Genre', value: details.genre, inline: true },
          { name: 'IMDb Rating', value: `⭐ ${details.rating}/10`, inline: true }
        )
        .setColor(0x9932cc)
        .setTimestamp()
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

      // Check if already acknowledged before updating
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }
      await interaction.editReply({ embeds: [embed], components: [row] });
      return;
    }

    // Recipe reroll (pick from user's saved recipes)
    if (customId === 'random_recipe_reroll') {
      const recipe = await Recipe.getRandom(guildId);
      if (!recipe) {
        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferUpdate();
        }
        await interaction.editReply({
          content: '❌ No recipes yet. Add some with `/recipe add`.',
          embeds: [],
          components: [],
        });
        return;
      }

      const descParts: string[] = [];
      if (recipe.cuisine) descParts.push(`🍽️ ${recipe.cuisine}`);
      if (recipe.difficulty) descParts.push(`⚙️ ${recipe.difficulty}`);
      if (recipe.dietary_tags && recipe.dietary_tags.length > 0) {
        descParts.push(`🥗 ${recipe.dietary_tags.join(', ')}`);
      }

      const embed = new EmbedBuilder()
        .setTitle(`🎲 Bwaincell Picks: ${recipe.name}`)
        .setColor(0x9b59b6)
        .setTimestamp()
        .setFooter({ text: 'Use /recipe view to cook this' });
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

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('random_recipe_reroll')
          .setLabel('Pick Another')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🎲')
      );

      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }
      await interaction.editReply({ embeds: [embed], components: [row] });
      return;
    }

    // Date idea reroll
    if (customId === 'random_date_reroll') {
      const date = dateIdeas[Math.floor(Math.random() * dateIdeas.length)];
      const embed = new EmbedBuilder()
        .setTitle('💑 Random Date Idea')
        .setDescription(`**${date}**`)
        .addFields({ name: '💡 Tip', value: 'Make it special by adding your personal touch!' })
        .setColor(0x9932cc)
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('random_date_reroll')
          .setLabel('Get Another Idea')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('💝')
      );

      // Check if already acknowledged before updating
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }
      await interaction.editReply({ embeds: [embed], components: [row] });
      return;
    }

    // Conversation starter reroll
    if (customId === 'random_question_reroll') {
      const levelColors: Record<number, number> = {
        1: 0x2ecc71, // Green - Perception
        2: 0x3498db, // Blue - Connection
        3: 0x9b59b6, // Purple - Reflection
      };

      let questionText: string;
      let footerText: string = '💡 Tip';
      let embedColor: number = 0x9932cc;

      try {
        const wnrsResponse = await GeminiService.generateQuestion();

        questionText = wnrsResponse.question;
        footerText = "✨ Inspired by We're Not Really Strangers • Powered by AI";
        embedColor = levelColors[wnrsResponse.level] || 0x9932cc;

        const embed = new EmbedBuilder()
          .setTitle('💭 Conversation Starter')
          .setDescription(questionText)
          .addFields({
            name: '📊 Level',
            value: `Level ${wnrsResponse.level}: ${wnrsResponse.levelName}`,
            inline: true,
          })
          .setColor(embedColor)
          .setTimestamp()
          .setFooter({ text: footerText });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('random_question_reroll')
            .setLabel('Next Question')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('💬')
        );

        if (!interaction.deferred && !interaction.replied) {
          await interaction.deferUpdate();
        }
        await interaction.editReply({ embeds: [embed], components: [row] });
        return;
      } catch (error) {
        logger.warn('Gemini API unavailable for question reroll, using fallback', { error });
        questionText =
          conversationStarters[Math.floor(Math.random() * conversationStarters.length)];
      }

      const embed = new EmbedBuilder()
        .setTitle('💭 Conversation Starter')
        .setDescription(questionText)
        .setColor(embedColor)
        .setTimestamp()
        .setFooter({ text: footerText });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('random_question_reroll')
          .setLabel('Next Question')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('💬')
      );

      // Check if already acknowledged before updating
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }
      await interaction.editReply({ embeds: [embed], components: [row] });
      return;
    }

    // Coin flip
    if (customId === 'random_coin_flip') {
      const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
      const emoji = result === 'Heads' ? '👑' : '⚡';
      const embed = new EmbedBuilder()
        .setTitle('🪙 Coin Flip')
        .setDescription(`${emoji} **${result}**`)
        .setColor(0x9932cc)
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('random_coin_flip')
          .setLabel('Flip Again')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🪙')
      );

      // Check if already acknowledged before updating
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }
      await interaction.editReply({ embeds: [embed], components: [row] });
      return;
    }
  } catch (error) {
    await handleInteractionError(interaction, error, 'random button handler');
  }
}
