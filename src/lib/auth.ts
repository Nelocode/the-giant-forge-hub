import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { getUserByEmail } from '@/lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET ?? 'forge-secret-dev-change-in-prod',
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = getUserByEmail(credentials.email as string);
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;
        return {
          id:     String(user.id),
          name:   user.name,
          email:  user.email,
          role:   user.role,
          avatar: user.avatar,
        };
      },
    }),
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id     = user.id;
        token.role   = (user as any).role ?? 'user';
        token.avatar = (user as any).avatar ?? null;
      }
      if (account?.provider === 'google' && account.access_token) {
        token.googleAccessToken  = account.access_token;
        token.googleRefreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id                 = token.id as string;
        (session.user as any).role               = token.role as string;
        (session.user as any).avatar             = token.avatar as string | null;
        (session.user as any).googleAccessToken  = token.googleAccessToken as string | undefined;
      }
      return session;
    },
  },
});
