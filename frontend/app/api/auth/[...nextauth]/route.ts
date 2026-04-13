import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/db/prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: [
            'openid',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            // Future scopes for Google Calendar, Gmail, Drive
            // 'https://www.googleapis.com/auth/calendar',
            // 'https://www.googleapis.com/auth/gmail.readonly',
            // 'https://www.googleapis.com/auth/drive.readonly',
          ].join(' '),
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      console.log('[NEXTAUTH] Sign-in attempt for:', user.email);

      if (!user.email || !user.id) {
        console.error('[NEXTAUTH] Missing email or id');
        return false;
      }

      try {
        // Find or create user in database
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (!existingUser) {
          // Map email to Discord ID using environment variables
          const emailToDiscordMap: Record<string, string> = {
            [process.env.STRAWHATLUKA_EMAIL || '']: process.env.STRAWHATLUKA_DISCORD_ID || '',
            [process.env.DANDELION_EMAIL || '']: process.env.DANDELION_DISCORD_ID || '',
          };

          const discordId =
            emailToDiscordMap[user.email] || process.env.STRAWHATLUKA_DISCORD_ID || '';
          const guildId = process.env.GUILD_ID || '';

          // Create new user
          await prisma.user.create({
            data: {
              googleId: user.id,
              email: user.email,
              name: user.name || '',
              picture: user.image || null,
              discordId: discordId,
              guildId: guildId,
              refreshToken: account?.refresh_token || null,
            },
          });

          console.log('[NEXTAUTH] New user created:', user.email);
        } else {
          // Update existing user info
          await prisma.user.update({
            where: { email: user.email },
            data: {
              name: user.name || existingUser.name,
              picture: user.image || existingUser.picture,
              refreshToken: account?.refresh_token || existingUser.refreshToken,
            },
          });

          console.log('[NEXTAUTH] User updated:', user.email);
        }

        return true;
      } catch (error) {
        console.error('[NEXTAUTH] Error creating/updating user:', error);
        return false;
      }
    },
    async jwt({ token, account, user }) {
      // Initial sign in - store tokens
      if (account && user) {
        console.log('[NEXTAUTH] JWT callback - Initial sign in', {
          email: user.email,
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
        });

        // Store Google OAuth tokens in the JWT
        return {
          ...token,
          googleAccessToken: account.access_token,
          googleRefreshToken: account.refresh_token,
          email: user.email,
          name: user.name,
          picture: user.image,
        };
      }

      return token;
    },
    async session({ session, token }) {
      // Add custom fields to session
      return {
        ...session,
        googleAccessToken: token.googleAccessToken as string,
        googleRefreshToken: token.googleRefreshToken as string,
        user: {
          ...session.user,
          email: token.email as string,
          name: token.name as string,
          image: token.picture as string,
        },
      };
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
