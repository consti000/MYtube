import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { memoInputSchema } from "@/lib/validators";

export async function GET(req: Request) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;

  const videoId = new URL(req.url).searchParams.get("videoId")?.trim() || null;

  const memos = await prisma.memo.findMany({
    where: {
      userId: authz.userId,
      ...(videoId ? { videoId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(memos);
}

export async function POST(req: Request) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;

  const parsed = memoInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const memo = await prisma.memo.create({
    data: {
      userId: authz.userId,
      content: parsed.data.content,
      videoUrl: parsed.data.videoUrl?.trim() || "",
      videoTitle: parsed.data.videoTitle ?? null,
      videoId: parsed.data.videoId ?? null,
    },
  });

  return NextResponse.json(memo, { status: 201 });
}
