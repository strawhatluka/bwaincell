# Deployment Guide

**Version:** 2.2.0
**Last Updated:** 2026-04-16

Bwaincell runs as three cooperating artifacts:

- **Backend** (Express + Discord bot, single Node process) — built on GitHub Actions (arm64 via Buildx + QEMU), published to **GHCR** (`ghcr.io/strawhatluka/bwaincell-backend`), and pulled by the **Raspberry Pi 4B** at deploy time.
- **Supabase** — self-hosted on the **same Pi** as the backend. Inside the bot container `SUPABASE_URL=http://host.docker.internal:54321` (the container reaches Kong on the Pi host via the `host-gateway` alias).
- **Frontend** (Next.js PWA) — deployed to **Vercel**.

CI/CD is GitHub Actions (`.github/workflows/deploy.yml`): on release, the workflow builds the bot image on an `ubuntu-latest` runner, pushes it to GHCR, SSHes into the Pi to start Supabase and apply migrations, then pulls the prebuilt image on the Pi and starts the backend. The frontend deploys to Vercel in parallel.

---

## 1. Prerequisites

- A Raspberry Pi 4B (64-bit OS) reachable via SSH
- Docker + Docker Compose installed on the Pi
- **Supabase CLI** installed on the Pi (for `supabase start` / `supabase db push`)
- A Vercel account linked to the repo
- A registered Discord application (bot token, client ID)
- A Google Cloud project with OAuth 2.0 credentials
- A Gemini API key (`@google/genai`)

---

## 2. Supabase: Choose Your Environment Model

Two common shapes — we use **Option B** in production.

### Option A — Hosted Supabase (simpler)

Create a project at supabase.com and link it locally:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push            # applies supabase/migrations/*.sql to the hosted DB
```

Use this for staging if you want the simplest operational story.

### Option B — Self-Hosted Supabase on the Pi (current production)

The Pi runs both the backend container **and** the Supabase stack. Supabase Kong binds to `127.0.0.1:54321` on the **Pi host**. The backend runs inside a Docker container, so _from inside the container_ `127.0.0.1` is the container itself, not the Pi — use `host.docker.internal:54321` instead.

```bash
ssh pi@<pi-host>
git clone https://github.com/strawhatluka/bwaincell.git ~/bwaincell
cd ~/bwaincell
cp .env.example .env               # fill in production values (see section 3)
chmod 600 .env
npm install
npm run supabase:start             # starts Supabase stack via the CLI (Docker)
npm run supabase:status            # note the API URL and keys — paste into .env
supabase db push                   # apply migrations
```

#### Container-to-host networking on the Pi

`docker-compose.yml` configures the `backend` service with:

```yaml
extra_hosts:
  - 'host.docker.internal:host-gateway'
```

This makes `host.docker.internal` resolve to the Pi host's gateway IP from inside the bot container. Because of this, the `SUPABASE_URL` used by the bot **must** be `http://host.docker.internal:54321` — `http://127.0.0.1:54321` will fail with `ECONNREFUSED` inside the container.

> `http://127.0.0.1:54321` remains correct for **local developer workflows** (running `supabase start` + `npm run dev` outside Docker) and for the healthcheck curl the deploy workflow runs _from the Pi host itself_. It is only the containerized bot that needs `host.docker.internal`.

For separate dev/staging/prod environments, create a separate Supabase project (hosted or self-hosted) per environment and keep three distinct `.env` files / GitHub Actions environments with their own `SUPABASE_*` secrets.

---

## 3. Production `.env` (Pi)

Required keys (see [.env.example](../../.env.example) for the full canonical list):

```env
NODE_ENV=production
DEPLOYMENT_MODE=pi

BOT_TOKEN=...
CLIENT_ID=...
GUILD_ID=...
DEFAULT_REMINDER_CHANNEL=...

USER1_EMAIL=...
USER1_DISCORD_ID=...
USER2_EMAIL=...
USER2_DISCORD_ID=...

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ALLOWED_GOOGLE_EMAILS=user1@gmail.com,user2@gmail.com

JWT_SECRET=...              # openssl rand -base64 32
NEXTAUTH_SECRET=...         # openssl rand -base64 32

API_PORT=3000
PORT=3000

SUPABASE_URL=http://host.docker.internal:54321   # containerized bot → Pi host Kong
SUPABASE_ANON_KEY=...       # from `supabase status`
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_DB_PASSWORD=...    # strong password

TIMEZONE=America/Los_Angeles

GITHUB_TOKEN=...
GITHUB_REPO_OWNER=...
GITHUB_REPO_NAME=Bwaincell

GEMINI_API_KEY=...
LOCATION_ZIP_CODE=...
```

---

## 4. Backend Deployment (Raspberry Pi)

The bot image is built on GitHub Actions (arm64 via Buildx + QEMU) and pushed to `ghcr.io/strawhatluka/bwaincell-backend:latest` (also tagged with the triggering git SHA). The Pi only pulls; no local build runs on the Pi.

```bash
ssh pi@<pi-host>
cd ~/bwaincell
git pull                                                   # only needed for docker-compose.yml + supabase/ migrations
echo "$PI_GHCR_TOKEN" | docker login ghcr.io \
    -u strawhatluka --password-stdin                       # one-time — docker caches credentials
docker compose pull backend                                # pull prebuilt arm64 image from GHCR
docker compose up -d                                       # starts backend (no build step)
docker compose logs -f backend                             # tail to confirm healthy startup
```

Health check: `curl http://localhost:3000/health` should return `{"status":"healthy",...}`.

The backend container connects to Supabase at `http://host.docker.internal:54321`, which resolves (via `extra_hosts: host-gateway`) to the Pi's host loopback where the self-hosted Supabase Kong is listening on `:54321`.

---

## 5. Frontend Deployment (Vercel)

One-time link:

```bash
cd frontend
vercel login
vercel link
cat .vercel/project.json            # copy orgId + projectId to GitHub secrets
```

Vercel environment variables (Dashboard → Settings → Environment Variables):

- `NEXTAUTH_URL=https://bwaincell.sunny-stack.com`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `SUPABASE_URL` (public IP of the Pi, `http://<pi-public-ip>:54321` if exposed, or a separate hosted Supabase URL)
- `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (service role only on the server side)
- `GUILD_ID`, `USER1_EMAIL`, `USER1_DISCORD_ID`, `USER2_EMAIL`, `USER2_DISCORD_ID`

Publishing a GitHub release triggers the `deploy-vercel` job.

---

## 6. GitHub Actions Secrets

Set under **Repo → Settings → Secrets and variables → Actions**:

**Pi deployment:**

- `PI_HOST` (public IP)
- `PI_USERNAME`
- `PI_SSH_KEY` (entire private key including BEGIN/END lines)
- `PI_SSH_PASSPHRASE` (optional)
- `PI_SSH_PORT` (optional)
- `PI_GHCR_TOKEN` — GitHub Personal Access Token (classic) with `read:packages` scope. Used by the `deploy-bot` workflow to `docker login ghcr.io` on the Pi so it can pull the prebuilt `bwaincell-backend` image. Generate at https://github.com/settings/tokens/new.

**Vercel:**

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

See the comments at the bottom of [.env.example](../../.env.example) for the canonical list (including the full `PI_GHCR_TOKEN` block and one-time `docker login` instructions).

---

## 7. Post-Deploy Validation

```bash
# Backend health
curl https://<backend-host>/health

# Supabase reachable from the Pi
npm run supabase:status

# PWA loads and Google OAuth sign-in works end-to-end
# Discord bot responds to /task in the production guild
```

---

## 8. Rollback

### Backend (bot image)

The deploy workflow has an automatic `rollback` job that runs when `deploy-bot` fails. It re-tags the previously deployed `:backup` image as `:latest` and restarts the container. No manual action is required in the normal failure case.

For **manual** rollback (e.g., observed regression after a successful deploy):

```bash
# SSH to the Pi
ssh pi@<pi-host>
cd ~/bwaincell

# Option A — restore the most recently backed-up image (from the previous deploy):
REF=$(cat .bot-image-ref)   # e.g. ghcr.io/strawhatluka/bwaincell-backend
docker tag "${REF}:backup" "${REF}:latest"
docker compose up -d

# Option B — roll back to a specific prior commit:
#   Every successful build pushes :latest AND :<git-sha> to GHCR, so any prior commit is retrievable.
docker pull ghcr.io/strawhatluka/bwaincell-backend:<prior-sha>
docker tag ghcr.io/strawhatluka/bwaincell-backend:<prior-sha> \
           ghcr.io/strawhatluka/bwaincell-backend:latest
docker compose up -d
```

### Supabase

Add a reverse migration (see [database-migrations.md](database-migrations.md)) — do not edit applied migrations. The deploy workflow also snapshots the database (`pg_dump`) before each deploy into `~/bwaincell-backups/<timestamp>/supabase-pre-deploy.sql`; manual restore is documented in that backup directory but intentionally not automated.

### Frontend

Vercel → Deployments → "Promote to Production" on a prior deployment.

---

## Related Documentation

- [Getting Started](getting-started.md)
- [Database Migrations](database-migrations.md)
- [CI/CD Pipeline](ci-cd-pipeline.md)
- [Security Best Practices](security-best-practices.md)
