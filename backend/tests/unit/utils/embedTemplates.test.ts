/**
 * Unit Tests: Embed Templates
 *
 * Tests Discord embed factory functions and color constants
 * Coverage target: 90%
 */

import {
  EMBED_COLORS,
  createSuccessEmbed,
  createErrorEmbed,
  createInfoEmbed,
  createTaskEmbed,
  createListEmbed,
  createReminderEmbed,
  createRandomEmbed,
} from '../../../utils/interactions/responses/embedTemplates';

describe('Embed Templates', () => {
  describe('EMBED_COLORS', () => {
    test('should have all expected color keys', () => {
      expect(EMBED_COLORS).toHaveProperty('SUCCESS');
      expect(EMBED_COLORS).toHaveProperty('ERROR');
      expect(EMBED_COLORS).toHaveProperty('WARNING');
      expect(EMBED_COLORS).toHaveProperty('INFO');
      expect(EMBED_COLORS).toHaveProperty('TASK');
      expect(EMBED_COLORS).toHaveProperty('LIST');
      expect(EMBED_COLORS).toHaveProperty('REMINDER');
      expect(EMBED_COLORS).toHaveProperty('RANDOM');
      expect(EMBED_COLORS).toHaveProperty('SAVE');
    });

    test('should have numeric color values', () => {
      for (const value of Object.values(EMBED_COLORS)) {
        expect(typeof value).toBe('number');
      }
    });
  });

  describe('createSuccessEmbed()', () => {
    test('should create embed with SUCCESS color', () => {
      const embed = createSuccessEmbed('Test', 'Description');
      const json = embed.toJSON();
      expect(json.color).toBe(EMBED_COLORS.SUCCESS);
    });

    test('should prefix title with checkmark emoji', () => {
      const embed = createSuccessEmbed('Done', 'It worked');
      const json = embed.toJSON();
      expect(json.title).toBe('✅ Done');
    });

    test('should set description', () => {
      const embed = createSuccessEmbed('Title', 'My description');
      const json = embed.toJSON();
      expect(json.description).toBe('My description');
    });

    test('should include timestamp', () => {
      const embed = createSuccessEmbed('Title', 'Desc');
      const json = embed.toJSON();
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('createErrorEmbed()', () => {
    test('should create embed with ERROR color', () => {
      const embed = createErrorEmbed('Error', 'Something failed');
      const json = embed.toJSON();
      expect(json.color).toBe(EMBED_COLORS.ERROR);
    });

    test('should prefix title with cross emoji', () => {
      const embed = createErrorEmbed('Failed', 'Oops');
      const json = embed.toJSON();
      expect(json.title).toBe('❌ Failed');
    });
  });

  describe('createInfoEmbed()', () => {
    test('should create embed with INFO color', () => {
      const embed = createInfoEmbed('Info', 'Details here');
      const json = embed.toJSON();
      expect(json.color).toBe(EMBED_COLORS.INFO);
    });

    test('should prefix title with info emoji', () => {
      const embed = createInfoEmbed('Notice', 'Content');
      const json = embed.toJSON();
      expect(json.title).toBe('ℹ️ Notice');
    });
  });

  describe('createTaskEmbed()', () => {
    test('should create embed with TASK color', () => {
      const embed = createTaskEmbed('My Task');
      const json = embed.toJSON();
      expect(json.color).toBe(EMBED_COLORS.TASK);
    });

    test('should prefix title with clipboard emoji', () => {
      const embed = createTaskEmbed('Task Title');
      const json = embed.toJSON();
      expect(json.title).toBe('📋 Task Title');
    });

    test('should include fields when provided', () => {
      const fields = [
        { name: 'Status', value: 'Open', inline: true },
        { name: 'Priority', value: 'High', inline: true },
      ];
      const embed = createTaskEmbed('Task', fields);
      const json = embed.toJSON();
      expect(json.fields).toHaveLength(2);
      expect(json.fields![0].name).toBe('Status');
      expect(json.fields![1].value).toBe('High');
    });

    test('should have no fields when none provided', () => {
      const embed = createTaskEmbed('Task');
      const json = embed.toJSON();
      expect(json.fields).toBeUndefined();
    });
  });

  describe('createListEmbed()', () => {
    test('should format items with numbered list', () => {
      const items = [
        { text: 'Buy milk', completed: false },
        { text: 'Walk dog', completed: false },
      ];
      const embed = createListEmbed('List', 'Groceries', items);
      const json = embed.toJSON();
      expect(json.description).toContain('1. Buy milk');
      expect(json.description).toContain('2. Walk dog');
    });

    test('should show placeholder for empty items', () => {
      const embed = createListEmbed('List', 'Empty', []);
      const json = embed.toJSON();
      expect(json.description).toContain('_No items in this list_');
    });

    test('should use strikethrough for completed items', () => {
      const items = [{ text: 'Done task', completed: true }];
      const embed = createListEmbed('List', 'Tasks', items);
      const json = embed.toJSON();
      expect(json.description).toContain('~~Done task~~');
    });

    test('should include completion count in footer', () => {
      const items = [
        { text: 'A', completed: true },
        { text: 'B', completed: false },
        { text: 'C', completed: true },
      ];
      const embed = createListEmbed('List', 'Tasks', items);
      const json = embed.toJSON();
      expect(json.footer!.text).toBe('2/3 completed');
    });

    test('should use LIST color', () => {
      const embed = createListEmbed('List', 'Name', []);
      const json = embed.toJSON();
      expect(json.color).toBe(EMBED_COLORS.LIST);
    });
  });

  describe('createReminderEmbed()', () => {
    test('should create embed with REMINDER color', () => {
      const embed = createReminderEmbed('Reminder', 'Do something');
      const json = embed.toJSON();
      expect(json.color).toBe(EMBED_COLORS.REMINDER);
    });

    test('should prefix title with alarm clock emoji', () => {
      const embed = createReminderEmbed('Wake Up', 'Time to go');
      const json = embed.toJSON();
      expect(json.title).toBe('⏰ Wake Up');
    });
  });

  describe('createRandomEmbed()', () => {
    test('should create embed with RANDOM color', () => {
      const embed = createRandomEmbed('Random', 'Content');
      const json = embed.toJSON();
      expect(json.color).toBe(EMBED_COLORS.RANDOM);
    });

    test('should include footer when provided', () => {
      const embed = createRandomEmbed('Title', 'Desc', 'My footer');
      const json = embed.toJSON();
      expect(json.footer!.text).toBe('My footer');
    });

    test('should omit footer when not provided', () => {
      const embed = createRandomEmbed('Title', 'Desc');
      const json = embed.toJSON();
      expect(json.footer).toBeUndefined();
    });
  });
});
