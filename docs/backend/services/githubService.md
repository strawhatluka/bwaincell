# githubService

**Source:** `backend/utils/githubService.ts`

Octokit wrapper that backs the `/issues` Discord command. Exports a singleton `githubService` plus the `GitHubService` class and `GitHubIssueResponse` type.

## Environment Variables

| Var                 | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `GITHUB_TOKEN`      | Personal access token / fine-grained token with `issues:write` |
| `GITHUB_REPO_OWNER` | Repository owner login                                         |
| `GITHUB_REPO_NAME`  | Repository name                                                |

Missing any of the three → service logs a warning and `isConfigured()` returns `false`; `/issues` is expected to surface a user-facing message.

## Types

```ts
interface GitHubIssueResponse {
  success: boolean;
  issueNumber?: number;
  issueUrl?: string;
  error?: string;
}
```

## Class `GitHubService`

- `constructor()` — calls `initialize()` automatically.
- `private initialize()` — reads env vars, constructs `new Octokit({ auth: token })`, stores owner/repo, sets `initialized = true`.
- `isConfigured(): boolean`
- `createIssue(title: string, body: string, labels?: string[]): Promise<GitHubIssueResponse>`

`createIssue` calls `octokit.rest.issues.create({ owner, repo, title, body, labels })`. Error handling maps HTTP status codes to user-facing messages:

| Status | Message                                                       |
| ------ | ------------------------------------------------------------- |
| 401    | "GitHub authentication failed. Invalid token."                |
| 403    | "GitHub permission denied. Token lacks required permissions." |
| 404    | "GitHub repository not found. Check configuration."           |
| 429    | "GitHub API rate limit exceeded. Please try again later."     |
| other  | "Failed to create GitHub issue. Please try again."            |

## Exports

- `class GitHubService`
- `interface GitHubIssueResponse`
- `const githubService` — singleton instance created at module load.
