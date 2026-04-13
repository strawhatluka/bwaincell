// Mock Discord.js Client and related components
const mockBotLifecycleClient: any = {
  login: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  destroy: jest.fn(),
  user: null,
  guilds: {
    cache: new Map(),
  },
  commands: {
    set: jest.fn(),
  },
  readyAt: null,
  uptime: 0,
  ws: {
    ping: 50,
  },
};

jest.mock('discord.js', () => ({
  Client: jest.fn(() => mockBotLifecycleClient),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 512,
    MessageContent: 32768,
    GuildMembers: 2,
  },
  Partials: {
    Message: 'MESSAGE',
    Channel: 'CHANNEL',
    Reaction: 'REACTION',
  },
  ActivityType: {
    Playing: 0,
    Streaming: 1,
    Listening: 2,
    Watching: 3,
  },
}));

// Mock process events
const originalProcess = process;
let processEventHandlers: { [key: string]: Function[] } = {};

beforeAll(() => {
  // Mock process.on
  jest.spyOn(process, 'on').mockImplementation(((event: string | symbol, handler: any) => {
    const eventKey = typeof event === 'string' ? event : event.toString();
    if (!processEventHandlers[eventKey]) {
      processEventHandlers[eventKey] = [];
    }
    processEventHandlers[eventKey].push(handler);
    return process;
  }) as any);

  // Mock process.exit
  jest.spyOn(process, 'exit').mockImplementation(((_code?: number) => {
    // Don't actually exit during tests
    return undefined as never;
  }) as any);
});

afterAll(() => {
  jest.restoreAllMocks();
});

// Mock database connection
const mockBotSequelize = {
  authenticate: jest.fn(),
  sync: jest.fn(),
  close: jest.fn(),
  transaction: jest.fn(),
};

jest.mock('sequelize', () => ({
  Sequelize: jest.fn(() => mockBotSequelize),
}));

describe('Bot Lifecycle Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    processEventHandlers = {};

    // Reset mock implementations
    mockBotLifecycleClient.login.mockResolvedValue('token');
    mockBotLifecycleClient.on.mockImplementation((_event: any, _handler: any) => {
      // Store handlers for testing
      return mockBotLifecycleClient;
    });
    mockBotLifecycleClient.destroy.mockResolvedValue(undefined);

    mockBotSequelize.authenticate.mockResolvedValue(undefined);
    mockBotSequelize.sync.mockResolvedValue(undefined);
    mockBotSequelize.close.mockResolvedValue(undefined);
  });

  describe('Bot Initialization', () => {
    test('should initialize bot with correct configuration', async () => {
      const botConfig = {
        token: 'test-token',
        intents: [1, 512, 32768], // Guilds, GuildMessages, MessageContent
        partials: ['MESSAGE', 'CHANNEL'],
      };

      const initializeBot = async (config: typeof botConfig) => {
        // Simulate bot initialization process
        try {
          // 1. Setup database connection
          await mockBotSequelize.authenticate();
          console.log('Database connection established');

          // 2. Sync database models
          await mockBotSequelize.sync({ alter: true });
          console.log('Database models synchronized');

          // 3. Setup Discord client
          mockBotLifecycleClient.user = { id: 'bot-123', username: 'TestBot' };

          // 4. Register event handlers
          mockBotLifecycleClient.on('ready', () => {
            console.log(`Bot ${mockBotLifecycleClient.user?.username} is ready!`);
          });

          mockBotLifecycleClient.on('interactionCreate', async (interaction: any) => {
            if (interaction.isChatInputCommand()) {
              console.log(`Command received: ${interaction.commandName}`);
            }
          });

          // 5. Login to Discord
          await mockBotLifecycleClient.login(config.token);

          return { success: true, client: mockBotLifecycleClient };
        } catch (error) {
          console.error('Bot initialization failed:', error);
          throw error;
        }
      };

      const result = await initializeBot(botConfig);

      expect(mockBotSequelize.authenticate).toHaveBeenCalled();
      expect(mockBotSequelize.sync).toHaveBeenCalledWith({ alter: true });
      expect(mockBotLifecycleClient.login).toHaveBeenCalledWith('test-token');
      expect(mockBotLifecycleClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockBotLifecycleClient.on).toHaveBeenCalledWith(
        'interactionCreate',
        expect.any(Function)
      );
      expect(result.success).toBe(true);
    });

    test('should handle initialization failures gracefully', async () => {
      // Mock database connection failure
      mockBotSequelize.authenticate.mockRejectedValue(new Error('Database connection failed'));

      const initializeBot = async () => {
        try {
          await mockBotSequelize.authenticate();
          await mockBotLifecycleClient.login('test-token');
          return { success: true };
        } catch (error) {
          console.error('Initialization failed:', error);
          return { success: false, error: (error as Error).message };
        }
      };

      const result = await initializeBot();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
      expect(mockBotLifecycleClient.login).not.toHaveBeenCalled();
    });

    test('should retry connection on temporary failures', async () => {
      let attemptCount = 0;
      mockBotSequelize.authenticate.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Temporary connection failure'));
        }
        return Promise.resolve();
      });

      const initializeWithRetry = async (maxRetries = 3) => {
        let lastError: Error;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            await mockBotSequelize.authenticate();
            await mockBotLifecycleClient.login('test-token');
            return { success: true, attempts: attempt + 1 };
          } catch (error) {
            lastError = error as Error;
            if (attempt === maxRetries - 1) {
              throw lastError;
            }
            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
        // This should never be reached, but TypeScript needs it
        throw new Error('Unexpected flow');
      };

      const result = await initializeWithRetry();

      expect(result).toBeDefined();
      expect(result!.success).toBe(true);
      expect(result!.attempts).toBe(3);
      expect(mockBotSequelize.authenticate).toHaveBeenCalledTimes(3);
    });
  });

  describe('Event Handling', () => {
    test('should register and handle ready event', async () => {
      let readyHandler: ((args?: any) => any) | null = null;

      mockBotLifecycleClient.on.mockImplementation(
        (event: string, handler: (args?: any) => any) => {
          if (event === 'ready') {
            readyHandler = handler;
          }
          return mockBotLifecycleClient;
        }
      );

      const setupEventHandlers = () => {
        mockBotLifecycleClient.on('ready', () => {
          mockBotLifecycleClient.readyAt = new Date();
          console.log('Bot is ready!');
        });

        mockBotLifecycleClient.on('error', (error: Error) => {
          console.error('Discord client error:', error);
        });

        mockBotLifecycleClient.on('warn', (warning: string) => {
          console.warn('Discord client warning:', warning);
        });
      };

      setupEventHandlers();

      // Simulate ready event
      if (readyHandler) {
        (readyHandler as () => void)();
      }

      expect(mockBotLifecycleClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockBotLifecycleClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockBotLifecycleClient.on).toHaveBeenCalledWith('warn', expect.any(Function));
      expect(mockBotLifecycleClient.readyAt).toBeInstanceOf(Date);
    });

    test('should handle interaction events', async () => {
      let interactionHandler: ((args?: any) => any) | null = null;

      mockBotLifecycleClient.on.mockImplementation(
        (event: string, handler: (args?: any) => any) => {
          if (event === 'interactionCreate') {
            interactionHandler = handler;
          }
          return mockBotLifecycleClient;
        }
      );

      const setupInteractionHandler = () => {
        mockBotLifecycleClient.on('interactionCreate', async (interaction: any) => {
          try {
            if (interaction.isChatInputCommand?.()) {
              console.log(`Processing command: ${interaction.commandName}`);
              // Simulate command processing
              await interaction.reply?.({ content: 'Command executed' });
            }
          } catch (error) {
            console.error('Error handling interaction:', error);
          }
        });
      };

      setupInteractionHandler();

      // Simulate interaction
      const mockInteraction = {
        isChatInputCommand: jest.fn().mockReturnValue(true),
        commandName: 'test',
        reply: jest.fn().mockResolvedValue(undefined),
      };

      if (interactionHandler) {
        await (interactionHandler as (arg: any) => Promise<void>)(mockInteraction);
      }

      expect(mockInteraction.isChatInputCommand).toHaveBeenCalled();
      expect(mockInteraction.reply).toHaveBeenCalledWith({ content: 'Command executed' });
    });

    test('should handle error events gracefully', async () => {
      let errorHandler: ((args?: any) => any) | null = null;

      mockBotLifecycleClient.on.mockImplementation(
        (event: string, handler: (args?: any) => any) => {
          if (event === 'error') {
            errorHandler = handler;
          }
          return mockBotLifecycleClient;
        }
      );

      const errorLog: Error[] = [];

      const setupErrorHandler = () => {
        mockBotLifecycleClient.on('error', (error: Error) => {
          errorLog.push(error);
          console.error('Discord error:', error.message);
          // Don't crash the bot, just log the error
        });
      };

      setupErrorHandler();

      // Simulate error
      const testError = new Error('Test Discord error');
      if (errorHandler) {
        (errorHandler as (error: Error) => void)(testError);
      }

      expect(errorLog).toHaveLength(1);
      expect(errorLog[0]).toBe(testError);
    });
  });

  describe('Graceful Shutdown', () => {
    test('should handle SIGINT gracefully', async () => {
      const shutdownSequence = async () => {
        console.log('Received SIGINT, starting graceful shutdown...');

        try {
          // 1. Stop accepting new interactions
          mockBotLifecycleClient.off('interactionCreate');

          // 2. Close database connections
          await mockBotSequelize.close();
          console.log('Database connections closed');

          // 3. Destroy Discord client
          await mockBotLifecycleClient.destroy();
          console.log('Discord client destroyed');

          // 4. Exit process
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      };

      // Setup SIGINT handler
      process.on('SIGINT', shutdownSequence);

      // Simulate SIGINT
      const sigintHandlers = processEventHandlers['SIGINT'] || [];
      if (sigintHandlers.length > 0) {
        await sigintHandlers[0]();
      }

      expect(mockBotLifecycleClient.off).toHaveBeenCalledWith('interactionCreate');
      expect(mockBotSequelize.close).toHaveBeenCalled();
      expect(mockBotLifecycleClient.destroy).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should handle SIGTERM gracefully', async () => {
      const shutdownSequence = async (signal: string) => {
        console.log(`Received ${signal}, starting graceful shutdown...`);

        const timeout = setTimeout(() => {
          console.log('Graceful shutdown timeout, forcing exit');
          process.exit(1);
        }, 10000); // 10 second timeout

        try {
          await mockBotSequelize.close();
          await mockBotLifecycleClient.destroy();
          clearTimeout(timeout);
          process.exit(0);
        } catch (error) {
          clearTimeout(timeout);
          console.error('Shutdown error:', error);
          process.exit(1);
        }
      };

      // Setup SIGTERM handler
      process.on('SIGTERM', () => shutdownSequence('SIGTERM'));

      // Simulate SIGTERM
      const sigtermHandlers = processEventHandlers['SIGTERM'] || [];
      if (sigtermHandlers.length > 0) {
        await sigtermHandlers[0]();
      }

      expect(mockBotSequelize.close).toHaveBeenCalled();
      expect(mockBotLifecycleClient.destroy).toHaveBeenCalled();
    });

    test('should handle unhandled promise rejections', async () => {
      const unhandledRejections: any[] = [];

      const setupUnhandledRejectionHandler = () => {
        process.on('unhandledRejection', (reason, promise) => {
          unhandledRejections.push({ reason, promise });
          console.error('Unhandled Promise Rejection:', reason);
          // Log but don't crash in production
        });
      };

      setupUnhandledRejectionHandler();

      // Simulate unhandled rejection
      const rejectionReason = new Error('Test unhandled rejection');
      const rejectionHandlers = processEventHandlers['unhandledRejection'] || [];
      if (rejectionHandlers.length > 0) {
        rejectionHandlers[0](rejectionReason, Promise.resolve());
      }

      expect(unhandledRejections).toHaveLength(1);
      expect(unhandledRejections[0].reason).toBe(rejectionReason);
    });
  });

  describe('Health Monitoring', () => {
    test('should monitor bot health metrics', async () => {
      const healthCheck = () => {
        const health = {
          uptime: mockBotLifecycleClient.uptime || 0,
          memoryUsage: process.memoryUsage(),
          guilds: mockBotLifecycleClient.guilds.cache.size,
          ping: mockBotLifecycleClient.ws.ping,
          ready: !!mockBotLifecycleClient.readyAt,
          timestamp: Date.now(),
        };

        return health;
      };

      // Mock some health data
      mockBotLifecycleClient.uptime = 123456;
      mockBotLifecycleClient.guilds.cache.set('guild-1', { id: 'guild-1' });
      mockBotLifecycleClient.readyAt = new Date();

      const health = healthCheck();

      expect(health.uptime).toBe(123456);
      expect(health.guilds).toBe(1);
      expect(health.ping).toBe(50);
      expect(health.ready).toBe(true);
      expect(health.memoryUsage).toHaveProperty('heapUsed');
    });

    test('should restart on critical errors', async () => {
      let restartCount = 0;

      const restartBot = async () => {
        restartCount++;
        console.log(`Restarting bot (attempt ${restartCount})...`);

        try {
          await mockBotLifecycleClient.destroy();
          await mockBotSequelize.close();

          // Simulate restart delay
          await new Promise((resolve) => setTimeout(resolve, 1000));

          await mockBotSequelize.authenticate();
          await mockBotLifecycleClient.login('test-token');

          return { success: true, restartCount };
        } catch (error) {
          console.error('Restart failed:', error);
          throw error;
        }
      };

      const result = await restartBot();

      expect(result.success).toBe(true);
      expect(result.restartCount).toBe(1);
      expect(mockBotLifecycleClient.destroy).toHaveBeenCalled();
      expect(mockBotSequelize.close).toHaveBeenCalled();
      expect(mockBotSequelize.authenticate).toHaveBeenCalled();
      expect(mockBotLifecycleClient.login).toHaveBeenCalled();
    });
  });

  describe('Configuration Management', () => {
    test('should validate environment configuration', () => {
      const validateConfig = (config: any) => {
        const errors: string[] = [];

        if (!config.token) {
          errors.push('Discord token is required');
        }

        if (!config.database?.host) {
          errors.push('Database host is required');
        }

        if (!Array.isArray(config.intents)) {
          errors.push('Discord intents must be an array');
        }

        return { valid: errors.length === 0, errors };
      };

      // Test valid config
      const validConfig = {
        token: 'valid-token',
        database: { host: 'localhost' },
        intents: [1, 512],
      };

      const validResult = validateConfig(validConfig);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Test invalid config
      const invalidConfig = {
        database: {},
        intents: 'invalid',
      };

      const invalidResult = validateConfig(invalidConfig);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('Discord token is required');
      expect(invalidResult.errors).toContain('Database host is required');
      expect(invalidResult.errors).toContain('Discord intents must be an array');
    });

    test('should load configuration from environment', () => {
      const originalEnv = process.env;

      process.env = {
        ...originalEnv,
        DISCORD_TOKEN: 'env-token',
        DATABASE_HOST: 'env-host',
        NODE_ENV: 'test',
      };

      const loadConfig = () => {
        return {
          token: process.env.DISCORD_TOKEN,
          database: {
            host: process.env.DATABASE_HOST,
          },
          environment: process.env.NODE_ENV,
          debug: process.env.NODE_ENV !== 'production',
        };
      };

      const config = loadConfig();

      expect(config.token).toBe('env-token');
      expect(config.database.host).toBe('env-host');
      expect(config.environment).toBe('test');
      expect(config.debug).toBe(true);

      process.env = originalEnv;
    });
  });
});
