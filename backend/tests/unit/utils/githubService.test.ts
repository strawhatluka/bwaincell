/**
 * Unit tests for GitHubService
 *
 * Tests the GitHub API wrapper service that creates issues.
 * Uses inline mock factory to avoid ESM import issues
 */

// Mock logger BEFORE imports to prevent real Winston file transports from opening
jest.mock('../../../shared/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock function that will be shared across all Octokit instances
const mockCreateIssue = jest.fn();

// IMPORTANT: Mock MUST be declared before any imports that use it
jest.mock('@octokit/rest', () => {
  return {
    Octokit: jest.fn().mockImplementation(() => {
      return {
        rest: {
          issues: {
            create: mockCreateIssue,
          },
        },
      };
    }),
  };
});

import { GitHubService } from '../../../utils/githubService';

describe('GitHubService', () => {
  let githubService: GitHubService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Reset all mocks BEFORE creating service
    jest.clearAllMocks();
    jest.restoreAllMocks();

    // Clear singleton instance
    githubService = new GitHubService();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Initialization', () => {
    it('should initialize with valid environment variables', () => {
      process.env.GITHUB_TOKEN = 'test-token';
      process.env.GITHUB_REPO_OWNER = 'test-owner';
      process.env.GITHUB_REPO_NAME = 'test-repo';

      githubService = new GitHubService();

      expect(githubService.isConfigured()).toBe(true);
    });

    it('should not initialize without GITHUB_TOKEN', () => {
      delete process.env.GITHUB_TOKEN;
      process.env.GITHUB_REPO_OWNER = 'test-owner';
      process.env.GITHUB_REPO_NAME = 'test-repo';

      githubService = new GitHubService();

      expect(githubService.isConfigured()).toBe(false);
    });

    it('should not initialize without GITHUB_REPO_OWNER', () => {
      process.env.GITHUB_TOKEN = 'test-token';
      delete process.env.GITHUB_REPO_OWNER;
      process.env.GITHUB_REPO_NAME = 'test-repo';

      githubService = new GitHubService();

      expect(githubService.isConfigured()).toBe(false);
    });

    it('should not initialize without GITHUB_REPO_NAME', () => {
      process.env.GITHUB_TOKEN = 'test-token';
      process.env.GITHUB_REPO_OWNER = 'test-owner';
      delete process.env.GITHUB_REPO_NAME;

      githubService = new GitHubService();

      expect(githubService.isConfigured()).toBe(false);
    });
  });

  describe('isConfigured()', () => {
    it('should return true when properly configured', () => {
      process.env.GITHUB_TOKEN = 'test-token';
      process.env.GITHUB_REPO_OWNER = 'test-owner';
      process.env.GITHUB_REPO_NAME = 'test-repo';

      githubService = new GitHubService();

      expect(githubService.isConfigured()).toBe(true);
    });

    it('should return false when not configured', () => {
      delete process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_REPO_OWNER;
      delete process.env.GITHUB_REPO_NAME;

      githubService = new GitHubService();

      expect(githubService.isConfigured()).toBe(false);
    });
  });

  describe('createIssue()', () => {
    beforeEach(() => {
      // Setup valid environment for these tests
      process.env.GITHUB_TOKEN = 'test-token';
      process.env.GITHUB_REPO_OWNER = 'test-owner';
      process.env.GITHUB_REPO_NAME = 'test-repo';

      // Reset mock to default successful behavior
      mockCreateIssue.mockClear();
      mockCreateIssue.mockResolvedValue({
        data: {
          number: 123,
          html_url: 'https://github.com/test-owner/test-repo/issues/123',
          title: 'Test Issue',
          body: 'Test description',
          labels: [],
        },
      });

      githubService = new GitHubService();
    });

    it('should create an issue successfully', async () => {
      const result = await githubService.createIssue(
        'Test Issue',
        'This is a test issue description'
      );

      expect(result.success).toBe(true);
      expect(result.issueNumber).toBe(123);
      expect(result.issueUrl).toBe('https://github.com/test-owner/test-repo/issues/123');
      expect(result.error).toBeUndefined();
    });

    it('should create an issue with labels', async () => {
      const result = await githubService.createIssue('Bug Report', 'Found a bug', [
        'bug',
        'priority-high',
      ]);

      expect(result.success).toBe(true);
      expect(result.issueNumber).toBe(123);
    });

    it('should handle 401 Unauthorized error', async () => {
      // Mock the error response
      const error = Object.assign(new Error('Bad credentials'), { status: 401 });
      mockCreateIssue.mockRejectedValueOnce(error);

      const result = await githubService.createIssue('Test', 'Description');

      expect(result.success).toBe(false);
      expect(result.error).toContain('authentication failed');
      expect(result.issueNumber).toBeUndefined();
      expect(result.issueUrl).toBeUndefined();
    });

    it('should handle 403 Forbidden error', async () => {
      const error = Object.assign(new Error('Resource not accessible'), { status: 403 });
      mockCreateIssue.mockRejectedValueOnce(error);

      const result = await githubService.createIssue('Test', 'Description');

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission denied');
    });

    it('should handle 404 Not Found error', async () => {
      const error = Object.assign(new Error('Not Found'), { status: 404 });
      mockCreateIssue.mockRejectedValueOnce(error);

      const result = await githubService.createIssue('Test', 'Description');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle 429 Rate Limit error', async () => {
      const error = Object.assign(new Error('API rate limit exceeded'), { status: 429 });
      mockCreateIssue.mockRejectedValueOnce(error);

      const result = await githubService.createIssue('Test', 'Description');

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });

    it('should handle 500 Server Error', async () => {
      const error = Object.assign(new Error('Internal Server Error'), { status: 500 });
      mockCreateIssue.mockRejectedValueOnce(error);

      const result = await githubService.createIssue('Test', 'Description');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle unknown errors', async () => {
      const error = new Error('Unknown error');
      mockCreateIssue.mockRejectedValueOnce(error);

      const result = await githubService.createIssue('Test', 'Description');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create');
    });

    it('should handle network errors without status code', async () => {
      const error = new Error('Network error');
      mockCreateIssue.mockRejectedValueOnce(error);

      const result = await githubService.createIssue('Test', 'Description');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error response when service is not configured', async () => {
      // Create unconfigured service
      delete process.env.GITHUB_TOKEN;
      const unconfiguredService = new GitHubService();

      const result = await unconfiguredService.createIssue('Test', 'Description');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });
  });
});
