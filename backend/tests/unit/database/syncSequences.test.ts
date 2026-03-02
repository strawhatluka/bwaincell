const mockQuery = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();

// Must mock logger BEFORE database/index is loaded
jest.mock('../../../shared/utils/logger', () => ({
  createLogger: () => ({
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: jest.fn(),
  }),
}));

// Must set DATABASE_URL BEFORE database/index is loaded
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/testdb';

// Mock Sequelize constructor to avoid real DB connection
jest.mock('sequelize', () => {
  const actual = jest.requireActual('sequelize');
  return {
    ...actual,
    Sequelize: jest.fn().mockImplementation(() => ({
      query: mockQuery,
      define: jest.fn(),
      authenticate: jest.fn(),
      sync: jest.fn(),
      models: {},
    })),
  };
});

// Mock all model init methods to avoid real DB calls
jest.mock('../../../database/models/Task', () => ({
  default: { init: jest.fn() },
  __esModule: true,
}));
jest.mock('../../../database/models/Note', () => ({
  default: { init: jest.fn() },
  __esModule: true,
}));
jest.mock('../../../database/models/Reminder', () => ({
  default: { init: jest.fn() },
  __esModule: true,
}));
jest.mock('../../../database/models/Budget', () => ({
  default: { init: jest.fn() },
  __esModule: true,
}));
jest.mock('../../../database/models/Schedule', () => ({
  default: { init: jest.fn() },
  __esModule: true,
}));
jest.mock('../../../database/models/List', () => ({
  default: { init: jest.fn() },
  __esModule: true,
}));
jest.mock('../../../database/models/User', () => ({ User: { init: jest.fn() } }));
jest.mock('../../../database/models/EventConfig', () => ({
  default: { init: jest.fn() },
  __esModule: true,
}));
jest.mock('../../../database/models/SunsetConfig', () => ({
  default: { init: jest.fn() },
  __esModule: true,
}));

import { syncSequences } from '../../../database/index';

describe('syncSequences()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute the sequence sync SQL query', async () => {
    mockQuery.mockResolvedValue(undefined);

    await syncSequences();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('pg_get_serial_sequence'));
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('setval'));
  });

  it('should log success on completion', async () => {
    mockQuery.mockResolvedValue(undefined);

    await syncSequences();

    expect(mockLoggerInfo).toHaveBeenCalledWith('Auto-increment sequences verified');
  });

  it('should warn but not throw on query failure (non-fatal)', async () => {
    mockQuery.mockRejectedValue(new Error('permission denied'));

    // Should NOT throw
    await expect(syncSequences()).resolves.toBeUndefined();

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Failed to verify auto-increment sequences (non-fatal)',
      expect.objectContaining({
        error: 'permission denied',
      })
    );
  });

  it('should handle non-Error exceptions gracefully', async () => {
    mockQuery.mockRejectedValue('string error');

    await expect(syncSequences()).resolves.toBeUndefined();

    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Failed to verify auto-increment sequences (non-fatal)',
      expect.objectContaining({
        error: 'string error',
      })
    );
  });
});
