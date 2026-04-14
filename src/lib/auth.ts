import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      salonId: string | null;
      blocked: boolean;
      trialExpires: string | null; // ISO date string
      image?: string | null;
    };
  }
  interface User {
    role: Role;
    salonId: string | null;
    blocked: boolean;
    trialExpires: string | null;
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: {
            salons: { select: { id: true }, orderBy: { createdAt: "asc" }, take: 1 },
            colaborador: { select: { salonId: true } },
          },
        });

        if (!user?.passwordHash) return null;
        if (!user.active) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // OWNER → salonId from salons[]; BARBER → salonId from colaborador
        const salonId = user.salons?.[0]?.id ?? user.colaborador?.salonId ?? null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          salonId,
          blocked: user.blocked,
          trialExpires: user.trialExpires?.toISOString() ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.salonId = user.salonId;
        token.blocked = user.blocked;
        token.trialExpires = user.trialExpires;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.salonId = token.salonId as string | null;
      session.user.blocked = token.blocked as boolean;
      session.user.trialExpires = token.trialExpires as string | null;
      return session;
    },
  },
});
