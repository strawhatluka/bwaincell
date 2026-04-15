# Discord Commands (Per-Command Docs)

APO-2 covers HIGH-priority and new-feature commands. Remaining per-command docs (task, list, note, remind, budget, schedule, random) are owned by APO-3. The consolidated reference lives at [docs/api/discord-commands.md](../../api/discord-commands.md).

## Index

| Domain | Command | Doc | Status |
| ------ | ------- | --- | ------ |
| Recipes | `/recipe` | [recipe.md](./recipe.md) | Covered |
| Scheduling | `/sunset` | [sunset.md](./sunset.md) | Covered |
| Scheduling | `/events` | [events.md](./events.md) | Covered |
| Social | `/make-it-a-quote` | [quote.md](./quote.md) | Covered |
| System | `/issues` | [issues.md](./issues.md) | Covered |
| Productivity | `/task` | see consolidated reference | APO-3 |
| Productivity | `/list` | see consolidated reference | APO-3 |
| Productivity | `/note` | see consolidated reference | APO-3 |
| Productivity | `/remind` | see consolidated reference | APO-3 |
| Finance | `/budget` | see consolidated reference | APO-3 |
| Calendar | `/schedule` | see consolidated reference | APO-3 |
| Entertainment | `/random` | see consolidated reference | APO-3 |

All command handlers live in `backend/commands/*.ts`. Shared interaction handlers live in `backend/utils/interactions/handlers/*.ts`.
