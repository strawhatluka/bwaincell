# Testing Guide

**Last Updated:** 2026-04-15

> **Supabase update (2026-04-15):** The backend test DB is no longer SQLite in-memory or a Docker `postgres` service. Use the Supabase local stack.
>
> ```bash
> npm run supabase:start        # once per session
> npm run supabase:reset        # clean DB + re-apply all migrations
> npm test                      # or: npm run test:backend
> ```
>
> In `tests/` and per-feature test files, initialize the Supabase client with the local URL and service-role key (from `npm run supabase:status`). Reset between test suites with `supabase db reset` for isolation, or wrap each test in an explicit cleanup step (`DELETE FROM tasks WHERE guild_id = <test-guild>`).
>
> Jest setup still reads from `.env` (via `dotenv-cli` or `jest.setup.ts`). Provide:
>
> ```env
> SUPABASE_URL=http://127.0.0.1:54321
> SUPABASE_SERVICE_ROLE_KEY=<from supabase status>
> SUPABASE_ANON_KEY=<from supabase status>
> ```
>
> CI uses the same pattern via `supabase/setup-cli` — see [ci-cd-pipeline.md](ci-cd-pipeline.md).
**Target:** Contributors implementing features with comprehensive test coverage

---

## Table of Contents

1. [Overview](#overview)
2. [Testing Stack](#testing-stack)
3. [Test Configuration](#test-configuration)
4. [Unit Testing](#unit-testing)
5. [Integration Testing](#integration-testing)
6. [Discord Bot Testing](#discord-bot-testing)
7. [Frontend Testing](#frontend-testing)
8. [Test-Driven Development (TDD)](#test-driven-development-tdd)
9. [Mocking Strategies](#mocking-strategies)
10. [Coverage Targets](#coverage-targets)
11. [Running Tests](#running-tests)
12. [Best Practices](#best-practices)

---

## Overview

Bwaincell uses **Jest** as the primary testing framework across all workspaces (backend, frontend, shared). This guide covers testing patterns, mocking strategies, and TDD workflows to ensure reliable, maintainable code.

### Testing Philosophy

- **Test-Driven Development (TDD):** Write tests before implementation
- **Coverage Goals:** Minimum 80% coverage for all modules
- **Fast Feedback:** Unit tests run in milliseconds, integration tests in seconds
- **Isolated Tests:** Each test should be independent and repeatable
- **Real-World Scenarios:** Tests should reflect actual usage patterns

---

## Testing Stack

### Core Testing Tools

```json
{
  "jest": "^30.1.3",
  "ts-jest": "^29.4.4",
  "@jest/globals": "^30.1.2",
  "@types/jest": "^30.0.0",
  "supertest": "^7.1.4",
  "@testing-library/jest-dom": "^6.8.0",
  "@testing-library/react": "^16.0.0"
}
```

### Workspace-Specific Configurations

- **Backend:** `backend/jest.config.js` - Node.js environment, ts-jest preset
- **Frontend:** `frontend/jest.config.js` - Next.js + React Testing Library
- **Shared:** Inherits backend configuration (shared utilities)

---

## Test Configuration

### Backend Jest Configuration

**File:** `backend/jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests',
    '<rootDir>/commands',
    '<rootDir>/database',
    '<rootDir>/utils',
  ],
  testMatch: ['**/*.test.ts', '**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'commands/**/*.ts',
    'database/**/*.ts',
    'utils/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/*.test.ts',
    '!tests/**',
  ],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@database/(.*)$': '<rootDir>/database/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^@commands/(.*)$': '<rootDir>/commands/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@types/(.*)$': '<rootDir>/types/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 35, // Target: 80%
      functions: 45, // Target: 80%
      lines: 35, // Target: 80%
      statements: 35, // Target: 80%
    },
  },
  testTimeout: 10000,
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowJs: true,
          moduleResolution: 'node',
          isolatedModules: true,
        },
      },
    ],
  },
};
```

### Test Setup File

**File:** `backend/tests/setup.ts`

```typescript
import { sequelize } from '../database';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.BOT_TOKEN = 'test-bot-token';
process.env.CLIENT_ID = 'test-client-id';
process.env.DATABASE_URL = 'sqlite::memory:'; // In-memory SQLite for tests
process.env.JWT_SECRET = 'test-jwt-secret';

// Close database connection after all tests
afterAll(async () => {
  await sequelize.close();
});

// Reset database before each test
beforeEach(async () => {
  await sequelize.sync({ force: true });
});
```

---

## Unit Testing

### What to Unit Test

- **Pure Functions:** Utility functions, validators, formatters
- **Business Logic:** Service methods, data transformations
- **Model Methods:** Database model methods (without database calls)
- **Middleware:** Request/response processing functions

### Unit Test Structure

```typescript
import { describe, it, expect } from '@jest/globals';
import { calculateBudget } from '@utils/budgetCalculator';

describe('budgetCalculator', () => {
  describe('calculateBudget', () => {
    it('should calculate total expenses correctly', () => {
      // Arrange
      const expenses = [
        { amount: 100, category: 'food' },
        { amount: 50, category: 'transport' },
      ];

      // Act
      const result = calculateBudget(expenses);

      // Assert
      expect(result.total).toBe(150);
      expect(result.categories).toHaveProperty('food', 100);
      expect(result.categories).toHaveProperty('transport', 50);
    });

    it('should handle empty expense array', () => {
      // Arrange
      const expenses = [];

      // Act
      const result = calculateBudget(expenses);

      // Assert
      expect(result.total).toBe(0);
      expect(result.categories).toEqual({});
    });

    it('should throw error for negative amounts', () => {
      // Arrange
      const expenses = [{ amount: -50, category: 'food' }];

      // Act & Assert
      expect(() => calculateBudget(expenses)).toThrow('Amount cannot be negative');
    });
  });
});
```

### Example: Testing Utility Functions

**File:** `backend/utils/__tests__/dateUtils.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';
import { formatDateForDiscord, parseUserDate } from '@utils/dateUtils';

describe('dateUtils', () => {
  describe('formatDateForDiscord', () => {
    it('should format date as Discord timestamp', () => {
      const date = new Date('2026-01-11T12:00:00Z');
      const result = formatDateForDiscord(date);
      expect(result).toBe('<t:1736596800:F>');
    });

    it('should handle invalid dates', () => {
      expect(() => formatDateForDiscord(new Date('invalid'))).toThrow('Invalid date');
    });
  });

  describe('parseUserDate', () => {
    it('should parse natural language dates', () => {
      const result = parseUserDate('tomorrow at 3pm');
      expect(result).toBeInstanceOf(Date);
      expect(result.getHours()).toBe(15);
    });

    it('should handle ISO date strings', () => {
      const isoDate = '2026-01-15T10:00:00Z';
      const result = parseUserDate(isoDate);
      expect(result.toISOString()).toBe(isoDate);
    });

    it('should throw error for unparseable dates', () => {
      expect(() => parseUserDate('invalid date string')).toThrow('Unable to parse date');
    });
  });
});
```

---

## Integration Testing

### What to Integration Test

- **API Endpoints:** Full request/response cycle with database
- **Database Operations:** Sequelize models with real database (in-memory)
- **Command Execution:** Discord commands with mocked Discord.js client
- **Service Interactions:** Multiple services working together

### Integration Test Structure

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApiServer } from '@src/api/server';
import { Task } from '@database';

describe('Tasks API', () => {
  let app;
  let authToken;

  beforeEach(async () => {
    // Create fresh Express app
    app = createApiServer();

    // Generate test JWT token
    authToken = generateTestToken({ discordId: 'test-user-123' });

    // Seed test data
    await Task.create({
      id: 'task-1',
      userId: 'test-user-123',
      title: 'Test Task',
      completed: false,
    });
  });

  describe('GET /api/tasks', () => {
    it('should return all tasks for authenticated user', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Test Task');
    });

    it('should return 401 without auth token', async () => {
      await request(app).get('/api/tasks').expect(401);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create new task', async () => {
      const taskData = {
        title: 'New Task',
        description: 'Task description',
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('New Task');

      // Verify in database
      const dbTask = await Task.findOne({ where: { title: 'New Task' } });
      expect(dbTask).not.toBeNull();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Missing title
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('title');
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('should update task', async () => {
      const response = await request(app)
        .patch('/api/tasks/task-1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ completed: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.completed).toBe(true);
    });

    it('should not allow updating other users tasks', async () => {
      const otherUserToken = generateTestToken({ discordId: 'other-user' });

      await request(app)
        .patch('/api/tasks/task-1')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ completed: true })
        .expect(403);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete task', async () => {
      await request(app)
        .delete('/api/tasks/task-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify deletion
      const dbTask = await Task.findByPk('task-1');
      expect(dbTask).toBeNull();
    });
  });
});
```

---

## Discord Bot Testing

### Mocking Discord.js

Discord.js requires extensive mocking since we can't connect to real Discord servers in tests.

### Mock Client Setup

**File:** `backend/tests/mocks/discordMocks.ts`

```typescript
import { Client, Collection } from 'discord.js';

export function createMockClient() {
  const client = {
    commands: new Collection(),
    user: {
      id: 'bot-user-id',
      username: 'TestBot',
      tag: 'TestBot#0000',
    },
    guilds: {
      cache: new Map(),
    },
    login: jest.fn().mockResolvedValue('token'),
    destroy: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    once: jest.fn(),
  };

  return client as unknown as Client;
}

export function createMockInteraction(overrides = {}) {
  return {
    id: 'interaction-id-123',
    user: {
      id: 'user-id-123',
      username: 'TestUser',
      tag: 'TestUser#0000',
    },
    guild: {
      id: 'guild-id-123',
      name: 'Test Guild',
    },
    guildId: 'guild-id-123',
    channel: {
      id: 'channel-id-123',
      send: jest.fn().mockResolvedValue({}),
    },
    replied: false,
    deferred: false,
    reply: jest.fn().mockResolvedValue({}),
    editReply: jest.fn().mockResolvedValue({}),
    followUp: jest.fn().mockResolvedValue({}),
    deferReply: jest.fn().mockResolvedValue({}),
    deferUpdate: jest.fn().mockResolvedValue({}),
    isChatInputCommand: () => false,
    isButton: () => false,
    isStringSelectMenu: () => false,
    isModalSubmit: () => false,
    ...overrides,
  };
}
```

### Testing Discord Commands

**File:** `backend/commands/__tests__/tasks.test.ts`

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { createMockInteraction } from '@tests/mocks/discordMocks';
import tasksCommand from '@commands/tasks';
import { Task } from '@database';

describe('/tasks command', () => {
  let mockInteraction;

  beforeEach(async () => {
    mockInteraction = createMockInteraction({
      isChatInputCommand: () => true,
      commandName: 'tasks',
      options: {
        getSubcommand: jest.fn().mockReturnValue('list'),
      },
    });

    // Seed test data
    await Task.create({
      id: 'task-1',
      userId: 'user-id-123',
      title: 'Test Task',
      completed: false,
    });
  });

  describe('list subcommand', () => {
    it('should display user tasks', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('list');

      await tasksCommand.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              title: expect.stringContaining('Tasks'),
            }),
          ]),
        })
      );
    });

    it('should show message when no tasks exist', async () => {
      await Task.destroy({ where: { userId: 'user-id-123' } });

      await tasksCommand.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('No tasks found'),
        })
      );
    });
  });

  describe('add subcommand', () => {
    it('should create new task', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('add');
      mockInteraction.options.getString = jest.fn((name) => {
        if (name === 'title') return 'New Task';
        if (name === 'description') return 'Task description';
        return null;
      });

      await tasksCommand.execute(mockInteraction);

      const task = await Task.findOne({ where: { title: 'New Task' } });
      expect(task).not.toBeNull();
      expect(task.description).toBe('Task description');

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('created'),
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(Task, 'create').mockRejectedValue(new Error('Database error'));

      await tasksCommand.execute(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('error'),
          ephemeral: true,
        })
      );
    });
  });

  describe('complete subcommand', () => {
    it('should mark task as completed', async () => {
      mockInteraction.options.getSubcommand.mockReturnValue('complete');
      mockInteraction.options.getString = jest.fn(() => 'task-1');

      await tasksCommand.execute(mockInteraction);

      const task = await Task.findByPk('task-1');
      expect(task.completed).toBe(true);
    });
  });
});
```

### Testing Button Interactions

**File:** `backend/utils/interactions/__tests__/taskHandlers.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';
import { createMockInteraction } from '@tests/mocks/discordMocks';
import { handleTaskButton } from '@utils/interactions/handlers/taskHandlers';
import { Task } from '@database';

describe('Task Button Handlers', () => {
  describe('task_complete button', () => {
    it('should mark task as completed', async () => {
      const task = await Task.create({
        id: 'task-1',
        userId: 'user-id-123',
        title: 'Test Task',
        completed: false,
      });

      const mockInteraction = createMockInteraction({
        isButton: () => true,
        customId: 'task_complete_task-1',
        deferred: true,
      });

      await handleTaskButton(mockInteraction);

      await task.reload();
      expect(task.completed).toBe(true);
      expect(mockInteraction.editReply).toHaveBeenCalled();
    });

    it('should handle non-existent tasks', async () => {
      const mockInteraction = createMockInteraction({
        isButton: () => true,
        customId: 'task_complete_invalid-id',
        deferred: true,
      });

      await handleTaskButton(mockInteraction);

      expect(mockInteraction.followUp).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('not found'),
          ephemeral: true,
        })
      );
    });
  });

  describe('task_delete button', () => {
    it('should delete task', async () => {
      await Task.create({
        id: 'task-1',
        userId: 'user-id-123',
        title: 'Test Task',
        completed: false,
      });

      const mockInteraction = createMockInteraction({
        isButton: () => true,
        customId: 'task_delete_task-1',
        deferred: true,
      });

      await handleTaskButton(mockInteraction);

      const task = await Task.findByPk('task-1');
      expect(task).toBeNull();
    });
  });
});
```

---

## Frontend Testing

### Testing React Components (Next.js)

**File:** `frontend/__tests__/components/TaskList.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskList } from '@/components/TaskList';
import '@testing-library/jest-dom';

describe('TaskList Component', () => {
  const mockTasks = [
    { id: '1', title: 'Task 1', completed: false },
    { id: '2', title: 'Task 2', completed: true },
  ];

  it('should render task list', () => {
    render(<TaskList tasks={mockTasks} />);

    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('should call onToggle when checkbox clicked', async () => {
    const onToggle = jest.fn();
    render(<TaskList tasks={mockTasks} onToggle={onToggle} />);

    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith('1', true);
    });
  });

  it('should display completed tasks with strikethrough', () => {
    render(<TaskList tasks={mockTasks} />);

    const completedTask = screen.getByText('Task 2');
    expect(completedTask).toHaveClass('line-through');
  });
});
```

---

## Test-Driven Development (TDD)

### TDD Workflow: RED-GREEN-REFACTOR

```
┌─────────────┐
│  1. RED     │  Write a failing test
│  (Write)    │  - Test should fail initially
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  2. GREEN   │  Write minimal code to pass
│  (Implement)│  - Simplest solution that works
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  3. REFACTOR│  Improve code quality
│  (Clean)    │  - Optimize, remove duplication
└─────────────┘
```

### TDD Example: Building a Task Validator

**Step 1: RED (Write Failing Test)**

```typescript
// backend/utils/__tests__/taskValidator.test.ts
import { validateTask } from '@utils/taskValidator';

describe('validateTask', () => {
  it('should validate task with title', () => {
    const task = { title: 'Buy groceries' };
    expect(validateTask(task)).toBe(true);
  });

  it('should reject task without title', () => {
    const task = {};
    expect(() => validateTask(task)).toThrow('Title is required');
  });
});
```

Run test: `npm test -- taskValidator.test.ts`
**Result:** Test fails (function doesn't exist)

**Step 2: GREEN (Minimal Implementation)**

```typescript
// backend/utils/taskValidator.ts
export function validateTask(task: any): boolean {
  if (!task.title) {
    throw new Error('Title is required');
  }
  return true;
}
```

Run test: `npm test -- taskValidator.test.ts`
**Result:** Test passes

**Step 3: REFACTOR (Improve Implementation)**

```typescript
// Add more comprehensive validation
interface Task {
  title: string;
  description?: string;
  dueDate?: Date;
}

export function validateTask(task: any): task is Task {
  if (!task || typeof task !== 'object') {
    throw new Error('Task must be an object');
  }

  if (!task.title || typeof task.title !== 'string') {
    throw new Error('Title is required and must be a string');
  }

  if (task.title.length > 200) {
    throw new Error('Title must be less than 200 characters');
  }

  if (task.description && typeof task.description !== 'string') {
    throw new Error('Description must be a string');
  }

  if (task.dueDate && !(task.dueDate instanceof Date)) {
    throw new Error('Due date must be a Date object');
  }

  return true;
}
```

Add corresponding tests for new validations, then refactor again if needed.

---

## Mocking Strategies

### 1. Function Mocking

```typescript
import { jest } from '@jest/globals';

// Mock a module
jest.mock('@utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock a function return value
const mockFunction = jest.fn().mockReturnValue('mocked value');

// Mock resolved promise
const mockAsync = jest.fn().mockResolvedValue({ data: 'success' });

// Mock rejected promise
const mockError = jest.fn().mockRejectedValue(new Error('Failed'));
```

### 2. Sequelize Model Mocking

```typescript
import { Task } from '@database';

jest.mock('@database', () => ({
  Task: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

// In test
(Task.findAll as jest.Mock).mockResolvedValue([{ id: '1', title: 'Task 1' }]);
```

### 3. Discord.js Interaction Mocking

See [Discord Bot Testing](#discord-bot-testing) section above.

### 4. Environment Variable Mocking

```typescript
// In test setup
const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv, NODE_ENV: 'test' };
});

afterEach(() => {
  process.env = originalEnv;
});
```

### 5. Timer Mocking

```typescript
jest.useFakeTimers();

// In test
setTimeout(() => {
  console.log('delayed');
}, 1000);

jest.advanceTimersByTime(1000); // Fast-forward time

jest.useRealTimers(); // Restore real timers
```

---

## Coverage Targets

### Current Coverage Thresholds

**File:** `backend/jest.config.js`

```javascript
coverageThreshold: {
  global: {
    branches: 35,   // Current (Target: 80%)
    functions: 45,  // Current (Target: 80%)
    lines: 35,      // Current (Target: 80%)
    statements: 35, // Current (Target: 80%)
  },
}
```

### Coverage Goals

- **Critical Paths:** 100% coverage (authentication, data validation, payment processing)
- **Business Logic:** 90% coverage (commands, API endpoints, services)
- **Utilities:** 80% coverage (helpers, formatters)
- **UI Components:** 70% coverage (React components)

### Generating Coverage Reports

```bash
# Generate HTML coverage report
npm run test:coverage

# View report in browser
open backend/coverage/index.html

# Generate coverage badge
npm run coverage:badge
```

### Coverage Report Output

```
--------------------|---------|----------|---------|---------|-------------------
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Lines
--------------------|---------|----------|---------|---------|-------------------
All files           |   45.23 |    38.12 |   42.78 |   44.89 |
 commands/          |   52.14 |    45.32 |   48.91 |   51.76 |
  tasks.ts          |   68.42 |    60.00 |   75.00 |   67.89 | 45-52,78-82
  reminders.ts      |   42.31 |    35.71 |   50.00 |   41.67 | 23-45,67-89
 utils/             |   38.91 |    32.14 |   36.52 |   38.12 |
  dateUtils.ts      |   85.71 |    80.00 |   90.00 |   84.62 | 12-15
  taskValidator.ts  |   25.00 |    20.00 |   25.00 |   24.56 | 5-67
--------------------|---------|----------|---------|---------|-------------------
```

---

## Running Tests

### Workspace-Level Testing

```bash
# Run all tests in all workspaces
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend

# Run shared tests only
npm run test:shared
```

### Watch Mode (Development)

```bash
# Watch mode for all workspaces
npm run test:watch

# Watch mode for backend only
cd backend && npm run test:watch
```

### Coverage Reports

```bash
# Generate coverage for all workspaces
npm run test:coverage

# Backend coverage only
npm run test:coverage:backend

# With HTML report
cd backend && npm run test:coverage-report
```

### Running Specific Tests

```bash
# Run tests matching pattern
npm test -- tasks

# Run specific test file
npm test -- commands/tasks.test.ts

# Run tests in specific describe block
npm test -- -t "tasks command"

# Run single test
npm test -- -t "should create new task"
```

### CI/CD Testing

```bash
# Enforce 80% coverage threshold (fails if below)
cd backend && npm run coverage:threshold
```

---

## Best Practices

### 1. Arrange-Act-Assert (AAA) Pattern

```typescript
it('should calculate tax correctly', () => {
  // Arrange - Set up test data
  const amount = 100;
  const taxRate = 0.08;

  // Act - Execute the code under test
  const result = calculateTax(amount, taxRate);

  // Assert - Verify the result
  expect(result).toBe(8);
});
```

### 2. One Assertion Per Test (When Possible)

```typescript
// Good: Single assertion
it('should return user name', () => {
  const user = { name: 'John' };
  expect(getUsername(user)).toBe('John');
});

// Acceptable: Related assertions
it('should return formatted user', () => {
  const user = { name: 'John', age: 30 };
  const result = formatUser(user);

  expect(result.name).toBe('JOHN');
  expect(result.age).toBe(30);
  expect(result.formatted).toBe(true);
});
```

### 3. Descriptive Test Names

```typescript
// Bad
it('works', () => {
  /* ... */
});

// Good
it('should return 404 when task does not exist', () => {
  /* ... */
});

// Great
it('should throw ValidationError when task title exceeds 200 characters', () => {
  /* ... */
});
```

### 4. Test Edge Cases

```typescript
describe('divideNumbers', () => {
  it('should divide two positive numbers', () => {
    expect(divideNumbers(10, 2)).toBe(5);
  });

  it('should handle negative numbers', () => {
    expect(divideNumbers(-10, 2)).toBe(-5);
  });

  it('should handle division by zero', () => {
    expect(() => divideNumbers(10, 0)).toThrow('Cannot divide by zero');
  });

  it('should handle decimal results', () => {
    expect(divideNumbers(10, 3)).toBeCloseTo(3.333, 2);
  });

  it('should handle very large numbers', () => {
    expect(divideNumbers(1e20, 1e10)).toBe(1e10);
  });
});
```

### 5. Isolate Tests

```typescript
// Bad: Tests depend on each other
let userId;
it('should create user', async () => {
  const user = await createUser({ name: 'John' });
  userId = user.id; // Leaking state
});

it('should find user', async () => {
  const user = await findUser(userId); // Depends on previous test
  expect(user.name).toBe('John');
});

// Good: Tests are independent
it('should create user', async () => {
  const user = await createUser({ name: 'John' });
  expect(user.id).toBeDefined();
});

it('should find user', async () => {
  const user = await createUser({ name: 'John' });
  const found = await findUser(user.id);
  expect(found.name).toBe('John');
});
```

### 6. Clean Up Resources

```typescript
describe('Database Tests', () => {
  let connection;

  beforeAll(async () => {
    connection = await connectDatabase();
  });

  afterAll(async () => {
    await connection.close(); // Clean up
  });

  beforeEach(async () => {
    await seedTestData();
  });

  afterEach(async () => {
    await clearTestData(); // Reset state
  });
});
```

### 7. Avoid Testing Implementation Details

```typescript
// Bad: Testing internal implementation
it('should call internal helper function', () => {
  const spy = jest.spyOn(module, '_internalHelper');
  module.publicFunction();
  expect(spy).toHaveBeenCalled();
});

// Good: Testing public behavior
it('should return correct result', () => {
  const result = module.publicFunction();
  expect(result).toBe(expectedValue);
});
```

### 8. Use Test Factories

```typescript
// Test factory for creating test data
function createTestTask(overrides = {}) {
  return {
    id: 'test-task-id',
    userId: 'test-user-id',
    title: 'Test Task',
    completed: false,
    createdAt: new Date(),
    ...overrides,
  };
}

// Usage in tests
it('should mark task as completed', () => {
  const task = createTestTask({ title: 'Buy milk' });
  // ...
});
```

---

## Troubleshooting

### Common Issues

**Issue:** Tests fail with "Cannot find module '@shared/...'"

**Solution:** Ensure moduleNameMapper is configured in jest.config.js

```javascript
moduleNameMapper: {
  '^@shared/(.*)$': '<rootDir>/../shared/$1',
}
```

---

**Issue:** Database tests fail with "SQLITE_BUSY"

**Solution:** Use separate database for each test

```typescript
beforeEach(async () => {
  await sequelize.sync({ force: true });
});
```

---

**Issue:** Discord.js interaction tests fail with "interaction.reply is not a function"

**Solution:** Ensure mock includes all interaction methods (see Discord Bot Testing section)

---

## References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Backend Jest Config](c:\Users\lukaf\Desktop\Dev Work\Bwaincell\backend\jest.config.js)
- [Test-Driven Development Guide](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

---

**Next Steps:**

- [API Development Guide](api-development.md) - Learn to create REST endpoints
- [Discord Bot Development Guide](discord-bot-development.md) - Learn to create Discord commands
- [Database Migrations Guide](database-migrations.md) - Learn to migrate to PostgreSQL
