import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncVideoCache } from "@/lib/youtube";

/**
 * Cron endpoint — call with Authorization: Bearer $CRON_SECRET
 * Refreshes video_cache for users whose syncInterval has elapsed (best-effort).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const users = await prisma.user.findMany({
    select: { id: true, syncInterval: true },
  });

  const results: Array<{ userId: string; ok: boolean; error?: string }> = [];

  for (const user of users) {
    try {
      await syncVideoCache(user.id);
      results.push({ userId: user.id, ok: true });
    } catch (e) {
      results.push({
        userId: user.id,
        ok: false,
        error: e instanceof Error ? e.message : "failed",
      });
    }
  }

  return NextResponse.json({ synced: results.length, results });
}
