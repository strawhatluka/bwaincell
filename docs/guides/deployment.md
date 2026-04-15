# Deployment Guide

**Version:** 2.1.2
**Last Updated:** 2026-04-15

Bwaincell runs as three cooperating artifacts:

- **Backend** (Express + Discord bot, single Node process) — deployed via Docker on a **Raspberry Pi 4B**.
- **Supabase** — self-hosted on the **same Pi** as the backend; `SUPABASE_URL=http://127.0.0.1:54321`.
- **Frontend** (Next.js PWA) — deployed to **Vercel**.

CI/CD is GitHub Actions (`.github/workflows/deploy.yml`): on release, SSH into the Pi to deploy the backend + Supabase, and deploy the frontend to Vercel in parallel.

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

The Pi runs both the backend container **and** the Supabase stack on loopback (`127.0.0.1:54321`).

```bash
ssh pi@<pi-host>
git clone https://github.com/lukadfagundes/bwaincell.git ~/bwaincell
cd ~/bwaincell
cp .env.example .env               # fill in production values (see section 3)
chmod 600 .env
npm install
npm run supabase:start             # starts Supabase stack via the CLI (Docker)
npm run supabase:status            # note the API URL and keys — paste into .env
supabase db push                   # apply migrations
```

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

SUPABASE_URL=http://127.0.0.1:54321
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

```bash
ssh pi@<pi-host>
cd ~/bwaincell
git pull
docker compose build
docker compose up -d                # starts backend (and frontend if included in the compose file)
docker compose logs -f backend      # tail to confirm healthy startup
```

Health check: `curl http://localhost:3000/health` should return `{"status":"healthy",...}`.

The backend container connects to Supabase at `127.0.0.1:54321`, which is the Pi’s Supabase stack started in Section 2.

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

**Vercel:**

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

See the comments at the bottom of [.env.example](../../.env.example) for the canonical list.

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

- **Backend:** `git checkout <previous-sha> && docker compose up -d --build`
- **Supabase:** add a reverse migration (see [database-migrations.md](database-migrations.md)) — do not edit applied migrations
- **Frontend:** Vercel → Deployments → "Promote to Production" on a prior deployment

---

## Related Documentation

- [Getting Started](getting-started.md)
- [Database Migrations](database-migrations.md)
- [CI/CD Pipeline](ci-cd-pipeline.md)
- [Security Best Practices](security-best-practices.md)
