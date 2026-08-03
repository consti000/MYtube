import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const authz = await requireUser();
  if ("error" in authz) return authz.error;
  const { id } = await ctx.params;

  const memo = await prisma.memo.findFirst({
    where: { id, userId: authz.userId },
  });
  if (!memo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.memo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
