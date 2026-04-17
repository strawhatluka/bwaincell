# Architecture Diagrams

**Version:** 2.2.0
**Last Updated:** 2026-04-16

Visual documentation of Bwaincell system architecture, component interactions, database relationships, authentication flow, deployment architecture, and data flow using Mermaid diagrams.

---

## Table of Contents

1. [System Architecture Diagram](#1-system-architecture-diagram)
2. [Component Interaction Diagram](#2-component-interaction-diagram)
3. [Database ER Diagram](#3-database-er-diagram)
4. [Authentication Flow Diagram](#4-authentication-flow-diagram)
5. [Deployment Architecture Diagram](#5-deployment-architecture-diagram)
6. [Data Flow Diagram](#6-data-flow-diagram)
7. [How to Create Diagrams](#how-to-create-diagrams)

---

## 1. System Architecture Diagram

High-level overview of Bwaincell's three-interface architecture showing Discord Bot, REST API, Progressive Web App, and Supabase database.

```mermaid
graph TB
    subgraph "Client Layer"
        Discord[Discord Client]
        Browser[Web Browser]
        Mobile[Mobile Device]
    end

    subgraph "Application Layer"
        DiscordBot["Discord Bot<br/>(Discord.js 14)"]
        RestAPI["REST API<br/>(Express 4.21)"]
        PWA["Progressive Web App<br/>(Next.js 14.2)"]
    end

    subgraph "Data Layer"
        Supabase["Supabase (managed PostgreSQL)<br/>@supabase/supabase-js"]
    end

    subgraph "External Services"
        DiscordAPI[Discord API]
        GoogleOAuth[Google OAuth 2.0]
    end

    Discord -->|Slash Commands| DiscordBot
    Browser -->|HTTPS| PWA
    Mobile -->|HTTPS| PWA

    DiscordBot -->|Events/Messages| DiscordAPI
    DiscordAPI -->|Interactions| DiscordBot

    PWA -->|HTTP Requests<br/>JWT Auth| RestAPI
    DiscordBot -->|supabase-js| Supabase
    RestAPI -->|supabase-js| Supabase
    PWA -->|supabase-js via Next.js API routes| Supabase

    RestAPI -->|Verify ID Token| GoogleOAuth
    PWA -->|OAuth Flow| GoogleOAuth
    GoogleOAuth -->|ID Token| PWA

    style DiscordBot fill:#5865F2
    style RestAPI fill:#68A063
    style PWA fill:#000000
    style Supabase fill:#336791
    style DiscordAPI fill:#5865F2
    style GoogleOAuth fill:#4285F4
```

**Key Components:**

- **Discord Bot:** Primary interface via Discord slash commands
- **REST API:** Express-based HTTP API with JWT authentication
- **PWA:** Next.js frontend with offline support
- **Supabase:** Production-grade relational database
- **Discord API:** External service for Discord integration
- **Google OAuth:** External authentication provider

**Related:** [Architecture Overview](overview.md) | [Getting Started](../guides/getting-started.md)

---

## 2. Component Interaction Diagram

Detailed flow showing how Discord commands are processed through the system from user interaction to database response.

```mermaid
sequenceDiagram
    actor User
    participant Discord as Discord Client
    participant Bot as Discord Bot
    participant Commands as Command Handler
    participant Models as Database Models
    participant DB as Supabase
    participant Utils as Utils/Helpers

    User->>Discord: Types /task add description:"Buy groceries"
    Discord->>Bot: Send Interaction Event
    Bot->>Bot: Defer Reply (<3s)
    Bot->>Commands: Route to task.ts execute()

    Commands->>Utils: Validate Input (Joi)
    Utils-->>Commands: Validation Result

    alt Valid Input
        Commands->>Models: Task.createTask(guildId, description)
        Models->>DB: INSERT INTO tasks (...)
        DB-->>Models: Task Record
        Models-->>Commands: Task Object

        Commands->>Utils: Build Success Embed
        Utils-->>Commands: Embed Object

        Commands->>Bot: Edit Reply with Embed
        Bot->>Discord: Send Embed Response
        Discord->>User: Display Task Created
    else Invalid Input
        Commands->>Utils: Build Error Embed
        Utils-->>Commands: Embed Object
        Commands->>Bot: Edit Reply with Error
        Bot->>Discord: Send Error Response
        Discord->>User: Display Error Message
    end
```

**Flow Steps:**

1. User types slash command in Discord
2. Discord sends interaction event to bot
3. Bot immediately defers reply (within 3 seconds)
4. Bot routes interaction to appropriate command handler
5. Command validates input with Joi schemas
6. Command calls database model methods
7. Model executes SQL query via the Supabase client (supabase-js) ORM
8. Model returns data to command handler
9. Command builds Discord embed response
10. Bot sends final response to Discord
11. Discord displays response to user

**Related:** [Discord Commands](../api/discord-commands.md) | [Database Schema](database-schema.md)

---

## 3. Database ER Diagram

Entity-Relationship diagram showing all 12 tables with their fields, data types, and relationships. For the authoritative schema with every column, see [database-schema.md](database-schema.md).

```mermaid
erDiagram
    USERS ||--o{ TASKS : creates
    USERS ||--o{ LISTS : creates
    USERS ||--o{ NOTES : creates
    USERS ||--o{ REMINDERS : creates
    USERS ||--o{ SCHEDULES : creates
    USERS ||--o{ BUDGETS : creates
    USERS ||--o{ RECIPES : creates
    USERS ||--o{ MEAL_PLANS : edits
    USERS ||--o{ EVENT_CONFIGS : configures
    USERS ||--o{ SUNSET_CONFIGS : configures
    USERS ||--o{ RECIPE_PREFERENCES : configures
    MEAL_PLANS }o--|{ RECIPES : references

    USERS {
        int id PK
        string google_id UK "Google account ID"
        string email UK "User email"
        string name "Display name"
        string picture "Profile picture URL"
        string discord_id UK "Discord user ID"
        string guild_id "Discord server ID"
        text refresh_token "JWT refresh token"
        timestamp created_at
        timestamp updated_at
    }

    TASKS {
        int id PK
        text description "Task description"
        date due_date "Optional due date"
        boolean completed "Completion status"
        timestamp created_at
        timestamp completed_at "Completion timestamp"
        string user_id FK "Creator Discord ID"
        string guild_id "Discord server ID"
    }

    LISTS {
        int id PK
        string name "List name"
        jsonb items "Array of list items"
        string user_id FK "Creator Discord ID"
        string guild_id "Discord server ID"
        timestamp created_at
    }

    NOTES {
        int id PK
        string title "Note title"
        text content "Note content"
        text[] tags "Array of tags"
        timestamp created_at
        timestamp updated_at
        string user_id FK "Creator Discord ID"
        string guild_id "Discord server ID"
    }

    REMINDERS {
        int id PK
        text message "Reminder message"
        string time "Time in 24h format HH:MM"
        enum frequency "once | daily | weekly"
        int day_of_week "0-6 for weekly"
        string channel_id "Discord channel ID"
        string user_id FK "Creator Discord ID"
        string guild_id "Discord server ID"
        boolean active "Active status"
        timestamp next_trigger "Next scheduled time"
    }

    SCHEDULES {
        int id PK
        string event "Event name"
        date date "Event date YYYY-MM-DD"
        time time "Event time HH:MM:SS"
        text description "Optional description"
        string user_id FK "Creator Discord ID"
        string guild_id "Discord server ID"
        timestamp created_at
    }

    BUDGETS {
        int id PK
        enum type "expense | income"
        string category "Expense category"
        decimal amount "Amount value"
        text description "Optional description"
        timestamptz date "Transaction date"
        string user_id FK "Creator Discord ID"
        string guild_id "Discord server ID"
    }

    EVENT_CONFIGS {
        int id PK
        string guild_id UK
        string user_id
        string location
        string announcement_channel_id
        int schedule_day
        int schedule_hour
        int schedule_minute
        string timezone
        bool is_enabled
    }

    SUNSET_CONFIGS {
        int id PK
        string guild_id UK
        string user_id
        int advance_minutes
        string channel_id
        string zip_code
        string timezone
        bool is_enabled
    }

    RECIPES {
        int id PK
        string name
        text source_url
        enum source_type
        jsonb ingredients
        jsonb instructions
        bool is_favorite
        string user_id
        string guild_id
    }

    MEAL_PLANS {
        int id PK
        int[] recipe_ids
        int[] servings_per_recipe
        date week_start
        bool archived
        string guild_id
    }

    RECIPE_PREFERENCES {
        int id PK
        string guild_id UK
        jsonb dietary_restrictions
        jsonb excluded_cuisines
    }
```

**Key Design Decisions:**

- **No Foreign Key Constraints:** Simplified schema for easier migration and flexibility
- **Guild-Based Isolation:** All tables filter by `guild_id` for shared household model
- **User ID for Audit:** `user_id` stored for audit trail but not enforced in queries
- **JSONB for Lists:** Flexible item storage using Supabase JSONB type
- **Array Types for Tags:** Supabase native array type for note tags

**Relationships:**

- Users → Tasks: One-to-Many
- Users → Lists: One-to-Many
- Users → Notes: One-to-Many
- Users → Reminders: One-to-Many
- Users → Schedules: One-to-Many
- Users → Budgets: One-to-Many

**Related:** [Database Schema](database-schema.md) | [API Documentation](../api/)

---

## 4. Authentication Flow Diagram

Sequence diagram showing Google OAuth 2.0 authentication flow with JWT token generation and user-Discord ID mapping.

```mermaid
sequenceDiagram
    actor User
    participant PWA as PWA Frontend
    participant Google as Google OAuth
    participant API as REST API
    participant GoogleLib as google-auth-library
    participant DB as Supabase
    participant JWT as JWT Service

    User->>PWA: Click "Sign in with Google"
    PWA->>Google: Initiate OAuth Flow
    Google->>User: Show Google Sign-In Page
    User->>Google: Enter Credentials & Authorize
    Google->>PWA: Return Google ID Token

    PWA->>API: POST /api/auth/google/verify<br/>{idToken}
    API->>GoogleLib: Verify ID Token
    GoogleLib->>Google: Validate Token with Google
    Google-->>GoogleLib: Token Valid
    GoogleLib-->>API: User Info (email, name, picture)

    API->>API: Load USER*_EMAIL mappings from .env
    API->>API: Map email to Discord user ID

    alt Email Mapped
        API->>DB: SELECT * FROM users WHERE email = ?

        alt User Exists
            DB-->>API: User Record
        else User Not Found
            API->>DB: INSERT INTO users (email, discord_id, ...)
            DB-->>API: New User Record
        end

        API->>JWT: Generate Access Token (1h expiry)
        JWT-->>API: Access Token

        API->>JWT: Generate Refresh Token (7d expiry)
        JWT-->>API: Refresh Token

        API->>DB: UPDATE users SET refresh_token = ?

        API-->>PWA: {accessToken, refreshToken, user}
        PWA->>PWA: Store Tokens in localStorage
        PWA->>User: Redirect to Dashboard
    else Email Not Mapped
        API-->>PWA: Error: "Email not authorized"
        PWA->>User: Display Error Message
    end
```

**Authentication Steps:**

1. User initiates Google OAuth flow
2. Google authenticates user and returns ID token
3. PWA sends ID token to backend for verification
4. Backend verifies token with google-auth-library
5. Backend maps Google email to Discord user ID (from .env)
6. Backend creates or retrieves user record from database
7. Backend generates JWT access token (1 hour expiry)
8. Backend generates JWT refresh token (7 days expiry)
9. Backend stores refresh token in database
10. Backend returns tokens + user info to frontend
11. Frontend stores tokens and redirects to dashboard

**Security Considerations:**

- ID token verified with Google on every login
- Email whitelist enforced via environment variables
- JWT tokens signed with HS256 algorithm
- Refresh tokens stored in database for revocation
- Access tokens short-lived (1 hour)

**Related:** [API Documentation - Authentication](../api/README.md#authentication) | [Troubleshooting - OAuth Issues](../guides/troubleshooting.md#issue-32-google-oauth-verification-failed)

---

## 5. Deployment Architecture Diagram

Infrastructure diagram showing production deployment. The bot image is built on GitHub Actions (arm64 via Buildx + QEMU), pushed to **GHCR**, and pulled by the Raspberry Pi. The Pi never builds the image itself. Supabase runs as a separate CLI-managed Docker stack on the Pi host; the bot container reaches Kong via `host.docker.internal`.

```mermaid
graph TB
    subgraph "User Devices"
        DiscordClient[Discord Desktop/Mobile]
        WebBrowser[Web Browser]
        MobileDevice[Mobile Device PWA]
    end

    subgraph "Deployment Pipeline (GitHub)"
        GitHub[GitHub Repository<br/>release: published]
        GHA_Runner["GitHub Actions Runner<br/>ubuntu-latest<br/>QEMU + Buildx → linux/arm64"]
        GHCR["GHCR<br/>ghcr.io/strawhatluka/bwaincell-backend<br/>:latest + :&lt;git-sha&gt;"]

        GitHub -->|trigger| GHA_Runner
        GHA_Runner -->|docker push| GHCR
    end

    subgraph "Raspberry Pi 4B - Local Network"
        direction TB

        subgraph "Bot compose project (docker-compose.yml)"
            Backend["Backend Container<br/>bwaincell-backend<br/>Port 3000 (Express + Discord)<br/>extra_hosts: host.docker.internal"]
        end

        subgraph "Supabase stack (CLI-managed, separate compose project)"
            Kong["Supabase Kong<br/>127.0.0.1:54321 on Pi host"]
            Postgres["Postgres<br/>container supabase_db_bwaincell<br/>:5433"]
            Studio["Studio / PostgREST / GoTrue / Storage"]
            Kong --> Postgres
            Studio --> Postgres
        end

        Logs["./logs Volume<br/>Winston logs (max 75MB)"]

        Backend -.->|Write| Logs
        Backend -->|"HTTP via host.docker.internal:54321<br/>(host-gateway bridge)"| Kong
    end

    subgraph "Vercel Serverless - Global CDN"
        Frontend["Next.js PWA<br/>Serverless Functions<br/>Static Assets"]
    end

    subgraph "External Services"
        DiscordAPI[Discord API<br/>Gateway & REST]
        GoogleAuth[Google OAuth 2.0]
    end

    DiscordClient -->|WebSocket| DiscordAPI
    DiscordAPI -->|Events| Backend

    WebBrowser -->|HTTPS| Frontend
    MobileDevice -->|HTTPS| Frontend

    Frontend -->|HTTPS/JWT| Backend
    Frontend -->|OAuth| GoogleAuth
    Backend -->|Verify| GoogleAuth

    GHA_Runner -->|SSH: supabase start / migration up| Postgres
    GHCR -->|"docker pull (Pi, auth via PI_GHCR_TOKEN)"| Backend
    GHA_Runner -->|vercel deploy --prod| Frontend

    style Backend fill:#68A063
    style Kong fill:#336791
    style Postgres fill:#336791
    style Frontend fill:#000000
    style DiscordAPI fill:#5865F2
    style GoogleAuth fill:#4285F4
    style GitHub fill:#181717
    style GHCR fill:#2088FF
    style GHA_Runner fill:#2088FF
```

**Deployment Details:**

**GitHub Actions (CI/CD — `.github/workflows/deploy.yml`):**

- Trigger: `release: published` (or manual `workflow_dispatch`)
- Jobs:
  - `deploy-vercel` — deploys the frontend to Vercel (parallel).
  - `deploy-supabase` — SSH to Pi, backs up DB (`pg_dump`), `git reset --hard origin/main`, `supabase start` + `supabase migration up`.
  - `build-bot-image` — builds `linux/arm64` image on `ubuntu-latest` using QEMU + Buildx, pushes to GHCR as `:latest` and `:<git-sha>` with GHA layer cache.
  - `deploy-bot` — `needs: [deploy-supabase, build-bot-image]`. SSH to Pi, `docker login ghcr.io` (uses `PI_GHCR_TOKEN`), `docker pull`, `docker compose up -d`, refreshes Discord slash commands.
  - `rollback` — `needs: deploy-bot`, `if: failure()`. Re-tags the previously saved `:backup` image as `:latest` and restarts.

**GHCR (GitHub Container Registry):**

- Image: `ghcr.io/strawhatluka/bwaincell-backend`
- Tags: `:latest` (most recent successful build) and `:<git-sha>` (immutable per-commit).
- Auth on Pi: `docker login ghcr.io -u strawhatluka` with a PAT (`read:packages` scope) stored in the `PI_GHCR_TOKEN` repo secret.

**Raspberry Pi 4B:**

- OS: Raspberry Pi OS 64-bit.
- Two independent Docker compose projects share the host:
  - **Bot compose** (`docker-compose.yml`) — `bwaincell-backend` container on `bwaincell-network`. Pulls the GHCR image; no local build.
  - **Supabase stack** (started with `supabase start`) — Kong on host loopback `127.0.0.1:54321`, Postgres container `supabase_db_bwaincell`.
- Bot container reaches Kong via `extra_hosts: ["host.docker.internal:host-gateway"]` and `SUPABASE_URL=http://host.docker.internal:54321`.
- IPv6 disabled at the kernel level (`sysctl net.ipv6.conf.{all,default,lo}.disable_ipv6=1`) because the Pi has an IPv6 ULA but no IPv6 route, which otherwise stalls AAAA DNS lookups.
- Health Checks: `GET http://localhost:3000/health` on the bot, `docker exec supabase_db_bwaincell pg_isready -U postgres` for Supabase.

**Vercel (Frontend):**

- Platform: Vercel serverless
- Framework: Next.js 14.2+ with App Router
- Deployment: via `deploy-vercel` job on release (not push-to-main anymore)
- CDN: Global edge network
- SSL: Automatic HTTPS certificates

**Related:** [docker-compose.yml](../../docker-compose.yml) | [Getting Started - Deployment](../guides/getting-started.md)

---

## 6. Data Flow Diagram

Flowchart showing how user actions flow through Discord command → Backend → Database → Response for the complete request-response cycle.

```mermaid
flowchart TD
    Start([User Types Slash Command])

    Start --> Discord[Discord Client Sends Interaction]
    Discord --> BotReceive[Discord Bot Receives Interaction]

    BotReceive --> CheckGuild{Is Guild Command?}
    CheckGuild -->|No| RejectDM[Reject: DM Not Supported]
    RejectDM --> End1([End: Error Response])

    CheckGuild -->|Yes| Defer[Defer Reply Within 3 Seconds]
    Defer --> RouteCommand[Route to Command Handler]

    RouteCommand --> ValidateInput{Validate Input<br/>with Joi?}
    ValidateInput -->|Invalid| BuildError[Build Error Embed]
    BuildError --> SendError[Send Error to User]
    SendError --> End2([End: Validation Error])

    ValidateInput -->|Valid| ExtractData[Extract user_id, guild_id, params]
    ExtractData --> CallModel[Call Database Model Method]

    CallModel --> BuildQuery[Build SQL Query with the Supabase client (supabase-js)]
    BuildQuery --> ExecuteQuery[Execute Query on Supabase]

    ExecuteQuery --> CheckResult{Query<br/>Successful?}
    CheckResult -->|No| LogError[Log Error with Winston]
    LogError --> BuildDBError[Build Database Error Embed]
    BuildDBError --> SendDBError[Send Error to User]
    SendDBError --> End3([End: Database Error])

    CheckResult -->|Yes| ProcessData[Process Query Results]
    ProcessData --> BuildResponse[Build Discord Embed Response]

    BuildResponse --> AddButtons{Add Interactive<br/>Buttons?}
    AddButtons -->|Yes| CreateButtons[Create Button Components]
    CreateButtons --> AttachButtons[Attach Buttons to Embed]
    AttachButtons --> SendSuccess[Send Success Response to User]

    AddButtons -->|No| SendSuccess

    SendSuccess --> LogSuccess[Log Success Event]
    LogSuccess --> UpdateCache[Update in-memory cache if needed]
    UpdateCache --> End4([End: Success])

    style Start fill:#5865F2
    style Defer fill:#FFA500
    style ValidateInput fill:#FFD700
    style CheckResult fill:#FFD700
    style SendSuccess fill:#68A063
    style End1 fill:#FF6B6B
    style End2 fill:#FF6B6B
    style End3 fill:#FF6B6B
    style End4 fill:#68A063
```

**Data Flow Steps:**

1. **User Interaction:** User types slash command in Discord
2. **Discord Gateway:** Discord sends interaction event to bot
3. **Guild Check:** Bot verifies command was sent in guild (not DM)
4. **Immediate Deferral:** Bot defers reply within 3 seconds to prevent timeout
5. **Command Routing:** Bot routes interaction to appropriate command handler
6. **Input Validation:** Command validates parameters with Joi schemas
7. **Data Extraction:** Command extracts user_id, guild_id, and parameters
8. **Model Call:** Command calls database model method
9. **Query Building:** the Supabase client (supabase-js) builds parameterized SQL query
10. **Query Execution:** Supabase executes query with guild_id filtering
11. **Result Processing:** Model processes database results into objects
12. **Response Building:** Command builds Discord embed with results
13. **Interactive Components:** Optionally add buttons for quick actions
14. **Send Response:** Bot sends final response to Discord
15. **Logging:** Winston logs success/error with context
16. **Cache Update:** Update in-memory cache if needed (e.g., reminder scheduler)

**Error Handling:**

- **Validation Errors:** Return user-friendly error message
- **Database Errors:** Log full error, return generic message to user
- **Timeout Errors:** Prevented by immediate deferral

**Related:** [Discord Commands](../api/discord-commands.md) | [Database Schema](database-schema.md) | [Troubleshooting](../guides/troubleshooting.md)

---

## How to Create Diagrams

### Mermaid Syntax Guide

Bwaincell documentation uses Mermaid for all diagrams. Mermaid is a text-based diagramming tool that renders in markdown.

**Basic Syntax:**

````markdown
```mermaid
graph TD
    A[Start] --> B[Process]
    B --> C{Decision}
    C -->|Yes| D[End]
    C -->|No| E[Loop Back]
    E --> B
```
````

````

**Diagram Types:**

| Type | Code | Use Case |
|------|------|----------|
| **Flowchart** | `flowchart TD` or `graph TD` | Process flows, decision trees |
| **Sequence** | `sequenceDiagram` | Interactions between components |
| **ER Diagram** | `erDiagram` | Database relationships |
| **Class Diagram** | `classDiagram` | Object-oriented design |
| **State Diagram** | `stateDiagram-v2` | State machines |
| **Gantt Chart** | `gantt` | Project timelines |

**Flowchart Directions:**
- `TD` or `TB` - Top to Bottom
- `BT` - Bottom to Top
- `LR` - Left to Right
- `RL` - Right to Left

**Node Shapes:**
- `[Text]` - Rectangle
- `(Text)` - Rounded rectangle
- `{Text}` - Diamond (decision)
- `([Text])` - Stadium (start/end)
- `[[Text]]` - Subroutine
- `[(Text)]` - Cylinder (database)

**Arrows:**
- `-->` - Solid arrow
- `-.->` - Dotted arrow
- `==>` - Thick arrow
- `--Text-->` - Labeled arrow
- `-->|Text|` - Labeled arrow (alternative)

**Styling:**
- `style NodeID fill:#color` - Fill color
- `style NodeID stroke:#color` - Border color
- `style NodeID color:#color` - Text color

---

### Embedding Diagrams in Markdown

**Method 1: Inline Mermaid (Recommended)**

```markdown
```mermaid
graph TD
    A --> B
````

````

Renders directly in GitHub, GitLab, and most markdown viewers.

**Method 2: Mermaid Live Editor**

1. Go to [Mermaid Live Editor](https://mermaid.live/)
2. Write or paste Mermaid code
3. Export as SVG or PNG
4. Save to `docs/architecture/images/`
5. Reference in markdown:

```markdown
![System Architecture](images/system-architecture.svg)
````

**Method 3: VS Code Preview**

1. Install "Markdown Preview Mermaid Support" extension
2. Open markdown file
3. Press `Ctrl+Shift+V` (Windows/Linux) or `Cmd+Shift+V` (macOS)
4. Diagrams render in preview pane

---

### Exporting Diagrams to Images

**Using Mermaid CLI:**

```bash
# Install Mermaid CLI
npm install -g @mermaid-js/mermaid-cli

# Export to SVG
mmdc -i diagram.mmd -o diagram.svg

# Export to PNG
mmdc -i diagram.mmd -o diagram.png

# Export all .mmd files
mmdc -i docs/**/*.mmd -o docs/architecture/images/
```

**Using Mermaid Live Editor:**

1. Go to [mermaid.live](https://mermaid.live/)
2. Paste Mermaid code
3. Click "Actions" → "SVG" or "PNG"
4. Download to `docs/architecture/images/`

---

### Tools for Creating Diagrams

**Mermaid Editors:**

- [Mermaid Live Editor](https://mermaid.live/) - Official online editor
- [Mermaid Chart](https://www.mermaidchart.com/) - Advanced cloud-based editor
- VS Code with "Markdown Preview Mermaid Support" extension

**Diagram Tools (Alternative):**

- [draw.io](https://app.diagrams.net/) - General-purpose diagramming
- [Excalidraw](https://excalidraw.com/) - Hand-drawn style diagrams
- [PlantUML](https://plantuml.com/) - Text-based UML diagrams

**Database Diagram Tools:**

- [dbdiagram.io](https://dbdiagram.io/) - Database schema designer
- [QuickDBD](https://www.quickdatabasediagrams.com/) - Quick ER diagrams

---

### Mermaid Reference Links

- **Official Documentation:** [mermaid.js.org](https://mermaid.js.org/)
- **Syntax Reference:** [mermaid.js.org/syntax](https://mermaid.js.org/syntax/flowchart.html)
- **Live Editor:** [mermaid.live](https://mermaid.live/)
- **Examples:** [mermaid.js.org/ecosystem/tutorials](https://mermaid.js.org/ecosystem/tutorials.html)

---

## Diagram Maintenance

### Updating Diagrams

When architecture changes, update diagrams in this file:

1. **Identify Affected Diagrams:** Check which diagrams reference changed components
2. **Update Mermaid Code:** Modify diagram source code directly in markdown
3. **Validate Syntax:** Preview in VS Code or paste into Mermaid Live Editor
4. **Test Rendering:** Ensure diagram renders correctly in GitHub/GitLab
5. **Update Documentation:** Update related documentation referencing diagram
6. **Commit Changes:** Commit markdown file (diagrams update automatically)

**Diagram Update Checklist:**

- [ ] Component names match codebase
- [ ] Data flows reflect actual implementation
- [ ] Database schema matches the Supabase client (supabase-js) models
- [ ] Deployment architecture matches docker-compose.yml
- [ ] Colors consistent across diagrams
- [ ] Labels clear and concise
- [ ] Mermaid syntax valid (no rendering errors)

---

### Diagram Style Guide

**Colors:**

- Discord Bot: `#5865F2` (Discord brand blue)
- REST API: `#68A063` (Node.js green)
- PWA Frontend: `#000000` (Next.js black)
- Supabase: `#336791` (Supabase brand blue)
- Google OAuth: `#4285F4` (Google brand blue)
- Success/End: `#68A063` (green)
- Error/Warning: `#FF6B6B` (red)
- Decision Points: `#FFD700` (gold)

**Node Naming:**

- Use descriptive names with context
- Include version numbers where relevant (e.g., "Discord.js 14")
- Add resource limits for deployment diagrams (e.g., "512MB RAM")

**Arrow Labels:**

- Keep labels short and action-oriented
- Use present tense (e.g., "Sends" not "Sent")
- Include data format where helpful (e.g., "SQL Queries", "HTTP Requests")

---

## Related Documentation

- **[Architecture Overview](overview.md)** - Complete system architecture documentation
- **[Database Schema](database-schema.md)** - Detailed database structure and relationships
- **[API Documentation](../api/)** - REST API and Discord bot reference
- **[Getting Started](../guides/getting-started.md)** - Installation and deployment guide
- **[Troubleshooting](../guides/troubleshooting.md)** - Common issues and solutions

---

**Last Updated** 2026-01-12
**Version:** 2.0.0
**Diagrams:** 6 (System Architecture, Component Interaction, Database ER, Authentication Flow, Deployment Architecture, Data Flow)
**Diagram Tool:** Mermaid.js
