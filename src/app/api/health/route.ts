import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** 배포 환경 진단용 (비밀값 노출 없음) */
export async function GET() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const authUrl = process.env.AUTH_URL ?? "";
  let dbOk = false;
  let dbError: string | null = null;
  let userCount: number | null = null;

  try {
    userCount = await prisma.user.count();
    dbOk = true;
  } catch (e) {
    dbError = e instanceof Error ? e.message : "unknown db error";
  }

  let authUrlProtocol: string | null = null;
  try {
    authUrlProtocol = authUrl ? new URL(authUrl).protocol.replace(":", "") : null;
  } catch {
    authUrlProtocol = "invalid";
  }

  const hostHint = (() => {
    try {
      return databaseUrl ? new URL(databaseUrl.replace(/^postgresql:/, "http:")).host : null;
    } catch {
      return null;
    }
  })();

  return NextResponse.json({
    ok: dbOk && Boolean(process.env.AUTH_SECRET) && Boolean(process.env.AUTH_GOOGLE_ID),
    db: { ok: dbOk, userCount, error: dbError, hostHint },
    auth: {
      hasSecret: Boolean(process.env.AUTH_SECRET?.length),
      hasGoogleId: Boolean(process.env.AUTH_GOOGLE_ID?.includes(".apps.googleusercontent.com")),
      hasGoogleSecret: Boolean(process.env.AUTH_GOOGLE_SECRET?.length),
      authUrlProtocol,
      authUrlHost: (() => {
        try {
          return authUrl ? new URL(authUrl).host : null;
        } catch {
          return null;
        }
      })(),
    },
    runtime: {
      vercel: Boolean(process.env.VERCEL),
      region: process.env.VERCEL_REGION ?? null,
    },
  });
}
