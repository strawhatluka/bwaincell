# lib/google

**Source:** `frontend/lib/google/`

Google integration helpers used by the frontend. The directory supports the NextAuth Google provider flow and any client-side helpers that talk directly to Google APIs using the `googleAccessToken` stored on the NextAuth session (see [../api/auth.md](../api/auth.md) and [api.md](./api.md)).

## Setup Requirements

Environment variables (server-side) — shared with the NextAuth route:

| Var                            | Purpose                   |
| ------------------------------ | ------------------------- |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | OAuth client id (public). |
| `GOOGLE_CLIENT_SECRET`         | OAuth client secret.      |
| `NEXTAUTH_SECRET`              | JWT signing secret.       |

The Google OAuth consent screen is configured in the Google Cloud Console; the redirect URI must match the Next.js route `/api/auth/callback/google`.

## Authorization Scopes

Requested by the NextAuth provider:

- `openid`
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`

These scopes are sufficient for sign-in and profile information. Additional scopes (e.g., Calendar, Drive) must be added to `authorization.params.scope` in `app/api/auth/[...nextauth]/route.ts` before a helper in this directory can call them.

## Session Token Access

The `googleAccessToken` and `googleRefreshToken` values are exposed on the NextAuth session by the `jwt` and `session` callbacks in `[...nextauth]/route.ts`. Any helper here that needs to call Google APIs should use `getSession()` (client) or `getServerSession(authOptions)` (server) to retrieve those tokens and then call the Google API endpoint directly.

## Related

- Backend Google integration (server-side `googleapis`): [../../backend/services/googleServices.md](../../backend/services/googleServices.md)
- NextAuth route: [../api/auth.md](../api/auth.md)
