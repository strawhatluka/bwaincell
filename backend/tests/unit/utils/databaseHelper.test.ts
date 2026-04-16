/**
 * Unit Tests: Database Helper
 *
 * Tests model caching and retrieval from getModels()
 * Coverage target: 100%
 */

// Mock logger BEFORE imports
jest.mock('../../../shared/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

const mockTask = { name: 'Task', findAll: jest.fn() };
const mockList = { name: 'List', findAll: jest.fn() };
const mockReminder = { name: 'Reminder', findAll: jest.fn() };

jest.mock('@database/index', () => ({
  Task: mockTask,
  List: mockList,
  Reminder: mockReminder,
}));

import { getModels } from '../../../utils/interactions/helpers/databaseHelper';

describe('Database Helper', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('getModels()', () => {
    test('should return object with Task, List, and Reminder', async () => {
      const models = await getModels();
      expect(models).toHaveProperty('Task');
      expect(models).toHaveProperty('List');
      expect(models).toHaveProperty('Reminder');
    });

    test('should return the mocked model references', async () => {
      const models = await getModels();
      expect(models.Task).toBe(mockTask);
      expect(models.List).toBe(mockList);
      expect(models.Reminder).toBe(mockReminder);
    });

    test('should return cached models on second call (same reference)', async () => {
      const first = await getModels();
      const second = await getModels();
      expect(first).toBe(second);
    });
  });
});
