import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { encryptToken } from "@/lib/crypto";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  events: {
    async linkAccount({ account }) {
      const accountId = typeof account?.id === "string" ? account.id : null;
      if (!accountId) return;
      const data: { access_token?: string; refresh_token?: string } = {};
      if (typeof account.access_token === "string") {
        data.access_token = encryptToken(account.access_token);
      }
      if (typeof account.refresh_token === "string") {
        data.refresh_token = encryptToken(account.refresh_token);
      }
      if (Object.keys(data).length) {
        await prisma.account.update({
          where: { id: accountId },
          data,
        });
      }
    },
  },
});
