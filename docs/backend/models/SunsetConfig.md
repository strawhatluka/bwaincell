# SunsetConfig Model

**Source:** `supabase/models/SunsetConfig.ts`
**Table:** `sunset_configs`

Per-guild configuration for the daily sunset announcement. One row per guild (UNIQUE `guild_id`).

## Columns

| Column              | Type         | Constraints                               |
| ------------------- | ------------ | ----------------------------------------- |
| `id`                | SERIAL       | PRIMARY KEY                               |
| `guild_id`          | VARCHAR(255) | NOT NULL, UNIQUE                          |
| `user_id`           | VARCHAR(255) | NOT NULL (audit trail)                    |
| `advance_minutes`   | INTEGER      | NOT NULL, DEFAULT 60                      |
| `channel_id`        | VARCHAR(255) | NOT NULL                                  |
| `zip_code`          | VARCHAR(255) | NOT NULL                                  |
| `timezone`          | VARCHAR(255) | NOT NULL, DEFAULT `'America/Los_Angeles'` |
| `is_enabled`        | BOOLEAN      | NOT NULL, DEFAULT TRUE                    |
| `last_announcement` | TIMESTAMPTZ  | nullable                                  |
| `created_at`        | TIMESTAMPTZ  | NOT NULL, DEFAULT `NOW()`                 |
| `updated_at`        | TIMESTAMPTZ  | NOT NULL, DEFAULT `NOW()`                 |

Index: `idx_sunset_configs_is_enabled`.

## Cron Timing

There is no stored cron expression. The daily trigger is computed each day: `getSunsetTime(lat, lng)` (via `sunrise-sunset.org`) minus `advance_minutes`, scheduled by `backend/utils/scheduler.ts::addSunsetConfig`.

## Static Methods

| Method                   | Signature                                         | Returns                            |
| ------------------------ | ------------------------------------------------- | ---------------------------------- |
| `upsertConfig`           | `(guildId, userId, channelId, zipCode, options?)` | `Promise<SunsetConfigRow>`         |
| `getGuildConfig`         | `(guildId)`                                       | `Promise<SunsetConfigRow \| null>` |
| `getEnabledConfigs`      | `()`                                              | `Promise<SunsetConfigRow[]>`       |
| `toggleEnabled`          | `(guildId, enabled)`                              | `Promise<SunsetConfigRow \| null>` |
| `updateAdvanceMinutes`   | `(guildId, minutes)`                              | `Promise<SunsetConfigRow \| null>` |
| `updateLastAnnouncement` | `(guildId)`                                       | `Promise<void>`                    |

`upsertConfig` defaults: `advanceMinutes=60`, `timezone='America/Los_Angeles'`, `isEnabled=true`.

## Example

```ts
import SunsetConfig from '@database/models/SunsetConfig';

await SunsetConfig.upsertConfig(guildId, userId, channelId, '97330', {
  advanceMinutes: 30,
  timezone: 'America/Los_Angeles',
  isEnabled: true,
});

await SunsetConfig.updateAdvanceMinutes(guildId, 45);
await SunsetConfig.toggleEnabled(guildId, false);
```

## Related

- Command: [docs/backend/commands/sunset.md](../commands/sunset.md)
- Service + scheduler: [docs/backend/services/sunsetService.md](../services/sunsetService.md), [docs/backend/services/scheduler.md](../services/scheduler.md)
