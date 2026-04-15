# /api/auth/[...nextauth]

**Source:** `frontend/app/api/auth/[...nextauth]/route.ts`

NextAuth dynamic catch-all route. Exports `authOptions` plus `GET` and `POST` handlers (both bound to `NextAuth(authOptions)`). Other API routes import `authOptions` to call `getServerSession(authOptions)`.

## Provider

Single provider: **Google** (`next-auth/providers/google`).

```ts
GoogleProvider({
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authorization: {
    params: {
      prompt: 'consent',
      access_type: 'offline',
      response_type: 'code',
      scope: 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    },
  },
});
```

`prompt: 'consent'` + `access_type: 'offline'` ensures a `refresh_token` is issued on every sign-in so backend cron jobs can continue to use Google APIs.

## Session Strategy

`session.strategy = 'jwt'`. No database adapter — session data lives in the JWT cookie.

## Callbacks

### `signIn({ user, account })`

1. Returns `false` if `user.email` or `user.id` is missing.
2. `User.findByEmail(user.email)`.
3. If not found → builds a `guildId` from `process.env.GUILD_ID` and maps the email to a Discord ID via hard-coded env mapping (`STRAWHATLUKA_EMAIL → STRAWHATLUKA_DISCORD_ID`, `DANDELION_EMAIL → DANDELION_DISCORD_ID`; fallback `STRAWHATLUKA_DISCORD_ID`). Calls `User.create({ google_id, email, name, picture, discord_id, guild_id, refresh_token })`.
4. If found → `User.update(existingUser.id, { name, picture, refresh_token })`, preserving existing values where new values are absent.
5. Errors → logged, returns `false`.

### `jwt({ token, account, user })`

On initial sign-in only (`account && user`): augments the token with `googleAccessToken`, `googleRefreshToken`, `email`, `name`, `picture`. Subsequent calls pass the token through unchanged.

### `session({ session, token })`

Copies `googleAccessToken`, `googleRefreshToken`, and user fields from the JWT onto the `session` object exposed to the client.

## Pages

- `signIn: '/login'`
- `error: '/login'`

## Secret

`process.env.NEXTAUTH_SECRET` — required for JWT signing.

## Environment Variables

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | OAuth client id (public) |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `NEXTAUTH_SECRET` | JWT signing secret |
| `GUILD_ID` | Default guild id for new users |
| `STRAWHATLUKA_EMAIL`, `STRAWHATLUKA_DISCORD_ID` | Hard mapping for primary user |
| `DANDELION_EMAIL`, `DANDELION_DISCORD_ID` | Hard mapping for secondary user |

## Link to Backend

The backend Discord bot + Supabase share the `users` table with the frontend. `User.findByEmail` / `User.create` / `User.update` are supplied by `supabase/models/User` (aliased as `@database/models/User`).
