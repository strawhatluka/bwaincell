import {
  ButtonInteraction,
  CacheType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { dinnerOptions, movieData } from '../../recipeData';
import { getModels } from '../helpers/databaseHelper';
import { handleInteractionError } from '../responses/errorResponses';
import { GeminiService } from '../../geminiService';
import { logger } from '../../../shared/utils/logger';

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
  const userId = interaction.user.id;
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

    // Dinner reroll
    if (customId === 'random_dinner_reroll') {
      const dinnerNames = Object.keys(dinnerOptions);
      const dinner = dinnerNames[Math.floor(Math.random() * dinnerNames.length)];
      const details = dinnerOptions[dinner as keyof typeof dinnerOptions];

      const embed = new EmbedBuilder()
        .setTitle('🍽️ Random Dinner Pick')
        .setDescription(`**${dinner}**\n${details.description}`)
        .setImage(details.image)
        .addFields(
          { name: '⏱️ Prep Time', value: details.prepTime, inline: true },
          { name: '📊 Difficulty', value: details.difficulty, inline: true }
        )
        .setColor(0x9932cc)
        .setTimestamp()
        .setFooter({ text: 'Click below for the full recipe!' });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('View Recipe')
          .setURL(details.recipe)
          .setStyle(ButtonStyle.Link)
          .setEmoji('📖'),
        new ButtonBuilder()
          .setCustomId('random_dinner_reroll')
          .setLabel('Pick Another')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🎲'),
        new ButtonBuilder()
          .setCustomId(`save_dinner_${encodeURIComponent(dinner)}`)
          .setLabel('Save to List')
          .setStyle(ButtonStyle.Success)
          .setEmoji('💾')
      );

      // Check if already acknowledged before updating
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }
      await interaction.editReply({ embeds: [embed], components: [row] });
      return;
    }

    // Save dinner to list
    if (customId.startsWith('save_dinner_')) {
      const dinnerName = decodeURIComponent(customId.replace('save_dinner_', ''));
      const { List } = await getModels();

      // Try to find or create a "Meal Ideas" list
      let list = await List.getList(guildId, 'Meal Ideas');

      if (!list) {
        list = await List.createList(guildId, 'Meal Ideas', userId);
      }

      // Add the dinner to the list
      const updated = await List.addItem(guildId, 'Meal Ideas', dinnerName);

      // Check if already acknowledged before responding
      if (!interaction.deferred && !interaction.replied) {
        if (updated) {
          await interaction.reply({
            content: `✅ Added "${dinnerName}" to your Meal Ideas list!`,
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: `❌ Could not add item to list.`,
            ephemeral: true,
          });
        }
      } else {
        if (updated) {
          await interaction.followUp({
            content: `✅ Added "${dinnerName}" to your Meal Ideas list!`,
            ephemeral: true,
          });
        } else {
          await interaction.followUp({
            content: `❌ Could not add item to list.`,
            ephemeral: true,
          });
        }
      }
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
