# ADR 0001: Monorepo Architecture with npm Workspaces

**Status:** Accepted
**Date:** 2026-01-11
**Decision Makers:** Development Team

---

## Context

Bwaincell consists of multiple related codebases that share dependencies and types:

- **Backend:** Discord bot + Express REST API (Node.js, TypeScript, Discord.js, Express, Sequelize)
- **Frontend:** Progressive Web App (Next.js, React, TailwindCSS, Prisma)
- **Shared:** Common utilities, types, validators (TypeScript)

These codebases are tightly coupled and frequently reference shared code. We needed to decide on a repository structure that:

1. Enables code sharing between backend, frontend, and shared modules
2. Allows independent deployment of backend and frontend
3. Simplifies dependency management
4. Supports coordinated versioning
5. Provides a developer-friendly workflow

### Options Considered

1. **Monorepo with npm Workspaces**
2. **Polyrepo (separate repositories)**
3. **Monorepo with Lerna**
4. **Monorepo with Turborepo**
5. **Monorepo with Nx**

---

## Decision

We will use a **monorepo architecture with npm Workspaces** for organizing Bwaincell's codebase.

### Monorepo Structure

```
bwaincell/
├── backend/              # Discord bot + Express API
│   ├── src/             # Source code
│   ├── commands/        # Discord commands
│   ├── database/        # Sequelize models
│   ├── utils/           # Backend utilities
│   └── package.json     # Backend dependencies
├── frontend/            # Next.js PWA
│   ├── src/             # React components
│   ├── app/             # Next.js app directory
│   └── package.json     # Frontend dependencies
├── shared/              # Shared utilities and types
│   ├── utils/           # Common utilities
│   ├── types/           # TypeScript types
│   ├── validation/      # Validation schemas
│   └── package.json     # Shared dependencies
├── package.json         # Root package.json with workspaces
└── node_modules/        # Shared node_modules (hoisted)
```

### Root package.json Configuration

```json
{
  "name": "bwaincell-monorepo",
  "version": "2.0.0",
  "private": true,
  "workspaces": ["backend", "frontend", "shared"],
  "scripts": {
    "dev": "npm run build:shared && concurrently \"npm run dev --workspace=backend\" \"npm run dev --workspace=frontend\"",
    "dev:backend": "npm run dev --workspace=backend",
    "dev:frontend": "npm run dev --workspace=frontend",
    "build": "npm run build --workspace=shared && npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present"
  }
}
```

### Workspace Dependencies

Workspaces can reference each other using workspace protocol:

```json
// backend/package.json
{
  "dependencies": {
    "@bwaincell/shared": "workspace:*"
  }
}
```

### Path Aliases for Imports

```typescript
// backend/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../shared/*"],
      "@database/*": ["./database/*"],
      "@utils/*": ["./utils/*"]
    }
  }
}
```

**Usage in code:**

```typescript
import { validateEmail } from '@shared/validation/emailValidator';
import { Task } from '@database/models/Task';
import { logger } from '@shared/utils/logger';
```

---

## Consequences

### Positive

1. **Unified Codebase**
   - Single repository simplifies navigation and code discovery
   - Atomic commits across frontend, backend, and shared code
   - Single source of truth for all project code

2. **Code Sharing**
   - Shared utilities, types, and validators in `shared/` workspace
   - No need to publish private npm packages
   - Type safety across workspaces (TypeScript IntelliSense works)

3. **Dependency Management**
   - Shared dependencies are hoisted to root `node_modules/`
   - Reduces disk space and installation time
   - Consistent versions across workspaces

4. **Coordinated Versioning**
   - Frontend and backend versions stay in sync
   - Single version tag for entire project
   - Easier to track which frontend version works with which backend version

5. **Simplified CI/CD**
   - Single repository to clone
   - Single build pipeline for all workspaces
   - Single test suite execution

6. **Developer Experience**
   - Single `git clone` to get entire codebase
   - Single `npm install` to install all dependencies
   - Run all tests with single command: `npm test`
   - Hot reload works across workspaces in development

7. **Native npm Support**
   - npm Workspaces is built into npm (no extra tools)
   - No additional dependencies or configuration
   - Standard npm commands work (`npm install`, `npm run`)

### Negative

1. **Repository Size**
   - Single repository contains all code (larger clone size)
   - Git history includes changes to all workspaces
   - **Mitigation:** Still manageable for projects of Bwaincell's size (<100MB)

2. **Build Complexity**
   - Must build `shared/` before backend/frontend
   - Circular dependency risk if not careful
   - **Mitigation:** Clear workspace dependency hierarchy, build order enforced

3. **Deployment Coupling**
   - Changes to shared code affect both backend and frontend
   - Risk of unintended cross-workspace impact
   - **Mitigation:** Comprehensive test suite, careful change management

4. **CI/CD Optimization**
   - CI must detect which workspace changed and build only affected workspaces
   - Naive approach rebuilds everything on every commit
   - **Mitigation:** Use conditional builds (GitHub Actions `paths` filters)

5. **Access Control**
   - Cannot restrict access to specific workspaces within repository
   - All contributors have access to all code
   - **Mitigation:** Acceptable for Bwaincell (small team, trusted contributors)

6. **Independent Versioning**
   - Workspaces share a single version number
   - Cannot version backend and frontend independently
   - **Mitigation:** Acceptable for Bwaincell (tightly coupled services)

---

## Alternatives Considered

### Alternative 1: Polyrepo (Separate Repositories)

**Structure:**

- `bwaincell-backend` repository
- `bwaincell-frontend` repository
- `bwaincell-shared` repository (published as npm package)

**Pros:**

- Independent versioning and deployment
- Smaller repository sizes
- Finer-grained access control

**Cons:**

- Code sharing requires publishing `shared` as npm package
- Coordinating changes across repositories is complex
- Must update `shared` version in backend and frontend manually
- Atomic commits across repositories impossible
- Developer must clone 3 repositories

**Why we didn't choose this:** Too much overhead for a small team. Publishing and versioning a private npm package adds unnecessary complexity.

---

### Alternative 2: Monorepo with Lerna

**Pros:**

- Mature monorepo tool
- Handles versioning and publishing
- Bootstrap command for linking workspaces

**Cons:**

- Requires additional dependency (`lerna`)
- More complex configuration than native npm Workspaces
- Overlaps with npm Workspaces functionality
- Maintenance burden (Lerna development slowed down)

**Why we didn't choose this:** npm Workspaces provides all features we need without extra dependencies.

---

### Alternative 3: Monorepo with Turborepo

**Pros:**

- Blazing fast builds with intelligent caching
- Parallel task execution
- Remote caching for CI/CD

**Cons:**

- Requires additional dependency (`turbo`)
- More complex configuration
- Overkill for project of Bwaincell's size (3 workspaces)
- Adds learning curve for contributors

**Why we didn't choose this:** Premature optimization. npm Workspaces is sufficient for our build times.

---

### Alternative 4: Monorepo with Nx

**Pros:**

- Powerful monorepo tooling
- Advanced dependency graph analysis
- Code generation and scaffolding
- Affected project detection

**Cons:**

- Requires additional dependency (`nx`)
- Steep learning curve
- Heavy configuration
- Overkill for small projects

**Why we didn't choose this:** Too complex for our needs. We prefer simplicity over advanced features we don't use.

---

## Implementation Notes

### Workspace Setup

```bash
# Install all dependencies
npm install

# Build shared workspace
npm run build:shared

# Run backend in dev mode
npm run dev:backend

# Run frontend in dev mode
npm run dev:frontend

# Run both concurrently
npm run dev
```

### Adding Dependencies

```bash
# Add dependency to backend
npm install express --workspace=backend

# Add dependency to frontend
npm install next --workspace=frontend

# Add dependency to shared
npm install zod --workspace=shared

# Add devDependency to root
npm install -D concurrently
```

### Referencing Shared Code

```typescript
// backend/src/services/UserService.ts
import { validateEmail } from '@shared/validation/emailValidator';
import { logger } from '@shared/utils/logger';

export class UserService {
  static async createUser(email: string) {
    if (!validateEmail(email)) {
      throw new Error('Invalid email');
    }

    logger.info('Creating user', { email });
    // ...
  }
}
```

### Build Order

The `shared` workspace must be built before backend or frontend:

```json
{
  "scripts": {
    "build": "npm run build:shared && npm run build:backend && npm run build:frontend",
    "build:shared": "npm run build --workspace=shared",
    "build:backend": "npm run build --workspace=backend",
    "build:frontend": "npm run build --workspace=frontend"
  }
}
```

---

## References

- [npm Workspaces Documentation](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
- [Root package.json](c:\Users\lukaf\Desktop\Dev Work\Bwaincell\package.json)
- [ADR 0002: PostgreSQL Migration](0002-postgresql-migration.md)
- [ADR 0004: Dual Interface Architecture](0004-discord-bot-rest-api.md)

---

## Revision History

| Date       | Version | Changes                                   |
| ---------- | ------- | ----------------------------------------- |
| 2026-01-11 | 1.0     | Initial decision: npm Workspaces monorepo |

---

**Outcome:** Adopted npm Workspaces monorepo. The architecture has proven effective for:

- Code sharing between backend and frontend
- Unified development workflow
- Simplified dependency management
- Single version control for entire project

**Next Review:** 2027-01-11 (re-evaluate if project grows beyond 10 workspaces)
