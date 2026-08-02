import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { folderInputSchema } from "@/lib/validators";

export async function GET() {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;

  const folders = await prisma.folder.findMany({
    where: { userId: authz.userId },
    orderBy: { order: "asc" },
    include: {
      _count: { select: { channels: true, links: true } },
      channels: {
        include: {
          channel: {
            include: {
              videos: { orderBy: { publishedAt: "desc" }, take: 3 },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(folders);
}

export async function POST(req: Request) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;

  const body = await req.json();
  const parsed = folderInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const max = await prisma.folder.aggregate({
    where: { userId: authz.userId },
    _max: { order: true },
  });

  const folder = await prisma.folder.create({
    data: {
      userId: authz.userId,
      name: parsed.data.name,
      order: (max._max.order ?? -1) + 1,
    },
  });

  return NextResponse.json(folder, { status: 201 });
}
