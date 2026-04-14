/**
 * NextAuth Type Extensions
 *
 * Extends NextAuth types to include custom session fields
 */

import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    googleAccessToken?: string;
    googleRefreshToken?: string;
  }

  interface User {
    email?: string;
    name?: string;
    image?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    googleAccessToken?: string;
    googleRefreshToken?: string;
    email?: string;
    name?: string;
    picture?: string;
  }
}
