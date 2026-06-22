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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }
      
      if (!token.id) {
        return null;
      }

      // Fetch the user from database to ensure they still exist and sync properties
      const dbUser = await db.user.findUnique({
        where: { id: token.id as string },
        select: { id: true, username: true, avatar: true, displayName: true },
      });

      if (!dbUser) {
        console.warn(`[NextAuth] JWT token contains non-existent user ID: ${token.id}. Invalidating session.`);
        return null;
      }

      if (trigger === 'update' && session) {
        if (session.name) token.name = session.name;
        if (session.image) token.picture = session.image;
        if (session.username) token.username = session.username;
      } else {
        token.username = dbUser.username;
        token.picture = dbUser.avatar;
        token.name = dbUser.displayName || dbUser.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && token.id) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.image = token.picture;
        session.user.name = token.name;
      } else {
        return null as any;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.AUTH_SECRET,
});
