import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from 'discord.js';
import { logger } from '../shared/utils/logger';
import List, { ListItem } from '../../supabase/models/List';

export default {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('Manage your lists')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
        .setDescription('Create a new list')
        .addStringOption((option) =>
          option.setName('name').setDescription('List name').setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add item to a list')
        .addStringOption((option) =>
          option
            .setName('list_name')
            .setDescription('Name of the list')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option.setName('item').setDescription('Item to add').setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('show')
        .setDescription('Display a list')
        .addStringOption((option) =>
          option
            .setName('list_name')
            .setDescription('Name of the list to show')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove item from a list')
        .addStringOption((option) =>
          option
            .setName('list_name')
            .setDescription('Name of the list')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option
            .setName('item')
            .setDescription('Item to remove')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('clear')
        .setDescription('Clear completed items from a list')
        .addStringOption((option) =>
          option
            .setName('list_name')
            .setDescription('Name of the list')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('delete')
        .setDescription('Delete entire list')
        .addStringOption((option) =>
          option
            .setName('list_name')
            .setDescription('Name of the list to delete')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) => subcommand.setName('all').setDescription('Show all your lists'))
    .addSubcommand((subcommand) =>
      subcommand
        .setName('complete')
        .setDescription('Mark an item as complete')
        .addStringOption((option) =>
          option
            .setName('list_name')
            .setDescription('Name of the list')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option
            .setName('item')
            .setDescription('Item to mark as complete')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const userId = interaction.user.id;
    const guildId = interaction.guild?.id;

    if (!guildId) {
      await interaction.respond([]);
      return;
    }

    try {
      if (focused.name === 'list_name') {
        const lists = await List.getUserLists(guildId);
        const choices = lists.map((list: InstanceType<typeof List>) => list.name).slice(0, 25);

        const filtered = choices.filter((choice: string) =>
          choice.toLowerCase().includes(focused.value.toLowerCase())
        );

        await interaction.respond(
          filtered.map((choice: string) => ({ name: choice, value: choice }))
        );
      } else if (focused.name === 'item') {
        const listName = interaction.options.getString('list_name');
        if (listName) {
          const list = await List.getList(guildId, listName);
          if (list && list.items) {
            const items = list.items.map((item: ListItem) => item.text).slice(0, 25);
            const filtered = items.filter((item: string) =>
              item.toLowerCase().includes(focused.value.toLowerCase())
            );

            await interaction.respond(
              filtered.map((choice: string) => ({ name: choice, value: choice }))
            );
          } else {
            await interaction.respond([]);
          }
        } else {
          await interaction.respond([]);
        }
      }
    } catch (error) {
      logger.error('Error in list autocomplete', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        guildId,
      });
      await interaction.respond([]);
    }
  },

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // Note: Interaction is already deferred by bot.js for immediate acknowledgment

    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild?.id;

    if (!guildId) {
      await interaction.editReply({
        content: 'This command can only be used in a server.',
      });
      return;
    }

    try {
      switch (subcommand) {
        case 'create': {
          const name = interaction.options.getString('name', true);
          const list = await List.createList(guildId, name, userId);

          if (!list) {
            await interaction.editReply({
              content: `A list named "${name}" already exists.`,
            });
            return;
          }

          const embed = new EmbedBuilder()
            .setTitle('List Created')
            .setDescription(`List "${name}" has been created successfully.`)
            .setColor(0x00ff00)
            .setTimestamp();

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`list_add_${name}`)
              .setLabel('Add Item')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('➕'),
            new ButtonBuilder()
              .setCustomId(`list_view_${name}`)
              .setLabel('View List')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('👁️')
          );

          await interaction.editReply({ embeds: [embed], components: [row] });
          break;
        }

        case 'add': {
          const listName = interaction.options.getString('list_name', true);
          const item = interaction.options.getString('item', true);
          const list = await List.addItem(guildId, listName, item);

          if (!list) {
            await interaction.editReply({
              content: `List "${listName}" not found.`,
            });
            return;
          }

          const embed = new EmbedBuilder()
            .setTitle('Item Added')
            .setDescription(`Added "${item}" to list "${listName}"`)
            .setColor(0x00ff00)
            .addFields({ name: 'Total Items', value: list.items.length.toString() })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'show': {
          const listName = interaction.options.getString('list_name', true);
          const list = await List.getList(guildId, listName);

          if (!list) {
            await interaction.editReply({
              content: `List "${listName}" not found.`,
            });
            return;
          }

          const embed = new EmbedBuilder()
            .setTitle(`List: ${listName}`)
            .setColor(0x0099ff)
            .setTimestamp();

          if (list.items.length === 0) {
            embed.setDescription('This list is empty.');
          } else {
            const itemsList = list.items
              .map((item: ListItem) => {
                const status = item.completed ? '✅' : '☐';
                return `${status} ${item.text}`;
              })
              .join('\n');

            embed.setDescription(itemsList);

            const completed = list.items.filter((item: ListItem) => item.completed).length;
            embed.setFooter({ text: `${completed}/${list.items.length} completed` });
          }

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`list_add_${listName}`)
              .setLabel('Add Item')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('➕'),
            new ButtonBuilder()
              .setCustomId(`list_mark_complete_${listName}`)
              .setLabel('Mark Complete')
              .setStyle(ButtonStyle.Success)
              .setEmoji('✅')
              .setDisabled(
                list.items.length === 0 || list.items.every((item: ListItem) => item.completed)
              ),
            new ButtonBuilder()
              .setCustomId(`list_clear_completed_${listName}`)
              .setLabel('Clear Completed')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('🧹')
              .setDisabled(!list.items || !list.items.some((item: ListItem) => item.completed))
          );

          await interaction.editReply({ embeds: [embed], components: [row] });
          break;
        }

        case 'remove': {
          const listName = interaction.options.getString('list_name', true);
          const item = interaction.options.getString('item', true);
          const list = await List.removeItem(guildId, listName, item);

          if (!list) {
            await interaction.editReply({
              content: `List "${listName}" not found or item "${item}" doesn't exist.`,
            });
            return;
          }

          await interaction.editReply({
            content: `Removed "${item}" from list "${listName}".`,
          });
          break;
        }

        case 'clear': {
          const listName = interaction.options.getString('list_name', true);
          const list = await List.clearCompleted(guildId, listName);

          if (!list) {
            await interaction.editReply({
              content: `List "${listName}" not found.`,
            });
            return;
          }

          await interaction.editReply({
            content: `Cleared completed items from list "${listName}".`,
          });
          break;
        }

        case 'delete': {
          const listName = interaction.options.getString('list_name', true);

          const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`list_delete_confirm_${listName}`)
              .setLabel('Confirm Delete')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('⚠️'),
            new ButtonBuilder()
              .setCustomId('list_delete_cancel')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Secondary)
              .setEmoji('❌')
          );

          await interaction.editReply({
            content: `Are you sure you want to delete list "${listName}"? This action cannot be undone.`,
            components: [confirmRow],
          });
          break;
        }

        case 'all': {
          const lists = await List.getUserLists(guildId);

          if (lists.length === 0) {
            await interaction.editReply({
              content: 'You have no lists.',
            });
            return;
          }

          const embed = new EmbedBuilder().setTitle('Your Lists').setColor(0x0099ff).setTimestamp();

          const listInfo = lists
            .map((list: InstanceType<typeof List>) => {
              const itemCount = list.items ? list.items.length : 0;
              const completedCount = list.items
                ? list.items.filter((item: ListItem) => item.completed).length
                : 0;
              return `📋 **${list.name}** - ${itemCount} items (${completedCount} completed)`;
            })
            .join('\n');

          embed.setDescription(listInfo);
          embed.setFooter({ text: `Total lists: ${lists.length}` });

          if (lists.length > 0 && lists.length <= 5) {
            const selectMenu = new StringSelectMenuBuilder()
              .setCustomId('list_select_view')
              .setPlaceholder('Select a list to view')
              .addOptions(
                lists.map((list, index) => ({
                  label: list.name,
                  description: `${list.items ? list.items.length : 0} items`,
                  value: `${list.name}_${index}`,
                }))
              );

            const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

            await interaction.editReply({ embeds: [embed], components: [row] });
          } else {
            await interaction.editReply({ embeds: [embed] });
          }
          break;
        }

        case 'complete': {
          const listName = interaction.options.getString('list_name', true);
          const item = interaction.options.getString('item', true);
          const list = await List.toggleItem(guildId, listName, item);

          if (!list) {
            await interaction.editReply({
              content: `List "${listName}" not found or item "${item}" doesn't exist.`,
            });
            return;
          }

          const toggledItem = list.items.find(
            (i: ListItem) => i.text.toLowerCase() === item.toLowerCase()
          );
          if (!toggledItem) {
            await interaction.editReply({
              content: `Item "${item}" not found in list "${listName}".`,
            });
            return;
          }

          const status = toggledItem.completed ? 'completed' : 'uncompleted';

          await interaction.editReply({
            content: `Item "${item}" marked as ${status}.`,
          });
          break;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('Error in list command', {
        command: interaction.commandName,
        subcommand,
        error: errorMessage,
        stack: errorStack,
        userId: interaction.user.id,
        guildId: interaction.guild?.id,
      });

      const replyMessage = {
        content: 'An error occurred while processing your request.',
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyMessage);
      } else {
        await interaction.reply(replyMessage);
      }
    }
  },
};
