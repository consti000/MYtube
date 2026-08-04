import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { folderInputSchema } from "@/lib/validators";
import {
  FOLDER_VIDEO_LIMIT,
  folderVideoSince,
} from "@/lib/videos";
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
          channel: { select: { id: true, name: true, thumbnailUrl: true } },
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

  const channelIds = folder.channels.map((fc) => fc.channel.id);
  const channelById = new Map(
    folder.channels.map((fc) => [fc.channel.id, fc.channel]),
  );

  const recentVideos =
    channelIds.length === 0
      ? []
      : await prisma.videoCache.findMany({
          where: {
            channelId: { in: channelIds },
            publishedAt: { gte: folderVideoSince() },
          },
          orderBy: { publishedAt: "desc" },
          take: FOLDER_VIDEO_LIMIT,
        });

  const videos = recentVideos.map((v) => {
    const channel = channelById.get(v.channelId);
    return {
      ...v,
      channelName: channel?.name ?? "",
      channelThumbnail: channel?.thumbnailUrl ?? null,
    };
  });

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
