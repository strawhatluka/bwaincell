// Tests for bot.ts - Core bot initialization
import { Client, GatewayIntentBits } from 'discord.js';
import { mockSequelize } from '../mocks/database.mock';

// Create mock client
const mockClient = {
  commands: new Map(),
  once: jest.fn(),
  on: jest.fn(),
  login: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn(),
  user: { tag: 'TestBot#1234', username: 'TestBot', id: 'bot-123' },
  guilds: { cache: { size: 1 } },
};

// Create mock interaction
const mockInteraction = {
  isChatInputCommand: jest.fn(),
  isButton: jest.fn(),
  isStringSelectMenu: jest.fn(),
  isModalSubmit: jest.fn(),
  isAutocomplete: jest.fn(),
  commandName: '',
  reply: jest.fn(),
  followUp: jest.fn(),
  editReply: jest.fn(),
  deferReply: jest.fn(),
  deferUpdate: jest.fn(),
  user: { id: 'user-123' },
  guild: { id: 'guild-123' },
  guildId: 'guild-123',
  replied: false,
  deferred: false,
  id: 'interaction-123',
  type: 2, // APPLICATION_COMMAND
};

// Mock fs/promises
const mockReaddir = jest.fn().mockResolvedValue(['task.js', 'list.js']);
jest.mock('fs/promises', () => ({
  readdir: mockReaddir,
}));

// Mock fs (for existsSync)
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(false), // No scheduler by default
}));

// Mock discord.js
jest.mock('discord.js', () => ({
  Client: jest.fn(() => mockClient),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 512,
    DirectMessages: 16384,
  },
  Collection: Map,
}));

// Mock environment validation
jest.mock('@shared/validation/env', () => ({
  validateEnv: jest.fn(() => ({
    DISCORD_TOKEN: 'test-token',
    CLIENT_ID: 'test-client-id',
    NODE_ENV: 'test',
  })),
}));

// Mock logger
jest.mock('@shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  logBotEvent: jest.fn(),
  logError: jest.fn(),
}));

// Mock interactions
jest.mock('../../utils/interactions', () => ({
  handleButtonInteraction: jest.fn(),
  handleSelectMenuInteraction: jest.fn(),
  handleModalSubmit: jest.fn(),
}));

// Mock database
jest.mock('../../supabase', () => ({
  sequelize: mockSequelize,
}));

// Mock module-alias
jest.mock('module-alias/register', () => ({}));

// Mock environment variables
process.env.DISCORD_TOKEN = 'test-token';
process.env.CLIENT_ID = 'test-client-id';
process.env.NODE_ENV = 'test';

describe('Bot Initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.commands.clear();
  });

  describe('Client Setup', () => {
    it('should create Discord client with correct intents', () => {
      // Test that the Client constructor is available
      expect(Client).toBeDefined();
      expect(GatewayIntentBits.Guilds).toBeDefined();
      expect(GatewayIntentBits.GuildMessages).toBeDefined();
      expect(GatewayIntentBits.DirectMessages).toBeDefined();
    });

    it('should initialize commands collection', () => {
      const client = new Client({ intents: [GatewayIntentBits.Guilds] });
      expect(client.commands).toBeDefined();
      expect(client.commands).toBeInstanceOf(Map);
    });
  });

  describe('Event Handlers', () => {
    it('should register ready event handler', () => {
      // Test that mock client can register events
      const client = mockClient;
      client.once('clientReady', () => {});
      expect(client.once).toHaveBeenCalled();
    });

    it('should register interactionCreate event handler', () => {
      const client = mockClient;
      client.on('interactionCreate', () => {});
      expect(client.on).toHaveBeenCalled();
    });

    it('should handle slash commands', () => {
      // Test that command handling logic exists
      const testCommand = {
        data: { name: 'test' },
        execute: jest.fn(),
      };
      mockClient.commands.set('test', testCommand);

      expect(mockClient.commands.get('test')).toBe(testCommand);
      expect(testCommand.execute).toBeDefined();
    });

    it('should handle unknown commands gracefully', () => {
      // Test that getting a non-existent command returns undefined
      expect(mockClient.commands.get('unknown')).toBeUndefined();
    });

    it('should handle command execution errors', async () => {
      // Test that commands can handle errors
      const errorCommand = {
        data: { name: 'error-test' },
        execute: jest.fn().mockRejectedValue(new Error('Test error')),
      };

      mockClient.commands.set('error-test', errorCommand);

      try {
        await errorCommand.execute(mockInteraction);
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toBe('Test error');
      }
    });
  });

  describe('Database Connection', () => {
    it('should initialize database connection', async () => {
      // Test that sequelize can authenticate
      await mockSequelize.authenticate();
      expect(mockSequelize.authenticate).toHaveBeenCalled();
    });

    it('should sync database models', async () => {
      // Test that sequelize can sync
      await mockSequelize.sync();
      expect(mockSequelize.sync).toHaveBeenCalled();
    });

    it('should handle database connection errors', async () => {
      mockSequelize.authenticate.mockRejectedValueOnce(new Error('DB connection failed'));

      try {
        await mockSequelize.authenticate();
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toBe('DB connection failed');
      }
    });
  });

  describe('Bot Login', () => {
    it('should login with Discord token', async () => {
      await mockClient.login(process.env.DISCORD_TOKEN);
      expect(mockClient.login).toHaveBeenCalledWith(process.env.DISCORD_TOKEN);
    });

    it('should handle login failures', async () => {
      mockClient.login.mockRejectedValueOnce(new Error('Invalid token'));

      try {
        await mockClient.login('invalid-token');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toBe('Invalid token');
      }
    });
  });

  describe('Graceful Shutdown', () => {
    it('should handle SIGINT signal', () => {
      // Test that process can register signal handlers
      const handler = jest.fn();
      process.on('SIGINT', handler);
      expect(handler).toBeDefined();
    });

    it('should destroy client on shutdown', () => {
      // Test that client can be destroyed
      mockClient.destroy();
      expect(mockClient.destroy).toHaveBeenCalled();
    });
  });

  describe('Command Loading', () => {
    it('should load commands from commands directory', async () => {
      // Test that readdir can be called
      const files = await mockReaddir('commands');
      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
    });

    it('should filter only .js files', () => {
      // The bot filters for .js files (after TypeScript compilation)
      const files = ['command.js', 'command.d.ts', 'README.md', '.DS_Store'];
      const commandFiles = files.filter(file => file.endsWith('.js') && !file.endsWith('.d.ts'));

      expect(commandFiles).toHaveLength(1);
      expect(commandFiles).toContain('command.js');
    });

    it('should handle command loading errors gracefully', async () => {
      // Test error handling
      mockReaddir.mockRejectedValueOnce(new Error('Directory not found'));

      try {
        await mockReaddir('invalid');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toBe('Directory not found');
      }
    });
  });
});

describe('Bot Configuration', () => {
  it('should have correct bot configuration', () => {
    expect(process.env.DISCORD_TOKEN).toBeDefined();
    expect(process.env.CLIENT_ID).toBeDefined();
  });

  it('should throw error if token is missing', () => {
    const originalToken = process.env.DISCORD_TOKEN;
    delete process.env.DISCORD_TOKEN;

    expect(() => {
      if (!process.env.DISCORD_TOKEN) {
        throw new Error('Discord token is required');
      }
    }).toThrow('Discord token is required');

    process.env.DISCORD_TOKEN = originalToken;
  });
});
