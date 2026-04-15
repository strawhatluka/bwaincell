import { logger, createLogger, logCommandExecution, logError } from '@shared/utils/logger';

describe('Logger', () => {
  describe('logger instance', () => {
    it('should be defined', () => {
      expect(logger).toBeDefined();
    });

    it('should have info method', () => {
      expect(logger.info).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should have error method', () => {
      expect(logger.error).toBeDefined();
      expect(typeof logger.error).toBe('function');
    });

    it('should have warn method', () => {
      expect(logger.warn).toBeDefined();
      expect(typeof logger.warn).toBe('function');
    });

    it('should have debug method', () => {
      expect(logger.debug).toBeDefined();
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('createLogger', () => {
    it('should create a child logger with module name', () => {
      const moduleLogger = createLogger('TestModule');
      expect(moduleLogger).toBeDefined();
      expect(moduleLogger.info).toBeDefined();
    });
  });

  describe('utility functions', () => {
    it('should log command execution', () => {
      const spy = jest.spyOn(logger, 'info');
      logCommandExecution('testCommand', 'userId123', 'guildId456');

      expect(spy).toHaveBeenCalledWith(
        'Command executed',
        expect.objectContaining({
          command: 'testCommand',
          userId: 'userId123',
          guildId: 'guildId456',
        })
      );
    });

    it('should log errors with context', () => {
      const spy = jest.spyOn(logger, 'error');
      const testError = new Error('Test error');
      const context = { userId: '123', action: 'test' };

      logError(testError, context);

      expect(spy).toHaveBeenCalledWith(
        'Error occurred',
        expect.objectContaining({
          message: 'Test error',
          context,
        })
      );
    });
  });
});
