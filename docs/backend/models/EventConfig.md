# EventConfig Model

**Source:** `supabase/models/EventConfig.ts`
**Table:** `event_configs`

Per-guild configuration for the weekly local-events announcement.

## Columns

| Column                    | Type         | Constraints                               |
| ------------------------- | ------------ | ----------------------------------------- |
| `id`                      | SERIAL       | PRIMARY KEY                               |
| `guild_id`                | VARCHAR(255) | NOT NULL, UNIQUE                          |
| `user_id`                 | VARCHAR(255) | NOT NULL (audit trail)                    |
| `location`                | VARCHAR(255) | NOT NULL (ZIP or location string)         |
| `announcement_channel_id` | VARCHAR(255) | NOT NULL                                  |
| `schedule_day`            | INTEGER      | NOT NULL, DEFAULT 1 (Mon=1, Sun=0)        |
| `schedule_hour`           | INTEGER      | NOT NULL, DEFAULT 12                      |
| `schedule_minute`         | INTEGER      | NOT NULL, DEFAULT 0                       |
| `timezone`                | VARCHAR(255) | NOT NULL, DEFAULT `'America/Los_Angeles'` |
| `is_enabled`              | BOOLEAN      | NOT NULL, DEFAULT TRUE                    |
| `last_announcement`       | TIMESTAMPTZ  | nullable                                  |
| `created_at`              | TIMESTAMPTZ  | NOT NULL, DEFAULT `NOW()`                 |
| `updated_at`              | TIMESTAMPTZ  | NOT NULL, DEFAULT `NOW()`                 |

Index: `idx_event_configs_is_enabled`.

## Static Methods

| Method                   | Signature                                              | Returns                                                                                                             |
| ------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `upsertConfig`           | `(guildId, userId, location, channelId, options?)`     | `Promise<EventConfigRow>` — upsert on `guild_id`. Defaults: `scheduleDay=1`, `scheduleHour=12`, `scheduleMinute=0`. |
| `getGuildConfig`         | `(guildId)`                                            | `Promise<EventConfigRow \| null>`                                                                                   |
| `getEnabledConfigs`      | `()`                                                   | `Promise<EventConfigRow[]>`                                                                                         |
| `updateSchedule`         | `(guildId, scheduleDay, scheduleHour, scheduleMinute)` | `Promise<EventConfigRow \| null>`                                                                                   |
| `toggleEnabled`          | `(guildId, enabled)`                                   | `Promise<EventConfigRow \| null>`                                                                                   |
| `updateLastAnnouncement` | `(guildId)`                                            | `Promise<void>`                                                                                                     |
| `getNextRunTime`         | `(config)`                                             | `Date` — next occurrence of `scheduleDay/hour/minute` in `config.timezone` (Luxon)                                  |
| `formatSchedule`         | `(config)`                                             | `string` — e.g. `"Mondays at 12:00 PM (America/Los_Angeles)"`                                                       |

## Example

```ts
import EventConfig from '@database/models/EventConfig';

await EventConfig.upsertConfig(guildId, userId, '97330', channelId, {
  scheduleDay: 5, // Friday
  scheduleHour: 18,
  scheduleMinute: 0,
  timezone: 'America/Los_Angeles',
  isEnabled: true,
});

const next = EventConfig.getNextRunTime(await EventConfig.getGuildConfig(guildId));
```

## Related

- Command: [docs/backend/commands/events.md](../commands/events.md)
- Service: [docs/backend/services/eventsService.md](../services/eventsService.md)
- Scheduler: [docs/backend/services/scheduler.md](../services/scheduler.md)
