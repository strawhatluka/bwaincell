# Discord Commands (Per-Command Docs)

Per-command documentation for every slash command registered by the Bwaincell Discord bot. The consolidated user-facing reference lives at [docs/api/discord-commands.md](../../api/discord-commands.md); the files here capture implementation detail (subcommands, flow, model usage).

## Index

| Domain        | Command            | Doc                          |
| ------------- | ------------------ | ---------------------------- |
| Productivity  | `/task`            | [task.md](./task.md)         |
| Productivity  | `/list`            | [list.md](./list.md)         |
| Productivity  | `/note`            | [note.md](./note.md)         |
| Productivity  | `/remind`          | [remind.md](./remind.md)     |
| Finance       | `/budget`          | [budget.md](./budget.md)     |
| Calendar      | `/schedule`        | [schedule.md](./schedule.md) |
| Scheduling    | `/sunset`          | [sunset.md](./sunset.md)     |
| Scheduling    | `/events`          | [events.md](./events.md)     |
| Recipes       | `/recipe`          | [recipe.md](./recipe.md)     |
| Social        | `/make-it-a-quote` | [quote.md](./quote.md)       |
| System        | `/issues`          | [issues.md](./issues.md)     |
| Entertainment | `/random`          | [random.md](./random.md)     |

All command handlers live in `backend/commands/*.ts`. Shared interaction handlers live in `backend/utils/interactions/handlers/*.ts`.

## Database Imports

All command modules that talk to Supabase import their models via the `@database/*` path alias (see `backend/commands/task.ts` for an example):

```ts
// backend/commands/task.ts
import Task from '@database/models/Task';
```

The alias is defined in `backend/tsconfig.json` (`"@database/*": ["../supabase/*"]`). `/issues` is the only command in the list above that does not use `@database/*` (it only talks to GitHub).
