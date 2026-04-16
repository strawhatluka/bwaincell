# Supabase Client

**Source:** `supabase/supabase.ts`

Lazy-initialized singleton `SupabaseClient` used by every model wrapper in `supabase/models/`.

> **Import alias.** Backend code imports the client via the `@database/*` path alias defined in `backend/tsconfig.json` (`"@database/*": ["../supabase/*"]`). The alias is required because `tsc` does not rewrite cross-workspace relative imports at compile time — using a relative `../../supabase/...` path in backend source would break after `tsc --build` and produce a `MODULE_NOT_FOUND` in production.

## Environment Variables

| Var                         | Required  | Notes                                |
| --------------------------- | --------- | ------------------------------------ |
| `SUPABASE_URL`              | yes       | Project URL.[^pi]                    |
| `SUPABASE_SERVICE_ROLE_KEY` | preferred | Used first when present.             |
| `SUPABASE_ANON_KEY`         | fallback  | Used if service role key is not set. |

[^pi]: At Pi runtime the bot runs inside Docker, so `SUPABASE_URL` must be `http://host.docker.internal:54321` rather than `http://127.0.0.1:54321` — see [`docs/backend/supabase/config.md`](./config.md) for the rationale.

Missing both of the keys throws at first access: `"SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) environment variables are required"`.

## Service Role vs Anon Key

`getClient()` prefers `SUPABASE_SERVICE_ROLE_KEY`. Backend workloads (Discord bot + Express API) run with service role to bypass RLS. The Next.js frontend uses the anon key and enforces auth through NextAuth + `supabase/auth`.

## Lazy Initialization

```ts
const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
```

Using a `Proxy` means `import supabase from './supabase'` **never** triggers client creation at module load — only the first method invocation does. This prevents `next build` failures during page-data collection when env vars are absent.

## Client Options

```ts
createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' },
});
```

Tokens are never auto-refreshed or persisted because backend operations use the service role.

## Exports

- `supabase` — default + named; the Proxy-wrapped client.
- `verifyConnection(): Promise<void>` — runs `supabase.from('tasks').select('id').limit(1)`; throws on failure. Used during bot startup.

## Logger

Uses `backend/shared/utils/logger.createLogger('Database')` when available; falls back to `console.*` so the module can be imported from contexts where the backend tree isn't present (e.g., Next.js build without rootDir set).

## Usage Pattern

```ts
import supabase from '@database/supabase';
// Or, via the internal workspace package entry point (re-exports the same client):
// import supabase from '@database/index';

const { data, error } = await supabase.from('tasks').select('*').eq('guild_id', guildId);
```

Both forms resolve to the same lazy `Proxy`-wrapped singleton. `@database/supabase` is the direct module; `@database/index` re-exports `supabase` (and all model wrappers) from `supabase/index.ts` and is the canonical form when a file also needs model imports.

Model wrappers (`supabase/models/Task.ts`, etc.) encapsulate these queries as static methods (`Task.createTask`, `Task.getUserTasks`, …).
