import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  folderIds: z.array(z.string()).min(1),
});

/** 폴더 순서를 folderIds 배열 순서대로 일괄 갱신 */
export async function PUT(req: Request) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const owned = await prisma.folder.findMany({
    where: { userId: authz.userId, id: { in: parsed.data.folderIds } },
    select: { id: true },
  });
  if (owned.length !== parsed.data.folderIds.length) {
    return NextResponse.json({ error: "Invalid folder ids" }, { status: 400 });
  }

  // Neon HTTP 어댑터는 $transaction 미지원 → 순차 update
  for (let index = 0; index < parsed.data.folderIds.length; index++) {
    await prisma.folder.update({
      where: { id: parsed.data.folderIds[index] },
      data: { order: index },
    });
  }

  return NextResponse.json({ ok: true });
}
