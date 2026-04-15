// Discord.js test fixtures and mock data
// Removed unused imports - keeping the file for fixture data

/**
 * Standard test users for consistent testing
 */
export const testUsers = {
  standard: {
    id: 'user-123',
    tag: 'TestUser#0001',
    username: 'TestUser',
    discriminator: '0001',
    bot: false,
    system: false,
    avatar: null,
    verified: true,
    createdTimestamp: 1640995200000, // 2022-01-01
  },

  admin: {
    id: 'admin-456',
    tag: 'AdminUser#0002',
    username: 'AdminUser',
    discriminator: '0002',
    bot: false,
    system: false,
    avatar: null, // Changed to null to match type requirements
    verified: true,
    createdTimestamp: 1640995200000,
  },

  bot: {
    id: 'bot-789',
    tag: 'TestBot#0000',
    username: 'TestBot',
    discriminator: '0000',
    bot: true,
    system: false,
    avatar: null, // Changed to null to match type requirements
    verified: true,
    createdTimestamp: 1640995200000,
  },
};

/**
 * Standard test guilds for consistent testing
 */
export const testGuilds = {
  standard: {
    id: 'guild-123',
    name: 'Test Guild',
    ownerId: testUsers.admin.id,
    description: 'A test guild for unit testing',
    icon: null,
    banner: null,
    memberCount: 25,
    large: false,
    createdTimestamp: 1640995200000,
    features: [],
    preferredLocale: 'en-US',
  },

  large: {
    id: 'guild-456',
    name: 'Large Test Guild',
    ownerId: testUsers.admin.id,
    description: 'A large test guild',
    icon: null, // Changed to null to match type requirements
    banner: null, // Changed to null to match type requirements
    memberCount: 5000,
    large: true,
    createdTimestamp: 1640995200000,
    features: [], // Changed to empty array to match type requirements
    preferredLocale: 'en-US',
  },
};

/**
 * Standard test channels for consistent testing
 */
export const testChannels = {
  general: {
    id: 'channel-123',
    name: 'general',
    type: 0, // GUILD_TEXT
    guildId: testGuilds.standard.id,
    parentId: null,
    position: 0,
    topic: 'General discussion',
    nsfw: false,
    rateLimitPerUser: 0,
    createdTimestamp: 1640995200000,
  },

  commands: {
    id: 'channel-456',
    name: 'bot-commands',
    type: 0, // GUILD_TEXT
    guildId: testGuilds.standard.id,
    parentId: null,
    position: 1,
    topic: 'Bot commands channel',
    nsfw: false,
    rateLimitPerUser: 5,
    createdTimestamp: 1640995200000,
  },

  private: {
    id: 'channel-789',
    name: 'private-channel',
    type: 0, // GUILD_TEXT
    guildId: testGuilds.standard.id,
    parentId: 'category-123',
    position: 0,
    topic: 'Private discussion',
    nsfw: false,
    rateLimitPerUser: 10,
    createdTimestamp: 1640995200000,
  },
};

/**
 * Standard test members (users in guilds) for consistent testing
 */
export const testMembers = {
  standardInStandard: {
    id: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    user: testUsers.standard,
    nick: null,
    joinedTimestamp: 1640995200000,
    premiumSinceTimestamp: null,
    roles: ['role-everyone'],
    permissions: ['SEND_MESSAGES', 'READ_MESSAGE_HISTORY', 'USE_SLASH_COMMANDS'],
  },

  adminInStandard: {
    id: testUsers.admin.id,
    guildId: testGuilds.standard.id,
    user: testUsers.admin,
    nick: 'Guild Owner',
    joinedTimestamp: 1640995200000,
    premiumSinceTimestamp: null,
    roles: ['role-everyone', 'role-admin'],
    permissions: ['ADMINISTRATOR'],
  },
};

/**
 * Common embed templates for testing
 */
export const embedTemplates = {
  success: {
    title: '✅ Success',
    description: 'Operation completed successfully',
    color: 0x00ff00,
    timestamp: new Date().toISOString(),
    footer: { text: 'Bwaincell Bot' },
  },

  error: {
    title: '❌ Error',
    description: 'An error occurred',
    color: 0xff0000,
    timestamp: new Date().toISOString(),
    footer: { text: 'Bwaincell Bot' },
  },

  info: {
    title: 'ℹ️ Information',
    description: 'Informational message',
    color: 0x0099ff,
    timestamp: new Date().toISOString(),
    footer: { text: 'Bwaincell Bot' },
  },

  warning: {
    title: '⚠️ Warning',
    description: 'Warning message',
    color: 0xffff00,
    timestamp: new Date().toISOString(),
    footer: { text: 'Bwaincell Bot' },
  },
};

/**
 * Button component templates for testing
 */
export const buttonTemplates = {
  primary: {
    customId: 'test-primary-button',
    label: 'Primary Action',
    style: 1, // PRIMARY
    emoji: null,
    disabled: false,
  },

  secondary: {
    customId: 'test-secondary-button',
    label: 'Secondary Action',
    style: 2, // SECONDARY
    emoji: { name: '⚙️' },
    disabled: false,
  },

  success: {
    customId: 'test-success-button',
    label: 'Confirm',
    style: 3, // SUCCESS
    emoji: { name: '✅' },
    disabled: false,
  },

  danger: {
    customId: 'test-danger-button',
    label: 'Delete',
    style: 4, // DANGER
    emoji: { name: '🗑️' },
    disabled: false,
  },

  link: {
    label: 'External Link',
    style: 5, // LINK
    url: 'https://example.com',
    emoji: { name: '🔗' },
    disabled: false,
  },
};

/**
 * Select menu templates for testing
 */
export const selectMenuTemplates = {
  basic: {
    customId: 'test-select-menu',
    placeholder: 'Choose an option',
    minValues: 1,
    maxValues: 1,
    options: [
      {
        label: 'Option 1',
        value: 'option-1',
        description: 'First option',
        emoji: { name: '1️⃣' },
        default: false,
      },
      {
        label: 'Option 2',
        value: 'option-2',
        description: 'Second option',
        emoji: { name: '2️⃣' },
        default: false,
      },
      {
        label: 'Option 3',
        value: 'option-3',
        description: 'Third option',
        emoji: { name: '3️⃣' },
        default: true,
      },
    ],
  },
};

/**
 * Modal templates for testing
 */
export const modalTemplates = {
  basic: {
    customId: 'test-modal',
    title: 'Test Modal',
    components: [
      {
        type: 1, // ACTION_ROW
        components: [
          {
            type: 4, // TEXT_INPUT
            customId: 'test-text-input',
            label: 'Enter text',
            style: 1, // SHORT
            placeholder: 'Type here...',
            required: true,
            minLength: 1,
            maxLength: 100,
          },
        ],
      },
    ],
  },
};

/**
 * Permission templates for testing
 */
export const permissionTemplates = {
  basic: ['SEND_MESSAGES', 'READ_MESSAGE_HISTORY', 'USE_SLASH_COMMANDS', 'EMBED_LINKS'],

  moderator: [
    'SEND_MESSAGES',
    'READ_MESSAGE_HISTORY',
    'USE_SLASH_COMMANDS',
    'EMBED_LINKS',
    'MANAGE_MESSAGES',
    'KICK_MEMBERS',
    'BAN_MEMBERS',
  ],

  administrator: ['ADMINISTRATOR'],
};

/**
 * Factory functions for creating test data
 */
export const DiscordFixtureFactory = {
  /**
   * Creates a test user with custom properties
   */
  createUser(overrides: Partial<typeof testUsers.standard> = {}) {
    return {
      ...testUsers.standard,
      ...overrides,
    };
  },

  /**
   * Creates a test guild with custom properties
   */
  createGuild(overrides: Partial<typeof testGuilds.standard> = {}) {
    return {
      ...testGuilds.standard,
      ...overrides,
    };
  },

  /**
   * Creates a test channel with custom properties
   */
  createChannel(overrides: Partial<typeof testChannels.general> = {}) {
    return {
      ...testChannels.general,
      ...overrides,
    };
  },

  /**
   * Creates a test member with custom properties
   */
  createMember(overrides: Partial<typeof testMembers.standardInStandard> = {}) {
    return {
      ...testMembers.standardInStandard,
      ...overrides,
    };
  },

  /**
   * Creates an embed with custom properties
   */
  createEmbed(template: keyof typeof embedTemplates, overrides: any = {}) {
    return {
      ...embedTemplates[template],
      ...overrides,
    };
  },

  /**
   * Creates a button with custom properties
   */
  createButton(template: keyof typeof buttonTemplates, overrides: any = {}) {
    return {
      ...buttonTemplates[template],
      ...overrides,
    };
  },
};
