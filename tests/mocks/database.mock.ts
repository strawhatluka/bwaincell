// Database mocks for testing

export const mockSequelize = {
  authenticate: jest.fn().mockResolvedValue(undefined),
  sync: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  define: jest.fn(),
  transaction: jest.fn((callback) => callback()),
};

export const mockModel = {
  create: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  findByPk: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  count: jest.fn(),
  findOrCreate: jest.fn(),
  bulkCreate: jest.fn(),
  init: jest.fn(),
};

export const mockBudget = {
  ...mockModel,
  create: jest.fn().mockResolvedValue({ id: 1, amount: 100 }),
  findAll: jest.fn().mockResolvedValue([
    { id: 1, amount: 100, category: 'food' },
    { id: 2, amount: 50, category: 'transport' },
  ]),
  sum: jest.fn().mockResolvedValue(150),
  // Add custom Budget model methods
  addExpense: jest
    .fn()
    .mockResolvedValue({
      id: 1,
      amount: 100,
      category: 'food',
      type: 'expense',
      user_id: 'user-1',
      guild_id: 'guild-1',
    }),
  addIncome: jest
    .fn()
    .mockResolvedValue({
      id: 2,
      amount: 1000,
      category: 'income',
      type: 'income',
      user_id: 'user-1',
      guild_id: 'guild-1',
    }),
  getSummary: jest.fn().mockResolvedValue({ totalIncome: 1000, totalExpenses: 150, balance: 850 }),
  getCategories: jest.fn().mockResolvedValue([{ category: 'food', total: 100 }]),
  getRecentEntries: jest.fn().mockResolvedValue([]),
  getMonthlyTrend: jest.fn().mockResolvedValue([]),
  deleteEntry: jest.fn().mockResolvedValue(true),
};

export const mockTask = {
  ...mockModel,
  create: jest.fn().mockResolvedValue({ id: 1, description: 'Test task', completed: false }),
  findAll: jest.fn().mockResolvedValue([
    { id: 1, description: 'Task 1', completed: false },
    { id: 2, description: 'Task 2', completed: true },
  ]),
  update: jest.fn().mockResolvedValue([1]),
  // Add custom Task model methods
  createTask: jest
    .fn()
    .mockResolvedValue({
      id: 1,
      description: 'Test task',
      completed: false,
      user_id: 'user-1',
      guild_id: 'guild-1',
    }),
  getUserTasks: jest.fn().mockResolvedValue([
    { id: 1, description: 'Task 1', completed: false },
    { id: 2, description: 'Task 2', completed: true },
  ]),
  completeTask: jest.fn().mockResolvedValue({ id: 1, description: 'Task 1', completed: true }),
  deleteTask: jest.fn().mockResolvedValue(true),
  updateTask: jest.fn().mockResolvedValue({ id: 1, description: 'Updated task', completed: false }),
  getTaskById: jest.fn().mockResolvedValue({ id: 1, description: 'Test task', completed: false }),
};

export const mockList = {
  ...mockModel,
  create: jest.fn().mockResolvedValue({ id: 1, name: 'Test list', items: [] }),
  findAll: jest.fn().mockResolvedValue([{ id: 1, name: 'Shopping', items: ['milk', 'bread'] }]),
  // Add custom List model methods
  createList: jest
    .fn()
    .mockResolvedValue({
      id: 1,
      name: 'Test list',
      items: [],
      user_id: 'user-1',
      guild_id: 'guild-1',
    }),
  addItem: jest.fn().mockResolvedValue({ id: 1, name: 'Test list', items: ['new item'] }),
  removeItem: jest.fn().mockResolvedValue({ id: 1, name: 'Test list', items: [] }),
  getList: jest.fn().mockResolvedValue({ id: 1, name: 'Test list', items: [] }),
  getUserLists: jest
    .fn()
    .mockResolvedValue([{ id: 1, name: 'Shopping', items: ['milk', 'bread'] }]),
  clearCompleted: jest.fn().mockResolvedValue({ id: 1, name: 'Test list', items: [] }),
  deleteList: jest.fn().mockResolvedValue(true),
  toggleItem: jest.fn().mockResolvedValue({ id: 1, name: 'Test list', items: [] }),
};

export const mockNote = {
  ...mockModel,
  create: jest.fn().mockResolvedValue({ id: 1, title: 'Test note', content: 'Content' }),
  findAll: jest.fn().mockResolvedValue([{ id: 1, title: 'Note 1', content: 'Content 1' }]),
  // Add custom Note model methods
  createNote: jest
    .fn()
    .mockResolvedValue({
      id: 1,
      title: 'Test note',
      content: 'Content',
      tags: [],
      user_id: 'user-1',
      guild_id: 'guild-1',
    }),
  getNotes: jest.fn().mockResolvedValue([{ id: 1, title: 'Note 1', content: 'Content 1' }]),
  getNote: jest.fn().mockResolvedValue({ id: 1, title: 'Test note', content: 'Content' }),
  deleteNote: jest.fn().mockResolvedValue(true),
  searchNotes: jest.fn().mockResolvedValue([]),
  updateNote: jest
    .fn()
    .mockResolvedValue({ id: 1, title: 'Updated note', content: 'Updated content' }),
  getNotesByTag: jest.fn().mockResolvedValue([]),
  getAllTags: jest.fn().mockResolvedValue([]),
};

export const mockReminder = {
  ...mockModel,
  create: jest.fn().mockResolvedValue({
    id: 1,
    message: 'Test reminder',
    next_trigger: new Date().toISOString(),
  }),
  findAll: jest.fn().mockResolvedValue([]),
  // Add custom Reminder model methods
  createReminder: jest.fn().mockResolvedValue({
    id: 1,
    message: 'Test reminder',
    next_trigger: new Date(),
    user_id: 'user-1',
    guild_id: 'guild-1',
  }),
  getActiveReminders: jest.fn().mockResolvedValue([]),
  getUserReminders: jest.fn().mockResolvedValue([]),
  deleteReminder: jest.fn().mockResolvedValue(true),
  updateNextTrigger: jest.fn().mockResolvedValue({ id: 1, message: 'Test reminder' }),
  getTriggeredReminders: jest.fn().mockResolvedValue([]),
};

export const mockSchedule = {
  ...mockModel,
  create: jest.fn().mockResolvedValue({
    id: 1,
    event: 'Test event',
    event_date: new Date().toISOString(),
  }),
  findAll: jest.fn().mockResolvedValue([]),
  // Add custom Schedule model methods
  addEvent: jest
    .fn()
    .mockResolvedValue({
      id: 1,
      event: 'Test event',
      event_date: new Date(),
      user_id: 'user-1',
      guild_id: 'guild-1',
    }),
  getEvents: jest.fn().mockResolvedValue([]),
  deleteEvent: jest.fn().mockResolvedValue(true),
  getCountdown: jest.fn().mockResolvedValue({ days: 5, hours: 3, minutes: 30 }),
  getTodaysEvents: jest.fn().mockResolvedValue([]),
  getUpcomingEvents: jest.fn().mockResolvedValue([]),
};

export const mockTracker = {
  ...mockModel,
  create: jest.fn().mockResolvedValue({ id: 1, metric: 'Test metric', value: 10 }),
  findAll: jest.fn().mockResolvedValue([]),
  // Add custom Tracker model methods
  addDataPoint: jest
    .fn()
    .mockResolvedValue({
      id: 1,
      metric: 'Test metric',
      value: 10,
      user_id: 'user-1',
      guild_id: 'guild-1',
    }),
  getStats: jest.fn().mockResolvedValue({ average: 10, min: 5, max: 15, total: 100, count: 10 }),
  getMetrics: jest.fn().mockResolvedValue(['metric1', 'metric2']),
  deleteMetric: jest.fn().mockResolvedValue(true),
  getRecentData: jest.fn().mockResolvedValue([]),
};

export const mockModels = {
  Budget: mockBudget,
  Task: mockTask,
  List: mockList,
  Note: mockNote,
  Reminder: mockReminder,
  Schedule: mockSchedule,
  Tracker: mockTracker,
};

// Mock Sequelize module
jest.mock('sequelize', () => ({
  Sequelize: jest.fn(() => mockSequelize),
  DataTypes: {
    STRING: 'STRING',
    INTEGER: 'INTEGER',
    FLOAT: 'FLOAT',
    BOOLEAN: 'BOOLEAN',
    DATE: 'DATE',
    TEXT: 'TEXT',
    JSON: 'JSON',
  },
  Model: class Model {
    static init = jest.fn();
    static create = mockModel.create;
    static findOne = mockModel.findOne;
    static findAll = mockModel.findAll;
    static findByPk = mockModel.findByPk;
    static update = mockModel.update;
    static destroy = mockModel.destroy;
  },
}));

// Mock database helper
jest.mock('@utils/interactions/helpers/databaseHelper', () => ({
  getModels: jest.fn().mockResolvedValue(mockModels),
}));

export default {
  mockSequelize,
  mockModel,
  mockModels,
  mockBudget,
  mockTask,
  mockList,
  mockNote,
  mockReminder,
  mockSchedule,
  mockTracker,
};
