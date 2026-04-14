// Tests for Discord commands with proper mock setup
// Set up mocks BEFORE any imports that might use them

// Create mock functions that we'll use throughout the tests
const mockTaskCreateTask = jest.fn();
const mockTaskGetUserTasks = jest.fn();
const mockTaskCompleteTask = jest.fn();
const mockTaskDeleteTask = jest.fn();

// Mock the database models before any command imports them
jest.mock('../../supabase/models/Task', () => {
  return {
    __esModule: true,
    default: {
      createTask: mockTaskCreateTask,
      getUserTasks: mockTaskGetUserTasks,
      completeTask: mockTaskCompleteTask,
      deleteTask: mockTaskDeleteTask,
    },
  };
});

// Mock logger
jest.mock('../../shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  logError: jest.fn(),
  logBotEvent: jest.fn(),
}));

// Create mock interaction object
const createMockInteraction = () => ({
  user: { id: 'test-user-123', username: 'TestUser' },
  guild: { id: 'test-guild-456' },
  guildId: 'test-guild-456',
  options: {
    getSubcommand: jest.fn(),
    getString: jest.fn(),
    getInteger: jest.fn(),
    getBoolean: jest.fn(),
    getNumber: jest.fn(),
  },
  reply: jest.fn(),
  deferReply: jest.fn(),
  editReply: jest.fn(),
  followUp: jest.fn(),
  replied: false,
  deferred: true,
});

// Now require the commands AFTER the mocks are set up
const taskCommand = require('../../commands/task').default;

describe('Discord Commands', () => {
  let mockInteraction: any;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create fresh interaction for each test
    mockInteraction = createMockInteraction();

    // Reset mock return values
    mockTaskCreateTask.mockResolvedValue({
      id: 1,
      description: 'Test task',
      completed: false,
      user_id: 'test-user-123',
      guild_id: 'test-guild-456',
      created_at: new Date(),
    });
    mockTaskGetUserTasks.mockResolvedValue([
      {
        id: 1,
        description: 'Task 1',
        completed: false,
        user_id: 'test-user-123',
        guild_id: 'test-guild-456',
        created_at: new Date(),
      },
      {
        id: 2,
        description: 'Task 2',
        completed: true,
        user_id: 'test-user-123',
        guild_id: 'test-guild-456',
        created_at: new Date(),
      },
    ]);
    mockTaskCompleteTask.mockResolvedValue({
      id: 1,
      description: 'Test',
      completed: true,
      user_id: 'test-user-123',
      guild_id: 'test-guild-456',
      created_at: new Date(),
    });
    mockTaskDeleteTask.mockResolvedValue(true);
  });

  describe('Task Command', () => {
    it('should have correct command structure', () => {
      expect(taskCommand.data).toBeDefined();
      expect(taskCommand.data.name).toBe('task');
      expect(taskCommand.data.description).toBeDefined();
      expect(taskCommand.execute).toBeDefined();
    });

    it('should add a new task', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('add');
      mockInteraction.options.getString.mockImplementation((name) => {
        if (name === 'description') return 'Test task description';
        return null;
      });

      await taskCommand.execute(mockInteraction);

      expect(mockTaskCreateTask).toHaveBeenCalledWith(
        'test-user-123',
        'test-guild-456',
        'Test task description',
        undefined // When no date/time is provided, it's undefined
      );

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
        })
      );
    });

    it('should list all tasks', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('list');
      mockInteraction.options.getString.mockReturnValue('all');

      await taskCommand.execute(mockInteraction);

      expect(mockTaskGetUserTasks).toHaveBeenCalledWith('test-user-123', 'test-guild-456', 'all');

      expect(mockInteraction.editReply).toHaveBeenCalled();
    });

    it('should mark task as done', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('done');
      mockInteraction.options.getInteger.mockReturnValue(1);

      await taskCommand.execute(mockInteraction);

      expect(mockTaskCompleteTask).toHaveBeenCalledWith(1, 'test-user-123', 'test-guild-456');

      expect(mockInteraction.editReply).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('add');
      mockInteraction.options.getString.mockImplementation((name) => {
        if (name === 'description') return 'Test task description';
        return null;
      });
      mockTaskCreateTask.mockRejectedValue(new Error('Database error'));

      await taskCommand.execute(mockInteraction);

      // Since interaction is deferred, it uses followUp for errors
      expect(mockInteraction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('error'),
        })
      );
    });
  });
});
