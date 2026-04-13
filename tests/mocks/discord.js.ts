// Discord.js mocks for testing

export const mockClient = {
  user: {
    id: 'bot-user-id',
    tag: 'TestBot#0000',
    username: 'TestBot',
  },
  guilds: {
    cache: new Map([['guild-1', { id: 'guild-1', name: 'Test Guild' }]]),
  },
  commands: new Map(),
  on: jest.fn(),
  once: jest.fn(),
  login: jest.fn().mockResolvedValue('test-token'),
  destroy: jest.fn(),
};

export const mockInteraction = {
  isCommand: jest.fn().mockReturnValue(true),
  isChatInputCommand: jest.fn().mockReturnValue(true),
  isButton: jest.fn().mockReturnValue(false),
  isSelectMenu: jest.fn().mockReturnValue(false),
  isModalSubmit: jest.fn().mockReturnValue(false),
  isAutocomplete: jest.fn().mockReturnValue(false),
  commandName: 'test',
  commandId: 'command-id',
  guild: {
    id: 'guild-1',
    name: 'Test Guild',
  },
  guildId: 'guild-1',
  user: {
    id: 'user-1',
    tag: 'TestUser#0001',
    username: 'TestUser',
  },
  member: {
    id: 'user-1',
    permissions: {
      has: jest.fn().mockReturnValue(true),
    },
  },
  channel: {
    id: 'channel-1',
    name: 'test-channel',
    send: jest.fn(),
  },
  reply: jest.fn().mockResolvedValue(undefined),
  editReply: jest.fn().mockResolvedValue(undefined),
  deferReply: jest.fn().mockResolvedValue(undefined),
  followUp: jest.fn().mockResolvedValue(undefined),
  deleteReply: jest.fn().mockResolvedValue(undefined),
  fetchReply: jest.fn().mockResolvedValue({}),
  replied: false,
  deferred: false,
  options: {
    getString: jest.fn(),
    getInteger: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    getUser: jest.fn(),
    getChannel: jest.fn(),
    getRole: jest.fn(),
    getSubcommand: jest.fn(),
  },
  update: jest.fn().mockResolvedValue(undefined),
};

export const mockMessage = {
  id: 'message-1',
  content: 'Test message',
  author: {
    id: 'user-1',
    tag: 'TestUser#0001',
    username: 'TestUser',
    bot: false,
  },
  channel: {
    id: 'channel-1',
    name: 'test-channel',
    send: jest.fn(),
  },
  guild: {
    id: 'guild-1',
    name: 'Test Guild',
  },
  reply: jest.fn().mockResolvedValue(undefined),
  react: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
};

export const mockEmbed = {
  setTitle: jest.fn().mockReturnThis(),
  setDescription: jest.fn().mockReturnThis(),
  setColor: jest.fn().mockReturnThis(),
  addFields: jest.fn().mockReturnThis(),
  setFooter: jest.fn().mockReturnThis(),
  setTimestamp: jest.fn().mockReturnThis(),
  setThumbnail: jest.fn().mockReturnThis(),
  setImage: jest.fn().mockReturnThis(),
  setAuthor: jest.fn().mockReturnThis(),
  toJSON: jest.fn().mockReturnValue({}),
};

export const mockButtonBuilder = {
  setCustomId: jest.fn().mockReturnThis(),
  setLabel: jest.fn().mockReturnThis(),
  setStyle: jest.fn().mockReturnThis(),
  setDisabled: jest.fn().mockReturnThis(),
  setEmoji: jest.fn().mockReturnThis(),
};

export const mockActionRow = {
  addComponents: jest.fn().mockReturnThis(),
  setComponents: jest.fn().mockReturnThis(),
};

export const mockSelectMenu = {
  setCustomId: jest.fn().mockReturnThis(),
  setPlaceholder: jest.fn().mockReturnThis(),
  addOptions: jest.fn().mockReturnThis(),
  setMinValues: jest.fn().mockReturnThis(),
  setMaxValues: jest.fn().mockReturnThis(),
};

export const mockModal = {
  setCustomId: jest.fn().mockReturnThis(),
  setTitle: jest.fn().mockReturnThis(),
  addComponents: jest.fn().mockReturnThis(),
};

export const mockTextInput = {
  setCustomId: jest.fn().mockReturnThis(),
  setLabel: jest.fn().mockReturnThis(),
  setStyle: jest.fn().mockReturnThis(),
  setMinLength: jest.fn().mockReturnThis(),
  setMaxLength: jest.fn().mockReturnThis(),
  setPlaceholder: jest.fn().mockReturnThis(),
  setRequired: jest.fn().mockReturnThis(),
  setValue: jest.fn().mockReturnThis(),
};

// Mock Discord.js module
jest.mock('discord.js', () => ({
  Client: jest.fn(() => mockClient),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    DirectMessages: 4,
    MessageContent: 8,
  },
  Collection: Map,
  EmbedBuilder: jest.fn(() => mockEmbed),
  ButtonBuilder: jest.fn(() => mockButtonBuilder),
  ActionRowBuilder: jest.fn(() => mockActionRow),
  StringSelectMenuBuilder: jest.fn(() => mockSelectMenu),
  ModalBuilder: jest.fn(() => mockModal),
  TextInputBuilder: jest.fn(() => mockTextInput),
  ButtonStyle: {
    Primary: 1,
    Secondary: 2,
    Success: 3,
    Danger: 4,
    Link: 5,
  },
  TextInputStyle: {
    Short: 1,
    Paragraph: 2,
  },
  ActivityType: {
    Playing: 0,
    Streaming: 1,
    Listening: 2,
    Watching: 3,
    Custom: 4,
    Competing: 5,
  },
  REST: jest.fn(),
  Routes: {
    applicationCommands: jest.fn(),
    applicationGuildCommands: jest.fn(),
  },
}));

export default {
  mockClient,
  mockInteraction,
  mockMessage,
  mockEmbed,
  mockButtonBuilder,
  mockActionRow,
  mockSelectMenu,
  mockModal,
  mockTextInput,
};
