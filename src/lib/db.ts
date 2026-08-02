import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function isNeonUrl(url: string) {
  return (
    url.includes("neon.tech") ||
    url.includes("neon.technology") ||
    process.env.PRISMA_ADAPTER === "neon"
  );
}

function createPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  // Vercel Postgres / Neon → HTTP adapter (서버리스)
  if (isNeonUrl(connectionString)) {
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
