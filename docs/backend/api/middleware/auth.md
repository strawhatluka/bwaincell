# HTTP Basic Auth Middleware (Legacy)

**Source:** `backend/src/api/middleware/auth.ts`
**Export:** `authenticateUser(req, res, next): void` and interface `AuthenticatedRequest`.

Legacy HTTP Basic auth middleware for the dashboard. The active auth path is OAuth (see [oauth.md](./oauth.md)); this middleware exists for any route still using `Authorization: Basic <base64>` and for local development.

## Flow

1. Reads `req.headers.authorization`. If absent or not prefixed with `'Basic '`, responds `401 { success: false, error: 'Unauthorized - Basic authentication required' }` and returns.
2. Base64-decodes the credential, splits on `:` into `username:password`.
3. Looks up `username.toLowerCase()` in the in-file `USERS` map:

   ```ts
   const USERS = {
     strawhatluka: { password: STRAWHATLUKA_PASSWORD, discordId: STRAWHATLUKA_DISCORD_ID, guildId: GUILD_ID },
     dandelion:    { password: DANDELION_PASSWORD,   discordId: DANDELION_DISCORD_ID,   guildId: GUILD_ID },
   };
   ```

4. If user unknown or password mismatch → `401 { success: false, error: 'Invalid credentials' }`.
5. If `discordId` or `guildId` is missing from env → `500 { success: false, error: 'Server configuration error' }`.
6. Attaches `req.user = { username, discordId, guildId }` and calls `next()`.

## `AuthenticatedRequest`

```ts
export interface AuthenticatedRequest extends Request {
  user: {
    username: string;
    discordId: string;
    guildId: string;
  };
}
```

Note: the OAuth variant of `AuthenticatedRequest` in `oauth.ts` has a different shape (`googleId`, `email`, `name`, `discordId`, `guildId`). Route files import the OAuth version.

## Environment Variables

- `STRAWHATLUKA_PASSWORD`, `STRAWHATLUKA_DISCORD_ID`
- `DANDELION_PASSWORD`, `DANDELION_DISCORD_ID`
- `GUILD_ID`

## Failure Modes

| Condition | Status | Body |
| --------- | ------ | ---- |
| Missing / malformed `Authorization` header | 401 | `Unauthorized - Basic authentication required` |
| Unknown user or wrong password | 401 | `Invalid credentials` |
| User exists but env vars not set | 500 | `Server configuration error` |
| Exception during parsing | 500 | `Authentication failed` |

## Downstream Assumptions

Routes consuming this middleware treat `req.user.guildId` as the tenancy key and `req.user.discordId` as the audit `user_id`. See models under [docs/backend/models/](../../models/README.md).
