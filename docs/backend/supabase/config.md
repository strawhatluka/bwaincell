# supabase/config.toml

**Source:** `supabase/config.toml`

Controls local Supabase CLI behavior (`supabase start`, `supabase db reset`, etc.). Does not affect production; production is configured via Supabase dashboard.

## `project_id`

`"bwaincell"` — namespace prefix for Docker containers spun up by the CLI.

## `[api]`

| Key | Value | Meaning |
|---|---|---|
| `enabled` | `true` | PostgREST is exposed. |
| `port` | `54321` | Local API port. |
| `schemas` | `["public", "graphql_public"]` | Schemas auto-exposed by PostgREST. |
| `extra_search_path` | `["public", "extensions"]` | SQL `search_path` for PostgREST. |
| `max_rows` | `1000` | Cap on rows returned per request. |

### `[api.tls]`

`enabled = false` — plaintext local API (expected for dev).

## `[db]`

| Key | Value | Meaning |
|---|---|---|
| `port` | `5433` | Local Postgres port (avoids conflict with a local `postgres` on 5432). |
| `shadow_port` | `54320` | Shadow DB used during migration diffing. |
| `health_timeout` | `"2m"` | CLI startup wait. |
| `major_version` | `15` | Postgres 15. |

### `[db.pooler]` (disabled)

PgBouncer pooler disabled locally (`enabled = false`, port `54329`, `pool_mode = "transaction"`, `default_pool_size = 20`, `max_client_conn = 100`).

### `[db.migrations]`

`enabled = true`, `schema_paths = []` — migrations picked up from default `supabase/migrations/`.

### `[db.seed]`

`enabled = true`, `sql_paths = ["./seed.sql"]` — runs on `supabase db reset`.

## Disabled Services

- `[realtime] enabled = false`
- `[inbucket] enabled = false` (email testing)
- `[storage] enabled = false`
- `[edge_runtime] enabled = false`
- `[analytics] enabled = false`

## Enabled Services

- `[studio] enabled = true, port = 54323, api_url = "http://127.0.0.1"` — local Studio UI.
- `[auth] enabled = true` — local GoTrue.

## Relationship to code

`SUPABASE_URL` in `.env` should point to `http://127.0.0.1:54321` during local development; the app reads that variable via `supabase/supabase.ts` (see [client.md](./client.md)).
