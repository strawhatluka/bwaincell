/* eslint-disable no-undef */
/**
 * Jest test setup file
 * Executed before each test suite
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.BOT_TOKEN = 'test-bot-token';
process.env.CLIENT_ID = 'test-client-id';
process.env.GUILD_ID = 'test-guild-id';
process.env.SUPABASE_URL = 'http://test-supabase.local'; // Test Supabase URL
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'; // Test Supabase key

// Extend Jest timeout for slow operations
jest.setTimeout(10000);

// Global test utilities
global.console = {
  ...console,
  // Suppress console logs during tests (uncomment if needed)
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
