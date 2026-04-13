// Task Command Tests - REFACTORED using Work Order #008 Architecture
// Tests the actual command implementation with external dependencies mocked

import { createMockInteraction, InteractionScenarios } from '../../utils/helpers/test-interaction';
import { mockEssentials } from '../../utils/mocks/external-only';
import { taskFixtures } from '../../utils/fixtures/database-fixtures';
import taskCommand from '../../../commands/task';

// ✅ NEW ARCHITECTURE: Mock only external dependencies
mockEssentials();

// Mock the Task model
jest.mock('../../../supabase/models/Task');
import Task from '../../../supabase/models/Task';

describe('Task Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // ✅ NO jest.resetModules() - keeps module loading stable
  });

  describe('Command Structure', () => {
    it('should have correct command data', () => {
      // ✅ Static import - no dynamic loading needed
      expect(taskCommand.data).toBeDefined();
      expect(taskCommand.data.name).toBe('task');
      expect(taskCommand.data.description).toContain('task');
    });

    it('should have all required subcommands', () => {
      const commandData = taskCommand.data.toJSON();
      const subcommandNames = commandData.options?.map((opt: any) => opt.name) || [];

      expect(subcommandNames).toContain('add');
      expect(subcommandNames).toContain('list');
      expect(subcommandNames).toContain('done'); // Note: actual command uses 'done', not 'complete'
      expect(subcommandNames).toContain('delete');
      expect(subcommandNames).toContain('edit');
    });

    it('should have execute function', () => {
      expect(typeof taskCommand.execute).toBe('function');
    });
  });

  describe('Add Task Subcommand', () => {
    it('should create a new task with valid input', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'task',
        subcommand: 'add',
        options: {
          description: 'Complete unit tests',
          due_date: null,
        },
      });

      // Mock the Task model method (not the model itself)
      const mockTask = {
        id: 1,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        description: 'Complete unit tests',
        status: 'pending',
        createdAt: new Date(),
      };
      (Task.createTask as jest.Mock).mockResolvedValue(mockTask);

      // Act - Execute actual command
      await taskCommand.execute(interaction);

      // Assert - Verify actual behavior
      expect(Task.createTask).toHaveBeenCalledWith(
        interaction.user.id,
        interaction.guildId,
        'Complete unit tests',
        null
      );

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: '✨ Task Created',
              }),
            }),
          ]),
        })
      );
    });

    it('should create task with due date when provided', async () => {
      // Arrange
      const dueDate = '2025-12-25 15:30';
      const interaction = createMockInteraction({
        commandName: 'task',
        subcommand: 'add',
        options: {
          description: 'Christmas preparation',
          due_date: dueDate,
        },
      });

      const mockTask = {
        id: 2,
        description: 'Christmas preparation',
        dueDate: new Date(dueDate),
      };
      (Task.createTask as jest.Mock).mockResolvedValue(mockTask);

      // Act
      await taskCommand.execute(interaction);

      // Assert
      expect(Task.createTask).toHaveBeenCalledWith(
        interaction.user.id,
        interaction.guildId,
        'Christmas preparation',
        new Date(dueDate)
      );
    });

    it('should handle invalid date format gracefully', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'task',
        subcommand: 'add',
        options: {
          description: 'Test task',
          due_date: 'invalid-date',
        },
      });

      // Act
      await taskCommand.execute(interaction);

      // Assert - Should not create task with invalid date
      expect(Task.createTask).not.toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: 'Invalid date format. Use YYYY-MM-DD HH:MM',
      });
    });

    it('should handle missing guild context', async () => {
      // Arrange - Interaction without guild
      const interaction = createMockInteraction({
        commandName: 'task',
        subcommand: 'add',
        options: {
          description: 'Test task',
        },
        guild: undefined,
      });
      // Override guildId to null
      (interaction as any).guild = null;
      (interaction as any).guildId = null;

      // Act
      await taskCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: 'This command can only be used in a server.',
      });
    });
  });

  describe('List Tasks Subcommand', () => {
    it('should display user tasks with all filter', async () => {
      // Arrange
      const interaction = InteractionScenarios.taskList('all');

      const mockTasks = [
        { ...taskFixtures.basic, id: 1 },
        { ...taskFixtures.completed, id: 2 },
      ];
      (Task.getUserTasks as jest.Mock).mockResolvedValue(mockTasks);

      // Act
      await taskCommand.execute(interaction);

      // Assert
      expect(Task.getUserTasks).toHaveBeenCalledWith(
        interaction.user.id,
        interaction.guildId,
        'all'
      );

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining('Your  Tasks'),
              }),
            }),
          ]),
        })
      );
    });

    it('should display pending tasks only when filtered', async () => {
      // Arrange
      const interaction = InteractionScenarios.taskList('pending');
      const mockTasks = [taskFixtures.basic];
      (Task.getUserTasks as jest.Mock).mockResolvedValue(mockTasks);

      // Act
      await taskCommand.execute(interaction);

      // Assert
      expect(Task.getUserTasks).toHaveBeenCalledWith(
        interaction.user.id,
        interaction.guildId,
        'pending'
      );
    });

    it('should handle empty task list', async () => {
      // Arrange
      const interaction = InteractionScenarios.taskList();
      (Task.getUserTasks as jest.Mock).mockResolvedValue([]);

      // Act
      await taskCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: '📋 No Tasks Found',
              }),
            }),
          ]),
        })
      );
    });
  });

  describe('Complete Task Subcommand', () => {
    it('should mark task as completed', async () => {
      // Arrange
      const interaction = InteractionScenarios.taskComplete(1);
      const mockTask = { ...taskFixtures.basic, id: 1 };
      (Task.completeTask as jest.Mock).mockResolvedValue(mockTask);

      // Act
      await taskCommand.execute(interaction);

      // Assert
      expect(Task.completeTask).toHaveBeenCalledWith(1, interaction.user.id, interaction.guildId);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: '🎉 Task Completed!',
              }),
            }),
          ]),
        })
      );
    });

    it('should handle non-existent task', async () => {
      // Arrange
      const interaction = InteractionScenarios.taskComplete(999);
      (Task.completeTask as jest.Mock).mockResolvedValue(null);

      // Act
      await taskCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: "❌ Task #999 not found or doesn't belong to you.",
      });
    });
  });

  describe('Delete Task Subcommand', () => {
    it('should delete existing task', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'task',
        subcommand: 'delete',
        options: {
          task_id: 1,
        },
      });
      (Task.deleteTask as jest.Mock).mockResolvedValue(true);

      // Act
      await taskCommand.execute(interaction);

      // Assert
      expect(Task.deleteTask).toHaveBeenCalledWith(1, interaction.user.id, interaction.guildId);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: '🗑️ Task Deleted',
              }),
            }),
          ]),
        })
      );
    });

    it('should handle non-existent task deletion', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'task',
        subcommand: 'delete',
        options: {
          task_id: 999,
        },
      });
      (Task.deleteTask as jest.Mock).mockResolvedValue(false);

      // Act
      await taskCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: "❌ Task #999 not found or doesn't belong to you.",
      });
    });
  });

  describe('Edit Task Subcommand', () => {
    it('should edit task description', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'task',
        subcommand: 'edit',
        options: {
          task_id: 1,
          new_text: 'Updated task description',
        },
      });

      const mockUpdatedTask = {
        ...taskFixtures.basic,
        id: 1,
        description: 'Updated task description',
      };
      (Task.editTask as jest.Mock).mockResolvedValue(mockUpdatedTask);

      // Act
      await taskCommand.execute(interaction);

      // Assert
      expect(Task.editTask).toHaveBeenCalledWith(
        1,
        interaction.user.id,
        interaction.guildId,
        'Updated task description'
      );

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: '✏️ Task Updated',
              }),
            }),
          ]),
        })
      );
    });

    it('should handle editing non-existent task', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'task',
        subcommand: 'edit',
        options: {
          task_id: 999,
          new_text: 'New description',
        },
      });
      (Task.editTask as jest.Mock).mockResolvedValue(null);

      // Act
      await taskCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: "❌ Task #999 not found or doesn't belong to you.",
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const interaction = InteractionScenarios.taskAdd('Test task');
      const mockError = new Error('Database connection failed');
      (Task.createTask as jest.Mock).mockRejectedValue(mockError);

      // Act
      await taskCommand.execute(interaction);

      // Assert - Should handle error gracefully
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('An error occurred while processing your request'),
          ephemeral: true,
        })
      );
    });

    it('should use editReply when interaction not replied yet', async () => {
      // Arrange
      const interaction = InteractionScenarios.taskAdd('Test task');
      const mockError = new Error('Database error');

      // Mock interaction state
      (interaction as any).replied = false;
      (interaction as any).deferred = false;

      (Task.createTask as jest.Mock).mockRejectedValue(mockError);

      // Act
      await taskCommand.execute(interaction);

      // Assert
      expect(interaction.reply).toHaveBeenCalledWith({
        content: '❌ An error occurred while processing your request.',
      });
    });
  });

  describe('Autocomplete Functionality', () => {
    it('should provide task suggestions for done subcommand', async () => {
      // Arrange
      const autocompleteInteraction = {
        options: {
          getFocused: jest.fn().mockReturnValue({ name: 'task_id', value: '' }),
          getSubcommand: jest.fn().mockReturnValue('done'),
        },
        user: { id: 'test-user' },
        guild: { id: 'test-guild' },
        respond: jest.fn().mockResolvedValue(undefined),
      };

      const mockTasks = [
        { id: 1, description: 'Task 1', completed: false },
        { id: 2, description: 'Task 2', completed: false },
      ];
      (Task.getUserTasks as jest.Mock).mockResolvedValue(mockTasks);

      // Act
      await taskCommand.autocomplete(autocompleteInteraction as any);

      // Assert
      expect(Task.getUserTasks).toHaveBeenCalledWith('test-user', 'test-guild', 'pending');

      expect(autocompleteInteraction.respond).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringContaining('Task 1'),
            value: 1,
          }),
        ])
      );
    });

    it('should handle autocomplete errors gracefully', async () => {
      // Arrange
      const autocompleteInteraction = {
        options: {
          getFocused: jest.fn().mockReturnValue({ name: 'task_id', value: '' }),
          getSubcommand: jest.fn().mockReturnValue('done'),
        },
        user: { id: 'test-user' },
        guild: { id: 'test-guild' },
        respond: jest.fn().mockResolvedValue(undefined),
      };

      (Task.getUserTasks as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act
      await taskCommand.autocomplete(autocompleteInteraction as any);

      // Assert - Should respond with empty array on error
      expect(autocompleteInteraction.respond).toHaveBeenCalledWith([]);
    });
  });
});
