# ADR 0003: OAuth2 + JWT Authentication Strategy

**Status:** Accepted
**Date:** 2026-01-11
**Decision Makers:** Development Team

---

## Context

Bwaincell provides two user interfaces:

1. **Discord Bot:** Users interact via Discord slash commands
2. **Web/Mobile App:** Users access features via Progressive Web App (PWA)

We needed an authentication strategy that:

1. Enables users to sign in to the web app using existing credentials
2. Links web app users to their Discord accounts (for data access)
3. Supports stateless authentication (for API scalability)
4. Provides secure, industry-standard authentication
5. Works across web, mobile, and native platforms

### User Authentication Flow Requirements

**Discord Bot:**

- Users are already authenticated via Discord (no additional login required)
- Discord user ID (`interaction.user.id`) is the primary identifier
- No web-based authentication needed

**Web/Mobile App:**

- Users must authenticate to access their data
- Must link web login to Discord user ID
- Must support Google OAuth (primary authentication provider)
- Must work across browsers and mobile devices
- Must support session persistence

### Security Requirements

- Passwords must never be stored (use OAuth providers)
- API requests must be authenticated
- Tokens must expire after reasonable period
- Refresh tokens should enable long-lived sessions
- Email-to-Discord ID mapping must be secure

---

## Decision

We will implement **OAuth2 for initial authentication** + **JWT (JSON Web Tokens) for session management**.

### Authentication Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Authentication Flow                 │
└─────────────────────────────────────────────────────────────┘

1. User clicks "Sign in with Google" (Frontend)
        │
        ▼
2. Redirect to Google OAuth consent screen
        │
        ▼
3. User authorizes Bwaincell access
        │
        ▼
4. Google redirects back with authorization code
        │
        ▼
5. Backend exchanges code for Google ID token
        │
        ▼
6. Backend verifies Google ID token
        │
        ▼
7. Backend maps email → Discord ID (env variable mapping)
        │
        ▼
8. Backend generates JWT with Discord ID
        │
        ▼
9. Frontend stores JWT in secure storage
        │
        ▼
10. Frontend sends JWT in Authorization header for API requests
```

### OAuth2 Flow (Google)

**File:** `backend/src/api/routes/oauth.ts`

```typescript
import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/google/verify
router.post('/google/verify', async (req, res) => {
  const { idToken } = req.body;

  try {
    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;

    // Map email to Discord ID (from environment variables)
    const discordId = getDiscordIdFromEmail(email);

    if (!discordId) {
      return res.status(403).json({
        success: false,
        error: 'Email not authorized',
      });
    }

    // Generate JWT
    const accessToken = jwt.sign(
      {
        discordId,
        email,
        name: payload.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          discordId,
          email,
          name: payload.name,
        },
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
});

function getDiscordIdFromEmail(email: string): string | null {
  // Map emails to Discord IDs via environment variables
  const emailMap = {
    [process.env.USER1_EMAIL]: process.env.USER1_DISCORD_ID,
    [process.env.USER2_EMAIL]: process.env.USER2_DISCORD_ID,
  };

  return emailMap[email] || null;
}

export default router;
```

### JWT Authentication Middleware

**File:** `backend/src/api/middleware/oauth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  discordId: string;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    req.user = decoded; // Attach user to request
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}
```

### Frontend Integration (Next.js)

**File:** `frontend/app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        // Send Google ID token to backend for verification
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/google/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: account.id_token }),
        });

        const data = await response.json();

        if (data.success) {
          token.accessToken = data.data.accessToken;
          token.discordId = data.data.user.discordId;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.discordId = token.discordId;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### API Request with JWT

**File:** `frontend/lib/api.ts`

```typescript
import { getSession } from 'next-auth/react';

export async function fetchTasks() {
  const session = await getSession();

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.json();
}
```

---

## Consequences

### Positive

1. **No Password Management**
   - Users authenticate via Google OAuth (trusted provider)
   - No need to store or hash passwords
   - No password reset flows to implement
   - Reduced security risk

2. **Stateless Authentication**
   - JWT tokens are self-contained (no server-side session storage)
   - API scales horizontally without session stickiness
   - No database lookups for authentication (token verification only)

3. **Cross-Platform Support**
   - Works on web browsers, mobile browsers, and native apps
   - JWT can be stored in secure storage (HTTP-only cookies, secure storage)
   - Same token works across all API endpoints

4. **Secure by Design**
   - OAuth2 is industry standard (used by Google, GitHub, etc.)
   - JWT signing prevents token tampering
   - Token expiration enforces re-authentication
   - HTTPS ensures token transmission security

5. **User Convenience**
   - Single Sign-On (SSO) with Google account
   - No need to remember another password
   - Seamless login experience

6. **Email-to-Discord Mapping**
   - Simple environment variable mapping
   - No database required for user management
   - Easy to add new users (update .env)

7. **Token Expiration**
   - Access tokens expire after 7 days (configurable)
   - Forces periodic re-authentication
   - Limits damage if token is compromised

### Negative

1. **Dependency on OAuth Provider**
   - If Google OAuth is down, users cannot sign in
   - Changes to Google OAuth API require code updates
   - **Mitigation:** Google OAuth has 99.9% uptime SLA, add additional providers if needed

2. **Email-to-Discord Mapping Complexity**
   - Requires environment variable configuration for each user
   - No self-service user registration
   - **Mitigation:** Acceptable for small user base (2-10 users), will move to database if user base grows

3. **JWT Token Management**
   - Once issued, tokens cannot be revoked until expiration
   - Compromised token is valid until expiration
   - **Mitigation:** Short token expiration (7 days), refresh token flow for long-lived sessions

4. **No Refresh Token Flow (Initially)**
   - Users must re-authenticate after token expires
   - No automatic token refresh
   - **Mitigation:** 7-day expiration is reasonable, refresh tokens can be added later

5. **Token Storage Security**
   - JWT must be stored securely on client (not in localStorage)
   - Risk of XSS attacks stealing tokens
   - **Mitigation:** Use HTTP-only cookies for web, secure storage for mobile

6. **Authorization Logic in Environment Variables**
   - Email whitelist is in .env (not in database)
   - Adding users requires redeployment
   - **Mitigation:** Acceptable for MVP, will migrate to database-based user management

---

## Alternatives Considered

### Alternative 1: Session-Based Authentication (Cookies)

**Flow:**

1. User logs in with username/password
2. Server creates session, stores in database
3. Server sends session ID in cookie
4. Client sends cookie with each request

**Pros:**

- Sessions can be revoked instantly
- Familiar authentication pattern
- No token expiration management

**Cons:**

- Requires session storage (database or Redis)
- Doesn't scale horizontally without sticky sessions
- Requires password management (hashing, reset flows)
- CSRF protection needed
- Not suitable for mobile apps (cookies don't work well)

**Why we didn't choose this:** Stateless authentication with JWT scales better and works across platforms.

---

### Alternative 2: API Keys

**Flow:**

1. User generates API key in settings
2. API key is stored in database
3. Client sends API key in header

**Pros:**

- Simple to implement
- No expiration management
- Easy to revoke

**Cons:**

- No user identity verification
- API keys don't expire (security risk)
- No OAuth integration
- Poor user experience (manual key management)

**Why we didn't choose this:** Not suitable for consumer-facing web app. API keys are for programmatic access.

---

### Alternative 3: Basic Authentication (Username/Password)

**Flow:**

1. User enters username and password
2. Server verifies credentials
3. Client sends credentials with each request

**Pros:**

- Simple to implement
- No token management

**Cons:**

- Requires password storage (hashing, salting)
- Credentials sent with every request (security risk)
- No OAuth integration
- Must implement password reset flows
- Poor user experience

**Why we didn't choose this:** Less secure than OAuth + JWT, more implementation burden.

---

### Alternative 4: Discord OAuth (Direct)

**Flow:**

1. User clicks "Sign in with Discord"
2. Redirect to Discord OAuth
3. Backend receives Discord user ID directly

**Pros:**

- Direct Discord integration
- No email-to-Discord mapping needed
- User can authorize specific permissions

**Cons:**

- Requires Discord OAuth app setup
- Less flexible (Discord-only authentication)
- Users must have Discord account
- Discord OAuth token management

**Why we didn't choose this:** Google OAuth is more familiar to users, and we can easily add Discord OAuth later if needed.

---

## Implementation Notes

### Environment Variables

**File:** `.env`

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# JWT Configuration
JWT_SECRET=generate_with_openssl_rand_base64_32

# Email-to-Discord ID Mapping
USER1_EMAIL=user1@gmail.com
USER1_DISCORD_ID=123456789012345678
USER2_EMAIL=user2@gmail.com
USER2_DISCORD_ID=987654321098765432

# Allowed emails (comma-separated)
ALLOWED_GOOGLE_EMAILS=user1@gmail.com,user2@gmail.com
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "Bwaincell"
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3010/api/auth/callback/google` (development)
   - `https://bwaincell.sunny-stack.com/api/auth/callback/google` (production)
6. Copy Client ID and Client Secret to `.env`

### JWT Secret Generation

```bash
# Generate secure random JWT secret
openssl rand -base64 32

# Add to .env
JWT_SECRET=<generated_secret>
```

### Adding New Users

```env
# Add new user to .env
USER3_EMAIL=newuser@gmail.com
USER3_DISCORD_ID=111222333444555666

# Add email to allowed list
ALLOWED_GOOGLE_EMAILS=user1@gmail.com,user2@gmail.com,newuser@gmail.com
```

### Testing Authentication

```bash
# 1. Sign in via frontend (http://localhost:3010)
# 2. Extract JWT from browser storage
# 3. Test API endpoint

curl -H "Authorization: Bearer <jwt_token>" http://localhost:3000/api/tasks
```

---

## References

- [OAuth2 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [JWT RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [OAuth Middleware](c:\Users\lukaf\Desktop\Dev Work\Bwaincell\backend\src\api\middleware\oauth.ts)
- [OAuth Routes](c:\Users\lukaf\Desktop\Dev Work\Bwaincell\backend\src\api\routes\oauth.ts)

---

## Revision History

| Date       | Version | Changes                                       |
| ---------- | ------- | --------------------------------------------- |
| 2026-01-11 | 1.0     | Initial decision: OAuth2 + JWT authentication |

---

**Outcome:** OAuth2 + JWT provides secure, scalable authentication for web and mobile users while maintaining simplicity for small user base.

**Future Enhancements:**

- Refresh token flow for automatic token renewal
- Database-based user management (when user base exceeds 10 users)
- Additional OAuth providers (Discord, GitHub)
- Token revocation list for compromised tokens

**Next Review:** 2027-01-11 (evaluate refresh token implementation and database-based user management)
