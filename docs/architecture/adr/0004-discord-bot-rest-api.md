# ADR 0004: Dual Interface Architecture (Discord Bot + REST API)

**Status:** Accepted
**Date:** 2026-01-11
**Decision Makers:** Development Team

---

## Context

Bwaincell started as a Discord bot for task management, reminders, notes, and budget tracking. Users interacted exclusively via Discord slash commands. As the project evolved, we identified a need for:

1. **Web/Mobile Access:** Users want to access their data outside Discord
2. **Rich UI:** Complex features (budget charts, calendar views) need visual interfaces
3. **Cross-Platform:** Access from desktop, mobile, and tablet
4. **Real-Time Updates:** Changes made in Discord should reflect in web app

### Initial Constraints

- **Existing Discord Bot:** 1000+ lines of Discord commands working well
- **User Data:** All data (tasks, reminders, notes) tied to Discord user IDs
- **No Rewrite Budget:** Cannot afford to rewrite entire bot
- **Shared Database:** Both interfaces must access same data

### User Experience Requirements

**Discord Bot:**

- Quick task creation: `/tasks add Buy milk`
- Inline interactions: Complete tasks with buttons
- Notifications: Reminders sent as Discord messages
- Voice channel integration: Schedule tracking

**Web/Mobile App:**

- Visual task boards (Kanban, calendar views)
- Rich text editing for notes
- Budget visualization (charts, graphs)
- Offline support (Progressive Web App)
- Push notifications (web notifications)

---

## Decision

We will implement a **dual interface architecture** with a Discord bot and REST API sharing a common business logic layer and database.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Interfaces                      │
├──────────────────────────────┬──────────────────────────────┤
│       Discord Bot            │      Web/Mobile App          │
│   (discord.js v14)           │    (Next.js + React)         │
│   - Slash commands           │    - Task boards             │
│   - Button interactions      │    - Budget charts           │
│   - Select menus             │    - Calendar views          │
│   - Modals                   │    - Rich text editor        │
└──────────────┬───────────────┴──────────────┬───────────────┘
               │                              │
               │                              │
               ▼                              ▼
┌──────────────────────────┐   ┌────────────────────────────┐
│  Discord Command Layer   │   │     REST API Layer         │
│  backend/commands/       │   │  backend/src/api/routes/   │
│  - tasks.ts              │   │  - tasks.ts (GET/POST)     │
│  - reminders.ts          │   │  - reminders.ts            │
│  - notes.ts              │   │  - notes.ts                │
└──────────────┬───────────┘   └─────────────┬──────────────┘
               │                              │
               └──────────────┬───────────────┘
                              │
                              ▼
               ┌──────────────────────────────┐
               │   Shared Business Logic      │
               │   backend/utils/             │
               │   backend/shared/            │
               │   - Task validation          │
               │   - Date parsing             │
               │   - Notification logic       │
               └──────────────┬───────────────┘
                              │
                              ▼
               ┌──────────────────────────────┐
               │      Database Layer          │
               │   backend/database/models/   │
               │   - Task.ts (Sequelize)      │
               │   - Reminder.ts              │
               │   - Note.ts                  │
               └──────────────┬───────────────┘
                              │
                              ▼
               ┌──────────────────────────────┐
               │     PostgreSQL Database      │
               │   - tasks table              │
               │   - reminders table          │
               │   - notes table              │
               └──────────────────────────────┘
```

### Code Organization

```
backend/
├── src/
│   ├── bot.ts                 # Discord bot initialization
│   └── api/
│       ├── server.ts          # Express app initialization
│       ├── routes/            # REST API endpoints
│       │   ├── tasks.ts       # GET/POST/PATCH/DELETE /api/tasks
│       │   ├── reminders.ts
│       │   └── notes.ts
│       └── middleware/
│           └── oauth.ts       # JWT authentication
├── commands/                  # Discord slash commands
│   ├── tasks.ts               # /tasks command
│   ├── reminders.ts           # /reminders command
│   └── notes.ts               # /notes command
├── utils/                     # Shared utilities
│   ├── interactions/          # Button/modal handlers
│   └── scheduler.ts           # Cron jobs (reminders)
├── database/
│   ├── models/                # Sequelize models
│   │   ├── Task.ts            # Shared by Discord + API
│   │   ├── Reminder.ts
│   │   └── Note.ts
│   └── index.ts               # Database connection
└── shared/                    # Shared utilities (validators, logger)
    ├── validation/
    └── utils/
```

### Discord Command Example

**File:** `backend/commands/tasks.ts`

```typescript
import { SlashCommandBuilder } from 'discord.js';
import { Task } from '@database';

export const data = new SlashCommandBuilder()
  .setName('tasks')
  .setDescription('Manage your tasks')
  .addSubcommand((subcommand) => subcommand.setName('list').setDescription('List all your tasks'));

export async function execute(interaction) {
  const userId = interaction.user.id;

  // Use shared database model
  const tasks = await Task.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });

  await interaction.reply({
    content: `You have ${tasks.length} tasks`,
    ephemeral: true,
  });
}
```

### REST API Endpoint Example

**File:** `backend/src/api/routes/tasks.ts`

```typescript
import { Router } from 'express';
import { Task } from '@database';
import { authenticateToken } from '../middleware/oauth';

const router = Router();

// GET /api/tasks - List all tasks
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.discordId; // From JWT token

  // Use same database model as Discord bot
  const tasks = await Task.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });

  res.json({
    success: true,
    data: tasks,
  });
});

export default router;
```

### Shared Database Model

**File:** `backend/database/models/Task.ts`

```typescript
import { Model, DataTypes, Sequelize } from 'sequelize';

export default class Task extends Model {
  public id!: string;
  public userId!: string; // Discord user ID (used by both interfaces)
  public title!: string;
  public completed!: boolean;

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
        title: {
          type: DataTypes.STRING(200),
          allowNull: false,
        },
        completed: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
      },
      {
        sequelize,
        tableName: 'tasks',
        timestamps: true,
      }
    );
  }
}
```

---

## Consequences

### Positive

1. **Code Reuse**
   - Database models shared between Discord bot and REST API
   - Business logic in `shared/` utilities used by both interfaces
   - Validation rules apply consistently
   - Single source of truth for data operations

2. **User Flexibility**
   - Users choose their preferred interface (Discord or web)
   - Quick actions in Discord (`/tasks add`)
   - Complex workflows in web app (budget charts, calendar views)
   - Access data from any platform

3. **Gradual Migration**
   - Discord bot continues working while building web app
   - No need to rewrite existing Discord commands
   - Users transition at their own pace
   - Minimal disruption to existing workflows

4. **Consistent Data Layer**
   - Changes in Discord immediately visible in web app
   - Changes in web app immediately visible in Discord
   - No data synchronization needed
   - Single database ensures consistency

5. **Feature Parity**
   - Core features available in both interfaces
   - Interface-specific features where appropriate (charts in web, voice in Discord)
   - Users not locked into single interface

6. **Independent Deployment**
   - Discord bot and API run as separate processes
   - API can scale independently
   - Discord bot restarts don't affect API
   - Different deployment strategies per interface

7. **Security Isolation**
   - Discord bot uses Discord authentication (built-in)
   - Web app uses OAuth2 + JWT (industry standard)
   - Different attack surfaces
   - Compromise of one doesn't affect the other

### Negative

1. **Increased Complexity**
   - Must maintain two interfaces (Discord commands + API routes)
   - Two authentication systems (Discord OAuth + Google OAuth)
   - Two error handling strategies
   - **Mitigation:** Shared business logic reduces duplication

2. **Feature Synchronization**
   - New features must be implemented in both interfaces
   - Risk of feature drift (one interface has features the other doesn't)
   - **Mitigation:** Prioritize core features in both, interface-specific features optional

3. **Testing Overhead**
   - Must test Discord commands AND API endpoints
   - Integration tests need to cover both interfaces
   - **Mitigation:** Shared business logic means fewer integration tests

4. **Documentation Burden**
   - Must document Discord commands (slash command help text)
   - Must document REST API (OpenAPI spec)
   - **Mitigation:** Auto-generated API docs, inline Discord command help

5. **Deployment Complexity**
   - Must deploy Discord bot and API server
   - Two processes to monitor
   - **Mitigation:** Docker Compose orchestrates both services

6. **User Confusion**
   - Users may not know which interface to use
   - Different UX patterns between Discord and web
   - **Mitigation:** Clear documentation, onboarding guides

---

## Alternatives Considered

### Alternative 1: Discord Bot Only

**Architecture:** Single Discord bot, no web interface

**Pros:**

- Simpler architecture
- Single interface to maintain
- Native Discord integration

**Cons:**

- Limited to Discord platform
- No rich visualizations (charts, graphs)
- Difficult to build complex UI in Discord
- No offline access
- Cannot reach users outside Discord

**Why we didn't choose this:** Users want web/mobile access. Discord is too limiting for complex features like budget charts and calendar views.

---

### Alternative 2: REST API Only (No Discord Bot)

**Architecture:** Web/mobile app only, remove Discord bot

**Pros:**

- Single interface to maintain
- Rich UI capabilities
- Cross-platform (web, iOS, Android)

**Cons:**

- Lose existing Discord user base
- Must implement notifications from scratch
- No Discord integration (voice channels, server roles)
- Users must switch platforms

**Why we didn't choose this:** Existing users rely on Discord bot. Removing it would alienate user base.

---

### Alternative 3: Separate Codebases (Polyrepo)

**Architecture:**

- `bwaincell-bot` repository (Discord bot)
- `bwaincell-api` repository (REST API)
- `bwaincell-shared` repository (shared library, published as npm package)

**Pros:**

- Clear separation of concerns
- Independent versioning
- Can deploy independently

**Cons:**

- Must publish and version `shared` library
- Coordinating changes across 3 repositories is difficult
- Atomic commits impossible
- More complex CI/CD

**Why we didn't choose this:** Monorepo with workspaces provides code sharing without publishing overhead. See [ADR 0001: Monorepo Architecture](0001-monorepo-architecture.md).

---

### Alternative 4: GraphQL API Instead of REST

**Architecture:** GraphQL API instead of REST API

**Pros:**

- Flexible queries (client requests exactly what it needs)
- Single endpoint
- Type-safe schema

**Cons:**

- More complex setup (GraphQL server, schema, resolvers)
- Overhead for simple CRUD operations
- Discord bot doesn't benefit from GraphQL
- Learning curve for contributors

**Why we didn't choose this:** REST API is simpler and sufficient for Bwaincell's needs. GraphQL is overkill for CRUD operations.

---

## Implementation Notes

### Running Both Interfaces

**Development (separate terminals):**

```bash
# Terminal 1: Run Discord bot
npm run dev:backend

# Terminal 2: Run web app
npm run dev:frontend
```

**Production (Docker Compose):**

```yaml
services:
  backend:
    build: ./backend
    environment:
      - BOT_TOKEN=${BOT_TOKEN}
      - DATABASE_URL=${DATABASE_URL}
      - API_PORT=3000
    ports:
      - '3000:3000' # API port
    # Discord bot runs in same process

  frontend:
    build: ./frontend
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:3000
    ports:
      - '3010:3010'

  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### Shared Business Logic Example

**File:** `backend/shared/utils/taskValidator.ts`

```typescript
export function validateTaskTitle(title: string): void {
  if (!title || title.trim().length === 0) {
    throw new Error('Title cannot be empty');
  }

  if (title.length > 200) {
    throw new Error('Title must be less than 200 characters');
  }
}
```

**Usage in Discord command:**

```typescript
// backend/commands/tasks.ts
import { validateTaskTitle } from '@shared/utils/taskValidator';

export async function execute(interaction) {
  const title = interaction.options.getString('title');

  try {
    validateTaskTitle(title);
    await Task.create({ userId: interaction.user.id, title });
    await interaction.reply('Task created!');
  } catch (error) {
    await interaction.reply({ content: error.message, ephemeral: true });
  }
}
```

**Usage in REST API:**

```typescript
// backend/src/api/routes/tasks.ts
import { validateTaskTitle } from '@shared/utils/taskValidator';

router.post('/', async (req, res) => {
  const { title } = req.body;

  try {
    validateTaskTitle(title);
    const task = await Task.create({ userId: req.user.discordId, title });
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

### Feature Comparison

| Feature                | Discord Bot                   | Web/Mobile App            |
| ---------------------- | ----------------------------- | ------------------------- |
| **Task Management**    | ✅ `/tasks` command           | ✅ Task boards, lists     |
| **Reminders**          | ✅ `/reminders` + Discord DMs | ✅ Web notifications      |
| **Notes**              | ✅ `/notes` command           | ✅ Rich text editor       |
| **Budget Tracking**    | ✅ `/budget` command          | ✅ Charts, graphs         |
| **Calendar View**      | ❌ (limited Discord UI)       | ✅ Full calendar          |
| **Voice Integration**  | ✅ Voice channel schedules    | ❌                        |
| **Offline Access**     | ❌                            | ✅ PWA offline support    |
| **Push Notifications** | ✅ Discord DMs                | ✅ Web push notifications |

---

## References

- [Discord.js Documentation](https://discord.js.org/)
- [Express.js Documentation](https://expressjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Bot Code](c:\Users\lukaf\Desktop\Dev Work\Bwaincell\backend\src\bot.ts)
- [API Server Code](c:\Users\lukaf\Desktop\Dev Work\Bwaincell\backend\src\api\server.ts)
- [ADR 0001: Monorepo Architecture](0001-monorepo-architecture.md)
- [ADR 0003: OAuth2 + JWT Authentication](0003-oauth2-jwt-authentication.md)

---

## Revision History

| Date       | Version | Changes                                       |
| ---------- | ------- | --------------------------------------------- |
| 2026-01-11 | 1.0     | Initial decision: Dual interface architecture |

---

**Outcome:** Dual interface architecture successfully provides:

- Discord bot for quick interactions
- Web/mobile app for rich features
- Shared database and business logic
- User flexibility and feature parity

**Future Enhancements:**

- Real-time synchronization (WebSockets)
- Mobile native apps (React Native)
- Voice assistant integration (Alexa, Google Assistant)
- Browser extension for quick task capture

**Next Review:** 2027-01-11 (evaluate usage metrics, consider consolidating interfaces if one is underutilized)
