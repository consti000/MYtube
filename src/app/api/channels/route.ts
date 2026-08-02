import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function GET() {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;

  const channels = await prisma.channel.findMany({
    where: { userId: authz.userId },
    orderBy: { name: "asc" },
    include: {
      folders: { include: { folder: true } },
    },
  });

  return NextResponse.json(channels);
}
