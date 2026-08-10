import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { encryptToken } from "@/lib/crypto";

/** Prisma Account 모델에 없는 OAuth 토큰 필드를 제거합니다 (예: expires_in). */
function toPrismaAccount(
  data: AdapterAccount & Record<string, unknown>,
  encryptTokens: boolean,
): AdapterAccount {
  const access =
    typeof data.access_token === "string" ? data.access_token : undefined;
  const refresh =
    typeof data.refresh_token === "string" ? data.refresh_token : undefined;

  return {
    userId: String(data.userId),
    type: data.type,
    provider: data.provider,
    providerAccountId: String(data.providerAccountId),
    ...(refresh
      ? {
          refresh_token: encryptTokens ? encryptToken(refresh) : refresh,
        }
      : {}),
    ...(access
      ? { access_token: encryptTokens ? encryptToken(access) : access }
      : {}),
    ...(typeof data.expires_at === "number"
      ? { expires_at: data.expires_at }
      : {}),
    ...(typeof data.token_type === "string"
      ? { token_type: data.token_type as AdapterAccount["token_type"] }
      : {}),
    ...(typeof data.scope === "string" ? { scope: data.scope } : {}),
    ...(typeof data.id_token === "string" ? { id_token: data.id_token } : {}),
    ...(typeof data.session_state === "string"
      ? { session_state: data.session_state }
      : {}),
  };
}

export function createAuthAdapter(): Adapter {
  const base = PrismaAdapter(prisma);
  return {
    ...base,
    async createUser(data) {
      try {
        const user = await prisma.user.create({
          data: {
            name: typeof data.name === "string" ? data.name : undefined,
            email: typeof data.email === "string" ? data.email : undefined,
            emailVerified:
              data.emailVerified instanceof Date ? data.emailVerified : undefined,
            image: typeof data.image === "string" ? data.image : undefined,
          },
        });
        return {
          id: user.id,
          name: user.name,
          email: user.email ?? "",
          emailVerified: user.emailVerified,
          image: user.image,
        } satisfies AdapterUser;
      } catch (err) {
        console.error("[auth] createUser failed", err);
        throw err;
      }
    },
    async linkAccount(data) {
      try {
        // 저장 시점에 암호화 (events에서 다시 암호화하지 않음)
        const sanitized = toPrismaAccount(
          data as AdapterAccount & Record<string, unknown>,
          true,
        );
        await base.linkAccount!(sanitized);
        return sanitized;
      } catch (err) {
        console.error("[auth] linkAccount failed", err);
        throw err;
      }
    },
    async updateAccount(data) {
      try {
        const patch = data as AdapterAccount & Record<string, unknown>;
        const next: Record<string, unknown> = { ...patch };
        if (typeof patch.access_token === "string") {
          next.access_token = encryptToken(patch.access_token);
        }
        if (typeof patch.refresh_token === "string") {
          next.refresh_token = encryptToken(patch.refresh_token);
        }
        if (base.updateAccount) {
          return base.updateAccount(next as AdapterAccount);
        }
      } catch (err) {
        console.error("[auth] updateAccount failed", err);
        throw err;
      }
    },
  };
}
