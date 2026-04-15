# `/events` Command Reference

**Source:** `backend/commands/events.ts`
**Service:** `backend/utils/eventsService.ts`
**Model:** [EventConfig](../models/EventConfig.md)

Preview AI-discovered local events on demand, or reconfigure the weekly announcement schedule.

## Options

| Option | Type   | Required | Description                                                                                       |
| ------ | ------ | -------- | ------------------------------------------------------------------------------------------------- | --- | --- | ------- |
| `day`  | string | No       | Day name (`Monday`, `Friday`, ...), parsed by `parseDayName()` in `backend/utils/dateHelpers.ts`. |
| `time` | string | No       | 12-hour time (`2:30 PM`). Parsed to 24-hour via local regex `/^(\d{1,2}):(\d{2})\s\*(AM           | PM  | am  | pm)$/`. |

## Behaviors

### Preview Mode (no options)

1. Requires env `LOCATION_ZIP_CODE` and `DEFAULT_REMINDER_CHANNEL` (checked first).
2. `getEventWindow(timezone)` produces the search date range.
3. `eventsService.discoverLocalEvents(location, start, end)` → Gemini with Google Search grounding.
4. `eventsService.formatEventsForDiscord(events, location)` → `EmbedBuilder`.
5. Embed footer: `📍 <location> | Powered by AI`.

### Schedule Update Mode (day or time provided)

1. Validates inputs before DB writes.
2. `EventConfig.upsertConfig(guildId, userId, location, channelId, { scheduleDay, scheduleHour, scheduleMinute, timezone, isEnabled: true })`.
3. `scheduler.addEventConfig(guildId)` re-registers the weekly cron job.
4. Confirms with e.g. `✅ Schedule updated: Fridays at 6:00 PM`.

## Error Responses

- `❌ This command can only be used in a server.`
- `❌ No location configured. Set LOCATION_ZIP_CODE in environment variables.`
- `❌ No announcement channel configured. Set DEFAULT_REMINDER_CHANNEL in environment variables.`
- `❌ Invalid day: "<input>". Use day names like "Monday", "Friday", etc.`
- `❌ Invalid time format. Use 12-hour format (e.g., 2:30 PM).`
- `❌ Failed to fetch events. Please try again later.`

## Related

- Service: [eventsService.md](../services/eventsService.md)
- Scheduler: [scheduler.md](../services/scheduler.md)
