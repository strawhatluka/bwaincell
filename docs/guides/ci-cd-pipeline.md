# CI/CD Pipeline

Comprehensive guide to Bwaincell's continuous integration and deployment pipeline using GitHub Actions.

> **Supabase update (2026-04-15):** CI no longer provisions a standalone `postgres` service. Integration tests that need a database should use the Supabase CLI:
>
> ```yaml
> - name: Install Supabase CLI
>   uses: supabase/setup-cli@v1
> - name: Start Supabase
>   run: supabase start
> - name: Apply migrations
>   run: supabase db reset    # replays supabase/migrations/*.sql
> - name: Run tests
>   env:
>     SUPABASE_URL: http://127.0.0.1:54321
>     SUPABASE_SERVICE_ROLE_KEY: ${{ steps.supabase_status.outputs.service_role_key }}
>   run: npm run test:backend
> ```
>
> Deployment jobs in `.github/workflows/deploy.yml` (triggered on release) are:
> - **deploy** — SSH to the Pi, `git pull`, `docker compose up -d --build`, `supabase db push` against the Pi's self-hosted Supabase
> - **deploy-vercel** — frontend to Vercel via `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`
>
> Required repo secrets (see [.env.example](../../.env.example) trailing comments): `PI_HOST`, `PI_USERNAME`, `PI_SSH_KEY`, `PI_SSH_PASSPHRASE` (optional), `PI_SSH_PORT` (optional), `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## Table of Contents

1. [GitHub Actions Workflow](#github-actions-workflow)
2. [Quality Gates](#quality-gates)
3. [Automated Testing](#automated-testing)
4. [Code Coverage Enforcement](#code-coverage-enforcement)
5. [Linting and Formatting](#linting-and-formatting)
6. [Build Validation](#build-validation)
7. [Deployment Triggers](#deployment-triggers)
8. [Pre-commit Hooks](#pre-commit-hooks)
9. [Branch Protection](#branch-protection)
10. [Pull Request Workflow](#pull-request-workflow)
11. [Continuous Deployment](#continuous-deployment)

---

## GitHub Actions Workflow

### Workflow File Location

**File:** `.github/workflows/ci.yml`

### Workflow Overview

Bwaincell uses a **monorepo-aware CI pipeline** with path-based change detection:

```yaml
name: CI

on:
  push:
    branches:
      - main
      - dev
  pull_request:
    branches:
      - main
      - dev

# Prevent concurrent CI runs for the same PR
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### Workflow Jobs

1. **Detect Changes** - Identify which workspaces have changed
2. **Test Shared** - Build and test shared package
3. **Test Backend** - Build and test backend (Discord bot + API)
4. **Test Frontend** - Build and test frontend (Next.js PWA)
5. **Docker Build** - Test Docker image build (dev branch only)
6. **CI Success** - Aggregate status of all jobs

---

## Quality Gates

### 6-Phase Quality Gate System

1. **Phase 1: Lint** - Code style and quality checks
2. **Phase 2: Structure** - Project structure validation
3. **Phase 3: Build** - TypeScript compilation
4. **Phase 4: Test** - Unit and integration tests
5. **Phase 5: Coverage** - Code coverage enforcement (≥80%)
6. **Phase 6: Best Practices** - Security and performance checks

### Change Detection (Phase 0)

**Detect which workspaces have changes:**

```yaml
jobs:
  changes:
    name: Detect Changed Workspaces
    runs-on: ubuntu-latest
    permissions:
      pull-requests: read
    outputs:
      shared: ${{ steps.filter.outputs.shared }}
      backend: ${{ steps.filter.outputs.backend }}
      frontend: ${{ steps.filter.outputs.frontend }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Detect changed paths
        id: filter
        uses: dorny/paths-filter@v3
        with:
          filters: |
            shared:
              - 'shared/**'
              - 'package.json'
              - 'package-lock.json'
              - 'tsconfig.json'
            backend:
              - 'backend/**'
              - 'shared/**'
              - 'package.json'
              - 'package-lock.json'
              - 'tsconfig.json'
              - 'docker-compose.yml'
              - 'database/**'
            frontend:
              - 'frontend/**'
              - 'shared/**'
              - 'package.json'
              - 'package-lock.json'
              - 'tsconfig.json'
```

**Why Change Detection?**

- Skip unnecessary tests (faster CI)
- Parallel test execution (3 jobs run simultaneously)
- Reduced GitHub Actions minutes usage
- Faster feedback for developers

### Phase 1-2: Lint + Structure

```yaml
test-backend:
  name: Test Backend
  runs-on: ubuntu-latest
  needs: changes
  if: needs.changes.outputs.backend == 'true'

  steps:
    # ... setup steps ...

    - name: Lint backend
      run: npm run lint --workspace=backend
      continue-on-error: true # Don't fail build on lint warnings
```

**Linting Tools:**

- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking

### Phase 3: Build

```yaml
- name: Build shared package
  run: npm run build --workspace=shared

- name: Build backend
  run: npm run build --workspace=backend

- name: Verify compiled output
  run: |
    test -f backend/dist/src/bot.js || (echo "❌ Compiled bot.js not found" && exit 1)
    echo "✅ Backend compiled successfully"
```

**Build Validation:**

- TypeScript compilation succeeds
- Output files exist in `dist/` directory
- No compilation errors
- Source maps generated

### Phase 4: Test

```yaml
- name: Run backend tests
  if: hashFiles('backend/tests/**') != ''
  env:
    NODE_ENV: test
    DATABASE_URL: postgresql://test_user:test_password@localhost:5432/bwaincell_test
  run: npm run test --workspace=backend
```

**Test Environment:**

- PostgreSQL test database (Docker service)
- Isolated test environment
- Environment variables for testing
- Mocked external services

### Phase 5: Coverage

```yaml
- name: Run tests with coverage
  run: npm run test:coverage --workspace=backend

- name: Check coverage threshold
  run: |
    COVERAGE=$(cat backend/coverage/coverage-summary.json | jq '.total.lines.pct')
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "❌ Coverage is below 80% threshold: $COVERAGE%"
      exit 1
    fi
    echo "✅ Coverage passed: $COVERAGE%"
```

**Coverage Requirements:**

- **Minimum:** 80% line coverage
- **Target:** 90% line coverage
- **Critical Paths:** 100% coverage (authentication, security)

### Phase 6: Best Practices

```yaml
- name: Security audit
  run: npm audit --audit-level=high
  continue-on-error: true # Report but don't fail build

- name: Check for outdated dependencies
  run: npm outdated
  continue-on-error: true
```

---

## Automated Testing

### Backend Tests

**PostgreSQL Test Database:**

```yaml
services:
  postgres:
    image: postgres:15-alpine
    env:
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: bwaincell_test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432
```

**Why PostgreSQL Service?**

- Backend tests need real database
- Integration tests verify Sequelize queries
- Transaction tests require database support
- Schema migrations tested

**Test Execution:**

```yaml
- name: Run backend tests
  if: hashFiles('backend/tests/**') != ''
  env:
    NODE_ENV: test
    DATABASE_URL: postgresql://test_user:test_password@localhost:5432/bwaincell_test
  run: npm run test --workspace=backend
```

### Frontend Tests

```yaml
- name: Generate Prisma Client
  run: npx prisma generate --schema=frontend/prisma/schema.prisma

- name: Build frontend
  env:
    DATABASE_URL: postgresql://test_user:test_password@localhost:5432/bwaincell_test
    NEXT_PUBLIC_API_URL: http://localhost:3000
    NEXTAUTH_SECRET: test_secret_for_ci_build_only
    NEXTAUTH_URL: http://localhost:3000
  run: npm run build --workspace=frontend

- name: Run frontend tests
  if: hashFiles('frontend/tests/**') != ''
  run: npm run test --workspace=frontend
```

### Test Skipping Strategy

```yaml
# Skip tests if no test files exist
if: hashFiles('backend/tests/**') != ''
```

**Why Skip?**

- Faster CI when tests don't exist
- Avoid false failures
- Clearer CI logs

---

## Code Coverage Enforcement

### Coverage Threshold Configuration

**Jest Configuration (backend/jest.config.js):**

```javascript
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80, // 80% branch coverage
      functions: 80, // 80% function coverage
      lines: 80, // 80% line coverage
      statements: 80, // 80% statement coverage
    },
  },
};
```

### Coverage Reports

**Generate Coverage:**

```bash
# Run tests with coverage
npm run test:coverage --workspace=backend

# Output:
# ------------------|---------|----------|---------|---------|-------------------
# File              | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
# ------------------|---------|----------|---------|---------|-------------------
# All files         |   85.23 |    78.45 |   82.10 |   85.23 |
#  auth.ts          |   95.00 |    90.00 |   92.00 |   95.00 | 45-48
#  tasks.ts         |   80.00 |    75.00 |   78.00 |   80.00 | 102-110, 145
# ------------------|---------|----------|---------|---------|-------------------
```

### Coverage Badge (Optional)

```bash
# Generate coverage badge
npm install --save-dev coverage-badge-creator

# Add to package.json scripts:
"coverage:badge": "coverage-badge-creator"

# Run after tests
npm run test:coverage && npm run coverage:badge
```

**Display Badge in README:**

```markdown
![Coverage](./coverage/badge.svg)
```

### What to Test

**High Priority (100% Coverage):**

- Authentication middleware
- Authorization checks
- Input validation
- SQL query builders
- Security-sensitive code

**Medium Priority (80% Coverage):**

- API route handlers
- Database models
- Discord commands
- Service layer

**Low Priority (60% Coverage):**

- UI components (frontend)
- Configuration files
- Type definitions

---

## Linting and Formatting

### ESLint Configuration

**Root ESLint (.eslintrc.json):**

```json
{
  "root": true,
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint", "prettier"],
  "rules": {
    "prettier/prettier": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": "off"
  }
}
```

**Backend ESLint (backend/.eslintrc.json):**

```json
{
  "extends": ["../.eslintrc.json"],
  "parserOptions": {
    "project": "./tsconfig.json",
    "tsconfigRootDir": "./"
  },
  "rules": {
    "@typescript-eslint/no-floating-promises": "error"
  }
}
```

### Prettier Configuration

**.prettierrc:**

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "endOfLine": "lf"
}
```

**.prettierignore:**

```
node_modules/
dist/
build/
coverage/
*.log
.env*
```

### Linting in CI

```yaml
- name: Lint backend
  run: npm run lint --workspace=backend
  continue-on-error: true # Warnings don't fail build

- name: Lint frontend
  run: npm run lint --workspace=frontend
  continue-on-error: true
```

**Why `continue-on-error: true`?**

- Lint warnings shouldn't block deployment
- Developers notified but not blocked
- Errors still reported in CI logs

### Auto-Fix Linting

```bash
# Fix linting issues automatically
npm run lint:fix --workspace=backend
npm run lint:fix --workspace=frontend

# package.json scripts:
"lint": "eslint . --ext .ts,.tsx",
"lint:fix": "eslint . --ext .ts,.tsx --fix"
```

---

## Build Validation

### TypeScript Compilation

```yaml
- name: Build shared package
  run: npm run build --workspace=shared

- name: Build backend
  run: npm run build --workspace=backend

- name: Verify compiled output
  run: |
    test -f backend/dist/src/bot.js || (echo "❌ Compiled bot.js not found" && exit 1)
    echo "✅ Backend compiled successfully"
```

**What is Validated:**

- TypeScript compiles without errors
- Output files exist
- Source maps generated
- Type declarations generated

### Multi-Stage Build

**Monorepo Build Order:**

1. **Shared Package** (dependencies for backend/frontend)

   ```bash
   npm run build --workspace=shared
   ```

2. **Backend** (depends on shared)

   ```bash
   npm run build --workspace=backend
   ```

3. **Frontend** (depends on shared)
   ```bash
   npm run build --workspace=frontend
   ```

**Why Build Order Matters:**

- Backend imports shared types
- Frontend imports shared utilities
- Circular dependencies prevented

### Build Artifacts

```
backend/dist/
├── src/
│   ├── bot.js          # Main entry point
│   ├── bot.js.map      # Source map
│   └── api/
│       └── server.js
├── commands/
│   └── task.js
└── database/
    └── models/

shared/dist/
├── index.js
├── index.d.ts          # Type declarations
└── utils/
    └── logger.js
```

---

## Deployment Triggers

### Branch-Based Deployment

```yaml
on:
  push:
    branches:
      - main # Production deployment
      - dev # Staging deployment
```

**Deployment Strategy:**

- `main` → Production (Raspberry Pi + Vercel)
- `dev` → Staging (Docker build test only)

### Manual Deployment

**GitHub Actions Manual Trigger:**

```yaml
on:
  workflow_dispatch: # Enable manual trigger
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        type: choice
        options:
          - production
          - staging
```

**Trigger Manually:**

1. Go to GitHub → Actions → CI workflow
2. Click "Run workflow"
3. Select environment
4. Click "Run workflow"

### Tag-Based Deployment

```yaml
on:
  push:
    tags:
      - 'v*.*.*' # Deploy on version tags (v2.0.0, v1.0.1, etc.)
```

**Create Release:**

```bash
# Tag version
git tag v2.0.0

# Push tag to trigger deployment
git push origin v2.0.0
```

---

## Pre-commit Hooks

### Pre-commit Configuration

**File:** `.pre-commit-config.yaml`

```yaml
repos:
  - repo: https://github.com/pre-commit/mirrors-eslint
    rev: v8.50.0
    hooks:
      - id: eslint
        files: \.[jt]sx?$
        types: [file]
        additional_dependencies:
          - eslint@^8.50.0

  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v3.0.3
    hooks:
      - id: prettier
        files: \.[jt]sx?$
        types: [file]

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace # Remove trailing whitespace
      - id: end-of-file-fixer # Ensure files end with newline
      - id: check-yaml # Validate YAML syntax
      - id: check-json # Validate JSON syntax
      - id: check-merge-conflict # Detect merge conflicts
```

### Husky Configuration

**Install Husky:**

```bash
npm install --save-dev husky lint-staged
npx husky install
```

**package.json:**

```json
{
  "scripts": {
    "prepare": "husky || true"
  },
  "lint-staged": {
    "backend/**/*.ts": [
      "bash -c 'cd backend && eslint --fix \"${0#backend/}\"'",
      "prettier --write"
    ],
    "frontend/**/*.{ts,tsx}": ["prettier --write"],
    "*.{js,jsx,json,md}": ["prettier --write"]
  }
}
```

**Pre-commit Hook (.husky/pre-commit):**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

### What Pre-commit Hooks Do

**Before Every Commit:**

1. Lint staged files (ESLint)
2. Format staged files (Prettier)
3. Remove trailing whitespace
4. Fix end-of-file newlines
5. Validate YAML/JSON syntax
6. Check for merge conflicts

**Why Pre-commit Hooks?**

- Catch errors early (before CI)
- Enforce code style
- Reduce CI failures
- Save GitHub Actions minutes

---

## Branch Protection

### Main Branch Protection Rules

**GitHub Settings → Branches → Add rule:**

**Branch name pattern:** `main`

**Required status checks:**

- ☑ Require status checks to pass before merging
- ☑ Require branches to be up to date before merging
- Required checks:
  - `Test Shared`
  - `Test Backend`
  - `Test Frontend`
  - `CI Success`

**Additional settings:**

- ☑ Require pull request before merging
- ☑ Require approvals: 1
- ☑ Dismiss stale approvals when new commits are pushed
- ☑ Require review from Code Owners (optional)
- ☑ Require linear history (no merge commits)
- ☑ Include administrators (enforce rules for admins too)

### Dev Branch Protection Rules

**Branch name pattern:** `dev`

**Required status checks:**

- ☑ Require status checks to pass before merging
- Required checks:
  - `Test Shared`
  - `Test Backend`
  - `Test Frontend`
  - `Docker Build`
  - `CI Success`

**Additional settings:**

- ☑ Require pull request before merging
- ☑ Allow squash merging (keep commit history clean)

---

## Pull Request Workflow

### PR Template

**File:** `.github/pull_request_template.md`

```markdown
## Description

Brief description of changes.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review of code performed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
- [ ] Dependent changes merged

## Screenshots (if applicable)

[Add screenshots here]

## Related Issues

Closes #[issue number]
```

### PR Review Process

**1. Create PR:**

```bash
# Create feature branch
git checkout -b feature/add-task-priority

# Make changes and commit
git add .
git commit -m "feat: add task priority field"

# Push to GitHub
git push origin feature/add-task-priority
```

**2. Automated Checks Run:**

- CI workflow triggered
- All quality gates execute
- Status checks reported on PR

**3. Code Review:**

- Reviewer assigned
- Comments and suggestions
- Request changes or approve

**4. Address Feedback:**

- Make requested changes
- Push new commits
- CI runs again on new commits

**5. Merge PR:**

- Squash and merge (recommended)
- Delete branch after merge

### PR Status Badges

**Example PR Status:**

```
✅ CI / Detect Changed Workspaces (pull_request)
✅ CI / Test Shared Package (pull_request)
✅ CI / Test Backend (pull_request)
✅ CI / Test Frontend (pull_request)
✅ CI / CI Success (pull_request)
```

---

## Continuous Deployment

### Backend Deployment (Raspberry Pi)

**Automatic Deployment on Push to Main:**

```bash
# SSH into Raspberry Pi
ssh sunny-pi

# Navigate to project
cd ~/bwaincell

# Pull latest changes
git pull origin main

# Rebuild Docker image
docker compose build --no-cache backend

# Restart services
docker compose up -d

# Check logs
docker compose logs -f backend
```

### Frontend Deployment (Vercel)

**Automatic Deployment:**

1. **Production (main branch):**
   - Vercel automatically deploys on push to `main`
   - URL: `https://bwaincell.sunny-stack.com`

2. **Preview (feature branches):**
   - Vercel creates preview deployment for every PR
   - URL: `https://bwain-app-<branch>.vercel.app`

**Vercel Configuration (vercel.json):**

```json
{
  "buildCommand": "npm run build --workspace=frontend",
  "outputDirectory": "frontend/.next",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

### Deployment Notifications

**Discord Webhook (Deployment Success):**

```yaml
- name: Notify deployment
  if: success()
  run: |
    curl -X POST ${{ secrets.DISCORD_WEBHOOK_URL }} \
      -H "Content-Type: application/json" \
      -d '{
        "content": "✅ Deployment successful!",
        "embeds": [{
          "title": "Bwaincell Deployed",
          "description": "Version ${{ github.sha }} deployed to production",
          "color": 5763719
        }]
      }'
```

---

## Troubleshooting CI Failures

### Common Failure Scenarios

**1. Lint Failures:**

```
Error: 'req' is not defined (no-undef)
```

**Fix:**

```bash
npm run lint:fix --workspace=backend
git add .
git commit -m "fix: resolve linting issues"
git push
```

**2. Build Failures:**

```
Error: Cannot find module '@shared/utils/logger'
```

**Fix:**

```bash
# Build shared package first
npm run build --workspace=shared
npm run build --workspace=backend
```

**3. Test Failures:**

```
FAIL backend/tests/auth.test.ts
  ● Auth › should return 401 for invalid credentials
    Expected status 401, received 500
```

**Fix:**

```bash
# Run tests locally with debug output
DEBUG=* npm run test --workspace=backend

# Fix failing test
# Commit and push
```

**4. Coverage Below Threshold:**

```
ERROR: Coverage for lines (75%) does not meet global threshold (80%)
```

**Fix:**

```bash
# Add more tests
# Run coverage report to identify untested code
npm run test:coverage --workspace=backend

# View detailed report
open backend/coverage/lcov-report/index.html
```

### Debugging CI Locally

**Act (Run GitHub Actions Locally):**

```bash
# Install act
brew install act  # macOS
choco install act  # Windows

# Run CI workflow locally
act -j test-backend

# Run with secrets
act -j test-backend -s DATABASE_URL="postgresql://..."
```

---

## Related Documentation

- **[Security Best Practices](security-best-practices.md)** - Security checks in CI/CD
- **[Architecture Overview](../architecture/overview.md)** - System architecture

---

## External Resources

- **GitHub Actions Documentation:** [docs.github.com/en/actions](https://docs.github.com/en/actions)
- **pre-commit Documentation:** [pre-commit.com](https://pre-commit.com/)
- **Husky Documentation:** [typicode.github.io/husky/](https://typicode.github.io/husky/)
- **Jest Documentation:** [jestjs.io/docs/getting-started](https://jestjs.io/docs/getting-started)
- **ESLint Documentation:** [eslint.org/docs/latest/](https://eslint.org/docs/latest/)

---

**Last Updated** 2026-01-12
**Version:** 2.0.0
**Maintained by:** Bwaincell Development Team
