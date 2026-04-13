# Database Schema

**Version:** 2.0.0
**Last Updated** 2026-01-12
**Database:** PostgreSQL 15
**ORM:** Sequelize 6.37.5

Complete database schema documentation for Bwaincell productivity platform.

---

## Overview

Bwaincell uses PostgreSQL with Sequelize ORM for data persistence across Discord Bot, REST API, and PWA interfaces. The schema is designed for multi-tenant usage with user isolation by `guild_id` (shared household model) or `user_id` + `guild_id` (per-user isolation).

**Key Design Decisions:**

- **No Foreign Keys:** Simplified schema for easier migration and flexibility
- **Guild-Based Isolation:** Default filtering by `guild_id` for shared household access (WO-015)
- **Auto-Sync Schema:** Database tables created automatically on backend startup
- **Timestamp Tracking:** Created/updated timestamps for audit trails
- **JSONB for Complex Data:** Lists use JSONB for flexible item storage

---

## Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ TASKS : creates
    USERS ||--o{ LISTS : creates
    USERS ||--o{ NOTES : creates
    USERS ||--o{ REMINDERS : creates
    USERS ||--o{ SCHEDULES : creates

    USERS {
        int id PK
        string google_id UK
        string email UK
        string name
        string picture
        string discord_id UK
        string guild_id
        string refresh_token
        timestamp created_at
        timestamp updated_at
    }

    TASKS {
        int id PK
        string description
        date due_date
        boolean completed
        timestamp created_at
        timestamp completed_at
        string user_id FK
        string guild_id
    }

    LISTS {
        int id PK
        string name
        jsonb items
        string user_id FK
        string guild_id
        timestamp created_at
    }

    NOTES {
        int id PK
        string title
        text content
        text[] tags
        timestamp created_at
        timestamp updated_at
        string user_id FK
        string guild_id
    }

    REMINDERS {
        int id PK
        string message
        string time
        string frequency
        int day_of_week
        string channel_id
        string user_id FK
        string guild_id
        boolean active
        timestamp next_trigger
    }

    SCHEDULES {
        int id PK
        string event
        date date
        time time
        string description
        string user_id FK
        string guild_id
        timestamp created_at
    }
```

---

## Tables

### 1. Users

Stores authenticated users with Google OAuth credentials and Discord user mapping.

**Table Name:** `users`

| Column          | Type          | Constraints                     | Description                 |
| --------------- | ------------- | ------------------------------- | --------------------------- |
| `id`            | `INTEGER`     | `PRIMARY KEY`, `AUTO_INCREMENT` | Unique user identifier      |
| `google_id`     | `STRING(255)` | `UNIQUE`, `NOT NULL`            | Google account ID           |
| `email`         | `STRING(255)` | `UNIQUE`, `NOT NULL`            | Google email address        |
| `name`          | `STRING(255)` | `NOT NULL`                      | User's display name         |
| `picture`       | `STRING(512)` | `NULL`                          | Google profile picture URL  |
| `discord_id`    | `STRING(255)` | `UNIQUE`, `NOT NULL`            | Discord user ID (snowflake) |
| `guild_id`      | `STRING(255)` | `NOT NULL`                      | Discord guild/server ID     |
| `refresh_token` | `TEXT`        | `NULL`                          | JWT refresh token           |
| `created_at`    | `TIMESTAMP`   | `NOT NULL`, `DEFAULT NOW()`     | Account creation timestamp  |
| `updated_at`    | `TIMESTAMP`   | `NOT NULL`, `DEFAULT NOW()`     | Last update timestamp       |

**Indexes:**

```sql
CREATE UNIQUE INDEX idx_users_google_id ON users(google_id);
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_discord_id ON users(discord_id);
CREATE INDEX idx_users_guild_id ON users(guild_id);
```

**Model Definition:**

```typescript
// backend/database/models/User.ts
export interface UserAttributes {
  id: number;
  googleId: string;
  email: string;
  name: string;
  picture: string | null;
  discordId: string;
  guildId: string;
  refreshToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

**Usage:**

- Authentication: Maps Google OAuth email to Discord user ID
- JWT token storage: Stores refresh tokens for session management
- Multi-tenant isolation: Links users to Discord guilds

**Query Patterns:**

```typescript
// Find user by email
const user = await User.findOne({ where: { email: 'user@gmail.com' } });

// Find user by Discord ID
const user = await User.findOne({ where: { discordId: '123456789' } });

// Update refresh token
await User.update({ refreshToken: newToken }, { where: { email: 'user@gmail.com' } });
```

---

### 2. Tasks

Stores user tasks with optional due dates and completion tracking.

**Table Name:** `tasks`

| Column         | Type          | Constraints                     | Description                    |
| -------------- | ------------- | ------------------------------- | ------------------------------ |
| `id`           | `INTEGER`     | `PRIMARY KEY`, `AUTO_INCREMENT` | Unique task identifier         |
| `description`  | `TEXT`        | `NOT NULL`                      | Task description/title         |
| `due_date`     | `DATEONLY`    | `NULL`                          | Optional due date (YYYY-MM-DD) |
| `completed`    | `BOOLEAN`     | `NOT NULL`, `DEFAULT FALSE`     | Task completion status         |
| `created_at`   | `TIMESTAMP`   | `NOT NULL`, `DEFAULT NOW()`     | Task creation timestamp        |
| `completed_at` | `TIMESTAMP`   | `NULL`                          | Task completion timestamp      |
| `user_id`      | `STRING(255)` | `NOT NULL`                      | Discord user ID (creator)      |
| `guild_id`     | `STRING(255)` | `NOT NULL`                      | Discord guild ID               |

**Indexes:**

```sql
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_guild_id ON tasks(guild_id);
CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
```

**Model Definition:**

```typescript
// backend/database/models/Task.ts
interface TaskAttributes {
  id: number;
  description: string;
  due_date?: Date | null;
  completed: boolean;
  created_at: Date;
  completed_at?: Date | null;
  user_id: string;
  guild_id: string;
}
```

**Data Isolation:**

```typescript
// NOTE: Filters by guild_id only for shared household access (WO-015)
static async getUserTasks(
  guildId: string,
  filter: 'all' | 'pending' | 'completed' = 'all'
): Promise<Task[]> {
  const where: Record<string, unknown> = { guild_id: guildId };

  if (filter === 'pending') where.completed = false;
  else if (filter === 'completed') where.completed = true;

  return await Task.findAll({
    where,
    order: [['created_at', 'DESC']]
  });
}
```

**Query Patterns:**

```typescript
// Get all tasks for guild
const tasks = await Task.getUserTasks(guildId, 'all');

// Get pending tasks
const pending = await Task.getUserTasks(guildId, 'pending');

// Create task
const task = await Task.createTask(guildId, 'Buy groceries', new Date('2026-01-15'));

// Complete task
const updated = await Task.completeTask(taskId, guildId);

// Edit task
const edited = await Task.editTask(taskId, guildId, 'Updated description', null);

// Delete task
const deleted = await Task.deleteTask(taskId, guildId);
```

---

### 3. Lists

Stores named lists with items (shopping lists, checklists, etc.).

**Table Name:** `lists`

| Column       | Type          | Constraints                     | Description                 |
| ------------ | ------------- | ------------------------------- | --------------------------- |
| `id`         | `INTEGER`     | `PRIMARY KEY`, `AUTO_INCREMENT` | Unique list identifier      |
| `name`       | `STRING(255)` | `NOT NULL`                      | List name/title             |
| `items`      | `JSONB`       | `NOT NULL`, `DEFAULT '[]'`      | Array of list items (JSONB) |
| `user_id`    | `STRING(255)` | `NOT NULL`                      | Discord user ID (creator)   |
| `guild_id`   | `STRING(255)` | `NOT NULL`                      | Discord guild ID            |
| `created_at` | `TIMESTAMP`   | `NOT NULL`, `DEFAULT NOW()`     | List creation timestamp     |

**Indexes:**

```sql
CREATE INDEX idx_lists_guild_id ON lists(guild_id);
CREATE INDEX idx_lists_name ON lists(name);
```

**JSONB Structure (items column):**

```json
[
  {
    "text": "Milk",
    "completed": false,
    "added_at": "2026-01-11T12:00:00.000Z"
  },
  {
    "text": "Bread",
    "completed": true,
    "added_at": "2026-01-11T12:05:00.000Z"
  }
]
```

**Model Definition:**

```typescript
// backend/database/models/List.ts
export interface ListItem {
  text: string;
  completed: boolean;
  added_at: Date;
}

interface ListAttributes {
  id: number;
  name: string;
  items: ListItem[];
  user_id: string;
  guild_id: string;
  created_at: Date;
}
```

**Query Patterns:**

```typescript
// Create list
const list = await List.createList(guildId, 'Shopping List');

// Add item to list
const updated = await List.addItem(guildId, 'Shopping List', 'Milk');

// Remove item
const removed = await List.removeItem(guildId, 'Shopping List', 'Milk');

// Toggle item completion
const toggled = await List.toggleItem(guildId, 'Shopping List', 'Milk');

// Get specific list
const list = await List.getList(guildId, 'Shopping List');

// Get all lists for guild
const lists = await List.getUserLists(guildId);

// Clear completed items
const cleared = await List.clearCompleted(guildId, 'Shopping List');

// Delete list
const deleted = await List.deleteList(guildId, 'Shopping List');
```

**Note:** List names are case-insensitive (e.g., "shopping list" matches "Shopping List").

---

### 4. Notes

Stores text notes with tagging support and full-text search.

**Table Name:** `notes`

| Column       | Type          | Constraints                     | Description               |
| ------------ | ------------- | ------------------------------- | ------------------------- |
| `id`         | `INTEGER`     | `PRIMARY KEY`, `AUTO_INCREMENT` | Unique note identifier    |
| `title`      | `STRING(500)` | `NOT NULL`                      | Note title                |
| `content`    | `TEXT`        | `NOT NULL`                      | Note content/body         |
| `tags`       | `TEXT[]`      | `DEFAULT ARRAY[]::TEXT[]`       | Array of tags             |
| `created_at` | `TIMESTAMP`   | `NOT NULL`, `DEFAULT NOW()`     | Note creation timestamp   |
| `updated_at` | `TIMESTAMP`   | `NOT NULL`, `DEFAULT NOW()`     | Last update timestamp     |
| `user_id`    | `STRING(255)` | `NOT NULL`                      | Discord user ID (creator) |
| `guild_id`   | `STRING(255)` | `NOT NULL`                      | Discord guild ID          |

**Indexes:**

```sql
CREATE INDEX idx_notes_guild_id ON notes(guild_id);
CREATE INDEX idx_notes_tags ON notes USING GIN(tags);
CREATE INDEX idx_notes_created_at ON notes(created_at);
```

**Model Definition:**

```typescript
// backend/database/models/Note.ts
interface NoteAttributes {
  id: number;
  title: string;
  content: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  user_id: string;
  guild_id: string;
}

interface NoteUpdateAttributes {
  title?: string;
  content?: string;
  tags?: string[];
}
```

**Query Patterns:**

```typescript
// Create note
const note = await Note.createNote(guildId, 'Meeting Notes', 'Discussed Q1 roadmap...', [
  'work',
  'meetings',
]);

// Get all notes
const notes = await Note.getNotes(guildId);

// Get specific note
const note = await Note.getNote(noteId, guildId);

// Update note
const updated = await Note.updateNote(noteId, guildId, {
  title: 'Updated Title',
  content: 'Updated content',
  tags: ['work', 'important'],
});

// Search notes (title or content)
const results = await Note.searchNotes(guildId, 'roadmap');

// Get notes by tag
const workNotes = await Note.getNotesByTag(guildId, 'work');

// Get all tags for guild
const allTags = await Note.getAllTags(guildId);

// Delete note
const deleted = await Note.deleteNote(noteId, guildId);
```

**Search Implementation:**

```typescript
// backend/database/models/Note.ts
static async searchNotes(guildId: string, keyword: string): Promise<Note[]> {
  return await Note.findAll({
    where: {
      guild_id: guildId,
      [Op.or]: [
        { title: { [Op.like]: `%${keyword}%` } },
        { content: { [Op.like]: `%${keyword}%` } }
      ]
    },
    order: [['created_at', 'DESC']]
  });
}
```

---

### 5. Reminders

Stores scheduled reminders with frequency support (once, daily, weekly).

**Table Name:** `reminders`

| Column         | Type          | Constraints                     | Description                                     |
| -------------- | ------------- | ------------------------------- | ----------------------------------------------- |
| `id`           | `INTEGER`     | `PRIMARY KEY`, `AUTO_INCREMENT` | Unique reminder identifier                      |
| `message`      | `TEXT`        | `NOT NULL`                      | Reminder message text                           |
| `time`         | `STRING(10)`  | `NOT NULL`                      | Time in 24h format (e.g., "17:00")              |
| `frequency`    | `ENUM`        | `NOT NULL`, `DEFAULT 'once'`    | 'once', 'daily', 'weekly'                       |
| `day_of_week`  | `INTEGER`     | `NULL`                          | Day of week (0=Sun, 6=Sat) for weekly reminders |
| `channel_id`   | `STRING(255)` | `NOT NULL`                      | Discord channel ID for reminder                 |
| `user_id`      | `STRING(255)` | `NOT NULL`                      | Discord user ID (creator)                       |
| `guild_id`     | `STRING(255)` | `NOT NULL`                      | Discord guild ID                                |
| `active`       | `BOOLEAN`     | `NOT NULL`, `DEFAULT TRUE`      | Active status                                   |
| `next_trigger` | `TIMESTAMP`   | `NULL`                          | Next scheduled trigger time                     |

**Indexes:**

```sql
CREATE INDEX idx_reminders_guild_id ON reminders(guild_id);
CREATE INDEX idx_reminders_active ON reminders(active);
CREATE INDEX idx_reminders_next_trigger ON reminders(next_trigger) WHERE active = TRUE;
CREATE INDEX idx_reminders_guild_active ON reminders(guild_id, active);
```

**Model Definition:**

```typescript
// backend/database/models/Reminder.ts
type ReminderFrequency = 'once' | 'daily' | 'weekly';

interface ReminderAttributes {
  id: number;
  message: string;
  time: string;
  frequency: ReminderFrequency;
  day_of_week?: number | null;
  channel_id: string;
  user_id: string;
  guild_id: string;
  active: boolean;
  next_trigger?: Date | null;
}
```

**Timezone Handling:**

```typescript
// backend/database/models/Reminder.ts
import { DateTime } from 'luxon';
import config from '../../config/config';

/**
 * Calculate the next trigger time for a reminder in the configured timezone.
 * Uses Luxon DateTime to handle timezone-aware date calculations.
 */
static calculateNextTrigger(
  time: string,
  frequency: ReminderFrequency,
  dayOfWeek: number | null
): Date {
  const timezone = config.settings.timezone; // e.g., 'America/Los_Angeles'
  const now = DateTime.now().setZone(timezone);
  const [hours, minutes] = time.split(':').map(Number);

  let nextTrigger = DateTime.now().setZone(timezone).set({
    hour: hours,
    minute: minutes,
    second: 0,
    millisecond: 0
  });

  if (frequency === 'once') {
    if (nextTrigger <= now) {
      nextTrigger = nextTrigger.plus({ days: 1 });
    }
  } else if (frequency === 'daily') {
    if (nextTrigger <= now) {
      nextTrigger = nextTrigger.plus({ days: 1 });
    }
  } else if (frequency === 'weekly' && dayOfWeek !== null) {
    // Calculate days until target day of week
    const luxonWeekday = dayOfWeek === 0 ? 7 : dayOfWeek;
    const currentWeekday = now.weekday;
    let daysUntilNext = (luxonWeekday - currentWeekday + 7) % 7;

    if (daysUntilNext === 0 && nextTrigger <= now) {
      daysUntilNext = 7;
    }

    nextTrigger = nextTrigger.plus({ days: daysUntilNext });
  }

  return nextTrigger.toJSDate();
}
```

**Query Patterns:**

```typescript
// Create reminder
const reminder = await Reminder.createReminder(
  guildId,
  channelId,
  'Team meeting',
  '15:00',
  'daily'
);

// Create weekly reminder
const weeklyReminder = await Reminder.createReminder(
  guildId,
  channelId,
  'Weekly report',
  '10:00',
  'weekly',
  1 // Monday
);

// Get active reminders
const active = await Reminder.getActiveReminders();

// Get user's reminders
const userReminders = await Reminder.getUserReminders(guildId);

// Get triggered reminders (for scheduler)
const triggered = await Reminder.getTriggeredReminders();

// Update next trigger after firing
const updated = await Reminder.updateNextTrigger(reminderId);

// Delete reminder
const deleted = await Reminder.deleteReminder(reminderId, guildId);
```

**Scheduler Integration:**

```typescript
// backend/utils/scheduler.ts
async function checkReminders() {
  const triggered = await Reminder.getTriggeredReminders();

  for (const reminder of triggered) {
    // Send Discord message
    const channel = await client.channels.fetch(reminder.channel_id);
    await channel.send(reminder.message);

    // Update next trigger or deactivate
    await Reminder.updateNextTrigger(reminder.id);
  }
}

// Run every minute
setInterval(checkReminders, 60000);
```

---

### 6. Schedules

Stores scheduled events with date, time, and optional descriptions.

**Table Name:** `schedules`

| Column        | Type          | Constraints                     | Description                 |
| ------------- | ------------- | ------------------------------- | --------------------------- |
| `id`          | `INTEGER`     | `PRIMARY KEY`, `AUTO_INCREMENT` | Unique schedule identifier  |
| `event`       | `STRING(255)` | `NOT NULL`                      | Event name/title            |
| `date`        | `DATEONLY`    | `NOT NULL`                      | Event date (YYYY-MM-DD)     |
| `time`        | `TIME`        | `NOT NULL`                      | Event time (HH:MM:SS)       |
| `description` | `TEXT`        | `NULL`                          | Optional event description  |
| `user_id`     | `STRING(255)` | `NOT NULL`                      | Discord user ID (creator)   |
| `guild_id`    | `STRING(255)` | `NOT NULL`                      | Discord guild ID            |
| `created_at`  | `TIMESTAMP`   | `NOT NULL`, `DEFAULT NOW()`     | Schedule creation timestamp |

**Indexes:**

```sql
CREATE INDEX idx_schedules_guild_id ON schedules(guild_id);
CREATE INDEX idx_schedules_date ON schedules(date);
CREATE INDEX idx_schedules_guild_date ON schedules(guild_id, date);
```

**Model Definition:**

```typescript
// backend/database/models/Schedule.ts
type ScheduleFilter = 'upcoming' | 'past' | 'all';

interface ScheduleAttributes {
  id: number;
  event: string;
  date: string; // DATEONLY type (YYYY-MM-DD)
  time: string; // TIME type (HH:MM:SS)
  description?: string | null;
  user_id: string;
  guild_id: string;
  created_at: Date;
}

interface CountdownResult {
  event: Schedule;
  timeLeft: string;
}
```

**Query Patterns:**

```typescript
// Add event
const event = await Schedule.addEvent(
  guildId,
  'Birthday Party',
  '2026-01-20',
  '18:00:00',
  "John's birthday celebration"
);

// Get upcoming events
const upcoming = await Schedule.getEvents(guildId, 'upcoming');

// Get past events
const past = await Schedule.getEvents(guildId, 'past');

// Get all events
const all = await Schedule.getEvents(guildId, 'all');

// Get today's events
const today = await Schedule.getTodaysEvents(guildId);

// Get events in next N days
const nextWeek = await Schedule.getUpcomingEvents(guildId, 7);

// Get countdown to event
const countdown = await Schedule.getCountdown(guildId, 'Birthday');
// Returns: { event, timeLeft: "9 days, 6 hours, 30 minutes" }

// Delete event
const deleted = await Schedule.deleteEvent(eventId, guildId);
```

**Countdown Implementation:**

```typescript
// backend/database/models/Schedule.ts
static async getCountdown(
  guildId: string,
  eventName: string
): Promise<CountdownResult | null> {
  const event = await Schedule.findOne({
    where: {
      guild_id: guildId,
      event: { [Op.like]: `%${eventName}%` }
    },
    order: [['date', 'ASC'], ['time', 'ASC']]
  });

  if (!event) return null;

  const eventDateTime = new Date(`${event.date} ${event.time}`);
  const now = new Date();
  const diff = eventDateTime.getTime() - now.getTime();

  if (diff <= 0) return { event, timeLeft: 'Event has passed' };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);

  return {
    event,
    timeLeft: parts.length > 0 ? parts.join(', ') : 'Less than a minute'
  };
}
```

---

## Sequelize Configuration

### Database Connection

**Configuration File:** `backend/database/config.js`

```javascript
require('dotenv').config();

module.exports = {
  development: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  test: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
  },
};
```

**Environment Variable:**

```bash
# Development
DATABASE_URL=postgresql://bwaincell:password@localhost:5433/bwaincell

# Production
DATABASE_URL=postgresql://user:pass@db.example.com:5432/bwaincell?sslmode=require
```

---

### Model Initialization

**Database Index:** `backend/database/index.ts`

```typescript
import { Sequelize } from 'sequelize';
import config from './config';
import User from './models/User';
import Task from './models/Task';
import List from './models/List';
import Note from './models/Note';
import Reminder from './models/Reminder';
import Schedule from './models/Schedule';

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Initialize Sequelize
const sequelize = dbConfig.use_env_variable
  ? new Sequelize(process.env[dbConfig.use_env_variable], dbConfig)
  : new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);

// Initialize models
User.init(sequelize);
Task.init(sequelize);
List.init(sequelize);
Note.init(sequelize);
Reminder.init(sequelize);
Schedule.init(sequelize);

// Export sequelize instance and models
export { sequelize };
export { User, Task, List, Note, Reminder, Schedule };
```

---

### Associations

**Note:** Bwaincell currently does NOT use Sequelize associations or foreign key constraints. All relationships are managed at the application level.

**Potential Future Associations:**

```typescript
// If implementing associations
User.hasMany(Task, { foreignKey: 'user_id', sourceKey: 'discordId' });
Task.belongsTo(User, { foreignKey: 'user_id', targetKey: 'discordId' });

User.hasMany(List, { foreignKey: 'user_id', sourceKey: 'discordId' });
List.belongsTo(User, { foreignKey: 'user_id', targetKey: 'discordId' });

// Similar for other models
```

**Why No Associations?**

- Simplified schema for easier migration
- Flexibility for multi-tenant architecture
- No cascading delete complexities
- Manual relationship management in application code

---

## Migration History

### Migration Strategy

**Current Approach:** Sequelize auto-sync (`sequelize.sync()`)

```typescript
// backend/src/bot.ts
async function loadModels() {
  await sequelize.authenticate();
  await sequelize.sync(); // Creates/updates tables automatically
  logger.info('Database synced successfully', {
    models: Object.keys(sequelize.models),
  });
}
```

**Pros:**

- No manual migration files
- Tables created automatically on startup
- Fast prototyping

**Cons:**

- No version control for schema changes
- Cannot rollback changes
- Not recommended for production

---

### Migration to Production Approach

**Recommended:** Use Sequelize migrations for production

```bash
# Generate migration
npx sequelize-cli migration:generate --name create-tasks-table

# Run migrations
npx sequelize-cli db:migrate

# Rollback migration
npx sequelize-cli db:migrate:undo
```

**Example Migration:**

```javascript
// migrations/20260111-create-tasks-table.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tasks', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      completed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      user_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      guild_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
    });

    // Add indexes
    await queryInterface.addIndex('tasks', ['guild_id']);
    await queryInterface.addIndex('tasks', ['user_id']);
    await queryInterface.addIndex('tasks', ['completed']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tasks');
  },
};
```

---

## Indexes and Performance

### Index Strategy

**Current Indexes:** See individual table documentation above

**Performance Considerations:**

1. **Guild-based queries:** All tables have `guild_id` index
2. **User-based queries:** Tables have `user_id` index
3. **Status filters:** Indexes on `completed`, `active` columns
4. **Date filters:** Indexes on `date`, `due_date`, `next_trigger` columns
5. **Array/JSONB:** GIN indexes on `tags` column

---

### Query Optimization

**Example: Optimized Task Query**

```sql
EXPLAIN ANALYZE
SELECT * FROM tasks
WHERE guild_id = '987654321'
  AND completed = false
ORDER BY created_at DESC
LIMIT 50;

-- Result: Uses idx_tasks_guild_id + idx_tasks_completed
-- Execution time: ~2ms for 1000 rows
```

**Example: Slow Query (Missing Index)**

```sql
-- Before adding index
EXPLAIN ANALYZE
SELECT * FROM notes
WHERE content LIKE '%meeting%';

-- Result: Seq Scan on notes (Slow!)
-- Execution time: ~500ms for 10000 rows

-- Solution: Add full-text search index or use external search
```

---

## Data Isolation

### Guild-Based Isolation (Default)

**Implementation:** All queries filter by `guild_id`

```typescript
// Example: Task model
static async getUserTasks(guildId: string): Promise<Task[]> {
  return await Task.findAll({
    where: { guild_id: guildId },
    order: [['created_at', 'DESC']]
  });
}
```

**Use Case:** Shared household where all members see all data

---

### User-Based Isolation (Optional)

**Implementation:** Queries filter by `user_id` AND `guild_id`

```typescript
// Example: Per-user task isolation
static async getUserTasks(userId: string, guildId: string): Promise<Task[]> {
  return await Task.findAll({
    where: {
      user_id: userId,
      guild_id: guildId
    },
    order: [['created_at', 'DESC']]
  });
}
```

**Use Case:** Multi-user environment where users have private data

---

## Backup and Restore

### Backup Strategy

**PostgreSQL Dump:**

```bash
# Full backup (custom format, compressed)
pg_dump -U bwaincell -d bwaincell -F c -f "backup-$(date +%Y%m%d-%H%M%S).dump"

# Plain SQL backup (human-readable)
pg_dump -U bwaincell -d bwaincell -f "backup-$(date +%Y%m%d-%H%M%S).sql"

# Scheduled backups (cron)
0 2 * * * pg_dump -U bwaincell -d bwaincell -F c -f "/backups/bwaincell-$(date +\%Y\%m\%d).dump"
```

---

### Restore Strategy

**From Custom Format:**

```bash
# Create fresh database
psql -U postgres -c "DROP DATABASE IF EXISTS bwaincell;"
psql -U postgres -c "CREATE DATABASE bwaincell OWNER bwaincell;"

# Restore from dump
pg_restore -U bwaincell -d bwaincell -c backup.dump
```

**From SQL File:**

```bash
psql -U bwaincell -d bwaincell -f backup.sql
```

---

## Related Documentation

- [Architecture Overview](overview.md) - Complete system architecture
- [Getting Started Guide](../guides/getting-started.md) - Database setup instructions
- [API Documentation](../api/) - API endpoints using database models
- [Troubleshooting Guide](../guides/troubleshooting.md) - Database troubleshooting

---

**Last Updated** 2026-01-12
**Version:** 2.0.0
