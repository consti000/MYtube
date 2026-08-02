// Prisma 7: migrate/generate는 schema가 아니라 이 파일의 datasource.url을 사용합니다.
import "dotenv/config";
import { defineConfig } from "prisma/config";

function resolveDatabaseUrl() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (!url) {
    throw new Error(
      [
        "DATABASE_URL이 없습니다. prisma migrate deploy에 필요합니다.",
        "Vercel → Environment Variables에서 DATABASE_URL(또는 POSTGRES_URL)을",
        "Production에 추가하고, Build 시에도 사용할 수 있게 설정한 뒤 Redeploy 하세요.",
      ].join(" "),
    );
  }

  return url;
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
