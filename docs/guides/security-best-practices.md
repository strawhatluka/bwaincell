# Security Best Practices

Comprehensive security guide for Bwaincell - protecting your productivity platform from vulnerabilities.

## Table of Contents

1. [OWASP Top 10 Mitigation](#owasp-top-10-mitigation)
2. [JWT Security](#jwt-security)
3. [OAuth2 Security](#oauth2-security)
4. [Secrets Management](#secrets-management)
5. [Input Validation](#input-validation)
6. [SQL Injection Prevention](#sql-injection-prevention)
7. [XSS Prevention](#xss-prevention)
8. [CSRF Protection](#csrf-protection)
9. [Rate Limiting](#rate-limiting)
10. [Dependency Security](#dependency-security)
11. [Security Headers](#security-headers)
12. [HTTPS/TLS Configuration](#httpstls-configuration)
13. [Database Security](#database-security)
14. [Discord Bot Security](#discord-bot-security)
15. [Security Checklist](#security-checklist)

---

## OWASP Top 10 Mitigation

### A01:2021 – Broken Access Control

**Risk:** Unauthorized users accessing restricted resources

**Bwaincell Implementation:**

```typescript
// backend/src/api/middleware/auth.ts
export function authenticateUser(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    logger.warn('[AUTH] Missing or invalid authorization header', {
      path: req.path,
      ip: req.ip,
    });

    res.status(401).json({
      success: false,
      error: 'Unauthorized - Basic authentication required',
    });
    return;
  }

  // Parse and validate credentials
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  const user = USERS[username.toLowerCase()];

  if (!user || user.password !== password) {
    logger.warn('[AUTH] Invalid credentials', {
      username: username,
      path: req.path,
      ip: req.ip,
    });

    res.status(401).json({
      success: false,
      error: 'Invalid credentials',
    });
    return;
  }

  // Attach user context to request
  (req as AuthenticatedRequest).user = {
    username: username.toLowerCase(),
    discordId: user.discordId,
    guildId: user.guildId,
  };

  next();
}
```

**Best Practices:**

- Always validate authorization headers before processing requests
- Log authentication failures for security monitoring
- Attach user context to requests for downstream authorization checks
- Never expose internal error details to clients
- Use HTTP 401 (Unauthorized) for authentication failures
- Use HTTP 403 (Forbidden) for authorization failures

**User Isolation Strategy:**

Bwaincell implements user isolation using Discord User IDs:

```typescript
// All database queries filtered by Discord User ID
const tasks = await Task.findAll({
  where: {
    discordUserId: req.user.discordId, // User isolation
    completed: false,
  },
});
```

**Why Discord User ID?**

- Unique identifier across Discord platform
- No PII (personally identifiable information) exposure
- Consistent identity across bot commands and API
- Enables seamless integration between Discord and PWA

### A02:2021 – Cryptographic Failures

**Risk:** Exposure of sensitive data (passwords, tokens, API keys)

**Bwaincell Protections:**

```bash
# .env file (NEVER commit to git)
JWT_SECRET=your_secure_random_secret_here
BOT_TOKEN=your_discord_bot_token_here
GOOGLE_CLIENT_SECRET=your_google_oauth_secret_here
POSTGRES_PASSWORD=your_database_password_here

# Generate secure secrets:
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For NEXTAUTH_SECRET
```

**.gitignore Protection:**

```gitignore
# Environment files (CRITICAL - never commit secrets)
.env
.env.local
.env.production
.env.test

# Backup files that might contain secrets
*.backup
*.bak
```

**Encryption at Rest:**

```yaml
# docker-compose.yml - PostgreSQL data encryption
volumes:
  postgres-data:
    driver: local
    labels:
      com.bwaincell.description: 'PostgreSQL production database storage'
```

**Encryption in Transit:**

```typescript
// All API requests must use HTTPS in production
if (process.env.NODE_ENV === 'production' && req.protocol !== 'https') {
  return res.redirect(301, `https://${req.headers.host}${req.url}`);
}
```

### A03:2021 – Injection

**Risk:** SQL injection, command injection, NoSQL injection

**Bwaincell Protections:**

See [SQL Injection Prevention](#sql-injection-prevention) section below.

### A04:2021 – Insecure Design

**Risk:** Missing security controls in design phase

**Bwaincell Architecture Security:**

1. **Three-Interface Pattern Security:**
   - Discord Bot: Discord API security (OAuth2, gateway)
   - REST API: Basic Auth + JWT + rate limiting
   - PWA: NextAuth.js + Google OAuth2

2. **User Isolation:**
   - All database queries filtered by Discord User ID
   - No cross-user data leakage
   - Shared Discord server (guild) scope

3. **Monorepo Security:**
   - Shared types prevent type mismatches
   - Centralized security utilities
   - Consistent validation across services

### A05:2021 – Security Misconfiguration

**Risk:** Default credentials, verbose errors, missing security headers

**Bwaincell Configuration:**

```typescript
// backend/src/api/server.ts
import helmet from 'helmet';

app.use(helmet()); // Security headers middleware

// Disable verbose errors in production
if (process.env.NODE_ENV === 'production') {
  app.use((err, req, res, next) => {
    logger.error('[ERROR] Production error', {
      error: err.message,
      path: req.path,
      method: req.method,
    });

    // Generic error message (don't expose internals)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  });
}
```

**Docker Security Configuration:**

```yaml
# docker-compose.yml
security_opt:
  - no-new-privileges:true # Prevent privilege escalation

user: '1001:1001' # Run as non-root user

deploy:
  resources:
    limits:
      cpus: '1.0' # Limit CPU to prevent DoS
      memory: 512M # Limit memory to prevent DoS
```

### A06:2021 – Vulnerable and Outdated Components

**Risk:** Using components with known vulnerabilities

**Bwaincell Protections:**

See [Dependency Security](#dependency-security) section below.

### A07:2021 – Identification and Authentication Failures

**Risk:** Weak passwords, session fixation, credential stuffing

**Bwaincell Mitigations:**

```typescript
// JWT token expiration (15 minutes)
const token = jwt.sign(
  {
    username: user.username,
    discordId: user.discordId,
  },
  process.env.JWT_SECRET!,
  { expiresIn: '15m' } // Short expiration for security
);

// Refresh token (7 days)
const refreshToken = jwt.sign(
  {
    username: user.username,
    discordId: user.discordId,
  },
  process.env.JWT_SECRET!,
  { expiresIn: '7d' }
);
```

**Google OAuth2 Security:**

```bash
# .env.example
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
ALLOWED_GOOGLE_EMAILS=user1@gmail.com,user2@gmail.com  # Whitelist only
```

### A08:2021 – Software and Data Integrity Failures

**Risk:** Unsigned updates, insecure CI/CD pipelines

**Bwaincell CI/CD Security:**

```yaml
# .github/workflows/ci.yml
jobs:
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine # Official, trusted image
        env:
          POSTGRES_PASSWORD: test_password # Test credentials only
        options: >-
          --health-cmd pg_isready  # Health checks enabled
```

**Pre-commit Hooks:**

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: check-yaml # Validate YAML syntax
      - id: check-json # Validate JSON syntax
      - id: check-merge-conflict # Prevent merge conflicts
```

### A09:2021 – Security Logging and Monitoring Failures

**Risk:** Insufficient logging, no alerting, delayed detection

**Bwaincell Logging:**

See [Monitoring and Logging Guide](monitoring-and-logging.md) for comprehensive logging strategies.

```typescript
// backend/src/api/middleware/auth.ts
logger.warn('[AUTH] Invalid credentials', {
  username: username,
  path: req.path,
  ip: req.ip,
  timestamp: new Date().toISOString(),
});
```

### A10:2021 – Server-Side Request Forgery (SSRF)

**Risk:** Server makes unintended requests to internal resources

**Bwaincell Mitigations:**

```typescript
// Validate external URLs before making requests
function validateExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Block internal networks
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '10.', // Private network
      '172.16.', // Private network
      '192.168.', // Private network
    ];

    return !blockedHosts.some((host) => parsed.hostname.startsWith(host));
  } catch {
    return false; // Invalid URL
  }
}
```

---

## JWT Security

### Token Storage

**Frontend (PWA):**

```typescript
// ❌ NEVER store JWT in localStorage (vulnerable to XSS)
localStorage.setItem('token', jwt); // INSECURE!

// ✅ Store JWT in httpOnly cookies (protected from XSS)
// Set-Cookie: token=<jwt>; HttpOnly; Secure; SameSite=Strict
```

**NextAuth.js Implementation:**

```typescript
// frontend/pages/api/auth/[...nextauth].ts
export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt', // JWT stored in httpOnly cookies
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true, // ✅ Not accessible from JavaScript
        sameSite: 'lax', // ✅ CSRF protection
        path: '/',
        secure: process.env.NODE_ENV === 'production', // ✅ HTTPS only in production
      },
    },
  },
});
```

### Token Expiration

**Short-lived Access Tokens:**

```typescript
// 15 minutes expiration for access tokens
const accessToken = jwt.sign(
  {
    username: user.username,
    discordId: user.discordId,
  },
  process.env.JWT_SECRET!,
  { expiresIn: '15m' }
);
```

**Long-lived Refresh Tokens:**

```typescript
// 7 days expiration for refresh tokens
const refreshToken = jwt.sign(
  {
    username: user.username,
    discordId: user.discordId,
    type: 'refresh',
  },
  process.env.JWT_SECRET!,
  { expiresIn: '7d' }
);
```

### Token Rotation

**Automatic Refresh Flow:**

```typescript
// Frontend: Automatically refresh token before expiration
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const { accessToken } = await response.json();
  return accessToken;
}
```

### JWT Validation

```typescript
// backend/src/api/middleware/jwtAuth.ts
import jwt from 'jsonwebtoken';

export function validateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing JWT token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Attach user to request
    req.user = {
      username: decoded.username,
      discordId: decoded.discordId,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }

    logger.error('[JWT] Token validation failed', { error });
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

## OAuth2 Security

### PKCE (Proof Key for Code Exchange)

**Why PKCE?**

- Prevents authorization code interception attacks
- Required for mobile and single-page applications
- Provides additional security layer for public clients

**Implementation with NextAuth.js:**

```typescript
// frontend/pages/api/auth/[...nextauth].ts
export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          // PKCE enabled by default in NextAuth.js
        },
      },
    }),
  ],
});
```

### State Parameter

**CSRF Protection:**

The `state` parameter prevents CSRF attacks during OAuth flow:

1. Generate random state before redirect:

   ```typescript
   const state = crypto.randomBytes(32).toString('hex');
   sessionStorage.setItem('oauth_state', state);
   ```

2. Include state in authorization URL:

   ```
   https://accounts.google.com/o/oauth2/v2/auth?
     client_id=...&
     redirect_uri=...&
     state=<random_state>&
     ...
   ```

3. Validate state in callback:

   ```typescript
   const receivedState = req.query.state;
   const savedState = sessionStorage.getItem('oauth_state');

   if (receivedState !== savedState) {
     throw new Error('Invalid state parameter - possible CSRF attack');
   }
   ```

### Redirect URI Validation

**Whitelist Allowed Redirects:**

```bash
# .env
NEXTAUTH_URL=https://bwaincell.sunny-stack.com  # Production
# NEXTAUTH_URL=http://localhost:3010  # Development
```

**Validation:**

```typescript
// Validate redirect_uri matches NEXTAUTH_URL
const allowedRedirects = [
  'https://bwaincell.sunny-stack.com',
  'http://localhost:3010', // Development only
];

if (!allowedRedirects.includes(redirectUri)) {
  throw new Error('Invalid redirect_uri');
}
```

### Email Whitelist

**Restrict OAuth to Specific Users:**

```bash
# .env
ALLOWED_GOOGLE_EMAILS=user1@gmail.com,user2@gmail.com
```

```typescript
// Validate user email during OAuth callback
const allowedEmails = process.env.ALLOWED_GOOGLE_EMAILS!.split(',');

if (!allowedEmails.includes(userEmail)) {
  throw new Error('Email not authorized');
}
```

---

## Secrets Management

### Environment Variables

**.env File Structure:**

```bash
# =============================================================================
# Discord Bot Configuration (REQUIRED)
# =============================================================================
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_for_testing

# =============================================================================
# Google OAuth Configuration (REQUIRED for API authentication)
# =============================================================================
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
ALLOWED_GOOGLE_EMAILS=user1@gmail.com,user2@gmail.com

# =============================================================================
# JWT Configuration (REQUIRED for API authentication)
# =============================================================================
# Generate with: openssl rand -base64 32
JWT_SECRET=generate_with_openssl_rand_base64_32

# =============================================================================
# Database Configuration (PostgreSQL)
# =============================================================================
POSTGRES_PASSWORD=your_secure_database_password
DATABASE_URL=postgresql://bwaincell:${POSTGRES_PASSWORD}@localhost:5433/bwaincell
```

### Never Commit Secrets

**.gitignore:**

```gitignore
# Environment files (CRITICAL - never commit secrets)
.env
.env.local
.env.production
.env.test
.env*.local

# Backup files that might contain secrets
*.backup
*.bak
*.sql

# Logs that might contain sensitive data
logs/
*.log
npm-debug.log*

# Database files
*.sqlite
*.db
data/
```

### Generating Secure Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate NextAuth secret
openssl rand -base64 32

# Generate PostgreSQL password
openssl rand -base64 32

# Example output:
# RUhdJ1dZScrHpeiSWImJJx+lPyol+wpt3qoYzsaLMSI=
```

### GitHub Actions Secrets

**DO NOT store secrets in .env for CI/CD:**

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret:
   - `PI_HOST` - Raspberry Pi IP address
   - `PI_USERNAME` - SSH username
   - `PI_SSH_KEY` - Private SSH key
   - `PI_SSH_PASSPHRASE` - SSH key passphrase (if applicable)

### Docker Secrets

```yaml
# docker-compose.yml
services:
  backend:
    env_file:
      - .env # Load secrets from .env file

    environment:
      - NODE_ENV=production
      - DEPLOYMENT_MODE=pi
```

**File Permissions:**

```bash
# Restrict .env file permissions (read/write for owner only)
chmod 600 .env

# Verify permissions
ls -la .env
# Output: -rw------- 1 user user 1234 Jan 11 12:00 .env
```

---

## Input Validation

### Joi Schema Validation

**Install Joi:**

```bash
npm install joi
```

**Task Creation Validation:**

```typescript
// backend/src/api/validation/taskValidation.ts
import Joi from 'joi';

export const createTaskSchema = Joi.object({
  title: Joi.string().min(1).max(255).required().messages({
    'string.empty': 'Task title is required',
    'string.max': 'Task title must not exceed 255 characters',
  }),

  description: Joi.string().max(1000).optional().allow(null, '').messages({
    'string.max': 'Description must not exceed 1000 characters',
  }),

  dueDate: Joi.date().iso().optional().allow(null).messages({
    'date.format': 'Due date must be in ISO 8601 format (YYYY-MM-DD)',
  }),

  priority: Joi.string().valid('low', 'medium', 'high').optional().default('medium').messages({
    'any.only': 'Priority must be one of: low, medium, high',
  }),
});
```

**Middleware Usage:**

```typescript
// backend/src/api/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';

export function validateRequest(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown properties
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('[VALIDATION] Request validation failed', {
        path: req.path,
        errors: errors,
      });

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
}
```

**Route Implementation:**

```typescript
// backend/src/api/routes/tasks.ts
import { validateRequest } from '../middleware/validate';
import { createTaskSchema } from '../validation/taskValidation';

router.post('/tasks', authenticateUser, validateRequest(createTaskSchema), async (req, res) => {
  // req.body is now validated and sanitized
  const task = await Task.create({
    ...req.body,
    discordUserId: req.user.discordId,
  });

  res.json({ success: true, data: task });
});
```

### Sanitization

**HTML Sanitization:**

```typescript
import DOMPurify from 'dompurify';

// Sanitize HTML input to prevent XSS
function sanitizeHTML(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [], // Strip all attributes
  });
}

// Usage
const sanitizedTitle = sanitizeHTML(req.body.title);
```

**SQL Sanitization:**

Sequelize automatically sanitizes SQL queries through parameterized queries:

```typescript
// ✅ SAFE: Sequelize uses parameterized queries
const tasks = await Task.findAll({
  where: {
    discordUserId: req.user.discordId, // Automatically escaped
    title: {
      [Op.like]: `%${searchTerm}%`, // Automatically escaped
    },
  },
});

// ❌ UNSAFE: Never use raw queries without parameterization
const tasks = await sequelize.query(
  `SELECT * FROM tasks WHERE title = '${searchTerm}'` // SQL injection!
);
```

---

## SQL Injection Prevention

### Sequelize Parameterized Queries

**Automatic Parameterization:**

Sequelize ORM automatically parameterizes all queries:

```typescript
// ✅ SAFE: Sequelize automatically escapes parameters
const task = await Task.findOne({
  where: {
    id: req.params.id, // Automatically escaped
    discordUserId: req.user.discordId, // Automatically escaped
  },
});

// ✅ SAFE: Complex queries are also parameterized
const tasks = await Task.findAll({
  where: {
    [Op.and]: [
      { discordUserId: req.user.discordId },
      { completed: false },
      {
        [Op.or]: [
          { title: { [Op.like]: `%${searchTerm}%` } },
          { description: { [Op.like]: `%${searchTerm}%` } },
        ],
      },
    ],
  },
});
```

**Generated SQL (Safe):**

```sql
-- Sequelize generates parameterized queries:
SELECT * FROM tasks
WHERE discord_user_id = $1
  AND completed = $2
  AND (title LIKE $3 OR description LIKE $4);

-- Parameters: ['123456789', false, '%search%', '%search%']
```

### Raw Queries (Use with Caution)

**If you MUST use raw SQL:**

```typescript
// ✅ SAFE: Use replacements for parameterization
const tasks = await sequelize.query(
  'SELECT * FROM tasks WHERE discord_user_id = :discordUserId AND title LIKE :searchTerm',
  {
    replacements: {
      discordUserId: req.user.discordId,
      searchTerm: `%${searchTerm}%`,
    },
    type: QueryTypes.SELECT,
  }
);

// ❌ UNSAFE: String interpolation (SQL injection vulnerability!)
const tasks = await sequelize.query(
  `SELECT * FROM tasks WHERE discord_user_id = '${req.user.discordId}'`
);
```

### PostgreSQL Protections

**Connection String Security:**

```bash
# .env
DATABASE_URL=postgresql://bwaincell:password@localhost:5433/bwaincell?sslmode=require
```

**Least Privilege Principle:**

```sql
-- Create database user with minimal permissions
CREATE USER bwaincell_app WITH PASSWORD 'secure_password';

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bwaincell_app;

-- Revoke dangerous permissions
REVOKE CREATE ON SCHEMA public FROM bwaincell_app;
REVOKE DROP ON ALL TABLES IN SCHEMA public FROM bwaincell_app;
```

---

## XSS Prevention

### Content Security Policy (CSP)

**Helmet.js Implementation:**

```typescript
// backend/src/api/server.ts
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts (Next.js)
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://accounts.google.com'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for external APIs
  })
);
```

### Input Sanitization

**Frontend Sanitization:**

```typescript
// frontend/components/TaskForm.tsx
import DOMPurify from 'dompurify';

function TaskForm() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Sanitize user input before sending to API
    const sanitizedData = {
      title: DOMPurify.sanitize(title, { ALLOWED_TAGS: [] }),
      description: DOMPurify.sanitize(description, { ALLOWED_TAGS: [] }),
    };

    // Send to API
    createTask(sanitizedData);
  };
}
```

### Output Encoding

**React Automatic Escaping:**

React automatically escapes content rendered in JSX:

```tsx
// ✅ SAFE: React automatically escapes XSS
<div>{task.title}</div>

// ❌ UNSAFE: dangerouslySetInnerHTML disables escaping
<div dangerouslySetInnerHTML={{ __html: task.title }} />
```

### X-XSS-Protection Header

```typescript
// Enabled by Helmet.js
app.use(helmet.xssFilter());

// Response headers:
// X-XSS-Protection: 1; mode=block
```

---

## CSRF Protection

### SameSite Cookies

```typescript
// NextAuth.js cookies configuration
cookies: {
  sessionToken: {
    name: `__Secure-next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: 'lax',  // ✅ CSRF protection
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  },
}
```

**SameSite Options:**

- `Strict` - Never sent with cross-site requests (most secure, may break functionality)
- `Lax` - Sent with top-level navigation (recommended for most apps)
- `None` - Sent with all requests (requires `Secure` flag)

### CSRF Tokens (if needed)

**For non-cookie authentication:**

```typescript
// Generate CSRF token
import crypto from 'crypto';

const csrfToken = crypto.randomBytes(32).toString('hex');
res.cookie('csrf-token', csrfToken, { httpOnly: false });

// Validate CSRF token
const receivedToken = req.headers['x-csrf-token'];
const cookieToken = req.cookies['csrf-token'];

if (receivedToken !== cookieToken) {
  throw new Error('CSRF token mismatch');
}
```

---

## Rate Limiting

### Express Rate Limiter

**Install:**

```bash
npm install express-rate-limit
```

**Implementation:**

```typescript
// backend/src/api/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
});

// Authentication rate limiter (stricter)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Task creation rate limiter
export const createTaskLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit to 10 task creations per minute
  message: 'Too many tasks created, please slow down',
});
```

**Usage:**

```typescript
// backend/src/api/routes/tasks.ts
import { apiLimiter, createTaskLimiter } from '../middleware/rateLimiter';

// Apply rate limiters to routes
router.use(apiLimiter); // Apply to all routes

router.post('/tasks', createTaskLimiter, authenticateUser, async (req, res) => {
  // Create task
});
```

### Discord Bot Rate Limiting

**Discord API Rate Limits:**

Discord enforces rate limits on API requests:

- Global: 50 requests per second
- Per-route: Varies by endpoint
- Gateway: 120 commands per 60 seconds per guild

**Handling Rate Limits:**

```typescript
// discord.js automatically handles rate limits
client.on('rateLimit', (rateLimitData) => {
  logger.warn('[DISCORD] Rate limit hit', {
    timeout: rateLimitData.timeout,
    limit: rateLimitData.limit,
    method: rateLimitData.method,
    path: rateLimitData.path,
  });
});
```

---

## Dependency Security

### npm audit

**Check for Vulnerabilities:**

```bash
# Run security audit
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Force fix (may introduce breaking changes)
npm audit fix --force
```

**Example Output:**

```
┌───────────────┬──────────────────────────────────────────────────────────────┐
│ high          │ Prototype Pollution in lodash                                │
├───────────────┼──────────────────────────────────────────────────────────────┤
│ Package       │ lodash                                                       │
├───────────────┼──────────────────────────────────────────────────────────────┤
│ Patched in    │ >=4.17.21                                                    │
├───────────────┼──────────────────────────────────────────────────────────────┤
│ More info     │ https://github.com/advisories/GHSA-xxxx                     │
└───────────────┴──────────────────────────────────────────────────────────────┘
```

### Dependabot

**Enable Dependabot (GitHub):**

1. Go to repository → Settings → Security & analysis
2. Enable "Dependabot alerts"
3. Enable "Dependabot security updates"
4. Enable "Dependabot version updates"

**`.github/dependabot.yml`:**

```yaml
version: 2
updates:
  # Backend dependencies
  - package-ecosystem: 'npm'
    directory: '/backend'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 5

  # Frontend dependencies
  - package-ecosystem: 'npm'
    directory: '/frontend'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 5

  # Root dependencies
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 5
```

### Pin Dependencies

**package.json:**

```json
{
  "dependencies": {
    "express": "4.21.2", // ✅ Exact version (pinned)
    "discord.js": "^14.14.1", // ⚠️ Caret (allows minor updates)
    "sequelize": "~6.37.7" // ⚠️ Tilde (allows patch updates)
  }
}
```

**Best Practices:**

- Pin exact versions for critical dependencies (Express, Sequelize)
- Use `^` for minor updates (Discord.js, Next.js)
- Use `~` for patch updates only
- Test thoroughly before updating major versions

---

## Security Headers

### Helmet.js

**Install:**

```bash
npm install helmet
```

**Full Configuration:**

```typescript
// backend/src/api/server.ts
import helmet from 'helmet';

app.use(
  helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://accounts.google.com'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },

    // X-Content-Type-Options: nosniff
    contentTypeOptions: true,

    // X-Frame-Options: DENY
    frameguard: {
      action: 'deny',
    },

    // X-XSS-Protection: 1; mode=block
    xssFilter: true,

    // Strict-Transport-Security (HSTS)
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },

    // X-Download-Options: noopen
    ieNoOpen: true,

    // X-DNS-Prefetch-Control: off
    dnsPrefetchControl: {
      allow: false,
    },

    // Referrer-Policy: no-referrer
    referrerPolicy: {
      policy: 'no-referrer',
    },
  })
);
```

**Response Headers:**

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Download-Options: noopen
X-DNS-Prefetch-Control: off
Referrer-Policy: no-referrer
```

---

## HTTPS/TLS Configuration

### Local Development

**mkcert (Self-signed Certificates):**

```bash
# Install mkcert
brew install mkcert  # macOS
choco install mkcert  # Windows

# Generate local CA
mkcert -install

# Generate certificate for localhost
mkcert localhost 127.0.0.1 ::1

# Output:
# localhost+2.pem (certificate)
# localhost+2-key.pem (private key)
```

**Express HTTPS Server:**

```typescript
// backend/src/api/server.ts
import https from 'https';
import fs from 'fs';

const options = {
  key: fs.readFileSync('localhost+2-key.pem'),
  cert: fs.readFileSync('localhost+2.pem'),
};

const server = https.createServer(options, app);
server.listen(3000, () => {
  console.log('HTTPS server running on https://localhost:3000');
});
```

### Production (Raspberry Pi)

**Nginx Reverse Proxy:**

```nginx
# /etc/nginx/sites-available/bwaincell
server {
    listen 443 ssl http2;
    server_name bwaincell.example.com;

    # SSL certificate (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/bwaincell.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bwaincell.example.com/privkey.pem;

    # TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...';
    ssl_prefer_server_ciphers on;

    # HSTS header
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Proxy to backend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name bwaincell.example.com;
    return 301 https://$server_name$request_uri;
}
```

**Let's Encrypt (Free SSL):**

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d bwaincell.example.com

# Auto-renewal (cron)
sudo crontab -e
# Add: 0 3 * * * certbot renew --quiet
```

### Vercel (Frontend)

Vercel automatically provides HTTPS certificates:

```bash
# Production URL (automatic HTTPS)
https://bwaincell.sunny-stack.com

# Custom domain (automatic HTTPS)
https://bwaincell.example.com
```

---

## Database Security

### PostgreSQL Security

**Connection Encryption:**

```bash
# .env
DATABASE_URL=postgresql://bwaincell:password@localhost:5433/bwaincell?sslmode=require
```

**SSL Modes:**

- `disable` - No SSL (development only)
- `require` - Require SSL (production minimum)
- `verify-ca` - Verify certificate authority
- `verify-full` - Verify certificate and hostname (most secure)

**docker-compose.yml Security:**

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-bwaincell}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD} # From .env
      POSTGRES_DB: ${POSTGRES_DB:-bwaincell}

    # Security options
    security_opt:
      - no-new-privileges:true

    # Resource limits (prevent DoS)
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### Least Privilege Principle

```sql
-- Create application user with minimal permissions
CREATE USER bwaincell_app WITH PASSWORD 'secure_password';

-- Grant SELECT, INSERT, UPDATE, DELETE (no DROP, CREATE, ALTER)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bwaincell_app;

-- Grant USAGE on sequences (for auto-increment IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bwaincell_app;

-- Revoke dangerous permissions
REVOKE CREATE ON SCHEMA public FROM bwaincell_app;
REVOKE DROP ON ALL TABLES IN SCHEMA public FROM bwaincell_app;
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM bwaincell_app;
```

### Database Backups

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
docker compose exec postgres pg_dump -U bwaincell bwaincell > "$BACKUP_DIR/bwaincell_$TIMESTAMP.sql"

# Encrypt backup
openssl enc -aes-256-cbc -salt -in "$BACKUP_DIR/bwaincell_$TIMESTAMP.sql" -out "$BACKUP_DIR/bwaincell_$TIMESTAMP.sql.enc"

# Delete unencrypted backup
rm "$BACKUP_DIR/bwaincell_$TIMESTAMP.sql"

# Keep only last 7 backups
ls -t "$BACKUP_DIR"/*.enc | tail -n +8 | xargs rm -f
```

**Cron Job:**

```bash
# Backup every day at 3 AM
0 3 * * * /home/pi/bwaincell/backup.sh
```

---

## Discord Bot Security

### Bot Permissions

**Minimal Permissions Principle:**

When inviting bot to Discord server, only request necessary permissions:

```
Required Permissions:
☑ Send Messages
☑ Embed Links
☑ Attach Files
☑ Read Message History
☑ Use Slash Commands

Unnecessary Permissions:
☐ Administrator (NEVER grant this!)
☐ Manage Server
☐ Manage Roles
☐ Manage Channels
☐ Kick Members
☐ Ban Members
```

**OAuth2 URL Generator:**

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=277025508416&scope=bot%20applications.commands
```

### Gateway Intents

**backend/src/bot.ts:**

```typescript
import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // Required for slash commands
    // DO NOT enable MessageContent intent (privacy concern)
  ],
});
```

**Why Limit Intents?**

- Reduce attack surface
- Protect user privacy
- Comply with Discord ToS
- Prevent abuse of message content

### Command Validation

```typescript
// backend/commands/task.ts
import { SlashCommandBuilder } from '@discordjs/builders';

export default {
  data: new SlashCommandBuilder()
    .setName('task')
    .setDescription('Manage tasks')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('create')
        .setDescription('Create a new task')
        .addStringOption(
          (option) =>
            option.setName('title').setDescription('Task title').setRequired(true).setMaxLength(255) // ✅ Validate input length
        )
        .addStringOption((option) =>
          option.setName('priority').setDescription('Task priority').addChoices(
            // ✅ Restrict to valid values
            { name: 'Low', value: 'low' },
            { name: 'Medium', value: 'medium' },
            { name: 'High', value: 'high' }
          )
        )
    ),

  async execute(interaction) {
    // Validate user is in allowed guild
    if (interaction.guildId !== process.env.GUILD_ID) {
      return interaction.reply({
        content: 'This bot is not available in this server',
        ephemeral: true,
      });
    }

    // Process command
    // ...
  },
};
```

### Bot Token Security

```bash
# .env (NEVER commit to git)
BOT_TOKEN=your_bot_token_here

# If token is compromised:
# 1. Go to Discord Developer Portal
# 2. Regenerate bot token immediately
# 3. Update .env with new token
# 4. Restart bot
```

---

## Security Checklist

### Pre-Production Checklist

- [ ] **Secrets Management**
  - [ ] All secrets in `.env` files (not committed to git)
  - [ ] `.gitignore` includes `.env`, `.env.*`
  - [ ] Generated secure secrets (JWT, database passwords)
  - [ ] GitHub Actions secrets configured (if using CI/CD)

- [ ] **Authentication & Authorization**
  - [ ] JWT tokens with short expiration (15 minutes)
  - [ ] Refresh tokens with longer expiration (7 days)
  - [ ] httpOnly cookies for token storage (not localStorage)
  - [ ] User isolation (all queries filtered by Discord User ID)
  - [ ] OAuth2 email whitelist configured

- [ ] **Input Validation**
  - [ ] Joi schemas for all API endpoints
  - [ ] HTML sanitization (DOMPurify)
  - [ ] SQL injection prevention (Sequelize parameterized queries)
  - [ ] Max length validation on all string inputs

- [ ] **Security Headers**
  - [ ] Helmet.js configured and enabled
  - [ ] Content Security Policy (CSP) configured
  - [ ] HSTS header enabled (HTTPS only)
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff

- [ ] **Rate Limiting**
  - [ ] General API rate limiter (100 req/15min)
  - [ ] Authentication rate limiter (5 attempts/15min)
  - [ ] Task creation rate limiter (10 req/min)

- [ ] **HTTPS/TLS**
  - [ ] HTTPS enabled in production
  - [ ] SSL certificates installed (Let's Encrypt)
  - [ ] HTTP → HTTPS redirect configured
  - [ ] TLS 1.2+ only (disable TLS 1.0, 1.1)

- [ ] **Database Security**
  - [ ] PostgreSQL password is strong
  - [ ] SSL mode enabled (`sslmode=require`)
  - [ ] Least privilege database user
  - [ ] Automated encrypted backups

- [ ] **Dependencies**
  - [ ] `npm audit` passed (0 high/critical vulnerabilities)
  - [ ] Dependabot enabled
  - [ ] Dependencies pinned (exact versions for critical packages)

- [ ] **Discord Bot**
  - [ ] Minimal permissions requested
  - [ ] Gateway intents limited (no MessageContent)
  - [ ] Command validation enabled
  - [ ] Guild ID whitelist configured

- [ ] **Logging & Monitoring**
  - [ ] Authentication failures logged
  - [ ] Rate limit hits logged
  - [ ] Security errors logged (with context, no sensitive data)
  - [ ] Log files rotated and encrypted

### Post-Deployment Monitoring

- [ ] Monitor authentication failure rate (detect brute force)
- [ ] Monitor rate limit hits (detect abuse)
- [ ] Monitor database query performance (detect N+1 queries)
- [ ] Monitor error logs for security incidents
- [ ] Review access logs weekly
- [ ] Rotate JWT secrets quarterly
- [ ] Update dependencies monthly (`npm audit fix`)

---

## Related Documentation

- **[Performance Optimization](performance-optimization.md)** - Database performance, caching, query optimization
- **[Monitoring and Logging](monitoring-and-logging.md)** - Winston logger, structured logging, security logging
- **[CI/CD Pipeline](ci-cd-pipeline.md)** - GitHub Actions, quality gates, automated security checks
- **[Architecture Overview](../architecture/overview.md)** - System architecture, user isolation strategy
- **[API Documentation](../api/)** - REST API endpoints, authentication flow

---

## External Resources

- **OWASP Top 10:** [owasp.org/www-project-top-ten/](https://owasp.org/www-project-top-ten/)
- **JWT Best Practices:** [jwt.io/introduction](https://jwt.io/introduction)
- **Helmet.js Documentation:** [helmetjs.github.io/](https://helmetjs.github.io/)
- **Discord Bot Security:** [discord.com/developers/docs](https://discord.com/developers/docs)
- **PostgreSQL Security:** [postgresql.org/docs/current/security.html](https://www.postgresql.org/docs/current/security.html)

---

**Last Updated** 2026-01-12
**Version:** 2.0.0
**Maintained by:** Bwaincell Development Team
