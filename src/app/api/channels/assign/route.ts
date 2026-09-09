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

  const channelIds = [
    ...new Set(
      parsed.data.channelIds?.length
        ? parsed.data.channelIds
        : [parsed.data.channelId!],
    ),
  ];
  const folderIds = [...new Set(parsed.data.folderIds)];

  try {
    const channels = await prisma.channel.findMany({
      where: { userId: authz.userId, id: { in: channelIds } },
      select: { id: true },
    });
    if (channels.length !== channelIds.length) {
      return NextResponse.json({ error: "채널을 찾을 수 없습니다" }, { status: 404 });
    }

    if (folderIds.length > 0) {
      const folders = await prisma.folder.findMany({
        where: { userId: authz.userId, id: { in: folderIds } },
        select: { id: true },
      });
      if (folders.length !== folderIds.length) {
        return NextResponse.json(
          { error: "폴더 선택이 올바르지 않습니다" },
          { status: 400 },
        );
      }
    }

    // Neon 어댑터는 deleteMany/createMany가 내부 트랜잭션을 쓰다 실패할 수 있다.
    const existing = await prisma.folderChannel.findMany({
      where: { channelId: { in: channelIds } },
      select: { id: true },
    });
    for (const row of existing) {
      await prisma.folderChannel.delete({ where: { id: row.id } });
    }

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
    return NextResponse.json(
      { error: "폴더 배정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
