import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  channelIds: z.array(z.string()).min(1),
  hidden: z.boolean(),
});

/** 채널을 배정 목록에서 숨기거나 다시 표시 (삭제 아님) */
export async function PATCH(req: Request) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const owned = await prisma.channel.findMany({
    where: {
      userId: authz.userId,
      id: { in: parsed.data.channelIds },
    },
    select: { id: true },
  });
  if (!owned.length) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // updateMany는 Neon HTTP에서 내부 트랜잭션 오류가 나므로 개별 update
  for (const ch of owned) {
    await prisma.channel.update({
      where: { id: ch.id },
      data: { hidden: parsed.data.hidden },
    });
  }

  return NextResponse.json({ ok: true, count: owned.length });
}
