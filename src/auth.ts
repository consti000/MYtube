import NextAuth from "next-auth";
import { createAuthAdapter } from "@/lib/auth-adapter";
import { normalizeAuthEnv } from "@/lib/auth-env";
import { encryptToken } from "@/lib/crypto";
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
    /**
     * Auth.js Adapter 타입에는 updateAccount가 없음.
     * Google 로그인/재연결 시 access·refresh 토큰을 암호화해 DB에 반영합니다.
     */
    async signIn({ account }) {
      if (!account || account.provider !== "google") return;
      if (!account.providerAccountId) return;

      const data: {
        access_token?: string;
        refresh_token?: string;
        expires_at?: number;
        scope?: string;
        token_type?: string;
        id_token?: string;
      } = {};

      if (typeof account.access_token === "string") {
        data.access_token = encryptToken(account.access_token);
      }
      if (typeof account.refresh_token === "string") {
        data.refresh_token = encryptToken(account.refresh_token);
      }
      if (typeof account.expires_at === "number") {
        data.expires_at = account.expires_at;
      }
      if (typeof account.scope === "string") data.scope = account.scope;
      if (typeof account.token_type === "string") {
        data.token_type = account.token_type;
      }
      if (typeof account.id_token === "string") data.id_token = account.id_token;

      if (!Object.keys(data).length) return;

      try {
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
        console.error("[auth] signIn token encrypt/update failed", err);
      }
    },
  },
});
