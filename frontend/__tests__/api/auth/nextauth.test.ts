/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(() => jest.fn()),
}));
jest.mock('next-auth/providers/google', () => ({
  __esModule: true,
  default: jest.fn((opts: unknown) => ({ id: 'google', options: opts })),
}));

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { User } from '@database/models/User';

describe('NextAuth authOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRAWHATLUKA_EMAIL = 'luka@example.com';
    process.env.STRAWHATLUKA_DISCORD_ID = 'discord-luka';
    process.env.DANDELION_EMAIL = 'dan@example.com';
    process.env.DANDELION_DISCORD_ID = 'discord-dan';
    process.env.GUILD_ID = 'guild-test';
  });

  it('configures Google provider and jwt strategy', () => {
    expect(authOptions.providers).toHaveLength(1);
    expect(authOptions.session?.strategy).toBe('jwt');
    expect(authOptions.pages?.signIn).toBe('/login');
  });

  describe('signIn callback', () => {
    const cb = (params: Record<string, unknown>) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authOptions.callbacks as any).signIn(params);

    it('returns false when email missing', async () => {
      const result = await cb({
        user: { id: 'g-1', email: null, name: 'x', image: null },
        account: {},
      });
      expect(result).toBe(false);
    });

    it('returns false when user.id missing', async () => {
      const result = await cb({
        user: { id: null, email: 'a@b.com', name: 'x', image: null },
        account: {},
      });
      expect(result).toBe(false);
    });

    it('creates new user mapped via env email', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue({ id: 1 });
      const result = await cb({
        user: { id: 'g-123', email: 'luka@example.com', name: 'Luka', image: 'img' },
        account: { refresh_token: 'r-tok' },
      });
      expect(result).toBe(true);
      expect(User.create).toHaveBeenCalled();
      const createArg = (User.create as jest.Mock).mock.calls[0][0];
      expect(createArg.email).toBe('luka@example.com');
      expect(createArg.discord_id).toBe('discord-luka');
      expect(createArg.guild_id).toBe('guild-test');
      expect(createArg.refresh_token).toBe('r-tok');
    });

    it('falls back to default discord id when email not in map', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue({ id: 2 });
      await cb({
        user: { id: 'g-xyz', email: 'stranger@example.com', name: 'S', image: null },
        account: {},
      });
      const createArg = (User.create as jest.Mock).mock.calls[0][0];
      expect(createArg.discord_id).toBe('discord-luka');
    });

    it('updates existing user', async () => {
      (User.findByEmail as jest.Mock).mockResolvedValue({
        id: 1,
        email: 'luka@example.com',
        name: 'Old',
        picture: 'oldimg',
        refresh_token: 'old-tok',
      });
      (User.update as jest.Mock).mockResolvedValue({});
      const result = await cb({
        user: { id: 'g-1', email: 'luka@example.com', name: 'NewName', image: 'newimg' },
        account: { refresh_token: 'new-tok' },
      });
      expect(result).toBe(true);
      expect(User.update).toHaveBeenCalledWith(1, {
        name: 'NewName',
        picture: 'newimg',
        refresh_token: 'new-tok',
      });
    });

    it('returns false on db error', async () => {
      (User.findByEmail as jest.Mock).mockRejectedValue(new Error('db'));
      const result = await cb({
        user: { id: 'g-1', email: 'a@b.com', name: 'x', image: null },
        account: {},
      });
      expect(result).toBe(false);
    });
  });

  describe('jwt callback', () => {
    const cb = (params: Record<string, unknown>) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authOptions.callbacks as any).jwt(params);

    it('stores Google tokens on initial sign in', async () => {
      const result = await cb({
        token: {},
        account: { access_token: 'acc', refresh_token: 'ref' },
        user: { email: 'a@b.com', name: 'N', image: 'img' },
      });
      expect(result.googleAccessToken).toBe('acc');
      expect(result.googleRefreshToken).toBe('ref');
      expect(result.email).toBe('a@b.com');
    });

    it('returns token unchanged on subsequent calls', async () => {
      const token = { googleAccessToken: 'existing', email: 'a@b.com' };
      const result = await cb({ token, account: null, user: undefined });
      expect(result).toBe(token);
    });
  });

  describe('session callback', () => {
    const cb = (params: Record<string, unknown>) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (authOptions.callbacks as any).session(params);

    it('extends session with google tokens and user fields', async () => {
      const result = await cb({
        session: { user: {}, expires: '2099' },
        token: {
          googleAccessToken: 'acc',
          googleRefreshToken: 'ref',
          email: 'a@b.com',
          name: 'N',
          picture: 'img',
        },
      });
      expect(result.googleAccessToken).toBe('acc');
      expect(result.googleRefreshToken).toBe('ref');
      expect(result.user.email).toBe('a@b.com');
      expect(result.user.name).toBe('N');
      expect(result.user.image).toBe('img');
    });
  });
});
