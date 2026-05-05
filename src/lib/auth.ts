import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { seedUserProjects } from "@/lib/userOnboarding";

export const authOptions: NextAuthOptions = {
  providers: [
    // ── Google OAuth ────────────────────────────────────────────────────────
    // Requires GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env.local
    // Add http://localhost:3000/api/auth/callback/google as an authorized redirect URI
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    // ── Email / Password ────────────────────────────────────────────────────
    CredentialsProvider({
      id: "credentials",
      name: "Email",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
        name:     { label: "Name",     type: "text"     },
        action:   { label: "Action",   type: "text"     }, // "signin" | "signup"
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();

        // ── Sign-up ─────────────────────────────────────────────────────────
        if (credentials.action === "signup") {
          const existing = await prisma.user.findUnique({ where: { email } });
          if (existing) throw new Error("EMAIL_EXISTS");

          const hash = await bcrypt.hash(credentials.password, 12);
          const user = await prisma.user.create({
            data: {
              email,
              name: credentials.name?.trim() || email.split("@")[0],
              passwordHash: hash,
            },
          });

          await seedUserProjects(user.id);
          return { id: String(user.id), email: user.email, name: user.name };
        }

        // ── Sign-in ─────────────────────────────────────────────────────────
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw new Error("NO_USER");
        if (!user.passwordHash) throw new Error("GOOGLE_ACCOUNT"); // signed up via Google

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) throw new Error("BAD_PASSWORD");

        return { id: String(user.id), email: user.email, name: user.name, image: user.image };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    // Store userId in the JWT on first sign-in
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.userId = user.id; // credentials: already String(db.id)
      }

      // Google sign-in: find-or-create the user row
      if (account?.provider === "google" && token.email) {
        let dbUser = await prisma.user.findUnique({ where: { email: token.email } });
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email: token.email,
              name: token.name ?? token.email.split("@")[0],
              image: (profile as { picture?: string })?.picture ?? null,
            },
          });
          await seedUserProjects(dbUser.id);
        } else if ((profile as { picture?: string })?.picture && !dbUser.image) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { image: (profile as { picture?: string })?.picture },
          });
        }
        token.userId = String(dbUser.id);
        token.picture = dbUser.image ?? token.picture;
      }

      return token;
    },

    // Expose userId + image on the session object
    async session({ session, token }) {
      session.user.id = token.userId as string;
      if (token.picture) session.user.image = token.picture as string;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
