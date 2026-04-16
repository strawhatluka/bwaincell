# OAuth Routes

**Source:** `backend/src/api/routes/oauth.ts`
**Mount point:** `/api/auth`

Google Sign-In + JWT refresh for the web dashboard. The server does not hold sessions; it issues short-lived JWT access tokens + long-lived refresh tokens. Emails must be present in `ALLOWED_GOOGLE_EMAILS`.

## Imports

```ts
// backend/src/api/routes/oauth.ts
import { User } from '@database/models/User';
```

Note that `User` is exported as a *named* export (not default) — `@database/models/User` must be imported as `{ User }`. `@database/*` is the path alias defined in `backend/tsconfig.json`.

## Endpoints

### `POST /api/auth/google/verify`

Verify a Google ID token, upsert the `users` row, and return an access + refresh token.

**Auth:** None (this endpoint mints tokens).

**Request body:**

```json
{ "idToken": "<Google ID token from GIS client>" }
```

**Behavior:**

1. `verifyGoogleToken(idToken)` in the oauth middleware calls `google-auth-library` (`OAuth2Client.verifyIdToken`) with `process.env.GOOGLE_CLIENT_ID` as audience.
2. Email whitelist check: rejects if `payload.email` is not in `ALLOWED_GOOGLE_EMAILS` (comma-separated env var).
3. `User.findByGoogleId(googleId)` → create new user or update name/picture. Discord ID mapping uses env vars `STRAWHATLUKA_EMAIL/DISCORD_ID`, `DANDELION_EMAIL/DISCORD_ID`, and `GUILD_ID`.
4. `generateAccessToken({ googleId, email, discordId, guildId })` → JWT, `expiresIn: '1h'`.
5. `generateRefreshToken(googleId)` → JWT, `expiresIn: '7d'`.
6. Persists `refresh_token` on the user row.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "accessToken": "<JWT, 1h>",
    "refreshToken": "<JWT, 7d>",
    "user": { "email": "...", "name": "...", "picture": "..." }
  }
}
```

**Errors:**

- `400` — missing `idToken`.
- `401` — invalid Google token or email not whitelisted.
- `500` — unexpected server error.

---

### `POST /api/auth/refresh`

Exchange a valid refresh token for a new access token.

**Auth:** None (uses the refresh token as proof).

**Request body:**

```json
{ "refreshToken": "<JWT>" }
```

**Behavior:**

1. `jwt.verify(refreshToken, JWT_SECRET)` → extracts `googleId`.
2. Loads the user by `googleId` and verifies the refresh token matches the persisted `users.refresh_token` (rotation-aware).
3. Issues a new 1h access token.

**Response (200):**

```json
{ "success": true, "data": { "accessToken": "<JWT>" } }
```

**Errors:**

- `400` — missing `refreshToken`.
- `401` — invalid / expired / revoked refresh token.

---

### `POST /api/auth/logout`

Invalidate the refresh token on the server by clearing `users.refresh_token`.

**Auth:** None (uses the refresh token as proof; always returns success for UX).

**Request body:**

```json
{ "refreshToken": "<JWT>" }
```

**Response (200):**

```json
{ "success": true, "message": "Logged out successfully" }
```

## Token Lifetimes

| Token   | Lifetime | Signed with  |
| ------- | -------- | ------------ |
| Access  | 1 hour   | `JWT_SECRET` |
| Refresh | 7 days   | `JWT_SECRET` |

`JWT_SECRET` is validated at module load — the process fails fast if the env var is missing.

## Related

- Middleware: [docs/backend/api/middleware/oauth.md](../middleware/oauth.md)
- User model: [docs/backend/models/User.md](../../models/User.md)
