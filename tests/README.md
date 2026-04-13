# tests/

Comprehensive test suite for Bwaincell productivity platform following TDD principles.

---

## Purpose

The `tests/` directory contains all testing infrastructure for the Bwaincell project:

- **Unit Tests** - Isolated function/class testing
- **Integration Tests** - Multi-component interaction testing
- **E2E Tests** - Full workflow testing
- **Test Helpers** - Shared utilities, mocks, fixtures
- **Coverage Tracking** - 80%+ target (282 tests across 13 suites)

---

## Contents

### Subdirectories

- **unit/** - Unit tests for individual functions and classes
- **integration/** - Integration tests for API endpoints and multi-component workflows
- **e2e/** - End-to-end tests for complete user journeys
- **helpers/** - Test utilities, mocks, fixtures, factories
- \***\*mocks**/\*\* - Mock implementations for external dependencies

---

## Directory Structure

```
tests/
├── unit/                       # Unit tests (isolated)
│   ├── utils/                 # Utility function tests
│   ├── validators/            # Input validator tests
│   ├── services/              # Service layer tests
│   └── models/                # Database model tests
├── integration/                # Integration tests (multi-component)
│   ├── api/                   # API endpoint tests
│   │   ├── tasks.test.ts     # Task API integration tests
│   │   ├── lists.test.ts     # List API integration tests
│   │   ├── notes.test.ts     # Note API integration tests
│   │   ├── reminders.test.ts # Reminder API integration tests
│   │   └── budget.test.ts    # Budget API integration tests
│   ├── discord/               # Discord bot interaction tests
│   └── database/              # Database integration tests
├── e2e/                        # End-to-end tests (full workflows)
│   ├── user-workflows/        # Complete user journey tests
│   └── api-workflows/         # Full API workflow tests
├── helpers/                    # Test utilities
│   ├── test-helpers.ts        # Common test utilities
│   ├── factories.ts           # Test data factories
│   └── fixtures.ts            # Static test data fixtures
├── __mocks__/                  # Mock implementations
│   ├── discord.js.ts          # Discord.js mocks
│   ├── sequelize.ts           # Sequelize mocks
│   └── google-auth-library.ts # Google OAuth mocks
└── README.md                   # This file
```

---

## Key Concepts

### AAA Pattern (Arrange-Act-Assert)

All tests follow the AAA structure:

```typescript
describe('Feature Name', () => {
  it('should do something specific', () => {
    // Arrange - Set up test data and conditions
    const input = 'test input';
    const expected = 'expected output';

    // Act - Execute the function/method being tested
    const result = functionUnderTest(input);

    // Assert - Verify the result matches expectations
    expect(result).toBe(expected);
  });
});
```

### Test Isolation

**Principles:**

- Each test is independent (no shared state)
- Use `beforeEach`/`afterEach` for setup/cleanup
- Mock external dependencies (database, APIs, file system)
- Tests pass in any order

**Example:**

```typescript
describe('Task API', () => {
  let testDb: Database;

  beforeEach(async () => {
    testDb = await createTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase(testDb);
  });

  it('should create task', async () => {
    // Test logic with isolated database
  });
});
```

### Coverage Requirements

**Minimum Thresholds:**

- **Statements:** 80%
- **Branches:** 75%
- **Functions:** 80%
- **Lines:** 80%

**Current Status:**

- **Backend:** 282 tests across 13 suites (improving toward 80% target)
- **Frontend:** Coverage tracking in progress

**100% Coverage Required for:**

- Authentication/Authorization
- Security-related code
- Payment processing (if applicable)
- Data validation
- Error handling

---

## Usage

### Running Tests

**All tests (all workspaces):**

```bash
npm test
```

**Backend tests only:**

```bash
npm run test:backend
```

**Frontend tests only:**

```bash
npm run test:frontend
```

**Watch mode (TDD):**

```bash
npm run test:watch
```

**Coverage report:**

```bash
npm run test:coverage
```

**Specific test file:**

```bash
npm test -- path/to/test.test.ts
```

### Writing Tests

**Unit Test Example:**

```typescript
import { describe, it, expect } from '@jest/globals';
import { validateEmail } from '@utils/validators';

describe('validateEmail', () => {
  it('should validate correct email format', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail(null)).toBe(false);
  });
});
```

**Integration Test Example:**

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { createApiServer } from '@src/api/server';

describe('Task API Integration', () => {
  let app: Express.Application;
  let jwtToken: string;

  beforeEach(async () => {
    app = createApiServer();
    jwtToken = await generateTestJWT();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('should create task via POST /api/tasks', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ text: 'Test task', dueDate: '2026-01-15' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.text).toBe('Test task');
  });
});
```

---

## Testing Standards

### DO ✅

- **Write tests before implementation** (TDD)
- **Test behavior, not implementation**
- **Use descriptive test names** ("should create task when given valid input")
- **Keep tests simple and focused** (one concept per test)
- **Mock external dependencies** (APIs, databases, file system)
- **Clean up after tests** (temp files, database records)
- **Run tests frequently** during development

### DON'T ❌

- **Skip tests** without good reason and TODO comment
- **Test implementation details** (private methods, internal variables)
- **Create test dependencies** (Test A must run before Test B)
- **Hard-code dates/times** (use relative times or freeze time)
- **Commit commented-out tests** (fix or remove them)
- **Ignore failing tests** (fix immediately or document issue)
- **Test external libraries** (assume they work)

---

## Test Categories

### Unit Tests (`tests/unit/`)

**Purpose:** Test individual functions/methods in isolation

**Scope:**

- Pure functions
- Validators
- Utility functions
- Model methods (without database)

**Mocking:** Mock all dependencies

**Example:**

```typescript
// tests/unit/utils/validators.test.ts
import { validateTaskInput } from '@utils/validators';

describe('validateTaskInput', () => {
  it('should accept valid input', () => {
    const input = { text: 'Task', dueDate: '2026-01-15' };
    expect(validateTaskInput(input)).toBe(true);
  });

  it('should reject empty text', () => {
    expect(() => validateTaskInput({ text: '' })).toThrow('Text required');
  });
});
```

---

### Integration Tests (`tests/integration/`)

**Purpose:** Test multiple components working together

**Scope:**

- API endpoints (full request/response)
- Database operations (real or test database)
- Service layer interactions
- Discord bot commands

**Mocking:** Mock external services only (Google OAuth, Discord API)

**Example:**

```typescript
// tests/integration/api/tasks.test.ts
import request from 'supertest';
import { createApiServer } from '@src/api/server';

describe('Task API', () => {
  it('should list user tasks', async () => {
    const response = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${jwtToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
```

---

### E2E Tests (`tests/e2e/`)

**Purpose:** Test complete user workflows from start to finish

**Scope:**

- Full user journeys (signup → create task → complete → delete)
- Multi-step workflows
- Cross-interface interactions (Discord → API → PWA)

**Mocking:** Minimal mocking (only external services if necessary)

**Example:**

```typescript
// tests/e2e/user-workflows/task-lifecycle.test.ts
describe('Task Lifecycle E2E', () => {
  it('should complete task creation to deletion workflow', async () => {
    // 1. Authenticate user
    const token = await authenticateUser('user@example.com');

    // 2. Create task
    const task = await createTask(token, 'Complete project');

    // 3. Mark as complete
    await completeTask(token, task.id);

    // 4. Verify completion
    const updatedTask = await getTask(token, task.id);
    expect(updatedTask.completed).toBe(true);

    // 5. Delete task
    await deleteTask(token, task.id);

    // 6. Verify deletion
    await expect(getTask(token, task.id)).rejects.toThrow('Not found');
  });
});
```

---

## Test Helpers

### Test Utilities (`tests/helpers/test-helpers.ts`)

**Common utilities:**

```typescript
// Create test database
export async function createTestDatabase(): Promise<Database> {
  const db = await Sequelize.connect(TEST_DB_URL);
  await db.sync({ force: true });
  return db;
}

// Generate JWT for testing
export function generateTestJWT(userId: string): string {
  return jwt.sign({ userId }, TEST_JWT_SECRET, { expiresIn: '1h' });
}

// Clean up test data
export async function cleanupTestData(): Promise<void> {
  await Task.destroy({ where: {}, truncate: true });
  await List.destroy({ where: {}, truncate: true });
}
```

### Factories (`tests/helpers/factories.ts`)

**Generate test data:**

```typescript
export function createTaskData(overrides = {}) {
  return {
    id: generateId(),
    text: 'Test task',
    completed: false,
    user_id: 'test_user_123',
    guild_id: 'test_guild_456',
    created_at: new Date(),
    ...overrides,
  };
}

export function createUserData(overrides = {}) {
  return {
    id: generateId(),
    email: 'test@example.com',
    discord_id: '123456789',
    ...overrides,
  };
}
```

### Fixtures (`tests/helpers/fixtures.ts`)

**Static test data:**

```typescript
export const validUserData = {
  id: '123',
  email: 'test@example.com',
  name: 'Test User',
};

export const invalidUserData = {
  id: null,
  email: 'invalid-email',
  name: '',
};
```

---

## Mocking

### Mock External Dependencies

**Discord.js:**

```typescript
// tests/__mocks__/discord.js.ts
export const Client = jest.fn(() => ({
  login: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  commands: new Map(),
}));
```

**Sequelize:**

```typescript
// Use test database or mock models
jest.mock('@database/models/Task', () => ({
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
}));
```

**Google OAuth:**

```typescript
// tests/__mocks__/google-auth-library.ts
export const OAuth2Client = jest.fn(() => ({
  verifyIdToken: jest.fn().mockResolvedValue({
    getPayload: () => ({ email: 'test@example.com' }),
  }),
}));
```

---

## Related Documentation

### Project Documentation

- **[../README.md](../README.md)** - Project overview
- **[../backend/README.md](../backend/README.md)** - Backend documentation
- **[../frontend/README.md](../frontend/README.md)** - Frontend documentation

### Configuration

- **[../backend/jest.config.js](../backend/jest.config.js)** - Backend Jest configuration
- **[../frontend/jest.config.js](../frontend/jest.config.js)** - Frontend Jest configuration (if exists)

---

## Notes

### Important Considerations

- **Test Isolation:** Each test must be independent (no shared state)
- **Coverage Target:** 80%+ (282 tests across 13 suites)
- **TDD Workflow:** Write tests before implementation
- **Mock External Services:** Database, APIs, file system
- **Clean Up:** Remove temp files, test data after tests
- **CI/CD:** All tests must pass before merging

### Best Practices

- **AAA Pattern:** Arrange-Act-Assert for clear test structure
- **Descriptive Names:** Test names explain what's being tested
- **One Assertion:** Focus on one concept per test (when possible)
- **Mock Dependencies:** Isolate code under test
- **Test Edge Cases:** Null, empty, boundary values
- **Error Testing:** Verify error handling paths

### Future Improvements

- [ ] Increase backend coverage to 80% (282 tests currently)
- [ ] Increase frontend coverage to 80%
- [ ] Add E2E tests for Discord bot commands
- [ ] Implement visual regression testing (frontend)
- [ ] Add performance benchmarking tests
- [ ] Set up continuous test monitoring

---

## Contributing

When writing tests:

1. **Follow TDD** - Write tests before implementation
2. **80%+ coverage** - Aim for comprehensive test coverage
3. **Use AAA pattern** - Arrange-Act-Assert structure
4. **Test behavior** - Not implementation details
5. **Mock dependencies** - Isolate code under test
6. **Clean up** - Remove test data after tests
7. **Run before commit** - `npm test` must pass

See [Contributing Guidelines](../CONTRIBUTING.md) for general contribution process.

---

**Testing Framework:** Jest 30.1.3 + ts-jest 29.4.4
**Coverage Target:** 80%+ (Statements, Branches, Functions, Lines)
**Current Coverage:** 282 tests across 13 suites
**Last Updated** 2026-02-11

---
