# OAuth Middleware

**Source:** `backend/src/api/middleware/oauth.ts`

Google Sign-In + JWT middleware used by the REST API. Issues and verifies short-lived access tokens and long-lived refresh tokens.

## Exports

| Symbol                 | Signature                                                                | Purpose                                                       |
| ---------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `AuthenticatedRequest` | interface extending `express.Request`                                    | Adds `user: { googleId, email, name, discordId, guildId }`    |
| `verifyGoogleToken`    | `(token: string) => Promise<{ googleId, email, name, picture } \| null>` | Verifies a Google ID token via `google-auth-library`          |
| `generateAccessToken`  | `(user: { googleId, email, discordId, guildId }) => string`              | Signs a JWT, `expiresIn: '1h'`                                |
| `generateRefreshToken` | `(googleId: string) => string`                                           | Signs a JWT, `expiresIn: '7d'`                                |
| `authenticateToken`    | `(req, res, next): Promise<void>`                                        | Express middleware — verifies Bearer JWT, attaches `req.user` |

## `verifyGoogleToken` Flow

1. `OAuth2Client(GOOGLE_CLIENT_ID).verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })`.
2. Enforces email whitelist: `ALLOWED_GOOGLE_EMAILS` (comma-separated env var) — rejects if `payload.email` not present. Logs a warn and returns `null`.
3. Returns `{ googleId: payload.sub, email, name, picture }` on success, `null` on any failure.

## `authenticateToken` Flow

1. Requires `Authorization: Bearer <jwt>` header. Missing/malformed → `401 { success: false, message: 'Authorization required' }`.
2. `jwt.verify(token, JWT_SECRET)` → extracts `{ googleId, email, discordId, guildId }`.
3. Attaches `(req as AuthenticatedRequest).user` and calls `next()`.
4. Invalid/expired signature → `401 { success: false, message: 'Invalid or expired token' }`.

## Interaction with `auth.ts`

`auth.ts` (HTTP Basic) is legacy. Current routes under `/api/*` use `authenticateToken` from this file. Both attach `req.user.discordId` + `req.user.guildId`, but the field sets differ (`email`, `name`, `googleId` only exist on the OAuth form). Route handlers treat `req.user` via the OAuth `AuthenticatedRequest` shape.

## Environment Variables

| Var                     | Purpose                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `GOOGLE_CLIENT_ID`      | Google OAuth client, also the audience for `verifyIdToken`         |
| `ALLOWED_GOOGLE_EMAILS` | Comma-separated email whitelist                                    |
| `JWT_SECRET`            | HS256 secret for access + refresh tokens; validated at module load |

## Token Shape

```
{
  googleId: string,   // Google 'sub'
  email:    string,
  discordId: string,  // resolved from email-to-Discord env mapping
  guildId:  string,
  iat, exp
}
```

## Related

- Endpoints: [docs/backend/api/routes/oauth.md](../routes/oauth.md)
- User model: [docs/backend/models/User.md](../../models/User.md)
