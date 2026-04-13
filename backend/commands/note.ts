import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from 'discord.js';
import { logger } from '../shared/utils/logger';
import Note from '../../supabase/models/Note';

interface NoteUpdateData {
  title?: string;
  content?: string;
  tags?: string[];
}

export default {
  data: new SlashCommandBuilder()
    .setName('note')
    .setDescription('Manage your notes')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Create a new note')
        .addStringOption((option) =>
          option.setName('title').setDescription('Note title').setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('content').setDescription('Note content').setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('tags').setDescription('Comma-separated tags').setRequired(false)
        )
    )
    .addSubcommand((subcommand) => subcommand.setName('list').setDescription('Show all your notes'))
    .addSubcommand((subcommand) =>
      subcommand
        .setName('view')
        .setDescription('Display a specific note')
        .addStringOption((option) =>
          option
            .setName('title')
            .setDescription('Note title to view')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('delete')
        .setDescription('Remove a note')
        .addStringOption((option) =>
          option
            .setName('title')
            .setDescription('Note title to delete')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('search')
        .setDescription('Search notes by keyword')
        .addStringOption((option) =>
          option.setName('keyword').setDescription('Keyword to search for').setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('edit')
        .setDescription('Edit an existing note')
        .addStringOption((option) =>
          option
            .setName('current_title')
            .setDescription('Current note title')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((option) =>
          option
            .setName('new_title')
            .setDescription('New title (leave empty to keep current)')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('content')
            .setDescription('New content (leave empty to keep current)')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option.setName('tags').setDescription('New comma-separated tags').setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('tag')
        .setDescription('Find notes by tag')
        .addStringOption((option) =>
          option.setName('tag').setDescription('Tag to search for').setRequired(true)
        )
    )
    .addSubcommand((subcommand) => subcommand.setName('tags').setDescription('List all your tags')),

  async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const userId = interaction.user.id;
    const guildId = interaction.guild?.id;

    if (!guildId) {
      await interaction.respond([]);
      return;
    }

    try {
      const focused = interaction.options.getFocused(true);

      if (focused.name === 'title' || focused.name === 'current_title') {
        const notes = await Note.getNotes(guildId);
        const titles = notes.map((note: InstanceType<typeof Note>) => note.title).slice(0, 25);

        const filtered = titles.filter((title: string) =>
          title.toLowerCase().includes(focused.value.toLowerCase())
        );

        await interaction.respond(filtered.map((title: string) => ({ name: title, value: title })));
      }
    } catch (error) {
      logger.error('Error in note autocomplete', {
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
        case 'add': {
          const title = interaction.options.getString('title', true);
          const content = interaction.options.getString('content', true);
          const tagsString = interaction.options.getString('tags');
          const tags = tagsString ? tagsString.split(',').map((tag) => tag.trim()) : [];
          const note = await Note.createNote(guildId, title, content, tags, userId);

          const embed = new EmbedBuilder()
            .setTitle('Note Created')
            .setDescription(`📝 **${title}**`)
            .addFields({ name: 'Note ID', value: `#${note.id}` })
            .setColor(0x00ff00)
            .setTimestamp();

          if (tags.length > 0) {
            embed.addFields({ name: 'Tags', value: tags.join(', ') });
          }

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'list': {
          const notes = await Note.getNotes(guildId);

          if (notes.length === 0) {
            await interaction.editReply({
              content: 'You have no notes.',
            });
            return;
          }

          const embed = new EmbedBuilder().setTitle('Your Notes').setColor(0x0099ff).setTimestamp();

          const noteList = notes
            .slice(0, 10)
            .map((note) => {
              const tags = note.tags && note.tags.length > 0 ? ` [${note.tags.join(', ')}]` : '';
              const preview =
                note.content.substring(0, 50) + (note.content.length > 50 ? '...' : '');
              return `**#${note.id}** - ${note.title}${tags}\n📝 ${preview}`;
            })
            .join('\n\n');

          embed.setDescription(noteList);

          if (notes.length > 10) {
            embed.setFooter({ text: `Showing 10 of ${notes.length} notes` });
          } else {
            embed.setFooter({ text: `${notes.length} note(s)` });
          }

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'view': {
          const title = interaction.options.getString('title', true);
          const notes = await Note.getNotes(guildId);
          const note = notes.find(
            (n: InstanceType<typeof Note>) => n.title.toLowerCase() === title.toLowerCase()
          );

          if (!note) {
            await interaction.editReply({
              content: `Note "${title}" not found.`,
            });
            return;
          }

          const embed = new EmbedBuilder()
            .setTitle(note.title)
            .setDescription(note.content)
            .setColor(0x0099ff)
            .addFields({
              name: 'Created',
              value: new Date(note.created_at).toLocaleDateString(),
              inline: true,
            })
            .setTimestamp();

          if (note.tags && note.tags.length > 0) {
            embed.addFields({ name: 'Tags', value: note.tags.join(', ') });
          }

          if (note.updated_at !== note.created_at) {
            embed.addFields({
              name: '**Last Updated**',
              value: new Date(note.updated_at).toLocaleDateString(),
            });
          }

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'delete': {
          const title = interaction.options.getString('title', true);
          const notes = await Note.getNotes(guildId);
          const note = notes.find(
            (n: InstanceType<typeof Note>) => n.title.toLowerCase() === title.toLowerCase()
          );

          if (!note) {
            await interaction.editReply({
              content: `Note "${title}" not found.`,
            });
            return;
          }

          const deleted: boolean = await Note.deleteNote(note.id, guildId);

          if (!deleted) {
            await interaction.editReply({
              content: `Failed to delete note "${title}".`,
            });
            return;
          }

          await interaction.editReply({
            content: `Note "${title}" has been deleted.`,
          });
          break;
        }

        case 'search': {
          const keyword = interaction.options.getString('keyword', true);
          const notes = await Note.searchNotes(guildId, keyword);

          if (notes.length === 0) {
            await interaction.editReply({
              content: `No notes found containing "${keyword}".`,
            });
            return;
          }

          const embed = new EmbedBuilder()
            .setTitle(`Search Results for "${keyword}"`)
            .setColor(0x0099ff)
            .setTimestamp();

          const noteList = notes
            .slice(0, 10)
            .map((note) => {
              const tags = note.tags && note.tags.length > 0 ? ` [${note.tags.join(', ')}]` : '';
              return `**#${note.id}** - ${note.title}${tags}`;
            })
            .join('\n');

          embed.setDescription(noteList);
          embed.setFooter({ text: `Found ${notes.length} note(s)` });

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'edit': {
          const currentTitle = interaction.options.getString('current_title', true);
          const newTitle = interaction.options.getString('new_title');
          const newContent = interaction.options.getString('content');
          const tagsString = interaction.options.getString('tags');

          const notes = await Note.getNotes(guildId);
          const existingNote = notes.find(
            (n: InstanceType<typeof Note>) => n.title.toLowerCase() === currentTitle.toLowerCase()
          );

          if (!existingNote) {
            await interaction.editReply({
              content: `Note "${currentTitle}" not found.`,
            });
            return;
          }

          const updates: NoteUpdateData = {};
          if (newTitle) updates.title = newTitle;
          if (newContent) updates.content = newContent;
          if (tagsString !== null)
            updates.tags = tagsString.split(',').map((tag: string) => tag.trim());

          if (Object.keys(updates).length === 0) {
            await interaction.editReply({
              content: 'No changes provided.',
            });
            return;
          }

          const note = await Note.updateNote(existingNote.id, guildId, updates);

          if (!note) {
            await interaction.editReply({
              content: `Failed to update note "${currentTitle}".`,
            });
            return;
          }

          const embed = new EmbedBuilder()
            .setTitle('Note Updated')
            .setDescription(`Note "${currentTitle}" has been updated successfully.`)
            .addFields({ name: 'New Title', value: note.title })
            .setColor(0x00ff00)
            .setTimestamp();

          if (note.tags && note.tags.length > 0) {
            embed.addFields({ name: 'Tags', value: note.tags.join(', ') });
          }

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'tag': {
          const tag = interaction.options.getString('tag', true);
          const notes = await Note.getNotesByTag(guildId, tag);

          if (notes.length === 0) {
            await interaction.editReply({
              content: `No notes found with tag "${tag}".`,
            });
            return;
          }

          const embed = new EmbedBuilder()
            .setTitle(`Notes tagged with "${tag}"`)
            .setColor(0x0099ff)
            .setTimestamp();

          const noteList = notes
            .slice(0, 10)
            .map((note) => {
              return `**#${note.id}** - ${note.title}`;
            })
            .join('\n');

          embed.setDescription(noteList);
          embed.setFooter({ text: `Found ${notes.length} note(s)` });

          await interaction.editReply({ embeds: [embed] });
          break;
        }

        case 'tags': {
          const tags: string[] = await Note.getAllTags(guildId);

          if (tags.length === 0) {
            await interaction.editReply({
              content: 'No tags found in your notes.',
            });
            return;
          }

          const embed = new EmbedBuilder()
            .setTitle('Your Tags')
            .setDescription(tags.map((tag) => `🏷️ ${tag}`).join('\n'))
            .setColor(0x0099ff)
            .setFooter({ text: `${tags.length} unique tag(s)` })
            .setTimestamp();

          await interaction.editReply({ embeds: [embed] });
          break;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('Error in note command', {
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
        await interaction.editReply(replyMessage);
      }
    }
  },
};
