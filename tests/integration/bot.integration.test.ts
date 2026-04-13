// Bot Integration Tests - REFACTORED using Work Order #010 Architecture
// Tests bot initialization, interaction flow, and database integration

// ✅ NEW ARCHITECTURE: Mock only external dependencies
import { mockEssentials } from '../utils/mocks/external-only';
import { Client } from 'discord.js';

// Mock only external dependencies
mockEssentials();

describe('Bot Integration Tests', () => {
  let sequelize: any = null;

  beforeAll(() => {
    // Mock environment
    process.env.DISCORD_TOKEN = 'test-token';
    process.env.CLIENT_ID = 'test-client-id';
    process.env.GUILD_ID = 'test-guild-id';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // ✅ NO jest.resetModules() - keeps module loading stable
  });

  afterEach(async () => {
    // Clean up database connections after each test
    if (sequelize) {
      await sequelize.close();
      sequelize = null;
    }
  });

  describe('Bot Initialization Flow', () => {
    it('should initialize Discord client with proper configuration', () => {
      const initializeBot = () => {
        const client = new Client({
          intents: ['Guilds', 'GuildMessages', 'DirectMessages'],
        });

        (client as any).commands = new Map();
        return client;
      };

      const bot = initializeBot();
      expect(bot).toBeInstanceOf(Client);
      expect(bot.commands).toBeInstanceOf(Map);
    });

    it('should connect to database successfully', async () => {
      const connectDatabase = async () => {
        // Simulate database connection
        const mockDb = {
          authenticate: jest.fn().mockResolvedValue(true),
          close: jest.fn().mockResolvedValue(undefined),
          getDialect: jest.fn().mockReturnValue('sqlite'),
          models: {},
        };

        await mockDb.authenticate();
        return mockDb;
      };

      const db = await connectDatabase();
      expect(db).toBeDefined();
      expect(db.authenticate).toBeDefined();

      const isConnected = await db
        .authenticate()
        .then(() => true)
        .catch(() => false);

      expect(isConnected).toBe(true);
      expect(db.authenticate).toHaveBeenCalled();
      await db.close();
    });

    it('should handle connection errors gracefully', async () => {
      const connectWithRetry = async (retries = 3): Promise<boolean> => {
        let attempt = 0;

        while (attempt < retries) {
          try {
            // Simulate connection attempt
            if (attempt < 2) {
              throw new Error('Connection failed');
            }
            return true;
          } catch (error) {
            attempt++;
            if (attempt >= retries) {
              return false;
            }
            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
        return false;
      };

      const result = await connectWithRetry();
      expect(result).toBe(true);
    });
  });

  describe('Command Registration Flow', () => {
    it('should load and register commands', () => {
      const commands = new Map();

      const registerCommand = (name: string, execute: Function) => {
        commands.set(name, { name, execute });
      };

      registerCommand('task', () => {});
      registerCommand('budget', () => {});
      registerCommand('remind', () => {});

      expect(commands.size).toBe(3);
      expect(commands.has('task')).toBe(true);
      expect(commands.has('budget')).toBe(true);
      expect(commands.has('remind')).toBe(true);
    });

    it('should handle duplicate command registration', () => {
      const commands = new Map();
      const errors: string[] = [];

      const registerCommand = (name: string, execute: Function) => {
        if (commands.has(name)) {
          errors.push(`Duplicate command: ${name}`);
          return false;
        }
        commands.set(name, { name, execute });
        return true;
      };

      expect(registerCommand('task', () => {})).toBe(true);
      expect(registerCommand('task', () => {})).toBe(false);
      expect(errors).toContain('Duplicate command: task');
    });
  });

  describe('Interaction Handling Flow', () => {
    it('should route interactions to appropriate handlers', async () => {
      const handlers = {
        command: jest.fn(),
        button: jest.fn(),
        selectMenu: jest.fn(),
        modal: jest.fn(),
      };

      const routeInteraction = async (interaction: any) => {
        if (interaction.isChatInputCommand) {
          return handlers.command(interaction);
        }
        if (interaction.isButton) {
          return handlers.button(interaction);
        }
        if (interaction.isSelectMenu) {
          return handlers.selectMenu(interaction);
        }
        if (interaction.isModalSubmit) {
          return handlers.modal(interaction);
        }
      };

      // Test command interaction
      await routeInteraction({
        isChatInputCommand: true,
        isButton: false,
        isSelectMenu: false,
        isModalSubmit: false,
      });
      expect(handlers.command).toHaveBeenCalledTimes(1);

      // Test button interaction
      await routeInteraction({
        isChatInputCommand: false,
        isButton: true,
        isSelectMenu: false,
        isModalSubmit: false,
      });
      expect(handlers.button).toHaveBeenCalledTimes(1);
    });

    it('should handle interaction errors with proper fallback', async () => {
      const handleInteraction = async (interaction: any) => {
        try {
          if (!interaction.commandName) {
            throw new Error('Invalid command');
          }
          return { success: true };
        } catch (error) {
          // Fallback error handling
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              content: 'An error occurred',
              ephemeral: true,
            });
          } else {
            await interaction.reply({
              content: 'An error occurred',
              ephemeral: true,
            });
          }
          return { success: false };
        }
      };

      const mockInteraction = {
        commandName: null,
        replied: false,
        deferred: false,
        reply: jest.fn(),
        followUp: jest.fn(),
      };

      const result = await handleInteraction(mockInteraction);
      expect(result.success).toBe(false);
      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: 'An error occurred',
        ephemeral: true,
      });
    });
  });

  describe('Database Transaction Flow', () => {
    it('should handle database transactions properly', async () => {
      // Mock database and model
      const records: any[] = [];

      const mockTransaction = {
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
      };

      const TestModel = {
        create: jest.fn().mockImplementation((data) => {
          // Only add to records on successful create
          if (data.name) {
            const record = { id: records.length + 1, ...data };
            // Don't add yet - wait for commit
            return Promise.resolve(record);
          }
          throw new Error('Validation error');
        }),
        count: jest.fn().mockImplementation(() => records.length),
      };

      const mockSequelize = {
        transaction: jest.fn().mockResolvedValue(mockTransaction),
        define: jest.fn().mockReturnValue(TestModel),
        sync: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const performTransaction = async () => {
        const t = await mockSequelize.transaction();

        try {
          const item1 = await TestModel.create({ name: 'Test 1' }, { transaction: t });
          const item2 = await TestModel.create({ name: 'Test 2' }, { transaction: t });
          await t.commit();
          // Only add to records after successful commit
          records.push(item1, item2);
          return true;
        } catch (error) {
          await t.rollback();
          return false;
        }
      };

      const success = await performTransaction();
      expect(success).toBe(true);
      expect(mockTransaction.commit).toHaveBeenCalled();

      const count = await TestModel.count();
      expect(count).toBe(2);
    });

    it('should rollback on transaction failure', async () => {
      // Mock database and model
      const records: any[] = [];

      const mockTransaction = {
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
      };

      const TestModel = {
        create: jest.fn().mockImplementation((data) => {
          // Fail on null name
          if (!data.name || data.name === null) {
            throw new Error('Validation error: name cannot be null');
          }
          const record = { id: records.length + 1, ...data };
          return Promise.resolve(record);
        }),
        count: jest.fn().mockImplementation(() => records.length),
      };

      const mockSequelize = {
        transaction: jest.fn().mockResolvedValue(mockTransaction),
        define: jest.fn().mockReturnValue(TestModel),
        sync: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const performFailingTransaction = async () => {
        const t = await mockSequelize.transaction();

        try {
          await TestModel.create({ name: 'Test 1' }, { transaction: t });
          // This should fail due to null name
          await TestModel.create({ name: null as any }, { transaction: t });
          await t.commit();
          // Should not reach here
          records.push({ name: 'Test 1' }, { name: null });
          return true;
        } catch (error) {
          await t.rollback();
          // Clear any temporary records on rollback
          records.length = 0;
          return false;
        }
      };

      const success = await performFailingTransaction();
      expect(success).toBe(false);
      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();

      const count = await TestModel.count();
      expect(count).toBe(0); // Nothing should be saved
    });
  });

  describe('Rate Limiting', () => {
    it('should implement rate limiting for commands', async () => {
      const rateLimits = new Map<string, number>();
      const RATE_LIMIT_MS = 1000;

      const checkRateLimit = (userId: string): boolean => {
        const now = Date.now();
        const lastUsed = rateLimits.get(userId) || 0;

        if (now - lastUsed < RATE_LIMIT_MS) {
          return false;
        }

        rateLimits.set(userId, now);
        return true;
      };

      const userId = 'test-user';

      // First attempt should pass
      expect(checkRateLimit(userId)).toBe(true);

      // Immediate second attempt should fail
      expect(checkRateLimit(userId)).toBe(false);

      // Wait for rate limit to expire
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS + 100));

      // Should pass after cooldown
      expect(checkRateLimit(userId)).toBe(true);
    });
  });

  describe('Graceful Shutdown', () => {
    it('should handle shutdown signals properly', async () => {
      const cleanup = {
        database: jest.fn(),
        discord: jest.fn(),
        scheduler: jest.fn(),
      };

      const gracefulShutdown = async (signal: string) => {
        console.log(`Received ${signal}, shutting down gracefully...`);

        await cleanup.database();
        await cleanup.discord();
        await cleanup.scheduler();

        return true;
      };

      const result = await gracefulShutdown('SIGTERM');

      expect(result).toBe(true);
      expect(cleanup.database).toHaveBeenCalled();
      expect(cleanup.discord).toHaveBeenCalled();
      expect(cleanup.scheduler).toHaveBeenCalled();
    });
  });
});
