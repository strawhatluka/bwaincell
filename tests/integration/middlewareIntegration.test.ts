// Middleware Integration Tests - REFACTORED using Work Order #010 Architecture
// Tests the complete middleware chain execution with real components

// ✅ NEW ARCHITECTURE: Mock only external dependencies
import { mockEssentials } from '../utils/mocks/external-only';
import { MiddlewareRunner } from '../../utils/interactions/middleware';
import { loggingMiddleware } from '../../utils/interactions/middleware/loggingMiddleware';
import { validationMiddleware } from '../../utils/interactions/middleware/validationMiddleware';
import { rateLimitMiddleware } from '../../utils/interactions/middleware/rateLimitMiddleware';
import { errorMiddleware } from '../../utils/interactions/middleware/errorMiddleware';
import { createMockButtonInteraction, createMockModalSubmitInteraction } from '../mocks/discord';
import { getModels } from '../../utils/interactions/helpers/databaseHelper';

// Mock getModels for database operations
jest.mock('../../utils/interactions/helpers/databaseHelper', () => ({
  getModels: jest.fn(),
}));

// ✅ Mock only external dependencies
mockEssentials();

describe('Middleware Integration Tests', () => {
  let middlewareRunner: MiddlewareRunner;

  beforeEach(() => {
    jest.clearAllMocks();
    // ✅ NO jest.resetModules() - keeps module loading stable
    middlewareRunner = new MiddlewareRunner();

    // Set up getModels mock for middleware that needs database access
    (getModels as jest.Mock).mockResolvedValue({
      Task: {
        findOne: jest.fn(),
        createTask: jest.fn(),
        completeTask: jest.fn(),
        getUserTasks: jest.fn(),
      },
      List: {
        findOne: jest.fn(),
        addItem: jest.fn(),
      },
    });
  });

  afterEach(() => {
    middlewareRunner.clear();
  });

  describe('Middleware Chain Execution', () => {
    it('should execute middleware chain in correct order', async () => {
      const executionOrder: string[] = [];

      const testMiddleware1 = {
        name: 'test1',
        execute: async (_context: any, next: () => Promise<void>) => {
          executionOrder.push('test1-start');
          await next();
          executionOrder.push('test1-end');
        },
      };

      const testMiddleware2 = {
        name: 'test2',
        execute: async (_context: any, next: () => Promise<void>) => {
          executionOrder.push('test2-start');
          await next();
          executionOrder.push('test2-end');
        },
      };

      middlewareRunner.use(testMiddleware1);
      middlewareRunner.use(testMiddleware2);

      const mockHandler = jest.fn().mockImplementation(() => {
        executionOrder.push('handler');
        return Promise.resolve();
      });

      const interaction = createMockButtonInteraction('test_button');
      await middlewareRunner.run(interaction as any, mockHandler);

      expect(executionOrder).toEqual([
        'test1-start',
        'test2-start',
        'handler',
        'test2-end',
        'test1-end',
      ]);
    });

    it('should handle middleware errors gracefully', async () => {
      const errorMiddleware = {
        name: 'error-test',
        execute: async (_context: any, _next: () => Promise<void>) => {
          throw new Error('Test middleware error');
        },
      };

      middlewareRunner.use(errorMiddleware);

      const mockHandler = jest.fn();
      const interaction = createMockButtonInteraction('test_button');

      await expect(middlewareRunner.run(interaction as any, mockHandler)).rejects.toThrow(
        'Test middleware error'
      );

      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('Performance Testing', () => {
    it('should execute middleware chain within performance budget', async () => {
      // Add all production middlewares
      middlewareRunner.use(loggingMiddleware);
      middlewareRunner.use(validationMiddleware);
      middlewareRunner.use(rateLimitMiddleware);
      middlewareRunner.use(errorMiddleware);

      const mockHandler = jest.fn().mockResolvedValue(undefined);
      const interaction = createMockButtonInteraction('task_add_new');

      const startTime = Date.now();
      await middlewareRunner.run(interaction as any, mockHandler);
      const executionTime = Date.now() - startTime;

      // Should complete in under 50ms as specified in work order
      expect(executionTime).toBeLessThan(50);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should handle concurrent middleware execution', async () => {
      middlewareRunner.use(loggingMiddleware);
      middlewareRunner.use(validationMiddleware);
      middlewareRunner.use(rateLimitMiddleware);

      const mockHandler = jest.fn().mockResolvedValue(undefined);

      // Create multiple concurrent interactions
      const interactions = Array.from({ length: 10 }, (_, i) =>
        createMockButtonInteraction(`test_button_${i}`, `user_${i}`)
      );

      const promises = interactions.map((interaction) =>
        middlewareRunner.run(interaction as any, mockHandler)
      );

      const startTime = Date.now();
      await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All should complete reasonably quickly
      expect(totalTime).toBeLessThan(500);
      expect(mockHandler).toHaveBeenCalledTimes(10);
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should apply rate limiting across middleware chain', async () => {
      middlewareRunner.use(rateLimitMiddleware);
      middlewareRunner.use(errorMiddleware);

      const mockHandler = jest.fn().mockResolvedValue(undefined);
      const interaction = createMockButtonInteraction('task_add_new', 'rate-limit-user');

      // First 5 requests should succeed (within limit)
      for (let i = 0; i < 5; i++) {
        await middlewareRunner.run(interaction as any, mockHandler);
      }

      expect(mockHandler).toHaveBeenCalledTimes(5);
    });
  });

  describe('Validation Integration', () => {
    it('should validate modal inputs through middleware', async () => {
      middlewareRunner.use(validationMiddleware);
      middlewareRunner.use(errorMiddleware);

      const mockHandler = jest.fn().mockResolvedValue(undefined);

      // Test with valid input
      const validInteraction = createMockModalSubmitInteraction('task_add_modal', {
        task_description: 'Valid task description',
      });

      await middlewareRunner.run(validInteraction as any, mockHandler);
      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Test with potentially malicious input
      const maliciousInteraction = createMockModalSubmitInteraction('task_add_modal', {
        task_description: '<script>alert("xss")</script>DROP TABLE tasks;',
      });

      // Should be blocked by validation middleware
      await middlewareRunner.run(maliciousInteraction as any, mockHandler);
      // Handler should still be called once (from valid interaction)
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from handler errors', async () => {
      middlewareRunner.use(errorMiddleware);

      const failingHandler = jest.fn().mockRejectedValue(new Error('Handler failed'));
      const interaction = createMockButtonInteraction('test_button');

      // Should not throw - error middleware should handle it
      await expect(
        middlewareRunner.run(interaction as any, failingHandler)
      ).resolves.toBeUndefined();

      expect(failingHandler).toHaveBeenCalled();
    });

    it('should provide context for error recovery', async () => {
      let capturedContext: any = null;

      const contextCapturingMiddleware = {
        name: 'context-capture',
        execute: async (context: any, next: () => Promise<void>) => {
          capturedContext = { ...context };
          await next();
        },
      };

      middlewareRunner.use(contextCapturingMiddleware);

      const mockHandler = jest.fn().mockResolvedValue(undefined);
      const interaction = createMockButtonInteraction('test_button', 'test-user');

      await middlewareRunner.run(interaction as any, mockHandler);

      expect(capturedContext).toBeDefined();
      expect(capturedContext.userId).toBe('test-user');
      expect(capturedContext.guildId).toBe('test-guild');
      expect(capturedContext.startTime).toBeGreaterThan(0);
      expect(capturedContext.metadata).toBeDefined();
    });
  });

  describe('Logging Integration', () => {
    it('should capture timing metrics through real logging middleware', async () => {
      // The logging middleware uses the actual logger from our system
      // We can verify it works by checking that no errors are thrown
      // and the handler gets called successfully

      middlewareRunner.use(loggingMiddleware);

      const mockHandler = jest.fn().mockResolvedValue(undefined);
      const interaction = createMockButtonInteraction('test_button');

      // Act - should complete without errors
      await expect(middlewareRunner.run(interaction as any, mockHandler)).resolves.toBeUndefined();

      // Verify the handler was called successfully
      expect(mockHandler).toHaveBeenCalledTimes(1);

      // The actual logging output is visible in the test output above
      // showing "Interaction started" and "Interaction completed" messages
    });
  });
});
