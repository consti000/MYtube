import { PrismaClient } from "@/generated/prisma/client";
import ws from "ws";

/** 어댑터 전략 변경 시 올려서 HMR/핫리로드에 남은 구 클라이언트를 버림 */
const PRISMA_ADAPTER_REV = 2;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaAdapterRev?: number;
};

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

  // Neon → WebSocket 어댑터 (HTTP 모드는 createMany/updateMany/$transaction 미지원)
  if (isNeonConnection(connectionString)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { neonConfig } = require("@neondatabase/serverless") as typeof import("@neondatabase/serverless");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaNeon } = require("@prisma/adapter-neon") as typeof import("@prisma/adapter-neon");
    neonConfig.webSocketConstructor = ws;
    const adapter = new PrismaNeon({ connectionString });
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

if (globalForPrisma.prismaAdapterRev !== PRISMA_ADAPTER_REV) {
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaAdapterRev = PRISMA_ADAPTER_REV;
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
