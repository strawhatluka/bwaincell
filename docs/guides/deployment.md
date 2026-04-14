# Deployment Guide

**Version:** 2.0.0
**Last Updated** 2026-01-12
**Target Platform:** Raspberry Pi 4B (4GB RAM)
**Deployment Method:** Docker Compose + GitHub Actions

## Overview

This guide walks you through deploying Bwaincell to a Raspberry Pi 4B using Docker Compose for local deployment and GitHub Actions for automated CI/CD. The architecture deploys the backend (Discord Bot + Express API) and PostgreSQL database on the Raspberry Pi, while the frontend PWA deploys separately to Vercel.

**Deployment Architecture:**

- **Backend:** Discord Bot + Express API → Raspberry Pi (Docker)
- **Database:** PostgreSQL 15 → Raspberry Pi (Docker)
- **Frontend:** Next.js 14.2 PWA → Vercel
- **CI/CD:** GitHub Actions → Auto-deploy to Pi on push

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Raspberry Pi Setup](#raspberry-pi-setup)
3. [Database Configuration](#database-configuration)
4. [Environment Variables](#environment-variables)
5. [Docker Deployment](#docker-deployment)
6. [GitHub Actions CI/CD](#github-actions-cicd)
7. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
8. [Process Management](#process-management)
9. [SSL/TLS Configuration](#ssltls-configuration)
10. [Monitoring and Logs](#monitoring-and-logs)
11. [Backup and Recovery](#backup-and-recovery)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Hardware Requirements

**Raspberry Pi 4B Specifications:**

- Model: Raspberry Pi 4B
- RAM: 4GB minimum (recommended)
- Storage: 32GB microSD card or SSD (SSD strongly recommended for database performance)
- Network: Ethernet connection recommended (WiFi supported)
- Power Supply: Official Raspberry Pi 4 power supply (5V 3A USB-C)

**Optional Accessories:**

- Heatsink or cooling fan (recommended for 24/7 operation)
- Case with ventilation
- UPS for power protection

### Software Requirements

**On Your Local Machine:**

- Git
- SSH client
- Text editor (VS Code, Sublime Text, etc.)

**On Raspberry Pi:**

- Raspberry Pi OS (Debian-based) or Ubuntu Server 22.04 LTS
- Docker and Docker Compose
- Git

### Account Requirements

- Discord Developer Account (for bot token)
- Google Cloud Console Account (for OAuth credentials)
- GitHub Account (for CI/CD)
- Vercel Account (for frontend deployment)

---

## Raspberry Pi Setup

### Step 1: Operating System Installation

**Option A: Raspberry Pi OS (Recommended for beginners)**

1. Download Raspberry Pi Imager:
   - [https://www.raspberrypi.com/software/](https://www.raspberrypi.com/software/)

2. Flash OS to microSD card:
   - Select "Raspberry Pi OS (64-bit)" or "Raspberry Pi OS Lite (64-bit)"
   - Choose storage device
   - Click "Settings" (gear icon) to configure:
     - Set hostname: `sunny-pi` (or your preferred name)
     - Enable SSH with password authentication
     - Set username: `pi` (or your preferred username)
     - Set password
     - Configure WiFi (optional)
     - Set locale settings
   - Write image to SD card

3. Boot Raspberry Pi:
   - Insert microSD card into Pi
   - Connect ethernet cable (recommended)
   - Connect power supply
   - Wait 2-3 minutes for first boot

**Option B: Ubuntu Server 22.04 LTS (Recommended for advanced users)**

1. Download Ubuntu Server for Raspberry Pi:
   - [https://ubuntu.com/download/raspberry-pi](https://ubuntu.com/download/raspberry-pi)

2. Flash OS using Raspberry Pi Imager or balenaEtcher

3. Configure cloud-init for SSH and WiFi (if needed)

### Step 2: SSH Access

1. Find your Pi's IP address:

   ```bash
   # On your router admin panel, or use:
   ping sunny-pi.local

   # Or scan network:
   nmap -sn 192.168.1.0/24
   ```

2. SSH into Pi:

   ```bash
   ssh pi@192.168.1.100
   # Or using hostname:
   ssh pi@sunny-pi.local
   ```

3. Update system packages:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

### Step 3: Install Docker

1. Install Docker using convenience script:

   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   ```

2. Add user to docker group (avoid sudo for docker commands):

   ```bash
   sudo usermod -aG docker $USER
   ```

3. Log out and back in for group changes to take effect:

   ```bash
   exit
   # SSH back in
   ssh pi@sunny-pi.local
   ```

4. Verify Docker installation:

   ```bash
   docker --version
   # Expected: Docker version 24.x.x or later

   docker compose version
   # Expected: Docker Compose version v2.x.x or later
   ```

### Step 4: Install Git

```bash
sudo apt install git -y

# Configure Git
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### Step 5: Setup SSH Key (for GitHub)

1. Generate SSH key on Pi:

   ```bash
   ssh-keygen -t ed25519 -C "your@email.com"
   # Press Enter to accept default location
   # Set passphrase (optional but recommended)
   ```

2. Add SSH key to ssh-agent:

   ```bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_ed25519
   ```

3. Copy public key to GitHub:

   ```bash
   cat ~/.ssh/id_ed25519.pub
   # Copy output and add to GitHub: Settings → SSH and GPG keys → New SSH key
   ```

4. Test GitHub connection:
   ```bash
   ssh -T git@github.com
   # Expected: "Hi username! You've successfully authenticated..."
   ```

### Step 6: Static IP Configuration (Optional but Recommended)

**Option A: Router DHCP Reservation**

- Access router admin panel
- Find Pi's MAC address
- Reserve IP address (e.g., 192.168.1.100)

**Option B: Static IP on Pi**

Edit network configuration:

```bash
sudo nano /etc/dhcpcd.conf
```

Add at the end:

```
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

Reboot to apply:

```bash
sudo reboot
```

---

## Database Configuration

### PostgreSQL Setup

Bwaincell uses PostgreSQL 15 running in Docker. The database configuration is handled automatically by docker-compose.yml, but you need to set credentials.

### Environment Variables (Database)

Create `.env` file with database credentials:

```bash
# PostgreSQL Configuration
POSTGRES_USER=bwaincell
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=bwaincell

# Database connection string (for backend)
DATABASE_URL=postgresql://bwaincell:your_secure_password_here@postgres:5432/bwaincell
```

**Security Best Practices:**

- Use strong passwords (32+ characters, random)
- Generate password: `openssl rand -base64 32`
- Never commit `.env` to Git (already in .gitignore)
- Set file permissions: `chmod 600 .env`

### Database Migrations

Migrations run automatically on backend startup using Sequelize:

```javascript
// backend/database/migrations run automatically
// No manual migration needed
```

**Manual Migration (if needed):**

```bash
# Connect to backend container
docker exec -it bwaincell-backend sh

# Run migrations
npx sequelize-cli db:migrate
```

### Database Backup Configuration

See [Backup and Recovery](#backup-and-recovery) section.

---

## Environment Variables

### Step 1: Copy Example File

On your Raspberry Pi:

```bash
cd ~/bwaincell
cp .env.example .env
```

### Step 2: Configure Environment Variables

Edit `.env` file:

```bash
nano .env
```

### Required Variables

```bash
# =============================================================================
# Discord Bot Configuration (REQUIRED)
# =============================================================================
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_for_testing

# =============================================================================
# User Mapping - Email to Discord ID (REQUIRED for API authentication)
# =============================================================================
USER1_EMAIL=your@email.com
USER1_DISCORD_ID=your_discord_user_id_here
USER2_EMAIL=partner@email.com
USER2_DISCORD_ID=partner_discord_user_id_here

# =============================================================================
# Google OAuth Configuration (REQUIRED for API authentication)
# =============================================================================
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
ALLOWED_GOOGLE_EMAILS=user1@gmail.com,user2@gmail.com

# =============================================================================
# JWT Configuration (REQUIRED for API authentication)
# =============================================================================
JWT_SECRET=generate_with_openssl_rand_base64_32

# =============================================================================
# Database Configuration (PostgreSQL)
# =============================================================================
POSTGRES_USER=bwaincell
POSTGRES_PASSWORD=generate_secure_password_here
POSTGRES_DB=bwaincell

# Database connection string
# Production: Use @postgres:5432 (Docker internal network)
DATABASE_URL=postgresql://bwaincell:${POSTGRES_PASSWORD}@postgres:5432/bwaincell

# =============================================================================
# Application Settings
# =============================================================================
# Timezone for reminders and scheduled tasks
TIMEZONE=America/Chicago

# Discord channel ID for reminder announcements
DEFAULT_REMINDER_CHANNEL=your_channel_id_for_reminders

# Milliseconds before Discord command responses are auto-deleted
DELETE_COMMAND_AFTER=5000

# =============================================================================
# Deployment Configuration (Raspberry Pi)
# =============================================================================
NODE_ENV=production
DEPLOYMENT_MODE=pi
```

### Step 3: Generate Secrets

**JWT Secret:**

```bash
openssl rand -base64 32
# Copy output to JWT_SECRET
```

**PostgreSQL Password:**

```bash
openssl rand -base64 32
# Copy output to POSTGRES_PASSWORD
```

### Step 4: Get Discord Credentials

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create new application or select existing
3. Go to "Bot" section:
   - Click "Reset Token" → Copy to `BOT_TOKEN`
   - Enable "SERVER MEMBERS INTENT"
   - Enable "MESSAGE CONTENT INTENT"
4. Go to "General Information":
   - Copy "Application ID" → `CLIENT_ID`
5. Invite bot to server:
   - Go to "OAuth2" → "URL Generator"
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: All required permissions
   - Copy generated URL and open in browser
   - Select your Discord server
6. Get Guild ID:
   - Enable Developer Mode in Discord: Settings → Advanced → Developer Mode
   - Right-click your server → "Copy Server ID" → `GUILD_ID`
7. Get User IDs:
   - Right-click user avatar → "Copy User ID"
8. Get Channel ID (for reminders):
   - Right-click channel → "Copy Channel ID" → `DEFAULT_REMINDER_CHANNEL`

### Step 5: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google+ API:
   - APIs & Services → Enable APIs and Services
   - Search "Google+ API" → Enable
4. Create OAuth 2.0 credentials:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: Web application
   - Name: "Bwaincell Frontend"
   - Authorized JavaScript origins:
     - `http://localhost:3010` (development)
     - `https://your-domain.vercel.app` (production)
   - Authorized redirect URIs:
     - `http://localhost:3010/api/auth/callback/google` (development)
     - `https://your-domain.vercel.app/api/auth/callback/google` (production)
   - Click "Create"
   - Copy "Client ID" → `GOOGLE_CLIENT_ID`
   - Copy "Client secret" → `GOOGLE_CLIENT_SECRET`

### Step 6: Set File Permissions

```bash
chmod 600 .env
```

This prevents other users from reading sensitive credentials.

---

## Docker Deployment

### Step 1: Clone Repository

```bash
cd ~
git clone git@github.com:lukadfagundes/bwaincell.git
cd bwaincell
```

### Step 2: Verify Configuration Files

**docker-compose.yml:**

```yaml
# Located at project root
# Defines services: postgres, backend
# Volume mappings for persistence
# Network configuration
# Resource limits optimized for Raspberry Pi 4B
```

**backend/Dockerfile:**

```dockerfile
# Multi-stage build for optimized image size
# Node 20 Alpine base image
# Production dependencies only
# Non-root user (1001:1001)
# Health check endpoint
```

### Step 3: Build Backend Image

```bash
# Build backend Docker image
docker compose build backend

# For fresh build (no cache):
docker compose build --no-cache backend
```

**Build Process:**

- Stage 1: Install dependencies (backend, shared)
- Stage 2: Build TypeScript (backend, shared)
- Stage 3: Production image with compiled JS only
- Total build time: 5-10 minutes on Pi 4B

### Step 4: Start Services

```bash
# Start all services (postgres + backend)
docker compose up -d

# View logs
docker compose logs -f

# View backend logs only
docker compose logs -f backend

# View postgres logs only
docker compose logs -f postgres
```

**Startup Sequence:**

1. PostgreSQL starts and runs health check
2. Backend waits for PostgreSQL to be healthy
3. Backend connects to database and runs migrations
4. Discord bot connects to Discord gateway
5. Express API starts on port 3000
6. Health endpoint available at http://localhost:3000/health

### Step 5: Verify Deployment

**Check running containers:**

```bash
docker compose ps
# Expected output:
# NAME                 STATUS              PORTS
# bwaincell-backend    Up X minutes        0.0.0.0:3000->3000/tcp
# bwaincell-db         Up X minutes        0.0.0.0:5433->5432/tcp
```

**Check health endpoint:**

```bash
curl http://localhost:3000/health
# Expected: {"status":"healthy","timestamp":"2026-01-11T..."}
```

**Check Discord bot status:**

- Bot should appear online in Discord server
- Run a test command: `/task list`

**Check database:**

```bash
# Connect to PostgreSQL
docker exec -it bwaincell-db psql -U bwaincell -d bwaincell

# List tables
\dt
# Expected: tasks, lists, notes, reminders, budgets, schedules, users

# Exit
\q
```

### Step 6: Deploy Discord Commands

```bash
# Enter backend container
docker exec -it bwaincell-backend sh

# Deploy commands to guild (testing)
npm run deploy

# Exit container
exit
```

**Command Deployment:**

- Registers 7 slash commands with Discord API
- Commands appear immediately in specified guild
- For global deployment, edit `backend/src/deploy-commands.ts`

### Step 7: Monitor Resource Usage

```bash
# View real-time resource usage
docker stats bwaincell-backend bwaincell-db

# Expected usage (Raspberry Pi 4B, 4GB RAM):
# Backend: ~200-300MB RAM, 5-10% CPU (idle)
# PostgreSQL: ~100-200MB RAM, 1-5% CPU (idle)
```

---

## GitHub Actions CI/CD

### Overview

Automatic deployment on push to `main` branch using GitHub Actions:

1. Push code to GitHub
2. GitHub Actions workflow triggers
3. SSH into Raspberry Pi
4. Pull latest code
5. Rebuild and restart Docker containers

### Step 1: Generate SSH Key (on Pi)

If not already done in Raspberry Pi Setup:

```bash
# On Raspberry Pi
cat ~/.ssh/id_ed25519
# Copy entire output including BEGIN/END lines
```

### Step 2: Configure GitHub Secrets

Go to GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

**PI_HOST** (REQUIRED)

- Value: Pi's IP address (e.g., `192.168.1.100`)
- **Important:** Use IP address, NOT hostname (GitHub Actions cannot resolve local hostnames)

**PI_USERNAME** (REQUIRED)

- Value: SSH username (e.g., `pi`)

**PI_SSH_KEY** (REQUIRED)

- Value: Private SSH key content
- Copy entire output from `cat ~/.ssh/id_ed25519`
- Include `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----` lines

**PI_SSH_PASSPHRASE** (Optional)

- Value: SSH key passphrase if you set one
- Leave blank if no passphrase

**PI_SSH_PORT** (Optional)

- Value: SSH port (default: 22)
- Only needed if using custom SSH port

### Step 3: Verify Workflow File

**.github/workflows/deploy-pi.yml:**

```yaml
name: Deploy to Raspberry Pi

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Raspberry Pi
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PI_HOST }}
          username: ${{ secrets.PI_USERNAME }}
          key: ${{ secrets.PI_SSH_KEY }}
          passphrase: ${{ secrets.PI_SSH_PASSPHRASE }}
          port: ${{ secrets.PI_SSH_PORT || 22 }}
          script: |
            cd ~/bwaincell
            git pull origin main
            docker compose down
            docker compose build --no-cache backend
            docker compose up -d
            docker compose logs --tail=50 backend
```

### Step 4: Test Auto-Deployment

1. Make a change to your code
2. Commit and push to `main` branch:

   ```bash
   git add .
   git commit -m "Test auto-deployment"
   git push origin main
   ```

3. Monitor workflow:
   - Go to GitHub → Actions tab
   - Watch "Deploy to Raspberry Pi" workflow
   - Check logs for errors

4. Verify deployment on Pi:
   ```bash
   docker compose ps
   docker compose logs --tail=50 backend
   ```

### Step 5: Manual Deployment Trigger

You can manually trigger deployment from GitHub:

- Go to Actions tab
- Select "Deploy to Raspberry Pi" workflow
- Click "Run workflow" → Select branch → Run workflow

---

## Frontend Deployment (Vercel)

### Overview

The frontend Next.js PWA deploys separately to Vercel for optimal performance and global CDN distribution.

### Step 1: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub account
3. Authorize Vercel to access your repositories

### Step 2: Import Project

1. Click "Add New..." → Project
2. Import your GitHub repository
3. Configure project:
   - Framework Preset: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

### Step 3: Configure Environment Variables

Add these environment variables in Vercel project settings:

```bash
# NextAuth Configuration
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32

# Backend API URL (points to Raspberry Pi or Fly.io)
NEXT_PUBLIC_API_URL=http://your-pi-ip:3000
# Or use ngrok/Cloudflare Tunnel for public access

# Google OAuth (same as backend)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Step 4: Deploy

Click "Deploy" and wait 2-3 minutes.

### Step 5: Configure Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add custom domain (e.g., `bwaincell.yourdomain.com`)
3. Update DNS records at your domain provider:
   - Type: CNAME
   - Name: `bwaincell`
   - Value: `cname.vercel-dns.com`
4. Wait for DNS propagation (5-30 minutes)

### Step 6: Update Google OAuth Redirect URIs

Add Vercel domain to authorized redirect URIs:

- `https://your-domain.vercel.app/api/auth/callback/google`

---

## Process Management

### Using Docker Compose (Recommended)

Docker Compose handles process management automatically:

**Start services:**

```bash
docker compose up -d
```

**Stop services:**

```bash
docker compose down
```

**Restart services:**

```bash
docker compose restart
```

**View logs:**

```bash
docker compose logs -f
```

**Check status:**

```bash
docker compose ps
```

### Auto-Start on Boot

Docker containers with `restart: unless-stopped` automatically start on Pi reboot.

**Verify auto-start:**

```bash
# Reboot Pi
sudo reboot

# Wait 2 minutes, then SSH back in
ssh pi@sunny-pi.local

# Check containers
docker compose ps
# Should show both containers running
```

### Using PM2 (Alternative for non-Docker deployments)

If deploying without Docker:

```bash
# Install PM2 globally
npm install -g pm2

# Start backend
cd ~/bwaincell/backend
pm2 start dist/src/bot.js --name bwaincell-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow instructions to run suggested command
```

---

## SSL/TLS Configuration

### Option A: Cloudflare Tunnel (Recommended for Pi)

Cloudflare Tunnel provides free HTTPS without exposing Pi to internet.

**Setup:**

1. Install cloudflared on Pi:

   ```bash
   wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
   sudo dpkg -i cloudflared-linux-arm64.deb
   ```

2. Authenticate:

   ```bash
   cloudflared tunnel login
   # Follow browser instructions
   ```

3. Create tunnel:

   ```bash
   cloudflared tunnel create bwaincell
   # Copy tunnel ID
   ```

4. Configure tunnel:

   ```bash
   nano ~/.cloudflared/config.yml
   ```

   ```yaml
   tunnel: your-tunnel-id
   credentials-file: /home/pi/.cloudflared/your-tunnel-id.json

   ingress:
     - hostname: api.yourdomain.com
       service: http://localhost:3000
     - service: http_status:404
   ```

5. Route DNS:

   ```bash
   cloudflared tunnel route dns bwaincell api.yourdomain.com
   ```

6. Run tunnel:

   ```bash
   cloudflared tunnel run bwaincell
   ```

7. Run tunnel as service:
   ```bash
   sudo cloudflared service install
   sudo systemctl start cloudflared
   sudo systemctl enable cloudflared
   ```

### Option B: Let's Encrypt with Nginx Reverse Proxy

**Not recommended for home Pi** (requires port forwarding and domain).

**Setup:**

1. Install Nginx and Certbot:

   ```bash
   sudo apt install nginx certbot python3-certbot-nginx -y
   ```

2. Configure Nginx:

   ```bash
   sudo nano /etc/nginx/sites-available/bwaincell
   ```

   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. Enable site:

   ```bash
   sudo ln -s /etc/nginx/sites-available/bwaincell /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. Get SSL certificate:

   ```bash
   sudo certbot --nginx -d api.yourdomain.com
   ```

5. Auto-renewal:
   ```bash
   sudo systemctl enable certbot.timer
   ```

### Option C: Self-Signed Certificate (Development Only)

**For local testing only:**

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Use in Express
# See backend/src/api/index.ts
```

---

## Monitoring and Logs

### Docker Logs

**View logs:**

```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend

# PostgreSQL only
docker compose logs -f postgres

# Last 100 lines
docker compose logs --tail=100 backend

# Since timestamp
docker compose logs --since=2026-01-11T12:00:00 backend
```

**Log Rotation:**

Docker automatically rotates logs with configuration in docker-compose.yml:

```yaml
logging:
  driver: 'json-file'
  options:
    max-size: '25m' # Max 25MB per log file
    max-file: '3' # Keep 3 rotated files
    compress: 'true' # Compress rotated logs
```

**Total log storage:** 75MB per container (3 files × 25MB)

### Winston Logs (Backend)

Backend uses Winston for structured logging:

**Log Locations:**

- Console: stdout/stderr (captured by Docker)
- File: `~/bwaincell/logs/backend.log` (if volume mounted)

**Log Levels:**

- `error`: Critical errors
- `warn`: Warnings
- `info`: Informational messages
- `debug`: Debugging details

**View Winston logs:**

```bash
# Inside container
docker exec -it bwaincell-backend sh
cat /app/logs/backend.log

# Or if volume mounted
cat ~/bwaincell/logs/backend.log
```

### Resource Monitoring

**Docker stats:**

```bash
docker stats bwaincell-backend bwaincell-db
```

**System monitoring:**

```bash
# CPU, memory, disk
htop

# Disk usage
df -h

# Temperature (Pi-specific)
vcgencmd measure_temp
```

**Monitoring Tools (Optional):**

- **Portainer:** Docker GUI management

  ```bash
  docker volume create portainer_data
  docker run -d -p 9000:9000 --name portainer --restart=always \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v portainer_data:/data \
    portainer/portainer-ce
  ```

  Access: http://sunny-pi.local:9000

- **Grafana + Prometheus:** Advanced metrics dashboard
  (Beyond scope of this guide)

### Health Checks

**Backend health endpoint:**

```bash
curl http://localhost:3000/health
# Response: {"status":"healthy","timestamp":"2026-01-11T..."}
```

**PostgreSQL health check:**

```bash
docker exec bwaincell-db pg_isready -U bwaincell
# Response: /var/run/postgresql:5432 - accepting connections
```

**Discord bot health:**

- Check bot status in Discord (online/offline)
- Run test command: `/task list`

### Alert Setup (Optional)

**Uptime Kuma:**

Free, self-hosted monitoring tool:

```bash
docker run -d --restart=always -p 3001:3001 \
  -v uptime-kuma:/app/data \
  --name uptime-kuma \
  louislam/uptime-kuma:1
```

Access: http://sunny-pi.local:3001

Configure monitors:

- HTTP(s) monitor for health endpoint
- Ping monitor for Pi availability
- Docker monitor for container status

Notifications:

- Email, Discord, Slack, Telegram, etc.

---

## Backup and Recovery

### Database Backup

**Manual Backup:**

```bash
# Backup to file
docker exec bwaincell-db pg_dump -U bwaincell bwaincell > backup_$(date +%Y%m%d_%H%M%S).sql

# Compress backup
gzip backup_$(date +%Y%m%d_%H%M%S).sql
```

**Automated Backup Script:**

Create `~/bwaincell/backup.sh`:

```bash
#!/bin/bash
# Bwaincell Database Backup Script

BACKUP_DIR=~/bwaincell/backups
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/bwaincell_$DATE.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker exec bwaincell-db pg_dump -U bwaincell bwaincell > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Delete backups older than 30 days
find $BACKUP_DIR -name "bwaincell_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

Make executable:

```bash
chmod +x ~/bwaincell/backup.sh
```

**Schedule with Cron:**

```bash
# Edit crontab
crontab -e

# Add line for daily backup at 2 AM
0 2 * * * ~/bwaincell/backup.sh >> ~/bwaincell/backup.log 2>&1
```

### Database Restore

**From backup file:**

```bash
# Decompress backup
gunzip backup_20260111_120000.sql.gz

# Restore to database
cat backup_20260111_120000.sql | docker exec -i bwaincell-db psql -U bwaincell -d bwaincell

# Or using docker compose
docker compose down
docker volume rm bwaincell_postgres-data  # WARNING: Deletes current data
docker compose up -d postgres
# Wait for PostgreSQL to initialize
cat backup_20260111_120000.sql | docker exec -i bwaincell-db psql -U bwaincell -d bwaincell
docker compose up -d backend
```

### Full System Backup

**SD Card Image (Complete Pi backup):**

On your local machine:

```bash
# Shutdown Pi gracefully
ssh pi@sunny-pi.local "sudo shutdown -h now"

# Wait 30 seconds, remove SD card, insert into PC

# Create image (Linux/macOS)
sudo dd if=/dev/sdX of=~/bwaincell-pi-backup.img bs=4M status=progress

# Compress image
gzip ~/bwaincell-pi-backup.img

# Restore (if needed)
gunzip ~/bwaincell-pi-backup.img.gz
sudo dd if=~/bwaincell-pi-backup.img of=/dev/sdX bs=4M status=progress
```

**Files to Backup:**

- `~/bwaincell/.env` - Environment variables
- `~/bwaincell/data/` - Persistent data (if not using Docker volumes)
- `~/bwaincell/logs/` - Log files
- `~/.ssh/` - SSH keys
- Database backups from `~/bwaincell/backups/`

**Remote Backup (rsync):**

```bash
# From your local machine
rsync -avz pi@sunny-pi.local:~/bwaincell/backups/ ~/bwaincell-backups/
```

---

## Troubleshooting

### Common Deployment Issues

#### Issue: "Cannot connect to Docker daemon"

**Symptoms:**

```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Solution:**

```bash
# Check Docker service status
sudo systemctl status docker

# Start Docker if stopped
sudo systemctl start docker

# Enable Docker on boot
sudo systemctl enable docker

# Verify Docker is running
docker ps
```

---

#### Issue: "Port 3000 already in use"

**Symptoms:**

```
Error starting userland proxy: listen tcp4 0.0.0.0:3000: bind: address already in use
```

**Solution:**

```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill process (if needed)
sudo kill -9 <PID>

# Or change port in docker-compose.yml
# ports:
#   - "3001:3000"  # External:Internal
```

---

#### Issue: "Database connection failed"

**Symptoms:**

```
Error: connect ECONNREFUSED 172.18.0.2:5432
```

**Solution:**

```bash
# Check PostgreSQL container status
docker compose ps

# Check PostgreSQL logs
docker compose logs postgres

# Verify DATABASE_URL in .env
# Should use @postgres:5432 (Docker internal network), NOT @localhost

# Correct format:
DATABASE_URL=postgresql://bwaincell:password@postgres:5432/bwaincell

# Test database connection
docker exec -it bwaincell-db psql -U bwaincell -d bwaincell
```

---

#### Issue: "Discord bot offline"

**Symptoms:**

- Bot shows offline in Discord
- Commands don't work

**Solution:**

```bash
# Check backend logs for authentication errors
docker compose logs backend | grep -i "discord\|error"

# Common causes:
# 1. Invalid BOT_TOKEN
nano .env  # Verify BOT_TOKEN

# 2. Missing intents
# Enable in Discord Developer Portal:
# - SERVER MEMBERS INTENT
# - MESSAGE CONTENT INTENT

# 3. Bot not invited to server
# Re-invite bot with correct OAuth URL

# Restart backend
docker compose restart backend
```

---

#### Issue: "Commands not appearing in Discord"

**Symptoms:**

- Slash commands don't show up when typing `/`

**Solution:**

```bash
# Deploy commands
docker exec -it bwaincell-backend sh
npm run deploy
exit

# Check CLIENT_ID and GUILD_ID in .env
nano .env

# Verify bot has "applications.commands" scope
# Re-invite bot if needed

# Wait 1-2 hours for global commands (if deployed globally)
# Guild commands appear instantly
```

---

#### Issue: "Out of memory" on Raspberry Pi

**Symptoms:**

```
npm ERR! code ENOMEM
npm ERR! syscall spawn
Docker: OOM killed
```

**Solution:**

```bash
# Check available memory
free -h

# Increase swap space
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Change CONF_SWAPSIZE=100 to CONF_SWAPSIZE=2048
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Reduce Docker resource limits in docker-compose.yml
# limits:
#   memory: 256M  # Reduce from 512M

# Close unnecessary processes
# Consider using SSD instead of SD card
```

---

#### Issue: "GitHub Actions deployment fails"

**Symptoms:**

- Workflow shows red X
- SSH connection timeout

**Solution:**

```bash
# Verify PI_HOST is IP address, NOT hostname
# GitHub Actions cannot resolve local hostnames

# Check SSH key is correct
ssh -i <path-to-key> pi@192.168.1.100

# Verify Pi is accessible from internet (if using external runner)
# Consider using self-hosted runner on local network

# Check GitHub Actions logs for specific error
# Go to Actions tab → Failed workflow → View logs
```

---

#### Issue: "SSL certificate errors"

**Symptoms:**

```
unable to verify the first certificate
SELF_SIGNED_CERT_IN_CHAIN
```

**Solution:**

```bash
# For development: Set NODE_TLS_REJECT_UNAUTHORIZED=0 (NOT for production)

# For production:
# Use proper SSL certificate (Let's Encrypt, Cloudflare)
# Ensure certificate chain is complete
# Verify certificate expiration date

# Check certificate
openssl s_client -connect api.yourdomain.com:443 -showcerts
```

---

### Performance Optimization

**Docker Optimization:**

- Use multi-stage builds (already implemented)
- Minimize image layers
- Use .dockerignore to exclude unnecessary files
- Prune unused images: `docker image prune -a`

**Database Optimization:**

- Add indexes for frequently queried fields
- Use connection pooling (already configured)
- Monitor slow queries
- Regular VACUUM: `docker exec bwaincell-db psql -U bwaincell -c "VACUUM ANALYZE;"`

**Raspberry Pi Optimization:**

- Use SSD instead of SD card (10x faster)
- Ensure adequate cooling (heatsink/fan)
- Overclock CPU (if needed): `sudo raspi-config` → Performance Options
- Monitor temperature: `vcgencmd measure_temp` (keep under 80°C)

---

### Getting Help

**Documentation:**

- [docs/](../)
- [Getting Started Guide](getting-started.md)
- [Troubleshooting Guide](troubleshooting.md)

**GitHub Issues:**

- [github.com/lukadfagundes/bwaincell/issues](https://github.com/lukadfagundes/bwaincell/issues)

**Discord Community:**

- Join Bwaincell Discord server for support

---

## Quick Reference

### Essential Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f backend

# Restart services
docker compose restart

# Rebuild backend
docker compose build --no-cache backend

# Backup database
docker exec bwaincell-db pg_dump -U bwaincell bwaincell > backup.sql

# Restore database
cat backup.sql | docker exec -i bwaincell-db psql -U bwaincell -d bwaincell

# Check health
curl http://localhost:3000/health

# SSH to Pi
ssh pi@sunny-pi.local

# View resource usage
docker stats

# Update code and restart
cd ~/bwaincell
git pull
docker compose down
docker compose build backend
docker compose up -d
```

---

## Appendix A: Port Reference

| Service                      | Internal Port | External Port | Protocol | Purpose                                      |
| ---------------------------- | ------------- | ------------- | -------- | -------------------------------------------- |
| Backend API                  | 3000          | 3000          | HTTP     | Express REST API + Health endpoint           |
| PostgreSQL                   | 5432          | 5433          | TCP      | Database (mapped to 5433 to avoid conflicts) |
| Frontend (Vercel)            | -             | 443           | HTTPS    | Next.js PWA (deployed separately)            |
| Portainer (optional)         | 9000          | 9000          | HTTP     | Docker management GUI                        |
| Cloudflare Tunnel (optional) | -             | 443           | HTTPS    | Secure external access                       |

---

## Appendix B: File Structure

```
~/bwaincell/
├── .env                      # Environment variables (GITIGNORED)
├── .env.example              # Environment template
├── docker-compose.yml        # Docker services configuration
├── package.json              # Monorepo package.json
├── backend/
│   ├── Dockerfile            # Backend container definition
│   ├── src/                  # Backend source code
│   ├── commands/             # Discord slash commands
│   ├── database/             # Sequelize models, schema, migrations
│   └── dist/                 # Compiled TypeScript (generated)
├── frontend/                 # Next.js PWA (deploy to Vercel)
├── shared/                   # Shared TypeScript types
├── data/                     # Persistent data (if volume mounted)
├── logs/                     # Log files (if volume mounted)
└── backups/                  # Database backups (created by script)
```

---

_Last Updated: 2026-01-11_
