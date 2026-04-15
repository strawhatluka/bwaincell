# `/sunset` Command Reference

**Source:** `backend/commands/sunset.ts`
**Service:** `backend/utils/sunsetService.ts`
**Model:** [SunsetConfig](../models/SunsetConfig.md)

Daily sunset-announcement scheduling for a guild. Sunset time is fetched from `api.sunrise-sunset.org` using coordinates resolved from `LOCATION_ZIP_CODE` via `api.zippopotam.us`.

## Subcommands

### `/sunset enable`

1. Requires env vars `LOCATION_ZIP_CODE` and `DEFAULT_REMINDER_CHANNEL`.
2. Validates ZIP by attempting `getCoordinatesFromZip(zipCode)`.
3. `SunsetConfig.upsertConfig(guildId, userId, channelId, zipCode, { timezone: config.settings.timezone, isEnabled: true })`.
4. `scheduler.addSunsetConfig(guildId)` registers the daily job.
5. Replies with embed (ZIP, 60m default advance notice, channel).

### `/sunset disable`

1. `SunsetConfig.toggleEnabled(guildId, false)`; returns `❌ No sunset configuration found.` if none exists.
2. `scheduler.removeSunsetConfig(guildId)`.
3. Replies with red disabled embed.

### `/sunset set minutes:<1-120>`

- Options: `minutes` (integer, required, 1..120).
- Calls `SunsetConfig.updateAdvanceMinutes(guildId, minutes)` → re-registers scheduler job via `scheduler.addSunsetConfig(guildId)`.

### `/sunset status`

- Reads `SunsetConfig.getGuildConfig(guildId)`.
- Attempts `getCoordinatesFromZip` + `getSunsetTime(lat, lng)` to compute today's sunset and countdown in the configured timezone.
- Embed fields: Status (✅/❌), ZIP Code, Advance Notice, Today's Sunset, Countdown, Channel, optional Last Announcement.

## Cron Scheduling Semantics

There is no persisted cron expression. On each daily pass, the scheduler recomputes `sunsetTime - advance_minutes` for the guild's timezone. See [scheduler.md](../services/scheduler.md) for how `addSunsetConfig` registers this.

## Environment Variables

| Var | Use |
| --- | --- |
| `LOCATION_ZIP_CODE` | US ZIP for geocoding |
| `DEFAULT_REMINDER_CHANNEL` | Discord channel to post announcement |
| `TIMEZONE` (via `config.settings.timezone`) | Display + scheduling timezone |

## Error Responses

- `❌ No location configured. Set LOCATION_ZIP_CODE...`
- `❌ No announcement channel configured. Set DEFAULT_REMINDER_CHANNEL...`
- `❌ Invalid ZIP code: <zip>. Check your LOCATION_ZIP_CODE setting.`
- `❌ No sunset configuration found. Use /sunset enable first.`

## Related

- Service: [sunsetService.md](../services/sunsetService.md)
- Scheduler: [scheduler.md](../services/scheduler.md)
