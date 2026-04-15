# Discord Bot Development Guide

**Last Updated:** 2026-04-15

> **Supabase update (2026-04-15):** Commands no longer use Sequelize. Use the typed model wrappers in `supabase/models/*.ts`. Any `Model.findAll` / `sequelize.sync()` patterns shown later in this file are historical.

## Command inventory (12)

`/budget`, `/events`, `/issues`, `/list`, `/note`, `/quote`, `/random`, `/recipe`, `/remind`, `/schedule`, `/sunset`, `/task`

Each command file lives in `backend/commands/` and exports `data` (a `SlashCommandBuilder`) and `execute(interaction)`.

## Data access pattern (current)

```typescript
// backend/commands/task.ts (illustrative)
import { SlashCommandBuilder } from 'discord.js';
import * as Task from '../../supabase/models/Task';

export const data = new SlashCommandBuilder().setName('task').setDescription('Manage tasks');

export async function execute(interaction) {
  const guildId = interaction.guildId!;
  const tasks = await Task.getGuildTasks(guildId);
  await interaction.reply({
    content: `You have ${tasks.length} tasks`,
    ephemeral: true,
  });
}
```

## Feature command scaffolds

### `/recipe`

`backend/commands/recipe.ts` defines the top-level command. Button and select-menu interactions (add-from-url, favorite-toggle, view-details, meal-plan-slot-assign) are routed through **`backend/utils/interactions/handlers/recipeHandlers.ts`**, which exports handlers keyed by `customId` prefix.

```typescript
// backend/utils/interactions/handlers/recipeHandlers.ts (pattern)
export async function handleButton(interaction: ButtonInteraction) {
  const [scope, action, ...rest] = interaction.customId.split(':');
  if (scope !== 'recipe') return false;

  switch (action) {
    case 'favorite': {
      const recipeId = Number(rest[0]);
      await Recipe.toggleFavorite(recipeId, interaction.guildId!);
      await interaction.deferUpdate();
      return true;
    }
    // ...
  }
  return false;
}
```

Ingest pipeline helpers live in `backend/utils/`:

- `recipeScraper.ts` — URL/video ingestion
- `recipeIngestion.ts` — orchestrates scrape → normalize → persist
- `recipeNormalize.ts` + `ingredientCanonical.ts` — ingredient canonicalization
- `geminiService.ts` — `@google/genai` client
- `shoppingList.ts` — AI consolidated shopping list from active meal plan

### `/sunset`

`backend/commands/sunset.ts` upserts the single per-guild row in `sunset_configs` via `supabase/models/SunsetConfig.ts`. The actual scheduling happens in `backend/utils/sunsetService.ts` on top of `node-cron`, with sunset imagery rendered by `imageService.ts` (skia-canvas).

### `/events`

`backend/commands/events.ts` configures `event_configs` (per-guild). `backend/utils/eventsService.ts` + `node-cron` runs the weekly announcement.

### `/quote`

`backend/commands/quote.ts` — quote storage + retrieval (uses `notes`-style patterns through a Supabase model wrapper).

### `/random`

Uses `geminiService.ts` + `LOCATION_ZIP_CODE` for location-aware suggestions.

## Interaction handlers

`backend/utils/interactions/handlers/` contains:

- `listHandlers.ts`
- `randomHandlers.ts`
- `recipeHandlers.ts`
- `reminderHandlers.ts`
- `selectMenuHandlers.ts`
- `taskHandlers.ts`

Each exports named handlers that receive the raw `Interaction` and return a boolean indicating whether they consumed it; the central dispatcher in the bot's interaction-create listener fans out to them in order.
**Target:** Contributors adding Discord slash commands and interactions

---

## Table of Contents

1. [Overview](#overview)
2. [Discord.js Architecture](#discordjs-architecture)
3. [SlashCommandBuilder Structure](#slashcommandbuilder-structure)
4. [Command Registration](#command-registration)
5. [Interaction Handlers](#interaction-handlers)
6. [Event Listeners](#event-listeners)
7. [Permissions and Roles](#permissions-and-roles)
8. [Error Handling](#error-handling)
9. [Testing Discord Commands](#testing-discord-commands)
10. [End-to-End Example](#end-to-end-example)
11. [Best Practices](#best-practices)

---

## Overview

Bwaincell's Discord bot is built with **Discord.js v14** and provides slash commands, button interactions, select menus, and modals. This guide covers creating new Discord features with proper error handling and testing.

### Bot Architecture

```
backend/
├── src/
│   └── bot.ts                 # Bot initialization and event handlers
├── commands/
│   ├── tasks.ts               # /tasks command
│   ├── reminders.ts           # /reminders command
│   ├── notes.ts               # /notes command
│   └── ...
└── utils/
    └── interactions/
        ├── index.ts           # Main interaction router
        ├── handlers/
        │   ├── taskHandlers.ts      # Task button handlers
        │   ├── reminderHandlers.ts  # Reminder button handlers
        │   └── ...
        └── modals/
            └── modalHandlers.ts     # Modal submission handlers
```

### Key Concepts

- **Slash Commands:** `/tasks list`, `/reminders add`
- **Button Interactions:** Complete task, delete task
- **Select Menus:** Choose from list of options
- **Modals:** Form popups for complex input
- **Ephemeral Messages:** Only visible to command user

---

## Discord.js Architecture

### Bot Initialization

**File:** `backend/src/bot.ts`

```typescript
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { validateEnv } from '@shared/validation/env';
import { logger } from '@shared/utils/logger';

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // Access to guild information
    GatewayIntentBits.GuildMessages, // Read messages in guilds
    GatewayIntentBits.DirectMessages, // Support DMs
  ],
});

// Attach commands collection to client
client.commands = new Collection();

// Load commands
async function loadCommands() {
  const commandFiles = await fs.readdir('./commands');

  for (const file of commandFiles.filter((f) => f.endsWith('.ts'))) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
    logger.info(`Loaded command: ${command.data.name}`);
  }
}

// Event handlers
client.once('ready', () => {
  logger.info(`Bot logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error('Command execution error', { error: error.message });
      await interaction.reply({
        content: 'An error occurred while executing this command.',
        ephemeral: true,
      });
    }
  }
});

// Login
await loadCommands();
await client.login(process.env.BOT_TOKEN);
```

### Command File Structure

All commands export:

1. **data:** SlashCommandBuilder definition
2. **execute:** Command execution function

```typescript
import { SlashCommandBuilder, CommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('command-name')
  .setDescription('Command description');

export async function execute(interaction: CommandInteraction) {
  // Command logic
}
```

---

## SlashCommandBuilder Structure

### Basic Command

```typescript
import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!');

export async function execute(interaction) {
  await interaction.reply('Pong!');
}
```

### Command with String Option

```typescript
export const data = new SlashCommandBuilder()
  .setName('echo')
  .setDescription('Echoes your message')
  .addStringOption((option) =>
    option.setName('message').setDescription('Message to echo').setRequired(true)
  );

export async function execute(interaction) {
  const message = interaction.options.getString('message');
  await interaction.reply(message);
}
```

### Command with Subcommands

```typescript
export const data = new SlashCommandBuilder()
  .setName('tasks')
  .setDescription('Manage your tasks')
  .addSubcommand((subcommand) => subcommand.setName('list').setDescription('List all your tasks'))
  .addSubcommand((subcommand) =>
    subcommand
      .setName('add')
      .setDescription('Add a new task')
      .addStringOption((option) =>
        option.setName('title').setDescription('Task title').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('description').setDescription('Task description').setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('complete')
      .setDescription('Mark a task as completed')
      .addStringOption((option) =>
        option.setName('task-id').setDescription('ID of the task to complete').setRequired(true)
      )
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'list':
      await handleList(interaction);
      break;
    case 'add':
      await handleAdd(interaction);
      break;
    case 'complete':
      await handleComplete(interaction);
      break;
  }
}

async function handleList(interaction) {
  // Implementation
}

async function handleAdd(interaction) {
  const title = interaction.options.getString('title');
  const description = interaction.options.getString('description');
  // Implementation
}

async function handleComplete(interaction) {
  const taskId = interaction.options.getString('task-id');
  // Implementation
}
```

### Option Types

```typescript
.addStringOption(option => /* ... */)      // Text input
.addIntegerOption(option => /* ... */)     // Whole number
.addNumberOption(option => /* ... */)      // Decimal number
.addBooleanOption(option => /* ... */)     // True/false
.addUserOption(option => /* ... */)        // Mention a user
.addChannelOption(option => /* ... */)     // Select a channel
.addRoleOption(option => /* ... */)        // Select a role
.addAttachmentOption(option => /* ... */)  // File upload
```

### Autocomplete Options

```typescript
export const data = new SlashCommandBuilder()
  .setName('tasks')
  .setDescription('Manage tasks')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('complete')
      .setDescription('Complete a task')
      .addStringOption(
        (option) =>
          option
            .setName('task')
            .setDescription('Task to complete')
            .setRequired(true)
            .setAutocomplete(true) // Enable autocomplete
      )
  );

export async function execute(interaction) {
  // Handle command execution
}

export async function autocomplete(interaction) {
  const focusedValue = interaction.options.getFocused();
  const userId = interaction.user.id;

  // Fetch user's tasks
  const tasks = await Task.findAll({
    where: {
      userId,
      completed: false,
      title: { [Op.like]: `%${focusedValue}%` }, // Filter by input
    },
    limit: 25, // Discord limit
  });

  // Return autocomplete suggestions
  await interaction.respond(
    tasks.map((task) => ({
      name: task.title,
      value: task.id,
    }))
  );
}
```

---

## Command Registration

### Deploying Commands to Discord

Commands must be registered with Discord before they can be used.

**File:** `backend/src/deploy-commands.ts`

```typescript
import { REST, Routes } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { validateEnv } from '@shared/validation/env';

const env = validateEnv();

async function deployCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, '../commands');
  const commandFiles = (await fs.readdir(commandsPath)).filter((file) => file.endsWith('.ts'));

  // Load all command data
  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    commands.push(command.data.toJSON());
  }

  const rest = new REST({ version: '10' }).setToken(env.BOT_TOKEN);

  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // Register commands globally (available in all servers)
    const data = await rest.put(Routes.applicationCommands(env.CLIENT_ID), {
      body: commands,
    });

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error('Error deploying commands:', error);
  }
}

deployCommands();
```

### Guild-Specific Commands (Testing)

For faster testing, register commands to a specific guild:

```typescript
// Register to specific guild (instant, for testing)
const data = await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID), {
  body: commands,
});
```

### Running Command Deployment

```bash
# Deploy commands to Discord
npm run deploy --workspace=backend

# Or from backend directory
cd backend && npm run deploy
```

---

## Interaction Handlers

### Button Interactions

**Creating Buttons**

```typescript
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('task_complete_task-123')
    .setLabel('Complete')
    .setStyle(ButtonStyle.Success)
    .setEmoji('✅'),
  new ButtonBuilder()
    .setCustomId('task_delete_task-123')
    .setLabel('Delete')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🗑️')
);

await interaction.reply({
  content: 'Task: Buy groceries',
  components: [row],
});
```

**Handling Button Clicks**

**File:** `backend/utils/interactions/handlers/taskHandlers.ts`

```typescript
import { ButtonInteraction } from 'discord.js';
import { Task } from '@database';
import { logger } from '@shared/utils/logger';

export async function handleTaskButton(interaction: ButtonInteraction) {
  const customId = interaction.customId;
  const userId = interaction.user.id;

  // Parse button action and task ID
  // Format: task_complete_task-123
  const [_, action, taskId] = customId.split('_');

  if (action === 'complete') {
    const task = await Task.findOne({ where: { id: taskId, userId } });

    if (!task) {
      await interaction.followUp({
        content: '❌ Task not found.',
        ephemeral: true,
      });
      return;
    }

    task.completed = true;
    await task.save();

    await interaction.editReply({
      content: `✅ Completed: ${task.title}`,
      components: [], // Remove buttons
    });

    logger.info('Task completed via button', { userId, taskId });
  } else if (action === 'delete') {
    const task = await Task.findOne({ where: { id: taskId, userId } });

    if (!task) {
      await interaction.followUp({
        content: '❌ Task not found.',
        ephemeral: true,
      });
      return;
    }

    await task.destroy();

    await interaction.editReply({
      content: `🗑️ Deleted: ${task.title}`,
      components: [],
    });

    logger.info('Task deleted via button', { userId, taskId });
  }
}
```

### Select Menu Interactions

**Creating Select Menus**

```typescript
import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

const row = new ActionRowBuilder().addComponents(
  new StringSelectMenuBuilder()
    .setCustomId('list_select')
    .setPlaceholder('Choose a list')
    .addOptions([
      {
        label: 'Personal',
        description: 'Personal tasks',
        value: 'list-personal',
      },
      {
        label: 'Work',
        description: 'Work-related tasks',
        value: 'list-work',
      },
      {
        label: 'Shopping',
        description: 'Shopping list',
        value: 'list-shopping',
      },
    ])
);

await interaction.reply({
  content: 'Select a list:',
  components: [row],
});
```

**Handling Select Menu**

```typescript
export async function handleSelectMenuInteraction(interaction) {
  const customId = interaction.customId;

  if (customId === 'list_select') {
    const selectedListId = interaction.values[0]; // First selected value

    const tasks = await Task.findAll({
      where: { userId: interaction.user.id, listId: selectedListId },
    });

    await interaction.update({
      content: `Found ${tasks.length} tasks in this list`,
      components: [], // Remove select menu
    });
  }
}
```

### Modal Interactions

**Opening Modals**

```typescript
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

// Button that opens modal
const button = new ButtonBuilder()
  .setCustomId('task_add_new')
  .setLabel('Add Task')
  .setStyle(ButtonStyle.Primary);

// Handle button click
if (interaction.customId === 'task_add_new') {
  const modal = new ModalBuilder().setCustomId('task_modal').setTitle('Add New Task');

  const titleInput = new TextInputBuilder()
    .setCustomId('task_title')
    .setLabel('Task Title')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(200);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('task_description')
    .setLabel('Description (optional)')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000);

  const titleRow = new ActionRowBuilder().addComponents(titleInput);
  const descriptionRow = new ActionRowBuilder().addComponents(descriptionInput);

  modal.addComponents(titleRow, descriptionRow);

  await interaction.showModal(modal);
}
```

**Handling Modal Submission**

```typescript
export async function handleModalSubmit(interaction) {
  if (interaction.customId === 'task_modal') {
    const title = interaction.fields.getTextInputValue('task_title');
    const description = interaction.fields.getTextInputValue('task_description');

    const task = await Task.create({
      userId: interaction.user.id,
      title,
      description,
      completed: false,
    });

    await interaction.reply({
      content: `✅ Created task: ${task.title}`,
      ephemeral: true,
    });
  }
}
```

---

## Event Listeners

### Available Events

```typescript
// Bot ready
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Interaction created
client.on('interactionCreate', async (interaction) => {
  // Handle all interactions
});

// Message created
client.on('messageCreate', async (message) => {
  // Handle messages (not recommended for commands)
});

// Guild member joined
client.on('guildMemberAdd', async (member) => {
  // Welcome new members
});

// Error handling
client.on('error', (error) => {
  logger.error('Discord client error', { error: error.message });
});

client.on('warn', (info) => {
  logger.warn('Discord client warning', { info });
});
```

---

## Permissions and Roles

### Checking Permissions

```typescript
export async function execute(interaction) {
  // Check if user has administrator permission
  if (!interaction.memberPermissions.has('Administrator')) {
    await interaction.reply({
      content: '❌ You need administrator permission to use this command.',
      ephemeral: true,
    });
    return;
  }

  // Command logic
}
```

### Setting Command Permissions

```typescript
export const data = new SlashCommandBuilder()
  .setName('admin-command')
  .setDescription('Admin-only command')
  .setDefaultMemberPermissions('0'); // Disable for everyone by default

// Server admins can then configure who can use this command
```

### Checking User Roles

```typescript
export async function execute(interaction) {
  const member = interaction.member;
  const hasModRole = member.roles.cache.some((role) => role.name === 'Moderator');

  if (!hasModRole) {
    await interaction.reply({
      content: '❌ You need the Moderator role to use this command.',
      ephemeral: true,
    });
    return;
  }

  // Command logic
}
```

---

## Error Handling

### Deferring Replies

Discord interactions must be acknowledged within 3 seconds. For long-running operations, defer the reply:

```typescript
export async function execute(interaction) {
  // Defer reply immediately (shows "Bot is thinking...")
  await interaction.deferReply();

  // Perform long-running operation
  const data = await fetchDataFromExternalAPI();

  // Edit the deferred reply
  await interaction.editReply({
    content: `Result: ${data}`,
  });
}
```

### Ephemeral Replies (Private)

```typescript
// Only the user who ran the command can see this
await interaction.reply({
  content: 'This is private',
  ephemeral: true,
});
```

### Error Recovery

```typescript
export async function execute(interaction) {
  try {
    await interaction.deferReply();

    const task = await Task.findByPk(taskId);

    if (!task) {
      await interaction.editReply({
        content: '❌ Task not found.',
      });
      return;
    }

    // Success case
    await interaction.editReply({
      content: `✅ Task: ${task.title}`,
    });
  } catch (error) {
    logger.error('Command error', {
      command: interaction.commandName,
      error: error.message,
      userId: interaction.user.id,
    });

    // Try to respond to user
    try {
      if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ An error occurred. Please try again later.',
        });
      } else if (!interaction.replied) {
        await interaction.reply({
          content: '❌ An error occurred. Please try again later.',
          ephemeral: true,
        });
      }
    } catch {
      // Failed to send error message - interaction may have expired
    }
  }
}
```

### Handling Unknown Interactions

```typescript
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn('Unknown command', { commandName: interaction.commandName });
      await interaction.reply({
        content: '❌ Unknown command. Please try again.',
        ephemeral: true,
      });
      return;
    }

    // Execute command...
  }
});
```

---

## Testing Discord Commands

### Mocking Discord.js

**File:** `backend/tests/mocks/discordMocks.ts`

```typescript
export function createMockInteraction(overrides = {}) {
  return {
    id: 'interaction-id-123',
    user: {
      id: 'user-id-123',
      username: 'TestUser',
      tag: 'TestUser#0000',
    },
    guild: {
      id: 'guild-id-123',
      name: 'Test Guild',
    },
    replied: false,
    deferred: false,
    reply: jest.fn().mockResolvedValue({}),
    editReply: jest.fn().mockResolvedValue({}),
    followUp: jest.fn().mockResolvedValue({}),
    deferReply: jest.fn().mockResolvedValue({}),
    options: {
      getSubcommand: jest.fn(),
      getString: jest.fn(),
      getInteger: jest.fn(),
      getBoolean: jest.fn(),
    },
    ...overrides,
  };
}
```

### Testing Commands

**File:** `backend/commands/__tests__/tasks.test.ts`

```typescript
import { createMockInteraction } from '@tests/mocks/discordMocks';
import tasksCommand from '@commands/tasks';
import { Task } from '@database';

describe('/tasks command', () => {
  beforeEach(async () => {
    await Task.sync({ force: true });
  });

  describe('list subcommand', () => {
    it('should display user tasks', async () => {
      const mockInteraction = createMockInteraction({
        options: {
          getSubcommand: jest.fn().mockReturnValue('list'),
        },
      });

      await Task.create({
        id: 'task-1',
        userId: 'user-id-123',
        title: 'Test Task',
        completed: false,
      });

      await tasksCommand.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              title: expect.stringContaining('Tasks'),
            }),
          ]),
        })
      );
    });
  });

  describe('add subcommand', () => {
    it('should create new task', async () => {
      const mockInteraction = createMockInteraction({
        options: {
          getSubcommand: jest.fn().mockReturnValue('add'),
          getString: jest.fn((name) => {
            if (name === 'title') return 'New Task';
            if (name === 'description') return 'Task description';
            return null;
          }),
        },
      });

      await tasksCommand.execute(mockInteraction);

      const task = await Task.findOne({ where: { title: 'New Task' } });
      expect(task).not.toBeNull();
      expect(task.description).toBe('Task description');
    });
  });
});
```

---

## End-to-End Example

### Creating a /notes Command

**File:** `backend/commands/notes.ts`

```typescript
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Note } from '@database';
import { logger } from '@shared/utils/logger';

export const data = new SlashCommandBuilder()
  .setName('notes')
  .setDescription('Manage your notes')
  .addSubcommand((subcommand) => subcommand.setName('list').setDescription('List all your notes'))
  .addSubcommand((subcommand) =>
    subcommand
      .setName('add')
      .setDescription('Add a new note')
      .addStringOption((option) =>
        option.setName('title').setDescription('Note title').setRequired(true)
      )
      .addStringOption((option) =>
        option.setName('content').setDescription('Note content').setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('view')
      .setDescription('View a specific note')
      .addStringOption((option) =>
        option
          .setName('note-id')
          .setDescription('ID of the note')
          .setRequired(true)
          .setAutocomplete(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('delete')
      .setDescription('Delete a note')
      .addStringOption((option) =>
        option
          .setName('note-id')
          .setDescription('ID of the note')
          .setRequired(true)
          .setAutocomplete(true)
      )
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const userId = interaction.user.id;

  switch (subcommand) {
    case 'list':
      await handleList(interaction, userId);
      break;
    case 'add':
      await handleAdd(interaction, userId);
      break;
    case 'view':
      await handleView(interaction, userId);
      break;
    case 'delete':
      await handleDelete(interaction, userId);
      break;
  }
}

async function handleList(interaction, userId) {
  await interaction.deferReply();

  const notes = await Note.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit: 10,
  });

  if (notes.length === 0) {
    await interaction.editReply('📝 You have no notes yet. Use `/notes add` to create one!');
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('📝 Your Notes')
    .setColor('#00FF00')
    .setDescription(notes.map((note) => `**${note.title}** (ID: ${note.id})`).join('\n'));

  await interaction.editReply({ embeds: [embed] });
}

async function handleAdd(interaction, userId) {
  const title = interaction.options.getString('title');
  const content = interaction.options.getString('content');

  const note = await Note.create({
    userId,
    title,
    content,
  });

  logger.info('Note created', { userId, noteId: note.id });

  await interaction.reply({
    content: `✅ Created note: **${title}** (ID: ${note.id})`,
    ephemeral: true,
  });
}

async function handleView(interaction, userId) {
  const noteId = interaction.options.getString('note-id');

  const note = await Note.findOne({ where: { id: noteId, userId } });

  if (!note) {
    await interaction.reply({
      content: '❌ Note not found.',
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(note.title)
    .setDescription(note.content)
    .setColor('#0099FF')
    .setFooter({ text: `ID: ${note.id}` });

  await interaction.reply({ embeds: [embed] });
}

async function handleDelete(interaction, userId) {
  const noteId = interaction.options.getString('note-id');

  const note = await Note.findOne({ where: { id: noteId, userId } });

  if (!note) {
    await interaction.reply({
      content: '❌ Note not found.',
      ephemeral: true,
    });
    return;
  }

  await note.destroy();

  logger.info('Note deleted', { userId, noteId });

  await interaction.reply({
    content: `🗑️ Deleted note: **${note.title}**`,
    ephemeral: true,
  });
}

export async function autocomplete(interaction) {
  const focusedValue = interaction.options.getFocused();
  const userId = interaction.user.id;

  const notes = await Note.findAll({
    where: {
      userId,
      title: { [Op.like]: `%${focusedValue}%` },
    },
    limit: 25,
  });

  await interaction.respond(
    notes.map((note) => ({
      name: note.title,
      value: note.id,
    }))
  );
}
```

---

## Best Practices

### 1. Always Defer Long Operations

```typescript
// If operation takes > 1 second, defer immediately
await interaction.deferReply();
// ... long operation ...
await interaction.editReply('Done!');
```

### 2. Use Ephemeral for Error Messages

```typescript
await interaction.reply({
  content: '❌ Error message',
  ephemeral: true, // Only user sees this
});
```

### 3. Validate User Ownership

```typescript
const task = await Task.findOne({
  where: { id: taskId, userId: interaction.user.id },
});
```

### 4. Log Important Actions

```typescript
logger.info('Task completed', {
  userId: interaction.user.id,
  taskId: task.id,
  commandName: interaction.commandName,
});
```

### 5. Handle All Error Cases

```typescript
try {
  // Command logic
} catch (error) {
  logger.error('Command error', { error: error.message });
  // Attempt to notify user
}
```

### 6. Use Embeds for Rich Content

```typescript
const embed = new EmbedBuilder()
  .setTitle('Task List')
  .setDescription('Your tasks')
  .setColor('#00FF00')
  .addFields({ name: 'Task 1', value: 'Buy groceries' }, { name: 'Task 2', value: 'Call dentist' });

await interaction.reply({ embeds: [embed] });
```

### 7. Implement Autocomplete for Better UX

```typescript
// Users can search and select from their own data
export async function autocomplete(interaction) {
  const focused = interaction.options.getFocused();
  // Filter user's data and return suggestions
}
```

---

## References

- [Discord.js Documentation](https://discord.js.org/)
- [Discord API Documentation](https://discord.com/developers/docs/intro)
- [Slash Commands Guide](https://discordjs.guide/interactions/slash-commands.html)
- [Bot Code](c:\Users\lukaf\Desktop\Dev Work\Bwaincell\backend\src\bot.ts)
- [Testing Guide](testing.md)

---

**Next Steps:**

- [API Development Guide](api-development.md) - Create REST endpoints
- [Testing Guide](testing.md) - Write comprehensive tests
- [Database Migrations Guide](database-migrations.md) - Migrate to PostgreSQL
