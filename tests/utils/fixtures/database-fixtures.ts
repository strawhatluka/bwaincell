// Database test fixtures and data factories
import { testUsers, testGuilds } from './discord-fixtures';

/**
 * Task model test fixtures
 */
export const taskFixtures = {
  basic: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    description: 'Complete unit tests',
    priority: 'medium',
    status: 'pending',
    dueDate: null,
    completedAt: null,
  },

  urgent: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    description: 'Fix critical bug',
    priority: 'high',
    status: 'pending',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    completedAt: null,
  },

  completed: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    description: 'Setup development environment',
    priority: 'medium',
    status: 'completed',
    dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    completedAt: new Date(),
  },

  overdue: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    description: 'Review pull request',
    priority: 'high',
    status: 'pending',
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    completedAt: null,
  },

  lowPriority: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    description: 'Update documentation',
    priority: 'low',
    status: 'pending',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
    completedAt: null,
  },
};

/**
 * Budget model test fixtures
 */
export const budgetFixtures = {
  expense: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    description: 'Coffee and snacks',
    amount: 25.5,
    category: 'Food',
    type: 'expense',
    date: new Date(),
  },

  income: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    description: 'Freelance payment',
    amount: 500.0,
    category: 'Work',
    type: 'income',
    date: new Date(),
  },

  largeExpense: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    description: 'Laptop purchase',
    amount: 1200.0,
    category: 'Technology',
    type: 'expense',
    date: new Date(),
  },

  transport: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    description: 'Gas for car',
    amount: 45.0,
    category: 'Transport',
    type: 'expense',
    date: new Date(),
  },

  entertainment: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    description: 'Movie tickets',
    amount: 30.0,
    category: 'Entertainment',
    type: 'expense',
    date: new Date(),
  },
};

/**
 * Schedule model test fixtures
 */
export const scheduleFixtures = {
  meeting: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    title: 'Team standup',
    description: 'Daily team synchronization meeting',
    scheduledFor: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    recurring: true,
    frequency: 'daily',
    notificationTime: 15, // 15 minutes before
    isActive: true,
  },

  reminder: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    title: 'Take medication',
    description: 'Daily vitamin supplements',
    scheduledFor: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    recurring: true,
    frequency: 'daily',
    notificationTime: 5, // 5 minutes before
    isActive: true,
  },

  appointment: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    title: 'Doctor appointment',
    description: 'Annual checkup at clinic',
    scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
    recurring: false,
    frequency: null,
    notificationTime: 60, // 1 hour before
    isActive: true,
  },

  weeklyReview: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    title: 'Weekly review',
    description: 'Review week progress and plan next week',
    scheduledFor: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Friday
    recurring: true,
    frequency: 'weekly',
    notificationTime: 30, // 30 minutes before
    isActive: true,
  },

  pastEvent: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    title: 'Past meeting',
    description: 'This event already happened',
    scheduledFor: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    recurring: false,
    frequency: null,
    notificationTime: 15,
    isActive: false,
  },
};

/**
 * Reminder model test fixtures
 */
export const reminderFixtures = {
  simple: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    channelId: 'channel-123',
    message: "Don't forget to submit the report",
    reminderTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    isActive: true,
    recurring: false,
  },

  recurring: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    channelId: 'channel-123',
    message: 'Time for your break!',
    reminderTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    isActive: true,
    recurring: true,
    frequency: 'daily',
  },

  urgent: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    channelId: 'channel-456',
    message: 'URGENT: Server maintenance in 15 minutes',
    reminderTime: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
    isActive: true,
    recurring: false,
  },

  completed: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    channelId: 'channel-123',
    message: 'This reminder was completed',
    reminderTime: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    isActive: false,
    recurring: false,
  },
};

/**
 * List model test fixtures
 */
export const listFixtures = {
  groceries: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    name: 'Grocery List',
    description: 'Weekly grocery shopping list',
    items: JSON.stringify([
      { text: 'Milk', completed: false },
      { text: 'Bread', completed: false },
      { text: 'Eggs', completed: true },
      { text: 'Apples', completed: false },
    ]),
    isPublic: false,
  },

  todo: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    name: 'Development TODO',
    description: 'Tasks for the current sprint',
    items: JSON.stringify([
      { text: 'Fix authentication bug', completed: true },
      { text: 'Implement new feature', completed: false },
      { text: 'Write unit tests', completed: false },
      { text: 'Update documentation', completed: false },
    ]),
    isPublic: true,
  },

  empty: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    name: 'Empty List',
    description: 'A list with no items',
    items: JSON.stringify([]),
    isPublic: false,
  },
};

/**
 * Note model test fixtures
 */
export const noteFixtures = {
  meeting: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    title: 'Meeting Notes - Project Kickoff',
    content:
      'Discussed project timeline, assigned roles, and set next milestones. Next meeting scheduled for Friday.',
    tags: JSON.stringify(['meeting', 'project', 'kickoff']),
    isPublic: false,
  },

  idea: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    title: 'Feature Idea: Auto-categorization',
    content:
      'Implement AI-powered automatic categorization for budget entries based on description patterns.',
    tags: JSON.stringify(['idea', 'feature', 'ai']),
    isPublic: true,
  },

  reference: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    title: 'API Documentation Links',
    content:
      'Discord.js: https://discord.js.org/\nSequelize: https://sequelize.org/\nJest: https://jestjs.io/',
    tags: JSON.stringify(['reference', 'documentation', 'links']),
    isPublic: true,
  },
};

/**
 * Tracker model test fixtures
 */
export const trackerFixtures = {
  habit: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    name: 'Daily Exercise',
    description: 'Track daily workout sessions',
    type: 'habit',
    target: 1, // 1 session per day
    frequency: 'daily',
    unit: 'sessions',
    currentValue: 0,
  },

  goal: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    name: 'Read 12 Books This Year',
    description: 'Annual reading goal',
    type: 'goal',
    target: 12,
    frequency: 'yearly',
    unit: 'books',
    currentValue: 3,
  },

  metric: {
    userId: testUsers.standard.id,
    guildId: testGuilds.standard.id,
    name: 'Water Intake',
    description: 'Daily water consumption tracking',
    type: 'metric',
    target: 8, // 8 glasses per day
    frequency: 'daily',
    unit: 'glasses',
    currentValue: 4,
  },
};

/**
 * Data factory functions for creating test data
 */
export const DatabaseFixtureFactory = {
  /**
   * Creates a task fixture with custom properties
   */
  createTask(overrides: Partial<typeof taskFixtures.basic> = {}) {
    return {
      ...taskFixtures.basic,
      ...overrides,
    };
  },

  /**
   * Creates a budget entry fixture with custom properties
   */
  createBudgetEntry(overrides: Partial<typeof budgetFixtures.expense> = {}) {
    return {
      ...budgetFixtures.expense,
      ...overrides,
    };
  },

  /**
   * Creates a schedule fixture with custom properties
   */
  createSchedule(overrides: Partial<typeof scheduleFixtures.meeting> = {}) {
    return {
      ...scheduleFixtures.meeting,
      ...overrides,
    };
  },

  /**
   * Creates a reminder fixture with custom properties
   */
  createReminder(overrides: Partial<typeof reminderFixtures.simple> = {}) {
    return {
      ...reminderFixtures.simple,
      ...overrides,
    };
  },

  /**
   * Creates a list fixture with custom properties
   */
  createList(overrides: Partial<typeof listFixtures.todo> = {}) {
    return {
      ...listFixtures.todo,
      ...overrides,
    };
  },

  /**
   * Creates a note fixture with custom properties
   */
  createNote(overrides: Partial<typeof noteFixtures.meeting> = {}) {
    return {
      ...noteFixtures.meeting,
      ...overrides,
    };
  },

  /**
   * Creates a tracker fixture with custom properties
   */
  createTracker(overrides: Partial<typeof trackerFixtures.habit> = {}) {
    return {
      ...trackerFixtures.habit,
      ...overrides,
    };
  },

  /**
   * Creates multiple fixtures of the same type
   */
  createMultiple<T>(factory: (overrides?: any) => T, count: number, baseOverrides: any = {}): T[] {
    return Array.from({ length: count }, (_, index) =>
      factory({ ...baseOverrides, id: index + 1 })
    );
  },

  /**
   * Creates a complete set of related test data
   */
  createUserDataSet(
    userId: string = testUsers.standard.id,
    guildId: string = testGuilds.standard.id
  ) {
    return {
      tasks: [
        this.createTask({ userId, guildId, description: 'Task 1' }),
        this.createTask({ userId, guildId, description: 'Task 2', status: 'completed' }),
        this.createTask({ userId, guildId, description: 'Task 3', priority: 'high' }),
      ],
      budgetEntries: [
        this.createBudgetEntry({ userId, guildId, description: 'Coffee', amount: 5.5 }),
        this.createBudgetEntry({ userId, guildId, description: 'Lunch', amount: 12.0 }),
        this.createBudgetEntry({
          userId,
          guildId,
          description: 'Income',
          amount: 100.0,
          type: 'income',
        }),
      ],
      schedules: [
        this.createSchedule({ userId, guildId, title: 'Morning standup' }),
        this.createSchedule({ userId, guildId, title: 'Code review', recurring: false }),
      ],
      reminders: [
        this.createReminder({ userId, guildId, message: 'Reminder 1' }),
        this.createReminder({ userId, guildId, message: 'Reminder 2', recurring: true }),
      ],
      lists: [
        this.createList({ userId, guildId, name: 'Project TODO' }),
        this.createList({ userId, guildId, name: 'Shopping List' }),
      ],
      notes: [
        this.createNote({ userId, guildId, title: 'Meeting notes' }),
        this.createNote({ userId, guildId, title: 'Ideas' }),
      ],
      trackers: [
        this.createTracker({ userId, guildId, name: 'Exercise' }),
        this.createTracker({ userId, guildId, name: 'Reading', type: 'goal' }),
      ],
    };
  },
};

/**
 * Common fixture collections for different test scenarios
 */
export const FixtureCollections = {
  /**
   * Basic set of fixtures for simple tests
   */
  basic: {
    tasks: [taskFixtures.basic, taskFixtures.completed],
    budgetEntries: [budgetFixtures.expense, budgetFixtures.income],
    schedules: [scheduleFixtures.meeting],
    reminders: [reminderFixtures.simple],
  },

  /**
   * Extended set of fixtures for comprehensive tests
   */
  comprehensive: {
    tasks: Object.values(taskFixtures),
    budgetEntries: Object.values(budgetFixtures),
    schedules: Object.values(scheduleFixtures),
    reminders: Object.values(reminderFixtures),
    lists: Object.values(listFixtures),
    notes: Object.values(noteFixtures),
    trackers: Object.values(trackerFixtures),
  },

  /**
   * Edge case fixtures for boundary testing
   */
  edgeCases: {
    tasks: [taskFixtures.overdue, taskFixtures.lowPriority],
    budgetEntries: [budgetFixtures.largeExpense],
    schedules: [scheduleFixtures.pastEvent],
    reminders: [reminderFixtures.completed],
    lists: [listFixtures.empty],
  },
};
