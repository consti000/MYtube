import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { linkInputSchema } from "@/lib/validators";

export async function GET() {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;

  const links = await prisma.link.findMany({
    where: { userId: authz.userId },
    orderBy: { createdAt: "desc" },
    include: { folders: { include: { folder: true } } },
  });
  return NextResponse.json(links);
}

export async function POST(req: Request) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;

  const parsed = linkInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const folders = await prisma.folder.findMany({
    where: { userId: authz.userId, id: { in: parsed.data.folderIds } },
  });
  if (folders.length !== parsed.data.folderIds.length) {
    return NextResponse.json({ error: "Invalid folder ids" }, { status: 400 });
  }

  const link = await prisma.link.create({
    data: {
      userId: authz.userId,
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

  return NextResponse.json(link, { status: 201 });
}
