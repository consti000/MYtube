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
        // 암호화 실패로 로그인 전체를 깨지 않음 (토큰은 평문 저장 상태 유지)
        console.error("[auth] linkAccount token encrypt failed", err);
      }
    },
  },
});
