import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { videoWatchInputSchema } from "@/lib/validators";

/** 직접 고른 유튜브 영상을 시청함으로 기록한다. */
export async function POST(req: Request) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;

  const parsed = videoWatchInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { videoId } = parsed.data;
  const existing = await prisma.videoWatch.findFirst({
    where: { userId: authz.userId, videoId },
  });

  if (existing) {
    await prisma.videoWatch.update({
      where: { id: existing.id },
      data: { watchedAt: new Date() },
    });
  } else {
    await prisma.videoWatch.create({
      data: { userId: authz.userId, videoId },
    });
  }

  return NextResponse.json({ ok: true, videoId });
}
