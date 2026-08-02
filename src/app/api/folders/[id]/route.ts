import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { folderInputSchema } from "@/lib/validators";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;
  const { id } = await ctx.params;

  const folder = await prisma.folder.findFirst({
    where: { id, userId: authz.userId },
    include: {
      channels: {
        orderBy: { order: "asc" },
        include: {
          channel: {
            include: {
              videos: { orderBy: { publishedAt: "desc" }, take: 8 },
            },
          },
        },
      },
      links: {
        orderBy: { order: "asc" },
        include: { link: true },
      },
    },
  });

  if (!folder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const videos = folder.channels
    .flatMap((fc) =>
      fc.channel.videos.map((v) => ({
        ...v,
        channelName: fc.channel.name,
        channelThumbnail: fc.channel.thumbnailUrl,
      })),
    )
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  return NextResponse.json({
    ...folder,
    videos,
    links: folder.links.map((fl) => fl.link),
    channelCount: folder.channels.length,
    linkCount: folder.links.length,
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;
  const { id } = await ctx.params;

  const body = await req.json();
  const schema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    order: z.number().int().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.folder.findFirst({
    where: { id, userId: authz.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (parsed.data.name !== undefined) {
    folderInputSchema.parse({ name: parsed.data.name });
  }

  const folder = await prisma.folder.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(folder);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;
  const { id } = await ctx.params;

  const existing = await prisma.folder.findFirst({
    where: { id, userId: authz.userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.folder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
