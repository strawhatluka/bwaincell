// Comprehensive mock factories for all Sequelize models with static methods

export function createTaskMock() {
  const mockModel = {
    // Base Sequelize methods
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    findByPk: jest.fn(),
    count: jest.fn(),

    // Static methods used by task commands
    createTask: jest.fn().mockResolvedValue({
      id: 1,
      user_id: 'user-1',
      guild_id: 'guild-1',
      description: 'Test task',
      completed: false,
      due_date: null,
      createdAt: new Date(),
      save: jest.fn(),
    }),

    getUserTasks: jest.fn().mockResolvedValue([
      { id: 1, description: 'Task 1', completed: false, due_date: null },
      { id: 2, description: 'Task 2', completed: true, due_date: null },
    ]),

    completeTask: jest.fn().mockResolvedValue({
      id: 1,
      description: 'Test task',
      completed: true,
      save: jest.fn(),
    }),

    deleteTask: jest.fn().mockResolvedValue(true),

    editTask: jest.fn().mockResolvedValue({
      id: 1,
      description: 'Updated task',
      completed: false,
      save: jest.fn(),
    }),

    init: jest.fn(),
  };

  return mockModel;
}

export function createBudgetMock() {
  const mockModel = {
    // Base Sequelize methods
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    sum: jest.fn(),
    destroy: jest.fn(),
    findByPk: jest.fn(),

    // Static methods used by budget commands
    addExpense: jest.fn().mockResolvedValue({
      id: 1,
      user_id: 'user-1',
      guild_id: 'guild-1',
      type: 'expense',
      category: 'food',
      amount: 25.5,
      description: 'Test expense',
      date: new Date(),
    }),

    addIncome: jest.fn().mockResolvedValue({
      id: 2,
      user_id: 'user-1',
      guild_id: 'guild-1',
      type: 'income',
      amount: 1000.0,
      description: 'Salary',
      date: new Date(),
    }),

    getSummary: jest.fn().mockResolvedValue({
      income: 1000,
      expenses: 500,
      balance: 500,
      categories: {
        food: 200,
        transport: 100,
        utilities: 150,
        other: 50,
      },
    }),

    getCategories: jest.fn().mockResolvedValue([
      { category: 'food', total: 200 },
      { category: 'transport', total: 100 },
      { category: 'utilities', total: 150 },
    ]),

    getRecentEntries: jest.fn().mockResolvedValue([
      {
        id: 1,
        type: 'expense',
        amount: 25.5,
        description: 'Groceries',
        category: 'food',
        date: new Date(),
      },
      { id: 2, type: 'income', amount: 1000, description: 'Salary', date: new Date() },
    ]),

    getMonthlyTrend: jest.fn().mockResolvedValue([
      { month: 1, year: 2025, income: 1000, expenses: 500 },
      { month: 2, year: 2025, income: 1200, expenses: 600 },
    ]),

    deleteEntry: jest.fn().mockResolvedValue(true),

    init: jest.fn(),
  };

  return mockModel;
}

export function createListMock() {
  const mockModel = {
    // Base Sequelize methods
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),

    // Static methods used by list commands
    createList: jest.fn().mockResolvedValue({
      id: 1,
      user_id: 'user-1',
      guild_id: 'guild-1',
      name: 'Shopping List',
      items: [],
      save: jest.fn(),
    }),

    addItem: jest.fn().mockResolvedValue({
      id: 1,
      name: 'Shopping List',
      items: [
        { text: 'Milk', completed: false },
        { text: 'Bread', completed: false },
      ],
      save: jest.fn(),
    }),

    removeItem: jest.fn().mockResolvedValue({
      id: 1,
      name: 'Shopping List',
      items: [{ text: 'Milk', completed: false }],
      save: jest.fn(),
    }),

    getList: jest.fn().mockResolvedValue({
      id: 1,
      name: 'Shopping List',
      items: [
        { text: 'Milk', completed: false },
        { text: 'Bread', completed: false },
      ],
    }),

    getUserLists: jest.fn().mockResolvedValue([
      { id: 1, name: 'Shopping List', items: [] },
      { id: 2, name: 'Todo List', items: [] },
    ]),

    clearCompleted: jest.fn().mockResolvedValue({
      id: 1,
      name: 'Shopping List',
      items: [{ text: 'Milk', completed: false }],
      save: jest.fn(),
    }),

    deleteList: jest.fn().mockResolvedValue(true),

    toggleItem: jest.fn().mockResolvedValue({
      id: 1,
      name: 'Shopping List',
      items: [
        { text: 'Milk', completed: true },
        { text: 'Bread', completed: false },
      ],
      save: jest.fn(),
    }),

    init: jest.fn(),
  };

  return mockModel;
}

export function createNoteMock() {
  const mockModel = {
    // Base Sequelize methods
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),

    // Static methods used by note commands
    createNote: jest.fn().mockResolvedValue({
      id: 1,
      user_id: 'user-1',
      guild_id: 'guild-1',
      title: 'Test Note',
      content: 'Note content',
      tags: ['test', 'sample'],
      createdAt: new Date(),
      save: jest.fn(),
    }),

    getNotes: jest.fn().mockResolvedValue([
      { id: 1, title: 'Note 1', content: 'Content 1', tags: [] },
      { id: 2, title: 'Note 2', content: 'Content 2', tags: ['important'] },
    ]),

    getNote: jest.fn().mockResolvedValue({
      id: 1,
      title: 'Test Note',
      content: 'Note content',
      tags: ['test'],
    }),

    deleteNote: jest.fn().mockResolvedValue(true),

    searchNotes: jest
      .fn()
      .mockResolvedValue([
        { id: 1, title: 'Matching Note', content: 'Contains search term', tags: [] },
      ]),

    updateNote: jest.fn().mockResolvedValue({
      id: 1,
      title: 'Updated Title',
      content: 'Updated content',
      tags: ['updated'],
      save: jest.fn(),
    }),

    getNotesByTag: jest
      .fn()
      .mockResolvedValue([
        { id: 1, title: 'Tagged Note', content: 'Has the tag', tags: ['important'] },
      ]),

    getAllTags: jest.fn().mockResolvedValue(['important', 'personal', 'work', 'ideas']),

    init: jest.fn(),
  };

  return mockModel;
}

export function createReminderMock() {
  const mockModel = {
    // Base Sequelize methods
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),

    // Static methods used by reminder commands
    createReminder: jest.fn().mockResolvedValue({
      id: 1,
      user_id: 'user-1',
      guild_id: 'guild-1',
      channel_id: 'channel-1',
      message: 'Test reminder',
      time: '10:00',
      frequency: 'once',
      next_trigger: new Date(),
      save: jest.fn(),
    }),

    calculateNextTrigger: jest.fn().mockReturnValue(new Date()),

    getActiveReminders: jest.fn().mockResolvedValue([
      { id: 1, message: 'Active reminder 1', next_trigger: new Date() },
      { id: 2, message: 'Active reminder 2', next_trigger: new Date() },
    ]),

    getUserReminders: jest
      .fn()
      .mockResolvedValue([{ id: 1, message: 'User reminder', time: '10:00', frequency: 'daily' }]),

    deleteReminder: jest.fn().mockResolvedValue(true),

    updateNextTrigger: jest.fn().mockResolvedValue({
      id: 1,
      next_trigger: new Date(),
      save: jest.fn(),
    }),

    getTriggeredReminders: jest
      .fn()
      .mockResolvedValue([{ id: 1, message: 'Triggered reminder', channel_id: 'channel-1' }]),

    init: jest.fn(),
  };

  return mockModel;
}

export function createScheduleMock() {
  const mockModel = {
    // Base Sequelize methods
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn(),

    // Static methods used by schedule commands
    addEvent: jest.fn().mockResolvedValue({
      id: 1,
      user_id: 'user-1',
      guild_id: 'guild-1',
      event_name: 'Meeting',
      event_date: new Date(),
      description: 'Team meeting',
      save: jest.fn(),
    }),

    getEvents: jest.fn().mockResolvedValue([
      { id: 1, event_name: 'Meeting', event_date: new Date(), description: 'Team meeting' },
      { id: 2, event_name: 'Deadline', event_date: new Date(), description: 'Project deadline' },
    ]),

    deleteEvent: jest.fn().mockResolvedValue(true),

    getCountdown: jest.fn().mockResolvedValue({
      event: 'Meeting',
      daysLeft: 5,
      hoursLeft: 120,
      minutesLeft: 7200,
    }),

    getTodaysEvents: jest
      .fn()
      .mockResolvedValue([{ id: 1, event_name: "Today's Meeting", event_date: new Date() }]),

    getUpcomingEvents: jest
      .fn()
      .mockResolvedValue([{ id: 1, event_name: 'Upcoming Event', event_date: new Date() }]),

    init: jest.fn(),
  };

  return mockModel;
}

export function createTrackerMock() {
  const mockModel = {
    // Base Sequelize methods
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn(),

    // Static methods used by tracker commands
    addDataPoint: jest.fn().mockResolvedValue({
      id: 1,
      user_id: 'user-1',
      guild_id: 'guild-1',
      metric: 'weight',
      value: 75.5,
      timestamp: new Date(),
      save: jest.fn(),
    }),

    getStats: jest.fn().mockResolvedValue({
      metric: 'weight',
      count: 10,
      average: 75.5,
      min: 74,
      max: 77,
      latest: 75.5,
      trend: 'stable',
    }),

    getMetrics: jest.fn().mockResolvedValue(['weight', 'steps', 'calories', 'sleep_hours']),

    deleteMetric: jest.fn().mockResolvedValue(true),

    getRecentData: jest.fn().mockResolvedValue([
      { id: 1, metric: 'weight', value: 75.5, timestamp: new Date() },
      { id: 2, metric: 'weight', value: 75.2, timestamp: new Date() },
    ]),

    init: jest.fn(),
  };

  return mockModel;
}

// Helper to reset all mocks
export function resetAllMocks() {
  const factories = [
    createTaskMock,
    createBudgetMock,
    createListMock,
    createNoteMock,
    createReminderMock,
    createScheduleMock,
    createTrackerMock,
  ];

  factories.forEach((factory) => {
    const mock = factory();
    Object.keys(mock).forEach((key) => {
      if (typeof mock[key] === 'function' && mock[key].mockReset) {
        mock[key].mockReset();
      }
    });
  });
}
