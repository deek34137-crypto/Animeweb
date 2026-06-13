import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findFirst({
          where: {
            OR: [
              { email: String(credentials.email).toLowerCase() },
              { username: String(credentials.email).toLowerCase() },
            ],
          },
        });

        if (!user || !user.password) {
          return null;
        }

        let isValidPassword = false;
        try {
          isValidPassword = bcrypt.compareSync(
            String(credentials.password),
            user.password
          );
        } catch (compareError) {
          console.error('[NextAuth] password comparison failed:', compareError);
          // Fallback to plain text comparison for legacy/test users
          isValidPassword = String(credentials.password) === user.password;
        }

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          name: user.displayName || user.username,
          email: user.email,
          image: user.avatar,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Fetch username from DB for profile path
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { username: true },
        });
        token.username = dbUser?.username || user.name || undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.username = token.username;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.AUTH_SECRET,
});
