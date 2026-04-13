/**
 * Unit tests for /api/auth OAuth Express route handlers
 *
 * Tests Google token verification, token refresh, and logout flows.
 * Mocks Google OAuth, JWT, and User model to test route logic in isolation.
 */

// Set required environment variables BEFORE imports
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.STRAWHATLUKA_EMAIL = 'luka@test.com';
process.env.STRAWHATLUKA_DISCORD_ID = 'discord-luka-123';
process.env.DANDELION_EMAIL = 'dandelion@test.com';
process.env.DANDELION_DISCORD_ID = 'discord-dandelion-456';
process.env.GUILD_ID = 'test-guild-id';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.ALLOWED_GOOGLE_EMAILS = 'luka@test.com,dandelion@test.com';

// Mock dependencies BEFORE imports
jest.mock('../../../../shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the oauth middleware functions
const mockVerifyGoogleToken = jest.fn();
const mockGenerateAccessToken = jest.fn();
const mockGenerateRefreshToken = jest.fn();

jest.mock('../../../../src/api/middleware/oauth', () => ({
  verifyGoogleToken: mockVerifyGoogleToken,
  generateAccessToken: mockGenerateAccessToken,
  generateRefreshToken: mockGenerateRefreshToken,
  authenticateToken: jest.fn(),
}));

// Mock the User model
const mockUserFindOne = jest.fn();
const mockUserCreate = jest.fn();

jest.mock('../../../../../supabase/models/User', () => ({
  User: {
    findOne: mockUserFindOne,
    create: mockUserCreate,
  },
}));

// Mock jsonwebtoken
const mockJwtVerify = jest.fn();
jest.mock('jsonwebtoken', () => ({
  verify: (...args: any[]) => mockJwtVerify(...args),
  sign: jest.fn().mockReturnValue('mock-token'),
}));

import express from 'express';
import oauthRouter from '../../../../src/api/routes/oauth';
import request from 'supertest';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', oauthRouter);
  return app;
}

describe('OAuth API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  // ─── POST /auth/google/verify ─────────────────────────────────────

  describe('POST /auth/google/verify', () => {
    it('should verify a valid Google token and return tokens for existing user', async () => {
      const googleUser = {
        googleId: 'google-123',
        email: 'luka@test.com',
        name: 'Luka',
        picture: 'https://example.com/photo.jpg',
      };
      mockVerifyGoogleToken.mockResolvedValue(googleUser);

      const mockUser = {
        googleId: 'google-123',
        email: 'luka@test.com',
        name: 'Luka',
        picture: 'https://example.com/photo.jpg',
        discordId: 'discord-luka-123',
        guildId: 'test-guild-id',
        refreshToken: null,
        save: jest.fn(),
      };
      mockUserFindOne.mockResolvedValue(mockUser);
      mockGenerateAccessToken.mockReturnValue('mock-access-token');
      mockGenerateRefreshToken.mockReturnValue('mock-refresh-token');

      const res = await request(app)
        .post('/auth/google/verify')
        .send({ idToken: 'valid-google-id-token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBe('mock-access-token');
      expect(res.body.data.refreshToken).toBe('mock-refresh-token');
      expect(res.body.data.user.email).toBe('luka@test.com');
      expect(res.body.data.user.name).toBe('Luka');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should create a new user when none exists', async () => {
      const googleUser = {
        googleId: 'google-new',
        email: 'luka@test.com',
        name: 'New User',
        picture: null,
      };
      mockVerifyGoogleToken.mockResolvedValue(googleUser);
      mockUserFindOne.mockResolvedValue(null);

      const mockNewUser = {
        googleId: 'google-new',
        email: 'luka@test.com',
        name: 'New User',
        picture: null,
        discordId: 'discord-luka-123',
        guildId: 'test-guild-id',
        refreshToken: null,
        save: jest.fn(),
      };
      mockUserCreate.mockResolvedValue(mockNewUser);
      mockGenerateAccessToken.mockReturnValue('new-access-token');
      mockGenerateRefreshToken.mockReturnValue('new-refresh-token');

      const res = await request(app)
        .post('/auth/google/verify')
        .send({ idToken: 'new-user-token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBe('new-access-token');
      expect(mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          googleId: 'google-new',
          email: 'luka@test.com',
        })
      );
    });

    it('should return 400 when idToken is missing', async () => {
      const res = await request(app).post('/auth/google/verify').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('ID token required');
    });

    it('should return 401 when Google token is invalid', async () => {
      mockVerifyGoogleToken.mockResolvedValue(null);

      const res = await request(app).post('/auth/google/verify').send({ idToken: 'invalid-token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid Google token');
    });

    it('should return 401 when email is not authorized (verifyGoogleToken returns null)', async () => {
      mockVerifyGoogleToken.mockResolvedValue(null);

      const res = await request(app)
        .post('/auth/google/verify')
        .send({ idToken: 'unauthorized-email-token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid Google token or email not authorized');
    });

    it('should handle server errors during verification', async () => {
      mockVerifyGoogleToken.mockRejectedValue(new Error('Google API down'));

      const res = await request(app).post('/auth/google/verify').send({ idToken: 'valid-token' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Authentication failed');
    });

    it('should update existing user name and picture on login', async () => {
      const googleUser = {
        googleId: 'google-123',
        email: 'luka@test.com',
        name: 'Updated Name',
        picture: 'https://example.com/new-photo.jpg',
      };
      mockVerifyGoogleToken.mockResolvedValue(googleUser);

      const mockUser = {
        googleId: 'google-123',
        email: 'luka@test.com',
        name: 'Old Name',
        picture: 'https://example.com/old-photo.jpg',
        discordId: 'discord-luka-123',
        guildId: 'test-guild-id',
        refreshToken: 'old-refresh-token',
        save: jest.fn(),
      };
      mockUserFindOne.mockResolvedValue(mockUser);
      mockGenerateAccessToken.mockReturnValue('token');
      mockGenerateRefreshToken.mockReturnValue('refresh');

      await request(app).post('/auth/google/verify').send({ idToken: 'valid-token' });

      expect(mockUser.name).toBe('Updated Name');
      expect(mockUser.picture).toBe('https://example.com/new-photo.jpg');
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  // ─── POST /auth/refresh ───────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      mockJwtVerify.mockReturnValue({ googleId: 'google-123' });

      const mockUser = {
        googleId: 'google-123',
        email: 'luka@test.com',
        discordId: 'discord-luka-123',
        guildId: 'test-guild-id',
        refreshToken: 'valid-refresh-token',
      };
      mockUserFindOne.mockResolvedValue(mockUser);
      mockGenerateAccessToken.mockReturnValue('new-access-token');

      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBe('new-access-token');
    });

    it('should return 400 when refresh token is missing', async () => {
      const res = await request(app).post('/auth/refresh').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Refresh token required');
    });

    it('should return 401 when refresh token is invalid (jwt.verify throws)', async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid or expired refresh token');
    });

    it('should return 401 when user is not found with the refresh token', async () => {
      mockJwtVerify.mockReturnValue({ googleId: 'google-123' });
      mockUserFindOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'orphan-refresh-token' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid refresh token');
    });
  });

  // ─── POST /auth/logout ────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('should logout successfully with valid refresh token', async () => {
      mockJwtVerify.mockReturnValue({ googleId: 'google-123' });

      const mockUser = {
        googleId: 'google-123',
        refreshToken: 'valid-refresh-token',
        save: jest.fn(),
      };
      mockUserFindOne.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/auth/logout')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Logged out successfully');
      expect(mockUser.refreshToken).toBeNull();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should return 200 even without refresh token', async () => {
      const res = await request(app).post('/auth/logout').send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 200 even if refresh token is invalid (graceful logout)', async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const res = await request(app).post('/auth/logout').send({ refreshToken: 'invalid-token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Logged out');
    });

    it('should return 200 even when user is not found', async () => {
      mockJwtVerify.mockReturnValue({ googleId: 'google-nonexistent' });
      mockUserFindOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/auth/logout')
        .send({ refreshToken: 'valid-token-no-user' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
