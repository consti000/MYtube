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

  const result = await prisma.channel.updateMany({
    where: {
      userId: authz.userId,
      id: { in: parsed.data.channelIds },
    },
    data: { hidden: parsed.data.hidden },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, count: result.count });
}
