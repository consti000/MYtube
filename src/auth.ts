import NextAuth from "next-auth";
import { encryptToken } from "@/lib/crypto";
import { createAuthAdapter } from "@/lib/auth-adapter";
import { normalizeAuthEnv } from "@/lib/auth-env";
import { prisma } from "@/lib/db";
import { authConfig } from "@/auth.config";

normalizeAuthEnv();

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  adapter: createAuthAdapter(),
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, account }) {
      // DB User.id 를 JWT에 고정 (Google sub와 섞이면 폴더/채널이 유실된 것처럼 보임)
      if (user?.id) {
        token.sub = user.id;
        return token;
      }
      if (account?.provider && account.providerAccountId) {
        const linked = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          select: { userId: true },
        });
        if (linked?.userId) {
          token.sub = linked.userId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  events: {
    async linkAccount({ account }) {
      try {
        const data: { access_token?: string; refresh_token?: string } = {};
        if (typeof account.access_token === "string") {
          data.access_token = encryptToken(account.access_token);
        }
        if (typeof account.refresh_token === "string") {
          data.refresh_token = encryptToken(account.refresh_token);
        }
        if (!Object.keys(data).length) return;

        if (typeof account.id === "string") {
          await prisma.account.update({ where: { id: account.id }, data });
          return;
        }

        await prisma.account.update({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          data,
        });
      } catch (err) {
        console.error("[auth] linkAccount token encrypt failed", err);
      }
    },
  },
});
