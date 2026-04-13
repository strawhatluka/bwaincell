/**
 * Unit Tests: MiddlewareRunner
 *
 * Tests middleware registration, removal, chain execution,
 * error propagation, and context construction.
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

import { MiddlewareRunner } from '../../../../utils/interactions/middleware/index';
import { logger } from '../../../../shared/utils/logger';
import {
  InteractionMiddleware,
  MiddlewareContext,
} from '../../../../utils/interactions/middleware/types';

const mockLogger = logger as jest.Mocked<typeof logger>;

const mockInteraction = {
  user: { id: 'user-123' },
  guild: { id: 'guild-456' },
  type: 2,
} as any;

function createMiddleware(
  name: string,
  executeFn?: (context: MiddlewareContext, next: () => Promise<void>) => Promise<void>
): InteractionMiddleware {
  return {
    name,
    execute:
      executeFn ??
      jest.fn(async (_context, next) => {
        await next();
      }),
  };
}

describe('MiddlewareRunner', () => {
  let runner: MiddlewareRunner;

  beforeEach(() => {
    jest.clearAllMocks();
    runner = new MiddlewareRunner();
  });

  describe('use()', () => {
    it('should register middleware and appear in getMiddlewares()', () => {
      const middleware = createMiddleware('auth');
      runner.use(middleware);

      expect(runner.getMiddlewares()).toContain('auth');
      expect(mockLogger.info).toHaveBeenCalledWith('Middleware registered: auth');
    });

    it('should register multiple middlewares', () => {
      runner.use(createMiddleware('auth'));
      runner.use(createMiddleware('logging'));
      runner.use(createMiddleware('rateLimit'));

      expect(runner.getMiddlewares()).toEqual(['auth', 'logging', 'rateLimit']);
    });
  });

  describe('remove()', () => {
    it('should remove middleware by name', () => {
      runner.use(createMiddleware('auth'));
      runner.use(createMiddleware('logging'));

      runner.remove('auth');

      expect(runner.getMiddlewares()).toEqual(['logging']);
      expect(runner.getMiddlewares()).not.toContain('auth');
      expect(mockLogger.info).toHaveBeenCalledWith('Middleware removed: auth');
    });

    it('should do nothing if middleware name does not exist', () => {
      runner.use(createMiddleware('auth'));

      runner.remove('nonexistent');

      expect(runner.getMiddlewares()).toEqual(['auth']);
    });
  });

  describe('getMiddlewares()', () => {
    it('should return middleware names in registration order', () => {
      runner.use(createMiddleware('first'));
      runner.use(createMiddleware('second'));
      runner.use(createMiddleware('third'));

      expect(runner.getMiddlewares()).toEqual(['first', 'second', 'third']);
    });

    it('should return empty array when no middlewares registered', () => {
      expect(runner.getMiddlewares()).toEqual([]);
    });
  });

  describe('clear()', () => {
    it('should remove all middlewares', () => {
      runner.use(createMiddleware('auth'));
      runner.use(createMiddleware('logging'));
      runner.use(createMiddleware('rateLimit'));

      runner.clear();

      expect(runner.getMiddlewares()).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith('All middlewares cleared');
    });
  });

  describe('run()', () => {
    it('should call handler directly when no middlewares registered', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      await runner.run(mockInteraction, handler);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should execute single middleware with correct context and call next', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      let capturedContext: MiddlewareContext | null = null;

      const middleware = createMiddleware('test', async (context, next) => {
        capturedContext = context;
        await next();
      });

      runner.use(middleware);
      await runner.run(mockInteraction, handler);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(capturedContext).not.toBeNull();
      expect(capturedContext!.userId).toBe('user-123');
      expect(capturedContext!.guildId).toBe('guild-456');
    });

    it('should execute multiple middlewares in registration order then handler', async () => {
      const executionOrder: string[] = [];
      const handler = jest.fn(async () => {
        executionOrder.push('handler');
      });

      runner.use(
        createMiddleware('first', async (_ctx, next) => {
          executionOrder.push('first');
          await next();
        })
      );
      runner.use(
        createMiddleware('second', async (_ctx, next) => {
          executionOrder.push('second');
          await next();
        })
      );
      runner.use(
        createMiddleware('third', async (_ctx, next) => {
          executionOrder.push('third');
          await next();
        })
      );

      await runner.run(mockInteraction, handler);

      expect(executionOrder).toEqual(['first', 'second', 'third', 'handler']);
    });

    it('should propagate middleware errors and log them', async () => {
      const testError = new Error('middleware failure');
      const handler = jest.fn().mockResolvedValue(undefined);

      runner.use(
        createMiddleware('failing', async () => {
          throw testError;
        })
      );

      await expect(runner.run(mockInteraction, handler)).rejects.toThrow('middleware failure');
      expect(handler).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should not call handler if middleware skips next()', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      runner.use(
        createMiddleware('blocker', async () => {
          // intentionally not calling next()
        })
      );

      await runner.run(mockInteraction, handler);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should construct context with correct properties', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      let capturedContext: MiddlewareContext | null = null;

      const beforeTime = Date.now();

      runner.use(
        createMiddleware('inspector', async (context, next) => {
          capturedContext = context;
          await next();
        })
      );

      await runner.run(mockInteraction, handler);

      const afterTime = Date.now();

      expect(capturedContext).not.toBeNull();
      expect(capturedContext!.interaction).toBe(mockInteraction);
      expect(capturedContext!.userId).toBe('user-123');
      expect(capturedContext!.guildId).toBe('guild-456');
      expect(capturedContext!.startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(capturedContext!.startTime).toBeLessThanOrEqual(afterTime);
      expect(capturedContext!.metadata).toEqual({});
    });

    it('should handle interaction without guild', async () => {
      const noGuildInteraction = {
        user: { id: 'user-789' },
        guild: undefined,
        type: 2,
      } as any;

      const handler = jest.fn().mockResolvedValue(undefined);
      let capturedContext: MiddlewareContext | null = null;

      runner.use(
        createMiddleware('inspector', async (context, next) => {
          capturedContext = context;
          await next();
        })
      );

      await runner.run(noGuildInteraction, handler);

      expect(capturedContext!.userId).toBe('user-789');
      expect(capturedContext!.guildId).toBeUndefined();
    });
  });
});
