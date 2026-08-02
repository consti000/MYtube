import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { z } from "zod";

const assignSchema = z.object({
  channelId: z.string(),
  folderIds: z.array(z.string()),
});

/** Replace folder membership for a YouTube channel (many-to-many). */
export async function POST(req: Request) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;

  const parsed = assignSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const channel = await prisma.channel.findFirst({
    where: { id: parsed.data.channelId, userId: authz.userId },
  });
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const folders = await prisma.folder.findMany({
    where: { userId: authz.userId, id: { in: parsed.data.folderIds } },
  });
  if (folders.length !== parsed.data.folderIds.length) {
    return NextResponse.json({ error: "Invalid folder ids" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.folderChannel.deleteMany({ where: { channelId: channel.id } }),
    ...parsed.data.folderIds.map((folderId, index) =>
      prisma.folderChannel.create({
        data: { folderId, channelId: channel.id, order: index },
      }),
    ),
  ]);

  return NextResponse.json({ ok: true });
}
