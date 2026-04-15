import { Router, Request, Response } from 'express';
import { verifyGoogleToken, generateAccessToken, generateRefreshToken } from '../middleware/oauth';
import { User } from '@database/models/User';
import { logger } from '@shared/utils/logger';
import jwt from 'jsonwebtoken';

// Validate JWT_SECRET is set - fail fast for security
if (!process.env.JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;

const router = Router();

/**
 * POST /api/auth/google/verify
 * Verify Google ID token and create/update user
 */
router.post('/google/verify', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'ID token required',
      });
    }

    // Verify Google token
    const googleUser = await verifyGoogleToken(idToken);

    if (!googleUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token or email not authorized',
      });
    }

    // Find or create user
    let user = await User.findByGoogleId(googleUser.googleId);

    if (!user) {
      // Map email to Discord ID using environment variables
      const emailToDiscordMap: Record<string, string> = {
        [process.env.STRAWHATLUKA_EMAIL || '']: process.env.STRAWHATLUKA_DISCORD_ID || '',
        [process.env.DANDELION_EMAIL || '']: process.env.DANDELION_DISCORD_ID || '',
      };

      const discordId =
        emailToDiscordMap[googleUser.email] || process.env.STRAWHATLUKA_DISCORD_ID || '';
      const guildId = process.env.GUILD_ID || '';

      // Create new user
      user = await User.create({
        google_id: googleUser.googleId,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        discord_id: discordId,
        guild_id: guildId,
      });

      logger.info('[OAUTH] New user created', {
        email: googleUser.email,
        googleId: googleUser.googleId,
      });
    } else {
      // Update existing user
      const updateData: Record<string, string | null> = {
        name: googleUser.name,
        picture: googleUser.picture,
      };

      // Update Discord IDs if they're missing (migration support)
      if (!user.discord_id || !user.guild_id) {
        const emailToDiscordMap: Record<string, string> = {
          [process.env.STRAWHATLUKA_EMAIL || '']: process.env.STRAWHATLUKA_DISCORD_ID || '',
          [process.env.DANDELION_EMAIL || '']: process.env.DANDELION_DISCORD_ID || '',
        };

        updateData.discord_id =
          emailToDiscordMap[googleUser.email] || process.env.STRAWHATLUKA_DISCORD_ID || '';
        updateData.guild_id = process.env.GUILD_ID || '';
      }

      user = (await User.update(user.id, updateData)) || user;

      logger.info('[OAUTH] User updated', {
        email: googleUser.email,
        discordId: user.discord_id,
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      googleId: user.google_id,
      email: user.email,
      discordId: user.discord_id,
      guildId: user.guild_id,
    });

    const refreshToken = generateRefreshToken(user.google_id);

    // Store refresh token
    await User.update(user.id, { refresh_token: refreshToken });

    return res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          email: user.email,
          name: user.name,
          picture: user.picture,
        },
      },
    });
  } catch (error) {
    logger.error('[OAUTH] Verification error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required',
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as {
      googleId: string;
    };

    // Find user by googleId and verify refresh token matches
    const user = await User.findByGoogleId(decoded.googleId);

    if (!user || user.refresh_token !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      googleId: user.google_id,
      email: user.email,
      discordId: user.discord_id,
      guildId: user.guild_id,
    });

    return res.json({
      success: true,
      data: { accessToken },
    });
  } catch (error) {
    logger.error('[OAUTH] Refresh error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
    });
  }
});

/**
 * POST /api/auth/logout
 * Invalidate refresh token
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Find user and clear refresh token
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as {
        googleId: string;
      };

      const user = await User.findByGoogleId(decoded.googleId);

      if (user) {
        await User.update(user.id, { refresh_token: null });
      }
    }

    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('[OAUTH] Logout error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return res.json({
      success: true,
      message: 'Logged out',
    });
  }
});

export default router;
