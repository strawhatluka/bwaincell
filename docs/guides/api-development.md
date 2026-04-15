# API Development Guide

**Last Updated:** 2026-04-15

> **Supabase update (2026-04-15):** Backend routes no longer use Sequelize. All data access goes through typed model wrappers in `supabase/models/*.ts`, which in turn use `@supabase/supabase-js` via the lazy-initialized client in `supabase/supabase.ts`. Any Sequelize idioms (`Model.findAll`, `Op.like`, `sequelize.transaction`) shown later in this file should be read as historical; the current equivalents are documented below.
>
> **Current backend REST route groups** (`backend/src/api/routes/`): `tasks`, `lists`, `notes`, `reminders`, `budget`, `schedule`, `oauth`, `health`.
> **Recipes / MealPlans / Sunset config / Events config are not yet exposed via REST** — they are currently driven through Discord commands and the Supabase model wrappers. See [api/README.md](../api/README.md).

## Quick patterns (current)

**Query with the Supabase model wrapper:**

```typescript
// backend/src/api/routes/tasks.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/oauth';
import * as Task from '../../../supabase/models/Task';

const router = Router();

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const tasks = await Task.getGuildTasks(req.user.guildId);
    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
});

export default router;
```

**Inside the model wrapper (`supabase/models/Task.ts`):**

```typescript
import supabase from '../supabase';

export async function getGuildTasks(guildId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('guild_id', guildId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
```

**Example: adding a new Recipe endpoint** (illustrative — no REST routes exist for recipes yet):

```typescript
import * as Recipe from '../../../supabase/models/Recipe';

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const recipes = await Recipe.listForGuild(req.user.guildId);
    res.json({ success: true, data: recipes });
  } catch (err) {
    next(err);
  }
});

router.post('/favorite/:id', authenticateToken, async (req, res, next) => {
  try {
    const updated = await Recipe.toggleFavorite(
      Number(req.params.id),
      req.user.guildId
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});
```

**Example: reading the active meal plan:**

```typescript
import * as MealPlan from '../../../supabase/models/MealPlan';

router.get('/active', authenticateToken, async (req, res, next) => {
  try {
    const plan = await MealPlan.getActiveForGuild(req.user.guildId);
    res.json({ success: true, data: plan });
  } catch (err) {
    next(err);
  }
});
```

**Example: shopping list generation** (delegates to `backend/utils/shoppingList.ts`):

```typescript
import { generateShoppingList } from '../../utils/shoppingList';

router.get('/shopping-list', authenticateToken, async (req, res, next) => {
  try {
    const list = await generateShoppingList(req.user.guildId);
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});
```

Keep Joi validation on the route, keep all Supabase queries inside `supabase/models/*.ts`, and surface errors via your standard Express error middleware.
**Target:** Contributors adding REST API endpoints to Bwaincell

---

## Table of Contents

1. [Overview](#overview)
2. [API Architecture](#api-architecture)
3. [Creating Express Routes](#creating-express-routes)
4. [Middleware Usage](#middleware-usage)
5. [Request Validation](#request-validation)
6. [Response Formatting](#response-formatting)
7. [Database Operations](#database-operations)
8. [Testing API Endpoints](#testing-api-endpoints)
9. [End-to-End Example](#end-to-end-example)
10. [Best Practices](#best-practices)

---

## Overview

Bwaincell's REST API is built with **Express.js** and provides web/mobile access to Discord bot features. All API endpoints:

- Use **Bearer token authentication** (OAuth2 + JWT)
- Follow **RESTful conventions** (GET, POST, PATCH, DELETE)
- Return **JSON responses** with standardized format
- Support **CORS** for frontend access
- Log **requests/responses** with Winston

### API Base URL

- **Development:** `http://localhost:3000`
- **Production:** `https://bwaincell.fly.dev` (or your deployment URL)

### Authentication

All `/api/*` endpoints (except `/api/auth/*`) require Bearer token authentication:

```http
Authorization: Bearer <jwt_token>
```

---

## API Architecture

### Directory Structure

```
backend/src/api/
├── server.ts              # Express app initialization
├── middleware/
│   ├── oauth.ts           # JWT authentication middleware
│   ├── validation.ts      # Request validation middleware
│   └── errorHandler.ts    # Global error handler
├── routes/
│   ├── health.ts          # Health check endpoint
│   ├── oauth.ts           # OAuth authentication routes
│   ├── tasks.ts           # Task management routes
│   ├── lists.ts           # List management routes
│   ├── notes.ts           # Note management routes
│   ├── reminders.ts       # Reminder management routes
│   ├── budget.ts          # Budget management routes
│   └── schedule.ts        # Schedule management routes
└── utils/
    └── response.ts        # Response formatting utilities
```

### Express App Initialization

**File:** `backend/src/api/server.ts`

```typescript
import express, { Application } from 'express';
import cors from 'cors';
import { logger } from '@shared/utils/logger';

// Import route modules
import healthRouter from './routes/health';
import tasksRouter from './routes/tasks';
import oauthRouter from './routes/oauth';

// Import OAuth middleware
import { authenticateToken } from './middleware/oauth';

export function createApiServer(): Application {
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: [process.env.PWA_URL || 'http://localhost:3001', 'https://bwaincell.sunny-stack.com'],
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req, res, next) => {
    logger.debug('[API-REQUEST]', {
      method: req.method,
      path: req.path,
      query: req.query,
    });
    next();
  });

  // Public routes (no authentication)
  app.use('/api/auth', oauthRouter);
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  // Protected routes (require Bearer token)
  app.use('/api/tasks', authenticateToken, tasksRouter);

  // Error handler
  app.use((err, req, res, next) => {
    logger.error('[API-ERROR]', { error: err.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  });

  return app;
}
```

---

## Creating Express Routes

### Route File Structure

**File:** `backend/src/api/routes/tasks.ts`

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { Task } from '@database';
import { logger } from '@shared/utils/logger';
import { validateTaskInput } from '../middleware/validation';

const router = Router();

// GET /api/tasks - List all tasks for authenticated user
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.discordId; // Set by authenticateToken middleware

    const tasks = await Task.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    logger.info('[API] Tasks retrieved', { userId, count: tasks.length });

    res.json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    next(error); // Pass to error handler
  }
});

// GET /api/tasks/:id - Get single task
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.discordId;
    const { id } = req.params;

    const task = await Task.findOne({
      where: { id, userId }, // Ensure user owns the task
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks - Create new task
router.post('/', validateTaskInput, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.discordId;
    const { title, description, dueDate, listId } = req.body;

    const task = await Task.create({
      userId,
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      listId: listId || null,
      completed: false,
    });

    logger.info('[API] Task created', { userId, taskId: task.id });

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/tasks/:id - Update task
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.discordId;
    const { id } = req.params;
    const updates = req.body;

    const task = await Task.findOne({ where: { id, userId } });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    // Update only allowed fields
    const allowedFields = ['title', 'description', 'dueDate', 'completed', 'listId'];
    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        task[key] = updates[key];
      }
    });

    await task.save();

    logger.info('[API] Task updated', { userId, taskId: task.id });

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.discordId;
    const { id } = req.params;

    const task = await Task.findOne({ where: { id, userId } });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    await task.destroy();

    logger.info('[API] Task deleted', { userId, taskId: id });

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
```

### Route Naming Conventions

- **Collection routes:** `/api/tasks` (plural noun)
- **Resource routes:** `/api/tasks/:id` (ID parameter)
- **Actions:** Use HTTP verbs (GET, POST, PATCH, DELETE), not verbs in URL
- **Nested resources:** `/api/lists/:listId/tasks`

---

## Middleware Usage

### Authentication Middleware

**File:** `backend/src/api/middleware/oauth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '@shared/utils/logger';

interface JwtPayload {
  discordId: string;
  email: string;
  name: string;
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    logger.warn('[AUTH] No token provided', { path: req.path });
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    req.user = decoded; // Attach user to request

    logger.debug('[AUTH] Token verified', { discordId: decoded.discordId });
    next();
  } catch (error) {
    logger.warn('[AUTH] Invalid token', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}
```

### Validation Middleware

**File:** `backend/src/api/middleware/validation.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '@shared/utils/logger';

// Task input validation schema
const taskSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000).optional().allow(''),
  dueDate: Joi.date().iso().optional().allow(null),
  listId: Joi.string().uuid().optional().allow(null),
  completed: Joi.boolean().optional(),
});

export function validateTaskInput(req: Request, res: Response, next: NextFunction): void {
  const { error, value } = taskSchema.validate(req.body, {
    abortEarly: false, // Return all errors, not just first
    stripUnknown: true, // Remove unknown fields
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    logger.warn('[VALIDATION] Invalid task input', { errors });

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
    });
    return;
  }

  req.body = value; // Replace with validated/sanitized data
  next();
}

// Reusable validation middleware factory
export function validate(schema: Joi.Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
      return;
    }

    req.body = value;
    next();
  };
}
```

### Error Handler Middleware

**File:** `backend/src/api/middleware/errorHandler.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '@shared/utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  logger.error('[API-ERROR]', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    userId: req.user?.discordId,
  });

  // Handle specific error types
  if (err.name === 'SequelizeValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.message,
    });
    return;
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    res.status(409).json({
      success: false,
      error: 'Resource already exists',
    });
    return;
  }

  // Generic error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(isDevelopment && { message: err.message, stack: err.stack }),
  });
}
```

---

## Request Validation

### Joi Validation Schemas

**File:** `backend/src/api/schemas/taskSchemas.ts`

```typescript
import Joi from 'joi';

export const createTaskSchema = Joi.object({
  title: Joi.string().min(1).max(200).required().messages({
    'string.empty': 'Title cannot be empty',
    'string.max': 'Title must be less than 200 characters',
    'any.required': 'Title is required',
  }),
  description: Joi.string().max(1000).optional().allow(''),
  dueDate: Joi.date().iso().optional().allow(null),
  listId: Joi.string().uuid().optional().allow(null),
});

export const updateTaskSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  description: Joi.string().max(1000).optional().allow(''),
  dueDate: Joi.date().iso().optional().allow(null),
  completed: Joi.boolean().optional(),
  listId: Joi.string().uuid().optional().allow(null),
}).min(1); // At least one field must be present

export const taskQuerySchema = Joi.object({
  completed: Joi.boolean().optional(),
  listId: Joi.string().uuid().optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});
```

### Using Validation in Routes

```typescript
import { validate } from '../middleware/validation';
import { createTaskSchema, updateTaskSchema } from '../schemas/taskSchemas';

// POST /api/tasks
router.post('/', validate(createTaskSchema), async (req, res, next) => {
  // req.body is now validated and sanitized
  // ...
});

// PATCH /api/tasks/:id
router.patch('/:id', validate(updateTaskSchema), async (req, res, next) => {
  // ...
});
```

---

## Response Formatting

### Standard Response Format

All API responses follow this format:

#### Success Response

```json
{
  "success": true,
  "data": {
    "id": "task-123",
    "title": "Buy groceries",
    "completed": false
  }
}
```

#### Error Response

```json
{
  "success": false,
  "error": "Task not found"
}
```

#### Validation Error Response

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "title",
      "message": "Title is required"
    },
    {
      "field": "dueDate",
      "message": "Due date must be a valid ISO date"
    }
  ]
}
```

### Response Utility Functions

**File:** `backend/src/api/utils/response.ts`

```typescript
import { Response } from 'express';

export function successResponse(res: Response, data: any, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

export function errorResponse(res: Response, error: string, statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    error,
  });
}

export function validationErrorResponse(res: Response, details: any[]) {
  return res.status(400).json({
    success: false,
    error: 'Validation failed',
    details,
  });
}

export function notFoundResponse(res: Response, resource: string) {
  return res.status(404).json({
    success: false,
    error: `${resource} not found`,
  });
}

export function unauthorizedResponse(res: Response) {
  return res.status(401).json({
    success: false,
    error: 'Authentication required',
  });
}

export function forbiddenResponse(res: Response) {
  return res.status(403).json({
    success: false,
    error: 'Access denied',
  });
}
```

### Using Response Utilities

```typescript
import { successResponse, notFoundResponse } from '../utils/response';

router.get('/:id', async (req, res, next) => {
  const task = await Task.findByPk(req.params.id);

  if (!task) {
    return notFoundResponse(res, 'Task');
  }

  return successResponse(res, task);
});
```

---

## Database Operations

### Sequelize Model Usage

```typescript
import { Task, List } from '@database';
import { Op } from 'sequelize';

// Find all tasks for user
const tasks = await Task.findAll({
  where: { userId: 'user-123' },
  order: [['createdAt', 'DESC']],
});

// Find single task
const task = await Task.findOne({
  where: { id: 'task-123', userId: 'user-123' },
});

// Find task by primary key
const task = await Task.findByPk('task-123');

// Create task
const task = await Task.create({
  userId: 'user-123',
  title: 'Buy groceries',
  completed: false,
});

// Update task
task.completed = true;
await task.save();

// Or update directly
await Task.update({ completed: true }, { where: { id: 'task-123' } });

// Delete task
await task.destroy();

// Or delete directly
await Task.destroy({
  where: { id: 'task-123' },
});

// Complex queries
const tasks = await Task.findAll({
  where: {
    userId: 'user-123',
    completed: false,
    dueDate: {
      [Op.lte]: new Date(), // Overdue tasks
    },
  },
  include: [
    {
      model: List,
      as: 'list',
      attributes: ['id', 'name'],
    },
  ],
  order: [['dueDate', 'ASC']],
  limit: 10,
  offset: 0,
});
```

### Transaction Support

```typescript
import { sequelize } from '@database';

// Create transaction
const transaction = await sequelize.transaction();

try {
  // All operations use the same transaction
  const task = await Task.create(
    {
      userId: 'user-123',
      title: 'Task 1',
    },
    { transaction }
  );

  await Note.create(
    {
      userId: 'user-123',
      taskId: task.id,
      content: 'Task note',
    },
    { transaction }
  );

  // Commit transaction
  await transaction.commit();
} catch (error) {
  // Rollback on error
  await transaction.rollback();
  throw error;
}
```

---

## Testing API Endpoints

### Integration Testing with Supertest

**File:** `backend/src/api/routes/__tests__/tasks.test.ts`

```typescript
import request from 'supertest';
import { createApiServer } from '@src/api/server';
import { Task } from '@database';
import jwt from 'jsonwebtoken';

describe('Tasks API', () => {
  let app;
  let authToken;

  beforeAll(() => {
    app = createApiServer();
    authToken = jwt.sign(
      { discordId: 'test-user-123', email: 'test@example.com' },
      process.env.JWT_SECRET
    );
  });

  beforeEach(async () => {
    await Task.sync({ force: true });
  });

  describe('GET /api/tasks', () => {
    it('should return all tasks for user', async () => {
      await Task.create({
        id: 'task-1',
        userId: 'test-user-123',
        title: 'Test Task',
        completed: false,
      });

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
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'New Task',
          description: 'Task description',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('New Task');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Missing title
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });
});
```

---

## End-to-End Example

### Creating a New Feature: Budget Categories

#### Step 1: Define Sequelize Model

**File:** `backend/database/models/BudgetCategory.ts`

```typescript
import { Model, DataTypes, Sequelize } from 'sequelize';

export class BudgetCategory extends Model {
  public id!: string;
  public userId!: string;
  public name!: string;
  public monthlyLimit!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static init(sequelize: Sequelize) {
    return super.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        monthlyLimit: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'budget_categories',
        timestamps: true,
      }
    );
  }
}
```

#### Step 2: Create Validation Schema

**File:** `backend/src/api/schemas/budgetCategorySchemas.ts`

```typescript
import Joi from 'joi';

export const createBudgetCategorySchema = Joi.object({
  name: Joi.string().min(1).max(50).required(),
  monthlyLimit: Joi.number().positive().required(),
});

export const updateBudgetCategorySchema = Joi.object({
  name: Joi.string().min(1).max(50).optional(),
  monthlyLimit: Joi.number().positive().optional(),
}).min(1);
```

#### Step 3: Create Routes

**File:** `backend/src/api/routes/budgetCategories.ts`

```typescript
import { Router } from 'express';
import { BudgetCategory } from '@database';
import { validate } from '../middleware/validation';
import {
  createBudgetCategorySchema,
  updateBudgetCategorySchema,
} from '../schemas/budgetCategorySchemas';
import { successResponse, notFoundResponse } from '../utils/response';

const router = Router();

// GET /api/budget-categories
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.discordId;
    const categories = await BudgetCategory.findAll({ where: { userId } });
    return successResponse(res, categories);
  } catch (error) {
    next(error);
  }
});

// POST /api/budget-categories
router.post('/', validate(createBudgetCategorySchema), async (req, res, next) => {
  try {
    const userId = req.user.discordId;
    const category = await BudgetCategory.create({
      userId,
      ...req.body,
    });
    return successResponse(res, category, 201);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/budget-categories/:id
router.patch('/:id', validate(updateBudgetCategorySchema), async (req, res, next) => {
  try {
    const userId = req.user.discordId;
    const category = await BudgetCategory.findOne({
      where: { id: req.params.id, userId },
    });

    if (!category) {
      return notFoundResponse(res, 'Budget category');
    }

    await category.update(req.body);
    return successResponse(res, category);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/budget-categories/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user.discordId;
    const category = await BudgetCategory.findOne({
      where: { id: req.params.id, userId },
    });

    if (!category) {
      return notFoundResponse(res, 'Budget category');
    }

    await category.destroy();
    return successResponse(res, { message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
```

#### Step 4: Register Routes in Server

**File:** `backend/src/api/server.ts`

```typescript
import budgetCategoriesRouter from './routes/budgetCategories';

// ...
app.use('/api/budget-categories', authenticateToken, budgetCategoriesRouter);
```

#### Step 5: Write Tests

**File:** `backend/src/api/routes/__tests__/budgetCategories.test.ts`

```typescript
import request from 'supertest';
import { createApiServer } from '@src/api/server';
import { BudgetCategory } from '@database';
import jwt from 'jsonwebtoken';

describe('Budget Categories API', () => {
  let app;
  let authToken;

  beforeAll(() => {
    app = createApiServer();
    authToken = jwt.sign({ discordId: 'test-user-123' }, process.env.JWT_SECRET);
  });

  it('should create budget category', async () => {
    const response = await request(app)
      .post('/api/budget-categories')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Groceries',
        monthlyLimit: 500,
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Groceries');
  });
});
```

---

## Best Practices

### 1. Use Async/Await with Try-Catch

```typescript
// Good
router.get('/', async (req, res, next) => {
  try {
    const data = await fetchData();
    res.json({ success: true, data });
  } catch (error) {
    next(error); // Let error handler deal with it
  }
});
```

### 2. Validate All User Input

```typescript
// Always validate request body, query params, and URL params
router.post('/', validate(schema), async (req, res) => {
  // req.body is now safe to use
});
```

### 3. Return Proper HTTP Status Codes

- **200 OK:** Successful GET/PATCH/DELETE
- **201 Created:** Successful POST
- **400 Bad Request:** Validation errors
- **401 Unauthorized:** Missing/invalid auth token
- **403 Forbidden:** Authenticated but not authorized
- **404 Not Found:** Resource doesn't exist
- **500 Internal Server Error:** Server error

### 4. Implement Ownership Checks

```typescript
// Always verify user owns the resource
const task = await Task.findOne({
  where: { id: req.params.id, userId: req.user.discordId },
});

if (!task) {
  return res.status(404).json({ error: 'Task not found' });
}
```

### 5. Log Important Events

```typescript
logger.info('[API] Task created', { userId, taskId });
logger.warn('[API] Unauthorized access attempt', { userId, resource });
logger.error('[API] Database error', { error: err.message });
```

### 6. Use Transactions for Multi-Step Operations

```typescript
const t = await sequelize.transaction();
try {
  await Task.create({ ... }, { transaction: t });
  await Note.create({ ... }, { transaction: t });
  await t.commit();
} catch (error) {
  await t.rollback();
  throw error;
}
```

### 7. Implement Pagination

```typescript
router.get('/', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  const { count, rows } = await Task.findAndCountAll({
    where: { userId: req.user.discordId },
    limit,
    offset,
  });

  res.json({
    success: true,
    data: rows,
    pagination: {
      total: count,
      limit,
      offset,
    },
  });
});
```

---

## References

- [Express.js Documentation](https://expressjs.com/)
- [Joi Validation Documentation](https://joi.dev/api/)
- [Sequelize Documentation](https://sequelize.org/docs/v6/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Testing Guide](testing.md)

---

**Next Steps:**

- [Discord Bot Development Guide](discord-bot-development.md) - Create Discord commands
- [Database Migrations Guide](database-migrations.md) - Migrate to PostgreSQL
- [Testing Guide](testing.md) - Write comprehensive tests
