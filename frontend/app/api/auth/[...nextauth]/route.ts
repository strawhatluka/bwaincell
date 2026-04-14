import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { User } from '@database/models/User';

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
        const existingUser = await User.findByEmail(user.email);

        if (!existingUser) {
          const emailToDiscordMap: Record<string, string> = {
            [process.env.STRAWHATLUKA_EMAIL || '']: process.env.STRAWHATLUKA_DISCORD_ID || '',
            [process.env.DANDELION_EMAIL || '']: process.env.DANDELION_DISCORD_ID || '',
          };

          const discordId =
            emailToDiscordMap[user.email] || process.env.STRAWHATLUKA_DISCORD_ID || '';
          const guildId = process.env.GUILD_ID || '';

          await User.create({
            google_id: user.id,
            email: user.email,
            name: user.name || '',
            picture: user.image || null,
            discord_id: discordId,
            guild_id: guildId,
            refresh_token: account?.refresh_token || null,
          });

          console.log('[NEXTAUTH] New user created:', user.email);
        } else {
          await User.update(existingUser.id, {
            name: user.name || existingUser.name,
            picture: user.image || existingUser.picture,
            refresh_token: account?.refresh_token || existingUser.refresh_token,
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
      if (account && user) {
        console.log('[NEXTAUTH] JWT callback - Initial sign in', {
          email: user.email,
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
        });

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
