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
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Basic Rate Limiting for Login
        const ip = req.headers?.get('x-forwarded-for') || '127.0.0.1';
        if (process.env.REDIS_REST_URL && process.env.REDIS_REST_TOKEN) {
          try {
            const redisUrl = process.env.REDIS_REST_URL;
            const redisToken = process.env.REDIS_REST_TOKEN;
            const key = `login-limit:${ip}`;
            
            const countRes = await fetch(`${redisUrl}/incr/${key}`, {
              headers: { Authorization: `Bearer ${redisToken}` },
              cache: 'no-store'
            });
            const countData = await countRes.json();
            const attempts = parseInt(countData.result || '0', 10);

            if (attempts === 1) {
               await fetch(`${redisUrl}/expire/${key}/300`, {
                 headers: { Authorization: `Bearer ${redisToken}` }
               });
            }

            if (attempts > 5) {
               console.warn(`[NextAuth] Rate limit exceeded for IP: ${ip}`);
               return null; // Block login attempt
            }
          } catch (err) {
            console.error('[NextAuth] Redis rate limiting error:', err);
          }
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
          // Removed insecure plaintext fallback
        }

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          name: user.displayName || user.username,
          email: user.email,
          image: user.avatar,
          username: user.username,
          role: user.role,
          sessionVersion: user.sessionVersion,
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
        token.username = (user as any).username;
        token.picture = user.image;
        token.name = user.name;
        token.role = (user as any).role;
        token.sessionVersion = (user as any).sessionVersion;
      }
      
      if (!token.id) {
        return null;
      }

      // Always validate sessionVersion against DB to catch suspensions/logouts
      // Also sync user data if trigger === 'update'
      try {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { id: true, username: true, avatar: true, displayName: true, sessionVersion: true, suspendedUntil: true },
        });

        if (!dbUser) {
          return null; // User deleted
        }

        if (dbUser.suspendedUntil && dbUser.suspendedUntil > new Date()) {
          return null; // User suspended
        }

        if (token.sessionVersion !== undefined && dbUser.sessionVersion !== token.sessionVersion) {
          return null; // Session invalidated by password change or logout
        }

        // Sync token fields
        token.username = dbUser.username;
        token.picture = dbUser.avatar;
        token.name = dbUser.displayName || dbUser.username;
        token.sessionVersion = dbUser.sessionVersion;

        if (trigger === 'update' && session) {
          if (session.name) token.name = session.name;
          if (session.image) token.picture = session.image;
          if (session.username) token.username = session.username;
        }
      } catch (error) {
        console.error('[NextAuth] JWT DB validation error:', error);
      }

      if (!token.username) {
        return null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && token.id) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.image = token.picture;
        session.user.name = token.name;
        session.user.role = token.role as string;
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
