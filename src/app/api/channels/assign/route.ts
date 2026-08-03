import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { z } from "zod";

const assignSchema = z
  .object({
    channelId: z.string().optional(),
    channelIds: z.array(z.string()).optional(),
    folderIds: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    const ids = data.channelIds?.length
      ? data.channelIds
      : data.channelId
        ? [data.channelId]
        : [];
    if (!ids.length) {
      ctx.addIssue({
        code: "custom",
        path: ["channelIds"],
        message: "channelId or channelIds required",
      });
    }
  });

/** Replace folder membership for one or more YouTube channels. */
export async function POST(req: Request) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;

  const parsed = assignSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const channelIds = parsed.data.channelIds?.length
    ? parsed.data.channelIds
    : [parsed.data.channelId!];
  const { folderIds } = parsed.data;

  const channels = await prisma.channel.findMany({
    where: { userId: authz.userId, id: { in: channelIds } },
  });
  if (channels.length !== channelIds.length) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const folders = await prisma.folder.findMany({
    where: { userId: authz.userId, id: { in: folderIds } },
  });
  if (folders.length !== folderIds.length) {
    return NextResponse.json({ error: "Invalid folder ids" }, { status: 400 });
  }

  // Neon HTTP 어댑터는 $transaction 미지원 → 순차 실행
  await prisma.folderChannel.deleteMany({
    where: { channelId: { in: channelIds } },
  });

  if (folderIds.length > 0) {
    await prisma.folderChannel.createMany({
      data: channelIds.flatMap((channelId) =>
        folderIds.map((folderId, index) => ({
          folderId,
          channelId,
          order: index,
        })),
      ),
    });
  }

  return NextResponse.json({ ok: true });
}
