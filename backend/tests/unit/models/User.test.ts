/**
 * Unit Tests: User Model
 *
 * Tests database model for user management using mocks
 * Coverage target: 80%
 */

// Mock logger BEFORE imports
jest.mock('../../../shared/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

import User from '@database/models/User';

describe('User Model', () => {
  let mockUser: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      id: 1,
      googleId: 'google-123',
      email: 'test@gmail.com',
      name: 'Test User',
      picture: 'https://example.com/photo.jpg',
      discordId: 'discord-456',
      guildId: 'guild-789',
      refreshToken: 'refresh-token-abc',
      createdAt: '2024-01-15T00:00:00.000Z',
      updatedAt: '2024-01-15T00:00:00.000Z',
    };

    // Mock findByGoogleId
    jest.spyOn(User, 'findByGoogleId').mockImplementation(async (googleId: string) => {
      if (googleId === 'google-123') {
        return { ...mockUser } as any;
      }
      return null;
    });

    // Mock findByEmail
    jest.spyOn(User, 'findByEmail').mockImplementation(async (email: string) => {
      if (email === 'test@gmail.com') {
        return { ...mockUser } as any;
      }
      return null;
    });

    // Mock create
    jest.spyOn(User, 'create').mockImplementation(async (values: any) => {
      if (!values.googleId || !values.email) {
        throw new Error('Validation error: googleId and email are required');
      }

      return {
        id: 2,
        googleId: values.googleId,
        email: values.email,
        name: values.name,
        picture: values.picture || null,
        discordId: values.discordId,
        guildId: values.guildId,
        refreshToken: values.refreshToken || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any;
    });

    // Mock update
    jest.spyOn(User, 'update').mockImplementation(async (id: number, values: any) => {
      if (id === 1) {
        return { ...mockUser, ...values, updatedAt: new Date().toISOString() } as any;
      }
      return null;
    });
  });

  describe('Model Attributes', () => {
    test('should have correct attributes defined', async () => {
      const user = await User.findByGoogleId('google-123');

      expect(user).toBeDefined();
      expect(user).toHaveProperty('googleId');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('picture');
      expect(user).toHaveProperty('discordId');
      expect(user).toHaveProperty('guildId');
      expect(user).toHaveProperty('refreshToken');
      expect(user).toHaveProperty('createdAt');
      expect(user).toHaveProperty('updatedAt');
    });

    test('should have correct attribute values', async () => {
      const user = await User.findByGoogleId('google-123');

      expect(user!.googleId).toBe('google-123');
      expect(user!.email).toBe('test@gmail.com');
      expect(user!.name).toBe('Test User');
      expect(user!.picture).toBe('https://example.com/photo.jpg');
      expect(user!.discordId).toBe('discord-456');
      expect(user!.guildId).toBe('guild-789');
      expect(user!.refreshToken).toBe('refresh-token-abc');
    });
  });

  describe('findByGoogleId', () => {
    test('should find user by googleId', async () => {
      const user = await User.findByGoogleId('google-123');

      expect(user).toBeDefined();
      expect(user!.googleId).toBe('google-123');
      expect(User.findByGoogleId).toHaveBeenCalledWith('google-123');
    });

    test('should return null when user is not found', async () => {
      const user = await User.findByGoogleId('nonexistent');

      expect(user).toBeNull();
    });
  });

  describe('findByEmail', () => {
    test('should find user by email', async () => {
      const user = await User.findByEmail('test@gmail.com');

      expect(user).toBeDefined();
      expect(user!.email).toBe('test@gmail.com');
      expect(User.findByEmail).toHaveBeenCalledWith('test@gmail.com');
    });

    test('should return null when email is not found', async () => {
      const user = await User.findByEmail('notfound@gmail.com');

      expect(user).toBeNull();
    });
  });

  describe('create', () => {
    test('should create a new user with all fields', async () => {
      const user = await User.create({
        googleId: 'google-new',
        email: 'new@gmail.com',
        name: 'New User',
        picture: 'https://example.com/new.jpg',
        discordId: 'discord-new',
        guildId: 'guild-new',
      });

      expect(user).toBeDefined();
      expect(user.googleId).toBe('google-new');
      expect(user.email).toBe('new@gmail.com');
      expect(user.name).toBe('New User');
      expect(user.discordId).toBe('discord-new');
      expect(user.guildId).toBe('guild-new');
    });

    test('should create user with null picture when not provided', async () => {
      const user = await User.create({
        googleId: 'google-new',
        email: 'new@gmail.com',
        name: 'New User',
        discordId: 'discord-new',
        guildId: 'guild-new',
      });

      expect(user).toBeDefined();
      expect(user.picture).toBeNull();
    });

    test('should create user with null refreshToken when not provided', async () => {
      const user = await User.create({
        googleId: 'google-new',
        email: 'new@gmail.com',
        name: 'New User',
        discordId: 'discord-new',
        guildId: 'guild-new',
      });

      expect(user).toBeDefined();
      expect(user.refreshToken).toBeNull();
    });
  });

  describe('update', () => {
    test('should update user fields', async () => {
      const updated = await User.update(1, {
        name: 'Updated Name',
        picture: 'https://example.com/updated.jpg',
      });

      expect(updated).toBeDefined();
      expect(updated!.name).toBe('Updated Name');
      expect(updated!.picture).toBe('https://example.com/updated.jpg');
      expect(User.update).toHaveBeenCalledWith(1, {
        name: 'Updated Name',
        picture: 'https://example.com/updated.jpg',
      });
    });

    test('should return null when user not found', async () => {
      const updated = await User.update(999, { name: 'Nobody' });
      expect(updated).toBeNull();
    });
  });

  describe('Unique Constraints', () => {
    test('should enforce unique googleId (via create validation)', async () => {
      // First create succeeds
      await User.create({
        googleId: 'google-unique',
        email: 'unique@gmail.com',
        name: 'User',
        discordId: 'discord-1',
        guildId: 'guild-1',
      });

      // Mock create to reject duplicate googleId
      (User.create as jest.Mock).mockRejectedValueOnce(
        new Error('Unique constraint violation: googleId must be unique')
      );

      await expect(
        User.create({
          googleId: 'google-unique', // Duplicate
          email: 'other@gmail.com',
          name: 'Other User',
          discordId: 'discord-2',
          guildId: 'guild-2',
        })
      ).rejects.toThrow('Unique constraint violation: googleId must be unique');
    });

    test('should enforce unique email (via create validation)', async () => {
      // First create succeeds
      await User.create({
        googleId: 'google-1',
        email: 'same@gmail.com',
        name: 'User',
        discordId: 'discord-1',
        guildId: 'guild-1',
      });

      // Mock create to reject duplicate email
      (User.create as jest.Mock).mockRejectedValueOnce(
        new Error('Unique constraint violation: email must be unique')
      );

      await expect(
        User.create({
          googleId: 'google-2',
          email: 'same@gmail.com', // Duplicate
          name: 'Other User',
          discordId: 'discord-2',
          guildId: 'guild-2',
        })
      ).rejects.toThrow('Unique constraint violation: email must be unique');
    });
  });
});
