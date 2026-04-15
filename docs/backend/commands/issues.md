# `/issues` Command Reference

**Source:** `backend/commands/issues.ts`
**Service:** `backend/utils/githubService.ts` (singleton `githubService`)

Creates a GitHub issue in the configured repository from within Discord.

## Options

| Option        | Type   | Required | Constraints                                                                                                                                                   |
| ------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | string | Yes      | `setMaxLength(100)`                                                                                                                                           |
| `description` | string | Yes      | `setMaxLength(2000)`                                                                                                                                          |
| `type`        | string | No       | Choices: `Bug Report` (`bug`), `Feature Request` (`feature`), `Question` (`question`), `Documentation` (`documentation`). Defaults to `'general'` if omitted. |

## Flow

1. Requires a guild context.
2. Early-out if `githubService.isConfigured()` is false → `❌ GitHub integration is not configured. Please contact the administrator to set up the /issues command.`
3. Builds the issue body:

   ```md
   ## Description

   <description>

   ---

   **Submitted by:** <username> (Discord ID: <userId>)
   **Guild ID:** <guildId>
   **Issue Type:** <issueType>
   **Timestamp:** <ISO-8601>
   ```

4. Derives labels from `type`:
   - `bug` → `['bug']`
   - `feature` → `['enhancement']`
   - `question` → `['question']`
   - `documentation` → `['documentation']`
5. Calls `githubService.createIssue(title, body, labels)`.
6. On success: replies with a success embed plus a link button to the new issue.
7. On failure: replies with a red error embed carrying `result.error` (or a generic fallback).

## GitHub Token Setup

`githubService` reads configuration from environment:

| Var                 | Purpose                                 |
| ------------------- | --------------------------------------- |
| `GITHUB_TOKEN`      | Personal access token with `repo` scope |
| `GITHUB_REPO_OWNER` | Owner (user or org)                     |
| `GITHUB_REPO_NAME`  | Repo name (e.g. `Bwaincell`)            |

All three must be present for `isConfigured()` to return true.

## Rate Limiting / Error Paths

`githubService.createIssue` returns `{ success: false, error: <string> }` for:

- GitHub API 401 / invalid token
- 403 / rate-limit exceeded (message includes retry-after timing)
- 403 / permission denied (`repo` scope missing)
- 404 / repository not found (owner/name mismatch)
- Network / unexpected errors

The error string is echoed to the user; the full stack is logged via Winston only.

## Accessible Repositories

Only the single repository identified by `GITHUB_REPO_OWNER/GITHUB_REPO_NAME` is accessible. Multi-repo routing is not supported.

## Related

- Upstream doc: [docs/api/discord-commands.md#7-github-issues---issues](../../api/discord-commands.md#7-github-issues---issues)
