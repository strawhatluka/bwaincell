// Schedule Command Tests - REFACTORED using Work Order #010 Architecture
// Tests the actual command implementation with external dependencies mocked

import { createMockInteraction } from '../../utils/helpers/test-interaction';
import { mockEssentials } from '../../utils/mocks/external-only';
import scheduleCommand from '../../../commands/schedule';
import Schedule from '../../../supabase/models/Schedule';

// ✅ NEW ARCHITECTURE: Mock only external dependencies
mockEssentials();

describe('Schedule Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // ✅ NO jest.resetModules() - keeps module loading stable
  });

  describe('Command Structure', () => {
    it('should have correct command data', () => {
      // ✅ Static import - no dynamic loading needed
      expect(scheduleCommand.data).toBeDefined();
      expect(scheduleCommand.data.name).toBe('schedule');
      expect(scheduleCommand.data.description).toContain('schedule');
    });

    it('should have all required subcommands', () => {
      const commandData = scheduleCommand.data.toJSON();
      const subcommandNames = commandData.options?.map((opt: any) => opt.name) || [];

      expect(subcommandNames).toContain('add');
      expect(subcommandNames).toContain('list');
      expect(subcommandNames).toContain('delete');
      expect(subcommandNames).toContain('countdown');
      expect(subcommandNames).toContain('today');
      expect(subcommandNames).toContain('week');
    });

    it('should have execute function', () => {
      expect(typeof scheduleCommand.execute).toBe('function');
    });
  });

  describe('Add Event Subcommand', () => {
    it('should create a new schedule event', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'schedule',
        subcommand: 'add',
        options: {
          event: 'Team meeting',
          date: '2024-12-25',
          time: '10:00',
          description: 'Weekly team sync',
        },
      });

      const mockEvent = {
        id: 1,
        user_id: interaction.user.id,
        guild_id: interaction.guildId,
        event: 'Team meeting',
        date: '2024-12-25',
        time: '10:00',
        description: 'Weekly team sync',
        created_at: new Date(),
      };
      jest.spyOn(Schedule, 'addEvent').mockResolvedValue(mockEvent as any);

      // Act - Execute actual command
      await scheduleCommand.execute(interaction);

      // Assert - Verify actual behavior
      expect(Schedule.addEvent).toHaveBeenCalledWith(
        interaction.user.id,
        interaction.guildId,
        'Team meeting',
        '2024-12-25',
        '10:00',
        'Weekly team sync'
      );

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Event Scheduled',
              }),
            }),
          ]),
        })
      );
    });

    it('should create event without description', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'schedule',
        subcommand: 'add',
        options: {
          event: 'Quick standup',
          date: '2024-12-26',
          time: '09:00',
          // No description provided
        },
      });

      const mockEvent = {
        id: 2,
        event: 'Quick standup',
        date: '2024-12-26',
        time: '09:00',
        description: null,
      };
      jest.spyOn(Schedule, 'addEvent').mockResolvedValue(mockEvent as any);

      // Act
      await scheduleCommand.execute(interaction);

      // Assert
      expect(Schedule.addEvent).toHaveBeenCalledWith(
        interaction.user.id,
        interaction.guildId,
        'Quick standup',
        '2024-12-26',
        '09:00',
        null
      );
    });

    it('should handle invalid date format', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'schedule',
        subcommand: 'add',
        options: {
          event: 'Invalid date event',
          date: 'invalid-date',
          time: '10:00',
        },
      });

      // Act
      await scheduleCommand.execute(interaction);

      // Assert - Should not create event with invalid date
      expect(Schedule.addEvent).not.toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: 'Invalid date format. Use YYYY-MM-DD.',
      });
    });

    it('should handle invalid time format', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'schedule',
        subcommand: 'add',
        options: {
          event: 'Invalid time event',
          date: '2024-12-25',
          time: 'invalid-time',
        },
      });

      // Act
      await scheduleCommand.execute(interaction);

      // Assert
      expect(Schedule.addEvent).not.toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: 'Invalid time format. Use HH:MM (24-hour format).',
      });
    });

    it('should handle missing guild context', async () => {
      // Arrange - Interaction without guild
      const interaction = createMockInteraction({
        commandName: 'schedule',
        subcommand: 'add',
        options: {
          event: 'Test event',
          date: '2024-12-25',
          time: '10:00',
        },
        guild: undefined,
      });
      (interaction as any).guild = null;
      (interaction as any).guildId = null;

      // Act
      await scheduleCommand.execute(interaction);

      // Assert
      expect(Schedule.addEvent).not.toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: 'This command can only be used in a server.',
      });
    });
  });

  describe('List Events Subcommand', () => {
    it('should display upcoming events', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'schedule',
        subcommand: 'list',
        options: {
          filter: 'upcoming',
        },
      });

      const mockEvents = [
        {
          id: 1,
          event: 'Team meeting',
          date: '2024-12-25',
          time: '10:00',
          description: 'Weekly team sync',
        },
        {
          id: 2,
          event: 'Project review',
          date: '2024-12-26',
          time: '14:00',
          description: null,
        },
      ];
      jest.spyOn(Schedule, 'getEvents').mockResolvedValue(mockEvents as any);

      // Act
      await scheduleCommand.execute(interaction);

      // Assert
      expect(Schedule.getEvents).toHaveBeenCalledWith(
        interaction.user.id,
        interaction.guildId,
        'upcoming'
      );

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Your Upcoming Events',
              }),
            }),
          ]),
        })
      );
    });

    it('should handle empty events list', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'schedule',
        subcommand: 'list',
        options: {
          filter: 'all',
        },
      });

      jest.spyOn(Schedule, 'getEvents').mockResolvedValue([]);

      // Act
      await scheduleCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: 'No all events found.',
      });
    });

    it('should default to upcoming filter when not specified', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'schedule',
        subcommand: 'list',
        // No filter option provided
      });

      const mockEvents = [
        {
          id: 1,
          event: 'Default test',
          date: '2024-12-25',
          time: '10:00',
        },
      ];
      jest.spyOn(Schedule, 'getEvents').mockResolvedValue(mockEvents as any);

      // Act
      await scheduleCommand.execute(interaction);

      // Assert
      expect(Schedule.getEvents).toHaveBeenCalledWith(
        interaction.user.id,
        interaction.guildId,
        'upcoming'
      );
    });
  });

  describe('Delete Event Subcommand', () => {
    it('should delete existing event', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'schedule',
        subcommand: 'delete',
        options: {
          event_id: 123,
        },
      });

      jest.spyOn(Schedule, 'deleteEvent').mockResolvedValue(true);

      // Act
      await scheduleCommand.execute(interaction);

      // Assert
      expect(Schedule.deleteEvent).toHaveBeenCalledWith(
        123,
        interaction.user.id,
        interaction.guildId
      );

      expect(interaction.editReply).toHaveBeenCalledWith({
        content: 'Event #123 has been deleted.',
      });
    });

    it('should handle non-existent event deletion', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'schedule',
        subcommand: 'delete',
        options: {
          event_id: 999,
        },
      });

      jest.spyOn(Schedule, 'deleteEvent').mockResolvedValue(false);

      // Act
      await scheduleCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: "Event #999 not found or doesn't belong to you.",
      });
    });
  });

  describe('Countdown Subcommand', () => {
    it('should display countdown to event', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'schedule',
        subcommand: 'countdown',
        options: {
          event: 'Team meeting',
        },
      });

      const mockResult = {
        event: {
          id: 1,
          event: 'Team meeting',
          date: '2024-12-25',
          time: '10:00',
          description: 'Weekly team sync',
        },
        timeLeft: '2 days, 3 hours, 45 minutes',
      };
      jest.spyOn(Schedule, 'getCountdown').mockResolvedValue(mockResult as any);

      // Act
      await scheduleCommand.execute(interaction);

      // Assert
      expect(Schedule.getCountdown).toHaveBeenCalledWith(
        interaction.user.id,
        interaction.guildId,
        'Team meeting'
      );

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: '⏳ Countdown',
              }),
            }),
          ]),
        })
      );
    });

    it('should handle event not found for countdown', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'schedule',
        subcommand: 'countdown',
        options: {
          event: 'Non-existent event',
        },
      });

      jest.spyOn(Schedule, 'getCountdown').mockResolvedValue(null);

      // Act
      await scheduleCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: 'No event found matching "Non-existent event".',
      });
    });
  });

  describe('Today Subcommand', () => {
    it("should display today's events", async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'schedule',
        subcommand: 'today',
      });

      const mockEvents = [
        {
          id: 1,
          event: 'Morning standup',
          date: '2024-12-25',
          time: '09:00',
          description: null,
        },
        {
          id: 2,
          event: 'Afternoon review',
          date: '2024-12-25',
          time: '15:00',
          description: 'Project status review',
        },
      ];
      jest.spyOn(Schedule, 'getTodaysEvents').mockResolvedValue(mockEvents as any);

      // Act
      await scheduleCommand.execute(interaction);

      // Assert
      expect(Schedule.getTodaysEvents).toHaveBeenCalledWith(
        interaction.user.id,
        interaction.guildId
      );

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: "Today's Events",
              }),
            }),
          ]),
        })
      );
    });

    it('should handle no events today', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'schedule',
        subcommand: 'today',
      });

      jest.spyOn(Schedule, 'getTodaysEvents').mockResolvedValue([]);

      // Act
      await scheduleCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: 'No events scheduled for today.',
      });
    });
  });

  describe('Week Subcommand', () => {
    it("should display this week's events", async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'schedule',
        subcommand: 'week',
      });

      const mockEvents = [
        {
          id: 1,
          event: 'Monday meeting',
          date: '2024-12-23',
          time: '10:00',
          description: null,
        },
        {
          id: 2,
          event: 'Friday review',
          date: '2024-12-27',
          time: '16:00',
          description: 'Week wrap-up',
        },
      ];
      jest.spyOn(Schedule, 'getUpcomingEvents').mockResolvedValue(mockEvents as any);

      // Act
      await scheduleCommand.execute(interaction);

      // Assert
      expect(Schedule.getUpcomingEvents).toHaveBeenCalledWith(
        interaction.user.id,
        interaction.guildId,
        7
      );

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: "This Week's Events",
              }),
            }),
          ]),
        })
      );
    });

    it('should handle no events this week', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'schedule',
        subcommand: 'week',
      });

      jest.spyOn(Schedule, 'getUpcomingEvents').mockResolvedValue([]);

      // Act
      await scheduleCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: 'No events scheduled for the next 7 days.',
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'schedule',
        subcommand: 'add',
        options: {
          event: 'Error test event',
          date: '2024-12-25',
          time: '10:00',
        },
      });

      // Mock the interaction as deferred (like in actual bot flow)
      (interaction as any).deferred = true;

      const mockError = new Error('Database connection failed');
      jest.spyOn(Schedule, 'addEvent').mockRejectedValue(mockError);

      // Act
      await scheduleCommand.execute(interaction);

      // Assert - Should handle error gracefully
      expect(interaction.followUp).toHaveBeenCalledWith({
        content: 'An error occurred while processing your request.',
      });
    });

    it('should use editReply when interaction not replied yet', async () => {
      // Arrange
      const interaction = createMockInteraction({
        commandName: 'schedule',
        subcommand: 'list',
      });

      const mockError = new Error('Database error');

      // Mock interaction state
      (interaction as any).replied = false;
      (interaction as any).deferred = false;

      jest.spyOn(Schedule, 'getEvents').mockRejectedValue(mockError);

      // Act
      await scheduleCommand.execute(interaction);

      // Assert
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: 'An error occurred while processing your request.',
      });
    });
  });
});
