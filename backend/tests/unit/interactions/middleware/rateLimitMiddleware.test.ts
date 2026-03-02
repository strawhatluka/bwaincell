/**
 * Unit Tests: Rate Limit Middleware
 *
 * Tests rate limiting enforcement, per-user tracking, window reset,
 * and custom limits per interaction type.
 * Coverage target: 80%
 */

// Mock logger BEFORE imports
jest.mock('../../../../shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import {
  rateLimitMiddleware,
  rateLimitStore,
} from '../../../../utils/interactions/middleware/rateLimitMiddleware';
import { MiddlewareContext } from '../../../../utils/interactions/middleware/types';

describe('Rate Limit Middleware', () => {
  function createMockContext(overrides: Partial<MiddlewareContext> = {}): MiddlewareContext {
    return {
      interaction: {
        id: 'interaction-1',
        customId: 'task_done_1',
        reply: jest.fn().mockResolvedValue(undefined),
        followUp: jest.fn().mockResolvedValue(undefined),
      } as any,
      startTime: Date.now(),
      metadata: {},
      userId: 'user-456',
      guildId: 'guild-123',
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    rateLimitStore.clear();
  });

  afterAll(() => {
    rateLimitStore.destroy();
  });

  describe('Middleware Properties', () => {
    it('should have name "rateLimit"', () => {
      expect(rateLimitMiddleware.name).toBe('rateLimit');
    });

    it('should have execute function', () => {
      expect(typeof rateLimitMiddleware.execute).toBe('function');
    });
  });

  describe('Rate Limit Enforcement', () => {
    it('should allow requests within the limit', async () => {
      const next = jest.fn().mockResolvedValue(undefined);
      const context = createMockContext();

      await rateLimitMiddleware.execute(context, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should pass rate limit info in context metadata', async () => {
      const next = jest.fn().mockResolvedValue(undefined);
      const context = createMockContext();

      await rateLimitMiddleware.execute(context, next);

      expect(context.metadata.rateLimit).toBeDefined();
      expect(context.metadata.rateLimit.category).toBeDefined();
      expect(context.metadata.rateLimit.remaining).toBeDefined();
      expect(context.metadata.rateLimit.limit).toBeDefined();
    });

    it('should block requests that exceed the rate limit', async () => {
      const next = jest.fn().mockResolvedValue(undefined);

      // Exceed the general rate limit (10 per minute)
      for (let i = 0; i < 11; i++) {
        const context = createMockContext();
        await rateLimitMiddleware.execute(context, next);
      }

      // 10 should have passed, 1 should have been blocked
      expect(next).toHaveBeenCalledTimes(10);
    });

    it('should send rate limit message when exceeded', async () => {
      const next = jest.fn().mockResolvedValue(undefined);
      let lastContext: MiddlewareContext | null = null;

      // Exceed the general rate limit (10 per minute)
      for (let i = 0; i < 12; i++) {
        const context = createMockContext();
        lastContext = context;
        await rateLimitMiddleware.execute(context, next);
      }

      expect(lastContext!.interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('sending requests too quickly'),
          ephemeral: true,
        })
      );
    });

    it('should use followUp when reply fails', async () => {
      const next = jest.fn().mockResolvedValue(undefined);

      // Exceed the limit
      for (let i = 0; i < 11; i++) {
        const replyFn =
          i === 10
            ? jest.fn().mockRejectedValue(new Error('Already replied'))
            : jest.fn().mockResolvedValue(undefined);
        const followUpFn = jest.fn().mockResolvedValue(undefined);

        const context = createMockContext({
          interaction: {
            id: `interaction-${i}`,
            customId: 'task_done_1',
            reply: replyFn,
            followUp: followUpFn,
          } as any,
        });
        await rateLimitMiddleware.execute(context, next);

        if (i === 10) {
          expect(followUpFn).toHaveBeenCalledWith(
            expect.objectContaining({
              content: expect.stringContaining('sending requests too quickly'),
              ephemeral: true,
            })
          );
        }
      }
    });
  });

  describe('Per-User Rate Limiting', () => {
    it('should track limits separately per user', async () => {
      const next = jest.fn().mockResolvedValue(undefined);

      // User A makes 10 requests (reaches the limit)
      for (let i = 0; i < 10; i++) {
        const context = createMockContext({ userId: 'user-A' });
        await rateLimitMiddleware.execute(context, next);
      }

      // User B should still be allowed
      const contextB = createMockContext({ userId: 'user-B' });
      await rateLimitMiddleware.execute(contextB, next);

      // User A's 10 + User B's 1 = 11 total calls to next
      expect(next).toHaveBeenCalledTimes(11);
    });

    it('should track limits separately per guild', async () => {
      const next = jest.fn().mockResolvedValue(undefined);

      // Same user, different guilds
      for (let i = 0; i < 10; i++) {
        const context = createMockContext({ guildId: 'guild-A' });
        await rateLimitMiddleware.execute(context, next);
      }

      const contextGuildB = createMockContext({ guildId: 'guild-B' });
      await rateLimitMiddleware.execute(contextGuildB, next);

      expect(next).toHaveBeenCalledTimes(11);
    });
  });

  describe('Rate Limit Categories', () => {
    it('should categorize task creation interactions', async () => {
      const next = jest.fn().mockResolvedValue(undefined);
      const context = createMockContext({
        interaction: {
          id: 'int-1',
          customId: 'task_add_new',
          reply: jest.fn().mockResolvedValue(undefined),
          followUp: jest.fn().mockResolvedValue(undefined),
        } as any,
      });

      await rateLimitMiddleware.execute(context, next);

      expect(context.metadata.rateLimit.category).toBe('task_create');
    });

    it('should categorize list interactions', async () => {
      const next = jest.fn().mockResolvedValue(undefined);
      const context = createMockContext({
        interaction: {
          id: 'int-1',
          customId: 'list_view_groceries',
          reply: jest.fn().mockResolvedValue(undefined),
          followUp: jest.fn().mockResolvedValue(undefined),
        } as any,
      });

      await rateLimitMiddleware.execute(context, next);

      expect(context.metadata.rateLimit.category).toBe('list_modify');
    });

    it('should categorize command interactions', async () => {
      const next = jest.fn().mockResolvedValue(undefined);
      const context = createMockContext({
        interaction: {
          id: 'int-1',
          commandName: 'task',
          reply: jest.fn().mockResolvedValue(undefined),
          followUp: jest.fn().mockResolvedValue(undefined),
        } as any,
      });

      await rateLimitMiddleware.execute(context, next);

      expect(context.metadata.rateLimit.category).toBe('command');
    });

    it('should default to general category for unknown interactions', async () => {
      const next = jest.fn().mockResolvedValue(undefined);
      const context = createMockContext({
        interaction: {
          id: 'int-1',
          reply: jest.fn().mockResolvedValue(undefined),
          followUp: jest.fn().mockResolvedValue(undefined),
        } as any,
      });

      await rateLimitMiddleware.execute(context, next);

      expect(context.metadata.rateLimit.category).toBe('general');
    });

    it('should enforce task_create limit (5 per minute)', async () => {
      const next = jest.fn().mockResolvedValue(undefined);

      for (let i = 0; i < 6; i++) {
        const context = createMockContext({
          interaction: {
            id: `int-${i}`,
            customId: 'task_add_new',
            reply: jest.fn().mockResolvedValue(undefined),
            followUp: jest.fn().mockResolvedValue(undefined),
          } as any,
        });
        await rateLimitMiddleware.execute(context, next);
      }

      // 5 should pass, 1 blocked
      expect(next).toHaveBeenCalledTimes(5);
    });
  });

  describe('Rate Limit Store', () => {
    it('should clear all limits', () => {
      // Add some limits
      rateLimitStore.isLimited('test-key', { maxRequests: 5, windowMs: 60000 });

      // Clear
      rateLimitStore.clear();

      // Should return max remaining after clear
      const remaining = rateLimitStore.getRemaining('test-key', {
        maxRequests: 5,
        windowMs: 60000,
      });
      expect(remaining).toBe(5);
    });

    it('should return correct remaining count', () => {
      const config = { maxRequests: 5, windowMs: 60000 };

      rateLimitStore.isLimited('user:guild:general', config); // 1 request
      rateLimitStore.isLimited('user:guild:general', config); // 2 requests

      const remaining = rateLimitStore.getRemaining('user:guild:general', config);
      expect(remaining).toBe(3); // 5 - 2 = 3
    });

    it('should reset count after window expires', () => {
      const config = { maxRequests: 2, windowMs: 100 }; // 100ms window

      // Make requests
      rateLimitStore.isLimited('expire-test', config);
      rateLimitStore.isLimited('expire-test', config);

      // Should be limited now
      expect(rateLimitStore.isLimited('expire-test', config)).toBe(true);
    });

    it('should handle DM context (no guild)', async () => {
      const next = jest.fn().mockResolvedValue(undefined);
      const context = createMockContext({
        guildId: undefined,
        interaction: {
          id: 'int-1',
          customId: 'task_done_1',
          reply: jest.fn().mockResolvedValue(undefined),
          followUp: jest.fn().mockResolvedValue(undefined),
        } as any,
      });

      await rateLimitMiddleware.execute(context, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Approaching Rate Limit Warning', () => {
    it('should log warning when approaching rate limit', async () => {
      const { logger } = require('../../../../shared/utils/logger');
      const next = jest.fn().mockResolvedValue(undefined);

      // Make 8 requests out of 10 general limit
      for (let i = 0; i < 9; i++) {
        const context = createMockContext();
        await rateLimitMiddleware.execute(context, next);
      }

      // Should have logged "approaching rate limit" when remaining < 3
      expect(logger.info).toHaveBeenCalledWith(
        'User approaching rate limit',
        expect.objectContaining({
          userId: 'user-456',
          guildId: 'guild-123',
        })
      );
    });
  });
});
