export const createMockTask = () => ({
  id: 1,
  description: 'Test task',
  user_id: 'test-user',
  guild_id: 'test-guild',
  status: 'pending',
  due_date: null,
  completed_at: null,
  created_at: new Date(),
  save: jest.fn().mockResolvedValue(true),
});

export const createMockList = () => ({
  id: 1,
  name: 'Test List',
  user_id: 'test-user',
  guild_id: 'test-guild',
  items: [],
  created_at: new Date(),
  save: jest.fn().mockResolvedValue(true),
});

export const createMockReminder = () => ({
  id: 1,
  message: 'Test reminder',
  user_id: 'test-user',
  guild_id: 'test-guild',
  channel_id: 'test-channel',
  reminder_time: new Date(Date.now() + 3600000), // 1 hour from now
  created_at: new Date(),
  save: jest.fn().mockResolvedValue(true),
  destroy: jest.fn().mockResolvedValue(true),
});

export const mockModels = {
  Task: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    createTask: jest.fn(),
    getUserTasks: jest.fn(),
    completeTask: jest.fn(),
    editTask: jest.fn(),
    deleteTask: jest.fn(),
  },
  List: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    addItem: jest.fn(),
    toggleItem: jest.fn(),
    removeItem: jest.fn(),
  },
  Reminder: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    destroy: jest.fn(),
  },
  Budget: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  Note: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  Schedule: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  Tracker: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
};

// Mock the getModels function
jest.mock('../../utils/interactions/helpers/databaseHelper', () => ({
  getModels: jest.fn().mockResolvedValue(mockModels),
}));
