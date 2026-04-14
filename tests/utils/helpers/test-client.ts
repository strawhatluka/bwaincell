// Test Discord client builder utilities
import { Client } from 'discord.js';
import { testUsers, testGuilds } from '../fixtures/discord-fixtures';

export interface MockClientOptions {
  user?: Partial<typeof testUsers.standard>;
  guilds?: Array<Partial<typeof testGuilds.standard>>;
  commands?: Map<string, any>;
  readyTimestamp?: number;
  uptime?: number;
}

/**
 * Creates a mock Discord client for testing
 * @param options Configuration for the mock client
 * @returns Mock Discord client object
 */
export function createMockClient(options: MockClientOptions = {}): Client {
  const {
    user = testUsers.bot,
    guilds = [testGuilds.standard],
    commands = new Map(),
    readyTimestamp = Date.now(),
    uptime = 60000, // 1 minute uptime
  } = options;

  // Create guild cache
  const guildCache = new Map();
  guilds.forEach((guild, index) => {
    const guildId = guild.id || `guild-${index}`;
    guildCache.set(guildId, {
      id: guildId,
      name: guild.name || `Test Guild ${index}`,
      ownerId: guild.ownerId || testUsers.admin.id,
      memberCount: guild.memberCount || 10,
      ...guild,
    });
  });

  const mockClient = {
    // Client identification
    user,
    application: {
      id: 'app-123',
      name: 'Test Bot',
      description: 'A test Discord bot',
    },

    // Client state
    readyTimestamp,
    uptime,
    isReady: jest.fn().mockReturnValue(true),

    // Collections
    guilds: {
      cache: guildCache,
      fetch: jest.fn().mockImplementation(async (guildId: string) => {
        return guildCache.get(guildId) || null;
      }),
      resolve: jest.fn().mockImplementation((guildResolvable: any) => {
        if (typeof guildResolvable === 'string') {
          return guildCache.get(guildResolvable);
        }
        return guildResolvable;
      }),
    },

    channels: {
      cache: new Map(),
      fetch: jest.fn().mockResolvedValue(null),
      resolve: jest.fn().mockReturnValue(null),
    },

    users: {
      cache: new Map([
        [user.id, user],
        [testUsers.standard.id, testUsers.standard],
        [testUsers.admin.id, testUsers.admin],
      ]),
      fetch: jest.fn().mockImplementation(async (userId: string) => {
        const users: Record<string, any> = {
          [String(user.id)]: user,
          [String(testUsers.standard.id)]: testUsers.standard,
          [String(testUsers.admin.id)]: testUsers.admin,
        };
        return users[userId] || null;
      }),
      resolve: jest.fn().mockImplementation((userResolvable: any) => {
        if (typeof userResolvable === 'string') {
          return mockClient.users.cache.get(userResolvable);
        }
        return userResolvable;
      }),
    },

    // Commands
    commands,

    // Event system
    on: jest.fn().mockReturnThis(),
    once: jest.fn().mockReturnThis(),
    off: jest.fn().mockReturnThis(),
    emit: jest.fn().mockReturnValue(true),
    removeAllListeners: jest.fn().mockReturnThis(),

    // Client lifecycle
    login: jest.fn().mockResolvedValue('test-token'),
    logout: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),

    // WebSocket
    ws: {
      status: 0, // READY
      gateway: {
        url: 'wss://gateway.discord.gg',
        ping: 50,
      },
      ping: 50,
      shards: new Map([[0, { status: 0, ping: 50 }]]),
    },

    // REST API
    rest: {
      put: jest.fn().mockResolvedValue({}),
      post: jest.fn().mockResolvedValue({}),
      patch: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      get: jest.fn().mockResolvedValue({}),
    },

    // Options
    options: {
      intents: [],
      shards: 'auto',
      presence: {
        status: 'online',
        activities: [],
      },
    },

    // Voice (if needed)
    voice: {
      adapters: new Map(),
      connections: new Map(),
    },

    // Utility methods
    generateInvite: jest.fn().mockResolvedValue('https://discord.com/invite/test'),

    // Custom properties for testing
    __testUtils: {
      // Helper to trigger events in tests
      triggerEvent: (eventName: string, ...args: any[]) => {
        const listeners = mockClient.__testUtils.eventListeners.get(eventName) || [];
        listeners.forEach((listener) => listener(...args));
      },

      // Track event listeners for testing
      eventListeners: new Map<string, Function[]>(),

      // Helper to add a guild
      addGuild: (guild: any) => {
        mockClient.guilds.cache.set(guild.id, guild);
      },

      // Helper to add a user
      addUser: (user: any) => {
        mockClient.users.cache.set(user.id, user);
      },

      // Helper to simulate client ready state
      setReady: (ready: boolean = true) => {
        mockClient.isReady = jest.fn().mockReturnValue(ready);
        if (ready) {
          mockClient.readyTimestamp = Date.now();
        }
      },
    },
  };

  // Override event methods to track listeners
  // const originalOn = mockClient.on; // Unused - removed
  mockClient.on = jest.fn().mockImplementation((event: string, listener: Function) => {
    const listeners = mockClient.__testUtils.eventListeners.get(event) || [];
    listeners.push(listener);
    mockClient.__testUtils.eventListeners.set(event, listeners);
    return mockClient;
  });

  // const originalOnce = mockClient.once; // Unused - removed
  mockClient.once = jest.fn().mockImplementation((event: string, listener: Function) => {
    const wrappedListener = (...args: any[]) => {
      listener(...args);
      // Remove after first call
      const listeners = mockClient.__testUtils.eventListeners.get(event) || [];
      const index = listeners.indexOf(wrappedListener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };

    const listeners = mockClient.__testUtils.eventListeners.get(event) || [];
    listeners.push(wrappedListener);
    mockClient.__testUtils.eventListeners.set(event, listeners);
    return mockClient;
  });

  return mockClient as unknown as Client;
}

/**
 * Creates a client builder with fluent interface for easier test setup
 */
export class TestClientBuilder {
  private options: MockClientOptions = {};

  /**
   * Sets the bot user for the client
   */
  withUser(user: Partial<typeof testUsers.standard>): TestClientBuilder {
    this.options.user = user;
    return this;
  }

  /**
   * Adds a guild to the client
   */
  withGuild(guild: Partial<typeof testGuilds.standard>): TestClientBuilder {
    if (!this.options.guilds) {
      this.options.guilds = [];
    }
    this.options.guilds.push(guild);
    return this;
  }

  /**
   * Adds multiple guilds to the client
   */
  withGuilds(guilds: Array<Partial<typeof testGuilds.standard>>): TestClientBuilder {
    this.options.guilds = guilds;
    return this;
  }

  /**
   * Sets the command collection
   */
  withCommands(commands: Map<string, any>): TestClientBuilder {
    this.options.commands = commands;
    return this;
  }

  /**
   * Adds a single command to the collection
   */
  withCommand(name: string, command: any): TestClientBuilder {
    if (!this.options.commands) {
      this.options.commands = new Map();
    }
    this.options.commands.set(name, command);
    return this;
  }

  /**
   * Sets the ready timestamp
   */
  withReadyTimestamp(timestamp: number): TestClientBuilder {
    this.options.readyTimestamp = timestamp;
    return this;
  }

  /**
   * Sets the uptime
   */
  withUptime(uptime: number): TestClientBuilder {
    this.options.uptime = uptime;
    return this;
  }

  /**
   * Builds the mock client
   */
  build(): Client {
    return createMockClient(this.options);
  }
}

/**
 * Pre-configured client scenarios for common test cases
 */
export const ClientScenarios = {
  /**
   * Basic bot client with minimal setup
   */
  basic: () =>
    new TestClientBuilder().withUser(testUsers.bot).withGuild(testGuilds.standard).build(),

  /**
   * Bot client with multiple guilds
   */
  multiGuild: () =>
    new TestClientBuilder()
      .withUser(testUsers.bot)
      .withGuilds([testGuilds.standard, testGuilds.large])
      .build(),

  /**
   * Bot client with pre-loaded commands
   */
  withCommands: (commands: Record<string, any>) => {
    const commandMap = new Map(Object.entries(commands));
    return new TestClientBuilder()
      .withUser(testUsers.bot)
      .withGuild(testGuilds.standard)
      .withCommands(commandMap)
      .build();
  },

  /**
   * Freshly started bot (just came online)
   */
  fresh: () =>
    new TestClientBuilder()
      .withUser(testUsers.bot)
      .withGuild(testGuilds.standard)
      .withReadyTimestamp(Date.now())
      .withUptime(1000) // 1 second uptime
      .build(),

  /**
   * Long-running bot (been online for a while)
   */
  longRunning: () =>
    new TestClientBuilder()
      .withUser(testUsers.bot)
      .withGuild(testGuilds.standard)
      .withReadyTimestamp(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      .withUptime(24 * 60 * 60 * 1000) // 24 hours uptime
      .build(),
};

/**
 * Helper functions for client testing
 */
export const ClientTestUtils = {
  /**
   * Simulates bot startup sequence
   */
  async simulateStartup(client: Client): Promise<void> {
    const mockClient = client as any;

    // Trigger ready event
    mockClient.__testUtils.setReady(true);
    mockClient.__testUtils.triggerEvent('ready', client);

    // Simulate guild availability
    mockClient.guilds.cache.forEach((guild: any) => {
      mockClient.__testUtils.triggerEvent('guildCreate', guild);
    });
  },

  /**
   * Simulates receiving an interaction
   */
  async simulateInteraction(client: Client, interaction: any): Promise<void> {
    const mockClient = client as any;
    mockClient.__testUtils.triggerEvent('interactionCreate', interaction);
  },

  /**
   * Simulates bot shutdown sequence
   */
  async simulateShutdown(client: Client): Promise<void> {
    const mockClient = client as any;

    // Trigger disconnect events
    mockClient.guilds.cache.forEach((guild: any) => {
      mockClient.__testUtils.triggerEvent('guildDelete', guild);
    });

    mockClient.__testUtils.setReady(false);
    mockClient.__testUtils.triggerEvent('disconnect');
  },

  /**
   * Asserts that a client has expected properties
   */
  assertClientReady(client: Client): void {
    expect(client.isReady()).toBe(true);
    expect(client.user).toBeDefined();
    expect(client.readyTimestamp).toBeDefined();
  },

  /**
   * Asserts that client has expected commands loaded
   */
  assertCommandsLoaded(client: Client, expectedCommands: string[]): void {
    const clientCommands = client.commands as Map<string, any>;
    expect(clientCommands).toBeInstanceOf(Map);

    expectedCommands.forEach((commandName) => {
      expect(clientCommands.has(commandName)).toBe(true);
    });
  },
};
