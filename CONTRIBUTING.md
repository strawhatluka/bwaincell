# Contributing to Bwaincell

Thank you for your interest in contributing to Bwaincell! This document provides guidelines and instructions for contributing to the project.

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and collaborative environment for all contributors.

---

## How to Contribute

### Reporting Bugs

Before creating a bug report:

1. Check existing issues to avoid duplicates
2. Use the latest version to verify the bug still exists
3. Collect relevant information (logs, screenshots, steps to reproduce)

When creating a bug report, include:

- Clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Relevant logs or error messages

### Suggesting Features

Feature requests are welcome! Please:

1. Check if the feature has already been suggested
2. Provide a clear description of the feature
3. Explain the use case and benefits
4. Consider implementation complexity

### Pull Requests

1. **Fork the repository**

   ```bash
   git clone https://github.com/yourusername/bwaincell.git
   cd bwaincell
   ```

2. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the code style guidelines below
   - Add tests for new functionality
   - Update documentation as needed

4. **Test your changes**

   ```bash
   npm run lint
   npm test
   npm run build
   ```

5. **Commit your changes**

   ```bash
   git commit -m "feat: add your feature description"
   ```

   Use conventional commit messages:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `refactor:` Code refactoring
   - `test:` Test updates
   - `chore:` Maintenance tasks

6. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Provide a clear title and description
   - Reference any related issues
   - Include screenshots for UI changes
   - Wait for code review

---

## Development Setup

### Prerequisites

- Node.js 18.0 or higher
- npm 8.0 or higher
- Git
- Discord Bot Token
- Google OAuth 2.0 Credentials

### Installation

```bash
# Clone your fork
git clone https://github.com/yourusername/bwaincell.git
cd bwaincell

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env

# Build TypeScript
npm run build

# Start development server
npm run dev
```

### Environment Variables

See `.env.example` for required variables.

---

## Code Style Guidelines

### TypeScript

- Use TypeScript strict mode
- Define proper types (avoid `any`)
- Use interfaces for object shapes
- Document complex functions with JSDoc comments

### Formatting

- Use Prettier for code formatting
- 2 spaces for indentation
- Semicolons required
- Single quotes for strings
- Trailing commas in objects/arrays

Run formatter:

```bash
npm run format
```

### Linting

- Follow ESLint rules
- Fix linting errors before committing
- No console.log in production code (use logger)

Run linter:

```bash
npm run lint
```

### Logging

Use the Winston logger, not console.log:

```typescript
import { logger } from '@shared/utils/logger';

logger.info('User logged in', { userId, email });
logger.error('Database error', { error: error.message });
logger.debug('Processing request', { endpoint, method });
```

---

## Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Coverage

Aim for:

- **80%+ overall coverage**
- **100% coverage for critical paths** (auth, data operations)
- All public methods tested
- Edge cases covered

---

## API Development

### Adding New Endpoints

1. **Create route handler** in `src/api/routes/`
2. **Add authentication** middleware
3. **Validate inputs** thoroughly
4. **Use standardized responses**
5. **Document the endpoint** in README.md
6. **Add tests** for the endpoint

### Response Format

All API responses use this format:

**Success:**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**

```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Discord Bot Development

### Adding Commands

1. Create command file in `commands/`
2. Implement `execute()` function
3. Add command metadata
4. Register with Discord
5. Deploy commands: `npm run deploy`

---

## Database Changes

### Schema Updates

1. Update schema in `database/schema.ts`
2. Update model in `database/models/`
3. Test migrations locally
4. Document changes in pull request

---

## Documentation

### Code Documentation

- Use JSDoc for functions and classes
- Document parameters and return types
- Explain complex logic with comments
- Keep comments up-to-date

### README Updates

Update README.md when:

- Adding new features
- Changing API endpoints
- Modifying setup instructions
- Updating dependencies

---

## Git Workflow

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/documentation-update` - Documentation
- `refactor/code-improvement` - Refactoring
- `test/test-updates` - Test changes

### Commit Messages

Follow conventional commits:

```
<type>(<scope>): <subject>
```

Example:

```
feat(auth): add Google OAuth 2.0 support
```

Types:

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code restructure
- `test` - Tests
- `chore` - Maintenance

---

## Release Process

Releases follow semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR** - Breaking changes
- **MINOR** - New features (backward compatible)
- **PATCH** - Bug fixes

---

## Need Help?

- **Issues**: [GitHub Issues](https://github.com/lukadfagundes/bwaincell/issues)
- **Discussions**: Use GitHub Discussions for questions

---

## License

By contributing to Bwaincell, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Bwaincell!** <�
