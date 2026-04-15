# Interactions Subsystem

**Source root:** `backend/utils/interactions/`

Handles every non-slash-command Discord interaction (buttons, select menus, modals, autocomplete) emitted by Bwaincell's slash commands.

## Directory Layout

```
backend/utils/interactions/
├── handlers/        # customId-pattern dispatchers
├── helpers/         # databaseHelper.getModels(), etc.
├── middleware/      # pre-dispatch checks (auth, guards)
├── modals/          # modal submission handlers
├── responses/       # handleInteractionError, shared response builders
├── types/           # shared TypeScript types
└── validators/      # input validation
```

## Flow

```
Discord Event
   │
   ▼
bot.ts interactionCreate
   │   (defers interaction for long-running ops)
   ▼
Interaction Router
   ├─ ChatInputCommand  → commands/<name>.ts execute()
   ├─ Autocomplete      → commands/<name>.ts autocomplete()
   ├─ Button            → dispatch by customId prefix:
   │     task_*     → handleTaskButton
   │     list_*     → handleListButton
   │     reminder_* → handleReminderButton
   │     recipe_*   → recipeHandlers (button entry)
   │     random_*   → handleRandomButton
   │     sunset_*   → handleSunsetButton
   │     events_*   → handleEventsButton
   ├─ StringSelectMenu  → handleSelectMenuInteraction (dispatches recipe_* to handleRecipeSelect)
   └─ ModalSubmit       → modals/*
```

## Handlers in This Directory

| File | Command | Doc |
|---|---|---|
| `taskHandlers.ts` | `/task` | [handlers/taskHandlers.md](handlers/taskHandlers.md) |
| `listHandlers.ts` | `/list` | [handlers/listHandlers.md](handlers/listHandlers.md) |
| `reminderHandlers.ts` | `/remind` | [handlers/reminderHandlers.md](handlers/reminderHandlers.md) |
| `recipeHandlers.ts` | `/recipe` | [handlers/recipeHandlers.md](handlers/recipeHandlers.md) |
| `selectMenuHandlers.ts` | (dispatcher) | [handlers/selectMenuHandlers.md](handlers/selectMenuHandlers.md) |
| `randomHandlers.ts` | `/random` | [handlers/randomHandlers.md](handlers/randomHandlers.md) |

## Conventions

- customId format: `{feature}_{action}_{...args}` (underscore-delimited).
- Every handler short-circuits non-guild interactions with an ephemeral "server only" message.
- Errors are routed through `responses/errorResponses.handleInteractionError(interaction, error, context)`.
- Database access goes through `helpers/databaseHelper.getModels()` for lazy-loading and DI-friendly testing; direct supabase reads are used when models would be overkill.

## Related

- Commands: [../commands/](../commands/)
- Supabase models: [../supabase/README.md](../supabase/README.md)
