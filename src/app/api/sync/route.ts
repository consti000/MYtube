import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { GoogleTokenError, syncSubscriptions, syncVideoCache } from "@/lib/youtube";

export async function POST(req: Request) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;

  const body = (await req.json().catch(() => ({}))) as { mode?: string };

  try {
    if (body.mode === "videos") {
      const result = await syncVideoCache(authz.userId);
      return NextResponse.json({ ok: true, ...result });
    }
    if (body.mode === "all") {
      const subs = await syncSubscriptions(authz.userId);
      const videos = await syncVideoCache(authz.userId);
      return NextResponse.json({ ok: true, ...subs, ...videos });
    }
    const result = await syncSubscriptions(authz.userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof GoogleTokenError) {
      return NextResponse.json(
        {
          error: e.message,
          code: e.code,
          needsReauth: e.needsReauth,
        },
        { status: 401 },
      );
    }
    const message = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
