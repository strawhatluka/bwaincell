import {
  ButtonInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  CacheType,
} from 'discord.js';

export const createMockButtonInteraction = (
  customId: string,
  userId: string = 'test-user',
  guildId: string | null = 'test-guild'
): Partial<ButtonInteraction<CacheType>> => {
  return {
    customId,
    user: { id: userId } as any,
    guild: guildId ? ({ id: guildId } as any) : null,
    replied: false,
    deferred: false,
    deferUpdate: jest.fn().mockResolvedValue(undefined),
    deferReply: jest.fn().mockResolvedValue(undefined),
    followUp: jest.fn().mockResolvedValue(undefined),
    reply: jest.fn().mockResolvedValue(undefined),
    editReply: jest.fn().mockResolvedValue(undefined),
    showModal: jest.fn().mockResolvedValue(undefined),
    client: {
      commands: new Map(),
    } as any,
    valueOf: () => customId,
    // Discord.js type checking methods
    isButton: () => true,
    isStringSelectMenu: () => false,
    isModalSubmit: () => false,
    isCommand: () => false,
    isAutocomplete: () => false,
  } as unknown as Partial<ButtonInteraction<CacheType>>;
};

export const createMockModalSubmitInteraction = (
  customId: string,
  fields: Record<string, string> = {},
  guildId: string | null = 'test-guild'
): Partial<ModalSubmitInteraction<CacheType>> => {
  return {
    customId,
    user: { id: 'test-user' } as any,
    guild: guildId ? ({ id: guildId } as any) : null,
    fields: {
      getTextInputValue: (fieldId: string) => fields[fieldId] || '',
    } as any,
    deferReply: jest.fn().mockResolvedValue(undefined),
    editReply: jest.fn().mockResolvedValue(undefined),
    followUp: jest.fn().mockResolvedValue(undefined),
    reply: jest.fn().mockResolvedValue(undefined),
    valueOf: () => customId,
    // Discord.js type checking methods
    isButton: () => false,
    isStringSelectMenu: () => false,
    isModalSubmit: () => true,
    isCommand: () => false,
    isAutocomplete: () => false,
  } as unknown as Partial<ModalSubmitInteraction<CacheType>>;
};

export const createMockSelectMenuInteraction = (
  customId: string,
  values: string[]
): Partial<StringSelectMenuInteraction<CacheType>> => {
  return {
    customId,
    values,
    user: { id: 'test-user' } as any,
    guild: { id: 'test-guild' } as any,
    deferUpdate: jest.fn().mockResolvedValue(undefined),
    followUp: jest.fn().mockResolvedValue(undefined),
    editReply: jest.fn().mockResolvedValue(undefined),
    valueOf: () => customId,
    // Discord.js type checking methods
    isButton: () => false,
    isStringSelectMenu: () => true,
    isModalSubmit: () => false,
    isCommand: () => false,
    isAutocomplete: () => false,
  } as unknown as Partial<StringSelectMenuInteraction<CacheType>>;
};
