import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { syncIntervalSchema } from "@/lib/validators";
import { z } from "zod";

export async function GET() {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;

  const user = await prisma.user.findUnique({
    where: { id: authz.userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      syncInterval: true,
      accounts: {
        where: { provider: "google" },
        select: { provider: true, scope: true, expires_at: true },
      },
    },
  });

  return NextResponse.json(user);
}

export async function PATCH(req: Request) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;

  const schema = z.object({ syncInterval: syncIntervalSchema });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: authz.userId },
    data: { syncInterval: parsed.data.syncInterval },
    select: { syncInterval: true },
  });

  return NextResponse.json(user);
}
