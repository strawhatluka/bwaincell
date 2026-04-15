# eventsService

**Source:** `backend/utils/eventsService.ts`
**Role:** AI-powered local events discovery with a provider abstraction (`Google Gemini` primary, `Mock Provider` fallback for dev).

## Default Export

`eventsService` — singleton facade. Used by `/events` and by the scheduler's `executeEventAnnouncement`.

## Exported Types

```ts
interface LocalEvent {
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  location: string;
  url?: string;
  source: string;
}

interface EventDiscoveryProvider {
  discoverEvents(location: string, startDate: Date, endDate: Date): Promise<LocalEvent[]>;
  getName(): string;
}
```

## Providers

### `GeminiEventProvider` (primary)

- Uses `@google/genai` with `model: 'gemini-2.5-flash'`, `tools: [{ googleSearch: {} }]`.
- Prompt asks for 5-10 events in JSON array form: `{ title, description, date, time, location, url, source }`.
- Strips markdown fences and extracts the first `[...]` JSON block.
- Parses date/time via Luxon (`yyyy-MM-dd h:mm a`, zone `'America/Los_Angeles'`); drops invalid rows with warnings.
- Requires `GEMINI_API_KEY`; otherwise throws `Gemini API not configured.`

### `MockEventProvider` (fallback)

Returns three hardcoded local-ish events (farmers market, art exhibition, live music) in the next few days for local development / tests when `GEMINI_API_KEY` is unset.

## Event Lifecycle

1. `/events` command (or scheduler's weekly job) calls `eventsService.discoverLocalEvents(location, start, end)`.
2. Provider returns `LocalEvent[]`.
3. `eventsService.formatEventsForDiscord(events, location)` returns an `EmbedBuilder` for reply.
4. Scheduler path: after posting, `EventConfig.updateLastAnnouncement(guildId)` is called.

`EventConfig` supplies the per-guild `schedule_day`, `schedule_hour`, `schedule_minute`, `timezone`, `announcement_channel_id`, and `is_enabled` flag. See [EventConfig.md](../models/EventConfig.md).

## Caching

The source file includes a `CachedEvents` interface (`events`, `timestamp`), used to short-circuit duplicate Gemini calls within a window. Check source for the active TTL.

## Date Extraction Helpers

- `extractStartDate(dateInput)` — regex `/(\d{4}-\d{2}-\d{2})/`, returns first match or the raw input.
- `extractStartTime(timeInput?)` — regex `/(\d{1,2}:\d{2}\s*[AaPp][Mm])/`, fallback `'12:00 PM'`.

These are intentionally forgiving of varied Gemini outputs like `"6:00 PM - 9:30 PM"` or `"2026-02-16 to 2026-02-23"`.

## Related

- Command: [docs/backend/commands/events.md](../commands/events.md)
- Model: [docs/backend/models/EventConfig.md](../models/EventConfig.md)
- Scheduler: [scheduler.md](./scheduler.md)
