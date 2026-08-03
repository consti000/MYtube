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

  try {
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

    // createMany/updateMany는 일부 어댑터에서 내부 트랜잭션을 요구하므로 개별 create 사용
    await prisma.folderChannel.deleteMany({
      where: { channelId: { in: channelIds } },
    });

    for (const channelId of channelIds) {
      for (let index = 0; index < folderIds.length; index++) {
        await prisma.folderChannel.create({
          data: {
            folderId: folderIds[index],
            channelId,
            order: index,
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[channels/assign]", err);
    const message =
      err instanceof Error ? err.message : "Failed to save assignment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
