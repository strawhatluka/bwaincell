# sunsetService

**Source:** `backend/utils/sunsetService.ts`
**Role:** Geocode ZIP codes, fetch daily sunset times, and format the announcement embed.

## Exported Functions

| Function                | Signature                                                    | Purpose                                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getCoordinatesFromZip` | `(zipCode: string) => Promise<{ lat: number; lng: number }>` | Checks local cache, then hits `https://api.zippopotam.us/us/<zip>`. Throws on lookup failure.                                                                                     |
| `getSunsetTime`         | `(lat: number, lng: number, date?: string) => Promise<Date>` | Calls `https://api.sunrise-sunset.org/json?lat=...&lng=...&date=...&formatted=0`. Throws on `status !== 'OK'` or missing `results.sunset`. Default `date='today'`.                |
| `formatSunsetEmbed`     | `(sunsetTime: Date, timezone: string) => EmbedBuilder`       | Returns a Discord embed with title "🌅 Sunset Announcement", description "The sun will set today at **h:mm a**", field "🕐 Sunset Time" with short-offset time, color `0xff6b35`. |

## External APIs

| API                      | Purpose                           | Auth |
| ------------------------ | --------------------------------- | ---- |
| `api.zippopotam.us`      | Free geocoding (US ZIP → lat/lng) | None |
| `api.sunrise-sunset.org` | Daily sunrise/sunset              | None |

Local in-memory cache (`ZIP_COORDINATES`) prevents repeated geocoding of the same ZIP within a process lifetime.

## Node-cron Integration

This service does NOT schedule itself. The central [scheduler](./scheduler.md) reads all `SunsetConfig` rows via `SunsetConfig.getEnabledConfigs()`, computes `sunsetTime - advance_minutes`, and schedules one job per guild. The job calls `formatSunsetEmbed(...)`, posts to the configured channel, and updates `SunsetConfig.updateLastAnnouncement(guildId)`.

## Per-Guild Lookup

Each guild's `SunsetConfig` row contains `zip_code`, `advance_minutes`, `timezone`, `channel_id`, `is_enabled`. See [SunsetConfig.md](../models/SunsetConfig.md).

## Errors

`getCoordinatesFromZip` throws `Unable to find coordinates for ZIP code: <zip>` on HTTP failure or empty `places` array.
`getSunsetTime` throws `Sunset API request failed: <status>`, `Sunset API returned status: <status>`, `No sunset time in API response`, or `Invalid sunset time from API: <raw>`.

## Example

```ts
import { getCoordinatesFromZip, getSunsetTime, formatSunsetEmbed } from '@/utils/sunsetService';

const coords = await getCoordinatesFromZip('97330');
const sunset = await getSunsetTime(coords.lat, coords.lng);
const embed = formatSunsetEmbed(sunset, 'America/Los_Angeles');
await channel.send({ embeds: [embed] });
```

## Related

- Command: [docs/backend/commands/sunset.md](../commands/sunset.md)
- Model: [docs/backend/models/SunsetConfig.md](../models/SunsetConfig.md)
- Scheduler: [scheduler.md](./scheduler.md)
