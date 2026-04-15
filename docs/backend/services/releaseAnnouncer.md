# releaseAnnouncer

**Source:** `backend/utils/releaseAnnouncer.ts`

On bot startup, posts a release-notes embed to the configured announcement channel whenever the running version differs from the last announced version.

## Paths

| Constant | Value | Purpose |
|---|---|---|
| `VERSION_FILE` | `../../data/.last-announced-version` (relative to `__dirname`) | Persisted via Docker volume mount. |
| `PACKAGE_JSON` | `../../package.json` | Source of current version. |
| `CHANGELOG_PATH` | `findChangelog()` — walks up from `__dirname` up to 5 levels looking for `CHANGELOG.md`, else falls back to `../../../CHANGELOG.md`. |

## Constants

- `EMBED_MAX_LENGTH = 4096` (Discord embed description limit).

## Internal Helpers

- `findChangelog(): string` — directory walk described above.
- `getAppVersion(): string` — reads `package.json`.
- `getLastAnnouncedVersion(): string | null` — reads `VERSION_FILE`; swallows errors.
- `setLastAnnouncedVersion(version): void` — creates parent dir if needed. Non-fatal on error.
- `extractChangelogNotes(version): string | null` — regex `## \[${version}\][^\n]*\n([\s\S]*?)(?=## \[|$)` against CHANGELOG.md; returns the matched section body or `null`.

## Exported Function

### `async announceRelease(client: Client): Promise<void>`

Flow:

1. Reads `config.settings.defaultReminderChannel`; returns if unset.
2. Compares `package.json` version to persisted version. Returns when equal.
3. Extracts changelog notes; if found and `> EMBED_MAX_LENGTH`, truncates with `…`.
4. Builds green embed `"Bwaincell v{version} Released"`.
5. Fetches channel via `client.channels.fetch(channelId)`; guards on `send in channel`.
6. Sends embed; on success writes the new version to `VERSION_FILE`.

All failures log a warning via `logger.warn` and never throw.
