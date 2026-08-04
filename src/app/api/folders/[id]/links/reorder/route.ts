import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  linkIds: z.array(z.string()).min(1),
});

/** 폴더 내 X/Facebook 링크 순서를 linkIds 배열 순서대로 갱신 */
export async function PUT(req: Request, ctx: Ctx) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;
  const { id: folderId } = await ctx.params;

  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId: authz.userId },
    select: { id: true },
  });
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const owned = await prisma.folderLink.findMany({
    where: { folderId, linkId: { in: parsed.data.linkIds } },
    select: { linkId: true },
  });
  if (owned.length !== parsed.data.linkIds.length) {
    return NextResponse.json({ error: "Invalid link ids" }, { status: 400 });
  }

  for (let index = 0; index < parsed.data.linkIds.length; index++) {
    await prisma.folderLink.update({
      where: {
        folderId_linkId: {
          folderId,
          linkId: parsed.data.linkIds[index],
        },
      },
      data: { order: index },
    });
  }

  return NextResponse.json({ ok: true });
}
