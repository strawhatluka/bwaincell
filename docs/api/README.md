# API Documentation

Bwaincell REST API documentation for programmatic access to tasks, lists, notes, reminders, and budget tracking.

## Base URL

**Development:** `http://localhost:3000`
**Production:** `https://bwaincell.fly.dev` (Raspberry Pi deployment)

## Authentication

All API endpoints (except `/health` and `/api/auth/*`) require JWT authentication.

### Authentication Flow

1. User authenticates with Google OAuth (PWA or external client)
2. Backend verifies Google ID token with `google-auth-library`
3. Backend maps Google email to Discord user ID (from environment variables)
4. Backend generates JWT access token (1 hour expiry) and refresh token (7 days expiry)
5. Client stores tokens and sends JWT in `Authorization: Bearer <token>` header
6. All protected routes require valid JWT token

### Authentication Endpoints

#### Verify Google ID Token

```http
POST /api/auth/google/verify
Content-Type: application/json

{
  "idToken": "google_id_token_from_client"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "user": {
      "email": "user@gmail.com",
      "discordId": "123456789",
      "name": "User Name"
    }
  }
}
```

#### Refresh JWT Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_access_token"
  }
}
```

#### Logout

```http
POST /api/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

## Request Headers

All authenticated requests must include:

```http
Authorization: Bearer <your_jwt_access_token>
Content-Type: application/json
```

## Response Format

All API responses follow this standard format:

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
  "error": "Error message describing what went wrong"
}
```

## Available Endpoints

### Tasks API

#### List All Tasks

```http
GET /api/tasks
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "text": "Complete project documentation",
      "completed": false,
      "dueDate": "2026-01-15T00:00:00.000Z",
      "userId": "123456789",
      "guildId": "987654321",
      "createdAt": "2026-01-11T12:00:00.000Z",
      "updatedAt": "2026-01-11T12:00:00.000Z"
    }
  ]
}
```

#### Create Task

```http
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "New task description",
  "dueDate": "2026-01-15"
}
```

#### Update Task

```http
PATCH /api/tasks/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Updated task description",
  "completed": true
}
```

#### Delete Task

```http
DELETE /api/tasks/:id
Authorization: Bearer <token>
```

### Lists API

#### Get All Lists

```http
GET /api/lists
Authorization: Bearer <token>
```

#### Create List

```http
POST /api/lists
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Shopping List"
}
```

#### Add Item to List

```http
POST /api/lists/:listId/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "item": "Milk"
}
```

#### Remove Item from List

```http
DELETE /api/lists/:listId/items/:itemId
Authorization: Bearer <token>
```

### Notes API

#### Get All Notes

```http
GET /api/notes
Authorization: Bearer <token>
```

#### Create Note

```http
POST /api/notes
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Note content here",
  "tags": "work,important"
}
```

#### Search Notes

```http
GET /api/notes/search?q=keyword
Authorization: Bearer <token>
```

### Reminders API

#### Get All Reminders

```http
GET /api/reminders
Authorization: Bearer <token>
```

#### Create Reminder

```http
POST /api/reminders
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Team meeting",
  "time": "15:00",
  "frequency": "daily"
}
```

#### Delete Reminder

```http
DELETE /api/reminders/:id
Authorization: Bearer <token>
```

### Budget API

#### Get Budget Summary

```http
GET /api/budget/summary?month=2026-01
Authorization: Bearer <token>
```

#### Add Budget Entry

```http
POST /api/budget
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 50.00,
  "category": "groceries",
  "type": "expense",
  "description": "Weekly shopping"
}
```

## Error Codes

- **400 Bad Request** - Invalid request parameters or missing required fields
- **401 Unauthorized** - Missing or invalid JWT token
- **403 Forbidden** - User doesn't have permission to access resource
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server error (check logs)

## Rate Limiting

Currently no rate limiting is implemented. Future versions may include rate limiting based on user IP or JWT token.

## CORS Configuration

CORS is configured to accept requests from:

- `http://localhost:3010` (development)
- `https://bwaincell.sunny-stack.com` (production frontend)

## Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2026-01-11T12:00:00.000Z",
  "environment": "production"
}
```

No authentication required.

## Code Examples

### JavaScript/TypeScript

```typescript
// Authenticate with Google ID token
const auth = await fetch('http://localhost:3000/api/auth/google/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken: googleIdToken }),
});

const { data } = await auth.json();
const accessToken = data.accessToken;

// Fetch tasks
const tasks = await fetch('http://localhost:3000/api/tasks', {
  headers: { Authorization: `Bearer ${accessToken}` },
});

const { data: taskList } = await tasks.json();
console.log(taskList);
```

### Python

```python
import requests

# Authenticate
auth_response = requests.post(
    'http://localhost:3000/api/auth/google/verify',
    json={'idToken': google_id_token}
)
access_token = auth_response.json()['data']['accessToken']

# Fetch tasks
tasks_response = requests.get(
    'http://localhost:3000/api/tasks',
    headers={'Authorization': f'Bearer {access_token}'}
)
tasks = tasks_response.json()['data']
print(tasks)
```

## Endpoint Groups

The Bwaincell system exposes HTTP endpoints from **two different layers**:

### Backend Express REST API (`backend/src/api/routes/`)

Implemented in Express, used by the Discord bot's companion API surface and by external programmatic clients:

- **Tasks** — `/api/tasks`
- **Lists** — `/api/lists` (+ `/items`, `/clear-completed`, item-toggle)
- **Notes** — `/api/notes` (+ `/search`)
- **Reminders** — `/api/reminders`
- **Budget** — `/api/budget` (+ `/summary`, `/transactions`)
- **Schedule** — `/api/schedule`
- **Auth / OAuth** — `/api/auth/*`
- **Health** — `/health`

### Frontend Next.js API Routes (`frontend/app/api/`)

Used by the PWA to broker requests from the browser to Supabase with NextAuth session context:

- `frontend/app/api/auth/[...nextauth]` — NextAuth handlers
- `frontend/app/api/tasks` (+ `[id]`)
- `frontend/app/api/lists` (+ `items`, `clear-completed`, toggle, `[id]`)
- `frontend/app/api/notes` (+ `[id]`)
- `frontend/app/api/reminders` (+ `[id]`)
- `frontend/app/api/schedule` (+ `[id]`)
- `frontend/app/api/budget` (+ `transactions`, `[id]`)

Recipes, MealPlans, Sunset-config, and Events-config are currently exposed **only through the Discord bot commands and Supabase model wrappers** (`supabase/models/`); there are no dedicated REST routes under `backend/src/api/routes/` for those features at the time of writing. Mutations happen through Discord interactions (`/recipe`, `/sunset`, `/events`) and direct Supabase model calls.

### Recipes (Supabase model wrapper: `supabase/models/Recipe.ts`)

- Create / list / favorite / delete recipes per guild
- Ingredients stored as JSONB array: `[{ name, quantity, unit, category }]`
- Source types: `website`, `video`, `file`, `manual`
- See the `recipes` table in [../architecture/database-schema.md](../architecture/database-schema.md)

### MealPlans (`supabase/models/MealPlan.ts`)

- One active meal plan per guild (`archived = FALSE`, enforced by partial unique index)
- `recipe_ids INTEGER[]` and `servings_per_recipe INTEGER[]` (parallel 7-element arrays, one per weekday)

### Sunset Config (`supabase/models/SunsetConfig.ts`)

- Per-guild row in `sunset_configs`
- Fields: `advance_minutes`, `channel_id`, `zip_code`, `timezone`, `is_enabled`, `last_announcement`
- Scheduled via `backend/utils/sunsetService.ts` using `node-cron`

### Events Config (`supabase/models/EventConfig.ts`)

- Per-guild row in `event_configs`
- Fields: `location`, `announcement_channel_id`, `schedule_day`, `schedule_hour`, `schedule_minute`, `timezone`, `is_enabled`
- Scheduled via `backend/utils/eventsService.ts`

## Implementation Details

- **Framework:** Express 4.21.2
- **Authentication:** Google OAuth 2.0 + JWT (jsonwebtoken)
- **Database:** Supabase (managed PostgreSQL) with typed model wrappers in `supabase/models/` (replaces the earlier Sequelize setup)
- **Middleware Stack:** CORS → JSON Parser → OAuth Verification → JWT Verification → Logging → Error Handler
- **User Isolation:** All data segregated by Discord `guild_id` (shared-household model) with `user_id` retained for audit trail

## Related Documentation

- [Architecture Overview](../architecture/overview.md)
- [Getting Started Guide](../guides/getting-started.md)
- [Discord Bot Commands](discord-commands.md)
- [Database Schema](../architecture/database-schema.md)
