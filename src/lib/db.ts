import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function resolveDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ""
  );
}

function isNeonConnection(url: string) {
  const host = process.env.PGHOST ?? process.env.POSTGRES_HOST ?? "";
  return (
    url.includes("neon.tech") ||
    url.includes("neon.technology") ||
    host.includes("neon") ||
    Boolean(process.env.NEON_PROJECT_ID) ||
    process.env.PRISMA_ADAPTER === "neon"
  );
}

function createPrisma() {
  const connectionString = resolveDatabaseUrl();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set (also checked POSTGRES_PRISMA_URL / POSTGRES_URL)",
    );
  }

  // Neon(Vercel Storage 포함) → HTTP 어댑터 (서버리스에서 TCP Pool보다 안정적)
  if (isNeonConnection(connectionString)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaNeonHttp } = require("@prisma/adapter-neon") as typeof import("@prisma/adapter-neon");
    const adapter = new PrismaNeonHttp(connectionString, { fullResults: true });
    return new PrismaClient({ adapter });
  }

  // 로컬 Docker 등 일반 Postgres → pg Pool
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require("@prisma/adapter-pg") as typeof import("@prisma/adapter-pg");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg") as typeof import("pg");
  const pool = new Pool({
    connectionString,
    ssl:
      connectionString.includes("sslmode=require") ||
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
