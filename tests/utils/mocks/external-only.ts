// External dependency mocks only - following the new architecture principle
// Mock external dependencies, never internal application code

/**
 * Mock Discord.js - External API library
 * This is the ONLY place where Discord.js should be mocked
 */
export const mockDiscordJs = () => {
  return jest.mock('discord.js', () => {
    const mockClient = {
      user: {
        id: 'bot-user-id',
        tag: 'TestBot#0000',
        username: 'TestBot',
      },
      guilds: {
        cache: new Map([['guild-1', { id: 'guild-1', name: 'Test Guild' }]]),
        fetch: jest.fn(),
        resolve: jest.fn(),
      },
      channels: {
        cache: new Map(),
        fetch: jest.fn(),
        resolve: jest.fn(),
      },
      users: {
        cache: new Map(),
        fetch: jest.fn(),
        resolve: jest.fn(),
      },
      commands: new Map(),
      on: jest.fn().mockReturnThis(),
      once: jest.fn().mockReturnThis(),
      off: jest.fn().mockReturnThis(),
      emit: jest.fn().mockReturnValue(true),
      login: jest.fn().mockResolvedValue('test-token'),
      destroy: jest.fn().mockResolvedValue(undefined),
      isReady: jest.fn().mockReturnValue(true),
      readyTimestamp: Date.now(),
      uptime: 60000,
    };

    const mockEmbed = {
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

    const mockButton = {
      setCustomId: jest.fn().mockReturnThis(),
      setLabel: jest.fn().mockReturnThis(),
      setStyle: jest.fn().mockReturnThis(),
      setDisabled: jest.fn().mockReturnThis(),
      setEmoji: jest.fn().mockReturnThis(),
      setURL: jest.fn().mockReturnThis(),
    };

    const mockActionRow = {
      addComponents: jest.fn().mockReturnThis(),
      setComponents: jest.fn().mockReturnThis(),
    };

    const mockSelectMenu = {
      setCustomId: jest.fn().mockReturnThis(),
      setPlaceholder: jest.fn().mockReturnThis(),
      addOptions: jest.fn().mockReturnThis(),
      setMinValues: jest.fn().mockReturnThis(),
      setMaxValues: jest.fn().mockReturnThis(),
    };

    const mockModal = {
      setCustomId: jest.fn().mockReturnThis(),
      setTitle: jest.fn().mockReturnThis(),
      addComponents: jest.fn().mockReturnThis(),
    };

    const mockTextInput = {
      setCustomId: jest.fn().mockReturnThis(),
      setLabel: jest.fn().mockReturnThis(),
      setStyle: jest.fn().mockReturnThis(),
      setMinLength: jest.fn().mockReturnThis(),
      setMaxLength: jest.fn().mockReturnThis(),
      setPlaceholder: jest.fn().mockReturnThis(),
      setRequired: jest.fn().mockReturnThis(),
      setValue: jest.fn().mockReturnThis(),
    };

    const mockSlashCommandBuilder = {
      setName: jest.fn().mockReturnThis(),
      setDescription: jest.fn().mockReturnThis(),
      addSubcommand: jest.fn().mockReturnThis(),
      addSubcommandGroup: jest.fn().mockReturnThis(),
      addStringOption: jest.fn().mockReturnThis(),
      addIntegerOption: jest.fn().mockReturnThis(),
      addNumberOption: jest.fn().mockReturnThis(),
      addBooleanOption: jest.fn().mockReturnThis(),
      addUserOption: jest.fn().mockReturnThis(),
      addChannelOption: jest.fn().mockReturnThis(),
      addRoleOption: jest.fn().mockReturnThis(),
      addMentionableOption: jest.fn().mockReturnThis(),
      addAttachmentOption: jest.fn().mockReturnThis(),
      setDefaultMemberPermissions: jest.fn().mockReturnThis(),
      setDMPermission: jest.fn().mockReturnThis(),
      toJSON: jest.fn().mockReturnValue({
        name: 'test-command',
        description: 'Test command',
        options: [],
      }),
    };

    return {
      // Client
      Client: jest.fn(() => mockClient),

      // Builders
      SlashCommandBuilder: jest.fn(() => mockSlashCommandBuilder),
      EmbedBuilder: jest.fn(() => mockEmbed),
      ButtonBuilder: jest.fn(() => mockButton),
      ActionRowBuilder: jest.fn(() => mockActionRow),
      StringSelectMenuBuilder: jest.fn(() => mockSelectMenu),
      ModalBuilder: jest.fn(() => mockModal),
      TextInputBuilder: jest.fn(() => mockTextInput),

      // Enums and Constants
      GatewayIntentBits: {
        Guilds: 1 << 0,
        GuildMembers: 1 << 1,
        GuildMessages: 1 << 9,
        DirectMessages: 1 << 12,
        MessageContent: 1 << 15,
      },

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

      ChannelType: {
        GuildText: 0,
        DM: 1,
        GuildVoice: 2,
        GroupDM: 3,
        GuildCategory: 4,
      },

      // Utilities
      Collection: Map,

      // REST API
      REST: jest.fn().mockImplementation(() => ({
        put: jest.fn().mockResolvedValue({}),
        post: jest.fn().mockResolvedValue({}),
        patch: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
        get: jest.fn().mockResolvedValue({}),
      })),

      Routes: {
        applicationCommands: jest.fn(
          (applicationId: string) => `/applications/${applicationId}/commands`
        ),
        applicationGuildCommands: jest.fn(
          (applicationId: string, guildId: string) =>
            `/applications/${applicationId}/guilds/${guildId}/commands`
        ),
      },

      // Permissions
      PermissionFlagsBits: {
        SendMessages: 1n << 11n,
        UseSlashCommands: 1n << 31n,
        Administrator: 1n << 3n,
        ManageMessages: 1n << 13n,
        EmbedLinks: 1n << 14n,
      },

      // Interaction Types
      InteractionType: {
        Ping: 1,
        ApplicationCommand: 2,
        MessageComponent: 3,
        ApplicationCommandAutocomplete: 4,
        ModalSubmit: 5,
      },

      ApplicationCommandType: {
        ChatInput: 1,
        User: 2,
        Message: 3,
      },
    };
  });
};

/**
 * Mock Sequelize - External ORM library
 * Only mock the connection and core Sequelize class, not our models
 */
export const mockSequelize = () => {
  return jest.mock('sequelize', () => {
    const mockSequelizeInstance = {
      authenticate: jest.fn().mockResolvedValue(undefined),
      sync: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue([]),
      transaction: jest.fn().mockImplementation((callback) => {
        const mockTransaction = {
          commit: jest.fn().mockResolvedValue(undefined),
          rollback: jest.fn().mockResolvedValue(undefined),
        };

        if (typeof callback === 'function') {
          return Promise.resolve(callback(mockTransaction));
        }
        return Promise.resolve(mockTransaction);
      }),
      define: jest.fn().mockImplementation((modelName, attributes, options) => {
        return {
          name: modelName,
          attributes,
          options,
          create: jest.fn().mockResolvedValue({}),
          findAll: jest.fn().mockResolvedValue([]),
          findOne: jest.fn().mockResolvedValue(null),
          findByPk: jest.fn().mockResolvedValue(null),
          update: jest.fn().mockResolvedValue([1]),
          destroy: jest.fn().mockResolvedValue(1),
          count: jest.fn().mockResolvedValue(0),
          sum: jest.fn().mockResolvedValue(0),
          bulkCreate: jest.fn().mockResolvedValue([]),
        };
      }),
      models: {},
    };

    const MockSequelizeConstructor = jest.fn(() => mockSequelizeInstance);
    MockSequelizeConstructor.prototype = mockSequelizeInstance;

    return {
      Sequelize: MockSequelizeConstructor,
      DataTypes: {
        STRING: 'STRING',
        TEXT: 'TEXT',
        INTEGER: 'INTEGER',
        BIGINT: 'BIGINT',
        FLOAT: 'FLOAT',
        DOUBLE: 'DOUBLE',
        DECIMAL: jest.fn((precision, scale) => ({ type: 'DECIMAL', precision, scale })),
        BOOLEAN: 'BOOLEAN',
        DATE: 'DATE',
        DATEONLY: 'DATEONLY',
        TIME: 'TIME',
        NOW: jest.fn(() => new Date()),
        UUID: 'UUID',
        UUIDV4: 'UUIDV4',
        JSON: 'JSON',
        JSONB: 'JSONB',
        ENUM: jest.fn((...values) => ({ type: 'ENUM', values })),
      },
      Op: {
        eq: Symbol('eq'),
        ne: Symbol('ne'),
        gte: Symbol('gte'),
        gt: Symbol('gt'),
        lte: Symbol('lte'),
        lt: Symbol('lt'),
        not: Symbol('not'),
        is: Symbol('is'),
        in: Symbol('in'),
        notIn: Symbol('notIn'),
        like: Symbol('like'),
        notLike: Symbol('notLike'),
        iLike: Symbol('iLike'),
        notILike: Symbol('notILike'),
        regexp: Symbol('regexp'),
        notRegexp: Symbol('notRegexp'),
        iRegexp: Symbol('iRegexp'),
        notIRegexp: Symbol('notIRegexp'),
        between: Symbol('between'),
        notBetween: Symbol('notBetween'),
        overlap: Symbol('overlap'),
        contains: Symbol('contains'),
        contained: Symbol('contained'),
        adjacent: Symbol('adjacent'),
        strictLeft: Symbol('strictLeft'),
        strictRight: Symbol('strictRight'),
        noExtendRight: Symbol('noExtendRight'),
        noExtendLeft: Symbol('noExtendLeft'),
        and: Symbol('and'),
        or: Symbol('or'),
        any: Symbol('any'),
        all: Symbol('all'),
        values: Symbol('values'),
        col: Symbol('col'),
        placeholder: Symbol('placeholder'),
        join: Symbol('join'),
        substring: Symbol('substring'),
      },
      QueryTypes: {
        SELECT: 'SELECT',
        INSERT: 'INSERT',
        UPDATE: 'UPDATE',
        BULKUPDATE: 'BULKUPDATE',
        BULKDELETE: 'BULKDELETE',
        DELETE: 'DELETE',
        UPSERT: 'UPSERT',
        VERSION: 'VERSION',
        SHOWTABLES: 'SHOWTABLES',
        SHOWINDEXES: 'SHOWINDEXES',
        DESCRIBE: 'DESCRIBE',
        RAW: 'RAW',
        FOREIGNKEYS: 'FOREIGNKEYS',
        SHOWCONSTRAINTS: 'SHOWCONSTRAINTS',
      },
      Model: class MockModel {
        static init = jest.fn();
        static associate = jest.fn();
        static create = jest.fn().mockResolvedValue({});
        static findAll = jest.fn().mockResolvedValue([]);
        static findOne = jest.fn().mockResolvedValue(null);
        static findByPk = jest.fn().mockResolvedValue(null);
        static update = jest.fn().mockResolvedValue([1]);
        static destroy = jest.fn().mockResolvedValue(1);
        static count = jest.fn().mockResolvedValue(0);
        static sum = jest.fn().mockResolvedValue(0);
        static bulkCreate = jest.fn().mockResolvedValue([]);

        save = jest.fn().mockResolvedValue(this);
        reload = jest.fn().mockResolvedValue(this);
        destroy = jest.fn().mockResolvedValue(undefined);
        update = jest.fn().mockResolvedValue(this);
      },
    };
  });
};

/**
 * Mock Node.js file system - External Node.js API
 */
export const mockFileSystem = () => {
  return jest.mock('fs/promises', () => ({
    readFile: jest.fn().mockResolvedValue(''),
    writeFile: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
    rmdir: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({
      isFile: jest.fn().mockReturnValue(true),
      isDirectory: jest.fn().mockReturnValue(false),
      size: 1024,
      mtime: new Date(),
    }),
    readdir: jest.fn().mockResolvedValue([]),
    access: jest.fn().mockResolvedValue(undefined),
    copyFile: jest.fn().mockResolvedValue(undefined),
  }));
};

/**
 * Mock Path module - External Node.js API
 */
export const mockPath = () => {
  return jest.mock('path', () => ({
    join: jest.fn((...args) => args.join('/')),
    resolve: jest.fn((...args) => '/' + args.join('/')),
    dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
    basename: jest.fn((path) => path.split('/').pop()),
    extname: jest.fn((path) => {
      const parts = path.split('.');
      return parts.length > 1 ? '.' + parts.pop() : '';
    }),
    sep: '/',
    delimiter: ':',
    normalize: jest.fn((path) => path),
    isAbsolute: jest.fn((path) => path.startsWith('/')),
  }));
};

/**
 * Mock HTTP libraries - External network dependencies
 */
export const mockAxios = () => {
  return jest.mock('axios', () => ({
    get: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
    post: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
    put: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
    patch: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
    delete: jest.fn().mockResolvedValue({ data: {}, status: 200 }),
    create: jest.fn().mockReturnThis(),
    defaults: {
      baseURL: '',
      timeout: 5000,
      headers: {},
    },
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  }));
};

/**
 * Mock crypto module - External Node.js API
 */
export const mockCrypto = () => {
  return jest.mock('crypto', () => ({
    randomBytes: jest.fn((size) => Buffer.alloc(size, 0)),
    randomUUID: jest.fn(() => '12345678-1234-1234-1234-123456789012'),
    createHash: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('hashedvalue'),
    })),
    createHmac: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('hmacvalue'),
    })),
  }));
};

/**
 * Collection of all external mocks for easy importing
 */
export const ExternalMocks = {
  discordJs: mockDiscordJs,
  sequelize: mockSequelize,
  fileSystem: mockFileSystem,
  path: mockPath,
  axios: mockAxios,
  crypto: mockCrypto,
};

/**
 * Apply all external mocks - for tests that need everything mocked
 */
export const mockAllExternal = () => {
  mockDiscordJs();
  mockSequelize();
  mockFileSystem();
  mockPath();
  mockAxios();
  mockCrypto();
};

/**
 * Apply only essential mocks - for most tests
 */
export const mockEssentials = () => {
  mockDiscordJs();
  mockSequelize();
};
