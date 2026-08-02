import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;
  const { id } = await ctx.params;

  const link = await prisma.link.findFirst({
    where: { id, userId: authz.userId },
  });
  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.link.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
