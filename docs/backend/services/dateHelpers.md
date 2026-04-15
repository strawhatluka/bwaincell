# dateHelpers

**Source:** `backend/utils/dateHelpers.ts`

Luxon-backed helpers for the weekly events feature and cron expression generation. All timezone parameters are IANA zone strings, defaulting to `America/Los_Angeles`.

## Exported Functions

### Event window

- `getNextMondayNoon(timezone?: string): Date` — next Monday at 12:00 (today if before noon Monday).
- `getFollowingMondayEnd(startDate: Date, timezone?: string): Date` — adds 7 days to `startDate` and sets time to 11:59 AM.
- `getEventWindow(timezone?: string): { start: Date; end: Date }` — combines the two above to produce a full Mon 12:00 → next Mon 11:59 window.

### Cron

- `buildCronExpression(minute: number, hour: number, dayOfWeek: number): string` — returns `minute hour * * dayOfWeek`. Throws when `minute` ∉ [0,59], `hour` ∉ [0,23], or `dayOfWeek` ∉ [0,6].

### Parsers

- `parseTimeString(s: string): { hour: number; minute: number }` — matches `^(\d{1,2}):(\d{2})$`. Throws on malformed input or out-of-range values.
- `parseDayName(name: string): number` — maps `sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat` (case-insensitive) to 0–6. Throws on unknown name.
- `formatDayName(dayOfWeek: number): string` — returns `Sunday`…`Saturday`. Throws on out-of-range.

### Timezone

- `isValidTimezone(tz: string): boolean` — returns `true` if `DateTime.now().setZone(tz)` does not throw.
- `getCurrentTime(tz: string): DateTime` — Luxon `DateTime.now().setZone(tz)`.

## Default Export

An object containing every function above.

## Logging

Uses `createLogger('DateHelpers')` from `backend/shared/utils/logger`. Functions emit `debug` traces; `getEventWindow` emits `info`.

## Example

```ts
import { getEventWindow, buildCronExpression } from '../utils/dateHelpers';

const { start, end } = getEventWindow('America/New_York');
const cron = buildCronExpression(0, 12, 1); // "0 12 * * 1"
```
