import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { linkInputSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;
  const { id } = await ctx.params;

  const parsed = linkInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.link.findFirst({
    where: { id, userId: authz.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const folders = await prisma.folder.findMany({
    where: { userId: authz.userId, id: { in: parsed.data.folderIds } },
  });
  if (folders.length !== parsed.data.folderIds.length) {
    return NextResponse.json({ error: "Invalid folder ids" }, { status: 400 });
  }

  await prisma.folderLink.deleteMany({ where: { linkId: id } });

  const link = await prisma.link.update({
    where: { id },
    data: {
      platform: parsed.data.platform,
      name: parsed.data.name,
      url: parsed.data.url,
      folders: {
        create: parsed.data.folderIds.map((folderId, order) => ({
          folderId,
          order,
        })),
      },
    },
    include: { folders: true },
  });

  return NextResponse.json(link);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;
  const { id } = await ctx.params;

  const link = await prisma.link.findFirst({
    where: { id, userId: authz.userId },
  });
  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.link.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
