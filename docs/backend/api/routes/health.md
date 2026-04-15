# Health Routes

**Source:** `backend/src/api/routes/health.ts`
**Mount point:** `/api/health`

Lightweight authenticated probe. Intended for frontend to verify an OAuth access token is still valid without fetching real data.

## Endpoints

### `GET /api/health/auth`

Authentication health check. Returns 200 when the request's JWT access token is valid.

**Auth:** Required. Bearer token (JWT access token from `/api/auth/google/verify`). Upstream middleware `authenticateToken` (from `backend/src/api/middleware/oauth.ts`) attaches `req.user`.

**Request:** No body.

**Response (200):**

```json
{
  "success": true,
  "authenticated": true,
  "email": "<user email>"
}
```

**Response (401):** When the Authorization header is missing or the JWT is invalid/expired. Emitted by the OAuth middleware before the handler runs.

```json
{ "success": false, "message": "Authorization required" }
```

## Middleware

See [docs/backend/api/middleware/oauth.md](../middleware/oauth.md).

## Example

```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  https://host/api/health/auth
```
