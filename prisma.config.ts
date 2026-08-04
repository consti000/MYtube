// Prisma 7: migrate/generate는 schema가 아니라 이 파일의 datasource.url을 사용합니다.
import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Neon pooler(-pooler / pgbouncer)는 advisory lock을 지원하지 않아
 * `prisma migrate deploy`에서 P1002 타임아웃이 납니다.
 * 마이그레이션에는 직접 연결(non-pooling) URL을 써야 합니다.
 */
export function toDirectDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("-pooler.")) {
      u.hostname = u.hostname.replace("-pooler.", ".");
    }
    u.searchParams.delete("pgbouncer");
    // channel_binding 등 풀러 전용 옵션은 제거하지 않아도 되지만,
    // connect_timeout이 너무 짧으면 cold start에 취약하므로 여유를 줌
    if (!u.searchParams.has("connect_timeout")) {
      u.searchParams.set("connect_timeout", "30");
    }
    return u.toString();
  } catch {
    return url;
  }
}

function resolveDatabaseUrl() {
  const preferred =
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL;

  if (!preferred) {
    throw new Error(
      [
        "DATABASE_URL이 없습니다. prisma migrate deploy에 필요합니다.",
        "Vercel → Environment Variables에서 DATABASE_URL(또는 POSTGRES_URL)을",
        "Production에 추가하고, Build 시에도 사용할 수 있게 설정한 뒤 Redeploy 하세요.",
        "Neon이면 pooler가 아닌 Direct(non-pooling) 연결을 권장합니다.",
      ].join(" "),
    );
  }

  return toDirectDatabaseUrl(preferred);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: resolveDatabaseUrl(),
  },
});
